// Run against npm run dev; requires Playwright and Chrome. APP_URL and
// PLAYWRIGHT_MODULE can point to another preview/module installation.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { completeQuiz, installNavigation } = require('./navigation.cjs');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { translations: { en, zh } } = require('../src/i18n/translations.ts');
const { PLANETS } = require('../src/data/roamingData.ts');

const cases = [
  ['OMEGA_01', [0, 0, 0], 'round'],
  ['DELTA_02', [1, 1, 1], 'lobed'],
  ['SIGMA_03', [2, 2, 2], 'cloud-triangle'],
  ['PSI_04', [0, 1, 2], 'soft-cube'],
];

async function installProbe(page) {
  await installNavigation(page);
  await page.evaluate(() => {
    const mount = document.querySelector('canvas').parentElement;
    let fiber = mount[Object.keys(mount).find(key => key.startsWith('__reactFiber'))];
    while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
    window.__formControls = fiber.memoizedProps;
    window.__formFrames = 0;
    const render = window.__navRenderer.render.bind(window.__navRenderer);
    window.__navRenderer.render = (scene, camera) => {
      render(scene, camera);
      window.__formCamera = camera;
      window.__formFrames++;
    };
    window.__formSnapshot = () => {
      const scene = window.__navScene;
      const planet = scene.getObjectByName('planet-surface');
      const body = scene.getObjectByName('planet-body');
      const surface = planet.userData.surface;
      const positions = body.geometry.attributes.position;
      const normals = body.geometry.attributes.normal;
      let min = Infinity, max = -Infinity, finite = true, hash = 2166136261;
      for (let index = 0; index < positions.count; index++) {
        const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
        const length = Math.hypot(x, y, z);
        finite &&= [x, y, z, normals.getX(index), normals.getY(index), normals.getZ(index)].every(Number.isFinite);
        min = Math.min(min, length); max = Math.max(max, length);
        hash = Math.imul(hash ^ Math.round((x + y * 7 + z * 31) * 1e5), 16777619);
      }
      const attached = name => {
        const object = scene.getObjectByName(name);
        const direction = object.position.clone().normalize();
        const expected = surface.point(direction);
        const normal = surface.normal(direction);
        const up = object.position.clone().set(0, 1, 0).applyQuaternion(object.quaternion);
        return { error: object.position.distanceTo(expected), alignment: up.dot(normal), radius: object.position.length() };
      };
      const textureHash = texture => {
        const image = texture?.image;
        if (!image?.getContext) return null;
        const pixels = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
        let hash = 2166136261;
        for (let i = 0; i < pixels.length; i += 64) hash = Math.imul(hash ^ (pixels[i] + pixels[i + 1] * 7 + pixels[i + 2] * 31), 16777619);
        return { hash, width: image.width, height: image.height };
      };
      const spiritGeometry = scene.getObjectByName('spirit-torso').geometry.attributes.position;
      let spiritHash = 2166136261;
      for (let i = 0; i < spiritGeometry.array.length; i++) spiritHash = Math.imul(spiritHash ^ Math.round(spiritGeometry.array[i] * 1e6), 16777619);
      const spirit = scene.getObjectByName('spirit-surface-root');
      return { id: planet.userData.planetId, kind: surface.kind, finite, hash, min, max, nominal: surface.radius,
        minBound: surface.minRadius, maxBound: surface.maxRadius, texture: textureHash(body.material.map), bump: textureHash(body.material.bumpMap),
        roughness: body.material.roughness, spiritHash,
        clearance: { stone: spirit.position.distanceTo(scene.getObjectByName('listening-stone').position), portal: spirit.position.distanceTo(scene.getObjectByName('portal-landmark').position) },
        attachments: ['spirit-surface-root', 'listening-stone', 'portal-landmark'].map(attached) };
    };
    window.__formBounds = () => {
      const scene = window.__navScene, camera = window.__formCamera;
      const canvas = window.__navRenderer.domElement;
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, leftObject = '', rightObject = '';
      const include = (point, label) => {
        point.project(camera);
        const x = (point.x + 1) * canvas.clientWidth / 2;
        const y = (1 - point.y) * canvas.clientHeight / 2;
        if (x < left) leftObject = label;
        if (x > right) rightObject = label;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      };
      for (const name of ['planet-body', 'planet-halo']) {
        const object = scene.getObjectByName(name);
        const vertices = object.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) include(object.position.clone().fromBufferAttribute(vertices, i).applyMatrix4(object.matrixWorld), name);
      }
      const meshBounds = object => {
        // Sprite vertices face the camera in the shader, not matrixWorld;
        // their feathered glows are not solid model edges.
        if (!object.isMesh || !object.geometry) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const { min, max } = object.geometry.boundingBox;
        for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z])
          include(object.position.clone().set(x, y, z).applyMatrix4(object.matrixWorld), object.name || object.parent.name || object.geometry.type);
      };
      for (const name of ['spirit-body', 'listening-stone', 'portal-landmark', 'interactive-garden']) scene.getObjectByName(name).traverseVisible(meshBounds);
      return { left, right, top, bottom, leftObject, rightObject, width: canvas.clientWidth, height: canvas.clientHeight };
    };
  });
  await page.waitForFunction(() => window.__formCamera && window.__navScene.getObjectByName('interactive-garden').userData.pendingTextures === 0);
}

// Drive the actual joystick. A deformed surface's true normal differs from its
// radial direction, so remove the current direction before projecting the
// target onto the character's tangent frame; otherwise steering has a bias.
async function approachSurface(page, name, label) {
  const pad = await page.locator('.wandering-joystick').boundingBox();
  const x = pad.x + pad.width / 2, y = pad.y + pad.height / 2;
  let previous = null, stalled = 0, detour = 0, side = 1;
  await page.mouse.move(x, y); await page.mouse.down();
  try {
    for (let step = 0; step < 300; step++) {
      const reached = typeof label === 'function' ? await page.evaluate(label)
        : await page.getByRole('button', { name: label, exact: true }).isVisible();
      if (reached) return;
      let [dx, dy, ...position] = await page.evaluate(name => {
        const root = window.__navScene.getObjectByName('spirit-surface-root');
        const target = window.__navScene.getObjectByName(name);
        const current = root.position.clone().normalize();
        const desired = target.position.clone().normalize();
        desired.addScaledVector(current, -desired.dot(current)).normalize();
        const planet = window.__navScene.getObjectByName('planet-surface');
        const surface = planet.userData.surface;
        const origin = root.position.clone().applyMatrix4(planet.matrixWorld).project(window.__formCamera);
        const step = surface.point(current.clone().addScaledVector(desired, .001).normalize())
          .applyMatrix4(planet.matrixWorld).project(window.__formCamera);
        const canvas = window.__navRenderer.domElement;
        return [(step.x - origin.x) * canvas.clientWidth, (origin.y - step.y) * canvas.clientHeight, ...root.position.toArray()];
      }, name);
      if (previous && Math.hypot(...position.map((value, index) => value - previous[index])) < .001) stalled++;
      else stalled = Math.max(0, stalled - 1);
      previous = position;
      if (stalled >= 7) { detour = 20; stalled = 0; side *= -1; }
      if (detour > 0) { [dx, dy] = [dx * .2 + dy * side, dy * .2 - dx * side]; detour--; }
      const length = Math.hypot(dx, dy);
      await page.mouse.move(x + (length > .0001 ? dx / length : 1) * 26, y + (length > .0001 ? dy / length : 0) * 26);
      await page.waitForTimeout(70);
    }
    throw new Error(`Could not approach ${name} using the live joystick`);
  } finally { await page.mouse.up(); }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const geometryHashes = new Set(), textureHashes = new Set(), spiritHashes = new Set();
  try {
    for (const [id, answers, kind] of cases) {
      if (process.env.PLANET_ID && process.env.PLANET_ID !== id) continue;
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'zh-CN' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const b = name => page.getByRole('button', { name, exact: true });
      await installControlledNarration(page);
      await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      await b(en.INTRO_COPY.startButton).click();
      await page.waitForFunction(() => window.__introUtterance); await page.evaluate(() => window.__finishIntro());
      await b(en.interlude.ready).click(); await completeQuiz(page, answers);
      await b(en.planetGuide.confirm).click(); await installProbe(page);
      const snapshot = await page.evaluate(() => window.__formSnapshot());
      assert.equal(snapshot.id, id); assert.equal(snapshot.kind, kind); assert.equal(snapshot.finite, true);
      assert.ok(snapshot.min >= snapshot.minBound - 1e-4 && snapshot.max <= snapshot.maxBound + 1e-4, `${id}: radial bounds ${JSON.stringify(snapshot)}`);
      assert.ok(snapshot.max / snapshot.min > (id === 'OMEGA_01' ? 1.01 : 1.12), `${id}: an actual volumetric form replaces the shared sphere`);
      assert.ok(snapshot.texture?.width >= 512 && snapshot.bump?.width >= 256);
      assert.ok(snapshot.roughness >= .6 && snapshot.roughness <= 1);
      geometryHashes.add(snapshot.hash); textureHashes.add(snapshot.texture.hash); spiritHashes.add(snapshot.spiritHash);
      for (const attachment of snapshot.attachments) {
        assert.ok(attachment.error < .003, `${id}: object attached to its actual surface: ${JSON.stringify(attachment)}`);
        assert.ok(attachment.alignment > .999, `${id}: object oriented to its geometric normal: ${JSON.stringify(attachment)}`);
      }
      await page.screenshot({ path: `tests/planet-form-${id}-390.png` });
      if (process.env.CAPTURE_ONLY) { await page.close(); console.log(`CAPTURE: ${id} ${kind}`); continue; }
      // Actual keyboard movement tests the public controls independently of the
      // angle samples used below to check the full visual rotation envelope.
      const start = await page.evaluate(() => window.__navScene.getObjectByName('spirit-surface-root').position.toArray());
      for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
        await page.keyboard.down(key); await page.waitForTimeout(380); await page.keyboard.up(key);
        const attachments = await page.evaluate(() => window.__formSnapshot().attachments);
        assert.ok(attachments[0].error < .003 && attachments[0].alignment > .999, `${id}: feet remain attached during ${key}`);
      }
      const moved = await page.evaluate(() => window.__navScene.getObjectByName('spirit-surface-root').position.toArray());
      assert.ok(start.some((value, index) => Math.abs(value - moved[index]) > .002), `${id}: movement controls still move the character`);
      const sampledViewports = process.env.SKIP_ROTATIONS ? [] : [[320, 568], [390, 844], [1280, 900]];
      for (const [width, height] of sampledViewports) {
        await page.setViewportSize({ width, height }); await page.waitForTimeout(220);
        for (const [lon, lat] of [[1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2]]) {
          for (let step = 0; step < 12; step++) {
            const previous = await page.evaluate(([lon, lat]) => {
              const controls = window.__formControls;
              controls.planetCoordsRef.current.lon += lon * Math.PI / 6;
              controls.planetCoordsRef.current.lat += lat * Math.PI / 6;
              controls.targetCoordsRef.current = { ...controls.planetCoordsRef.current };
              controls.springVelocityRef.current = { lon: 0, lat: 0 };
              return window.__formFrames;
            }, [lon, lat]);
            await page.waitForFunction(previous => window.__formFrames > previous, previous);
            const bounds = await page.evaluate(() => window.__formBounds());
            assert.ok(bounds.left >= 2 && bounds.right <= bounds.width - 2 && bounds.top >= 2 && bounds.bottom <= bounds.height - 2,
              `${id}/${width}: the complete moving world stays in frame: ${JSON.stringify(bounds)}`);
            const sampled = await page.evaluate(() => window.__formSnapshot());
            const attachment = sampled.attachments[0];
            assert.ok(attachment.error < .003 && attachment.alignment > .999, `${id}: surface attachment survives a full multi-axis circuit`);
            assert.ok(sampled.clearance.stone >= .57 && sampled.clearance.portal >= .565,
              `${id}/${width}/direction(${lon},${lat})/step${step}: physical landmark clearance survives a full multi-axis circuit: ${JSON.stringify(sampled.clearance)}`);
          }
        }
      }
      await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
      // Before this planet's first rest its portal is a visible but locked goal.
      await approachSurface(page, 'portal-landmark', () => {
        const scene = window.__navScene;
        const root = scene.getObjectByName('spirit-surface-root');
        return root.position.distanceTo(scene.getObjectByName('portal-landmark').position) < .67;
      });
      await page.locator('.landmark-label').last().waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await page.locator('.landmark-label').nth(1).isVisible(), true, `${id}: portal label is visible when approached before resting`);
      assert.equal(await b('[ Enter Portal ]').count(), 0);
      await approachSurface(page, 'listening-stone', '[ Sit & Listen ]');
      await page.locator('.landmark-label').first().waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await page.locator('.landmark-label').first().isVisible(), true);
      const separation = await page.evaluate(() => window.__navScene.getObjectByName('spirit-surface-root').position.distanceTo(window.__navScene.getObjectByName('listening-stone').position));
      assert.ok(separation >= .54, `${id}: the companion does not overlap the cushion (${separation})`);
      await b('[ Sit & Listen ]').click(); await page.getByRole('textbox').waitFor();
      const audio = await page.locator('#brief-roaming-external-audio').evaluate(element => ({ time: element.currentTime, paused: element.paused, src: element.src }));
      assert.equal(audio.paused, false); assert.ok(audio.time > 0); assert.ok(audio.src.endsWith(PLANETS[id].externalAudioUrl));
      await page.evaluate(() => {
        window.__surfaceBeforeLanguage = window.__navScene.getObjectByName('planet-surface').userData.surface;
        window.__spiritBeforeLanguage = window.__navScene.getObjectByName('spirit-surface-root').position.toArray();
        window.__canvasBeforeLanguage = document.querySelector('canvas');
      });
      await page.getByRole('textbox').fill('My quiet little thought.'); await b('\u4e2d\u6587').click();
      await b(`[ ${zh.ROAMING_COPY.releaseButton} ]`).waitFor();
      assert.equal(await page.getByRole('textbox').inputValue(), 'My quiet little thought.');
      assert.equal(await page.evaluate(() => window.__surfaceBeforeLanguage === window.__navScene.getObjectByName('planet-surface').userData.surface), true);
      assert.deepEqual(await page.evaluate(() => window.__navScene.getObjectByName('spirit-surface-root').position.toArray()), await page.evaluate(() => window.__spiritBeforeLanguage));
      await b('EN').click(); await b('[ Let It Float ]').click();
      assert.equal(await page.locator('.spirit-overhead-bubble[data-release="true"]').textContent(), 'My quiet little thought.');
      assert.ok(await page.locator('#brief-roaming-external-audio').evaluate((element, before) => !element.paused && element.currentTime >= before, audio.time), 'Language and message actions never restart the current music');
      await page.screenshot({ path: `tests/planet-form-${id}-listening.png` });
      await b('[ Stand Up ]').click(); await b(en.exitGuide.confirm).click();
      await approachSurface(page, 'portal-landmark', '[ Enter Portal ]');
      await page.locator('.landmark-label').last().waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await page.locator('.landmark-label').nth(1).isVisible(), true, `${id}: portal label is visible when the portal is reachable`);
      const portalDistance = await page.evaluate(() => window.__navScene.getObjectByName('spirit-surface-root').position.distanceTo(window.__navScene.getObjectByName('portal-landmark').position));
      assert.ok(portalDistance >= .53, `${id}: the companion does not overlap the portal (${portalDistance})`);
      await page.waitForFunction(() => document.getElementById('brief-roaming-external-audio').paused);
      await page.evaluate(() => {
        const body = window.__navScene.getObjectByName('planet-body');
        window.__oldFormGeometry = body.geometry; window.__formDisposed = 0;
        body.geometry.addEventListener('dispose', () => window.__formDisposed++);
      });
      await b('[ Enter Portal ]').click(); await b(en.portalDiscovery.spin).click();
      await page.locator('.portal-discovery-overlay').waitFor({ state: 'hidden' });
      await page.waitForFunction(id => window.__navScene.getObjectByName('planet-surface').userData.planetId !== id, id);
      assert.equal(await page.evaluate(() => window.__canvasBeforeLanguage === document.querySelector('canvas')), true, 'Travel preserves the WebGL context');
      assert.equal(await page.evaluate(() => window.__oldFormGeometry === window.__navScene.getObjectByName('planet-body').geometry), false, 'Travel replaces the actual geometry');
      assert.ok(await page.evaluate(() => window.__formDisposed) > 0, 'Travel disposes the previous world geometry');
      assert.equal(await page.locator('.planet-instructions').count(), 0, 'Travel never repeats the one-time guide');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS: ${id}, distinct ${kind} shape/material, actual surface attachments, ${sampledViewports.length * 36} rotation samples, music, message/language continuity and visible/reachable landmarks/travel`);
    }
    if (!process.env.PLANET_ID) {
      assert.equal(geometryHashes.size, 4, 'Each planet has a different actual mesh');
      assert.equal(textureHashes.size, 4, 'Each planet has a different surface treatment');
      assert.equal(spiritHashes.size, 1, 'The existing spirit geometry is unchanged across worlds');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
