const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { approach, installNavigation } = require('./navigation.cjs');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const { translations: { en } } = await import(pathToFileURL(path.resolve('src/i18n/translations.ts')));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const [id, answers] of [['OMEGA_01', [0,0,0]], ['DELTA_02', [1,1,1]], ['SIGMA_03', [2,2,2]], ['PSI_04', [0,1,2]]]) {
      if (process.env.PLANET_ID && id !== process.env.PLANET_ID) continue;
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: id === 'PSI_04' ? 'no-preference' : 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.__notes = 0;
        const start = OscillatorNode.prototype.start;
        OscillatorNode.prototype.start = function (...args) { window.__notes++; return start.apply(this, args); };
      });
      const b = name => page.getByRole('button', { name, exact: true });
      await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
      await b(en.INTRO_COPY.startButton).click(); await b(en.interlude.ready).click();
      for (let i = 0; i < 3; i++) await b(en.QUIZ_QUESTIONS[i].options[answers[i]].label).click();
      await b(en.planetGuide.confirm).click();
      await installNavigation(page);
      await page.evaluate(() => {
        const render = window.__navRenderer.render.bind(window.__navRenderer);
        window.__idles = new Set(); window.__maxCrown = 1; window.__maxIdleHeight = 0;
        window.__navRenderer.render = (scene, camera) => {
          render(scene, camera); window.__camera = camera;
          const action = scene.getObjectByName('spirit-body').userData.idleAction;
          if (action) {
            window.__idles.add(action);
            window.__maxIdleHeight = Math.max(window.__maxIdleHeight, scene.getObjectByName('spirit-body').position.y);
          }
          const garden = scene.getObjectByName('interactive-garden');
          garden.children.filter(o => o.name.startsWith('garden-cluster-')).forEach(o => { window.__maxCrown = Math.max(window.__maxCrown, o.children[0].scale.x); });
        };
      });
      const pad = await page.locator('.wandering-joystick').boundingBox();
      assert.ok(Math.abs(pad.width - 124) < .1, 'Joystick has the enlarged 124px touch area');
      const notesBefore = await page.evaluate(() => window.__notes);
      await approach(page, 'garden-cluster-0');
      assert.ok(await page.evaluate(n => window.__notes > n, notesBefore), 'Plant proximity plays a chime');
      // Push into a root using the real control; the boundary must remain solid.
      const x = pad.x + pad.width / 2, y = pad.y + pad.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      for (let i = 0; i < 12; i++) {
        const vector = await page.evaluate(() => {
          const root = window.__navScene.getObjectByName('spirit-surface-root');
          const plant = window.__navScene.getObjectByName('garden-cluster-0');
          const local = plant.position.clone().normalize().applyQuaternion(root.quaternion.clone().invert());
          const distance = root.position.distanceTo(plant.position.clone().normalize().multiplyScalar(root.position.length()));
          return { dx: local.x, dy: local.z / .75, distance, min: .25 + .15 + plant.scale.x * .055 + .035 };
        });
        assert.ok(vector.distance >= vector.min - .003, `${id}: decoration has a physical gap`);
        const length = Math.hypot(vector.dx, vector.dy);
        await page.mouse.move(x + vector.dx / length * 25, y + vector.dy / length * 25);
        await page.waitForTimeout(90);
      }
      await page.mouse.up();
      if (id === 'PSI_04') {
        assert.ok(await page.evaluate(() => window.__maxCrown > 1.12), 'Approaching briefly enlarges the decoration');
        await page.evaluate(() => { Math.random = () => .99; });
        await page.waitForTimeout(10000);
        assert.ok(await page.evaluate(() => window.__idles.size > 0), 'Idle character performs a random gesture');
        assert.ok(await page.evaluate(() => window.__idles.has('dance') && window.__maxIdleHeight < .075), 'Dance remains gentle and never accumulates upward drift');
        const position = await page.evaluate(() => window.__navScene.getObjectByName('spirit-surface-root').position.toArray());
        await page.waitForTimeout(1000);
        assert.deepEqual(await page.evaluate(() => window.__navScene.getObjectByName('spirit-surface-root').position.toArray()), position, 'Idle gesture does not move the character');
        await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => window.__navScene.getObjectByName('spirit-body').userData.idleAction), null, 'Movement cancels idle gesture');
        await page.keyboard.up('ArrowLeft');
      }
      await approach(page, 'listening-stone', '[ Sit & Listen ]');
      await b('[ Sit & Listen ]').click(); await page.getByRole('textbox').waitFor();
      await page.waitForTimeout(id === 'PSI_04' ? 3400 : 300);
      for (const [width, height] of [[390,844], [320,667]]) {
        await page.setViewportSize({ width, height }); await page.waitForTimeout(id === 'PSI_04' ? 3200 : 400);
        const view = await page.evaluate(() => {
          const scene = window.__navScene, camera = window.__camera;
          const planet = scene.getObjectByName('planet-surface');
          const p = planet.position.clone().project(camera);
          const mount = document.querySelector('canvas').getBoundingClientRect();
          const head = scene.getObjectByName('spirit-body').children[2];
          const projected = head.localToWorld(head.position.clone().set(0,.075,0)).project(camera);
          return { centerX: p.x, distance: camera.position.distanceTo(scene.getObjectByName('spirit-surface-root').getWorldPosition(p.clone())), headX: mount.x + (projected.x + 1) * mount.width / 2, headY: mount.y + (1 - projected.y) * mount.height / 2, bump: planet.children[0].material.bumpScale };
        });
        assert.ok(Math.abs(view.centerX) < .015, `${id}/${width}: seated planet is horizontally centered`);
        assert.ok(view.bump > 0, 'Planet has a relief texture');
        assert.ok(view.distance < 12, 'Wrapped thoughts and status feedback never push the camera far away');
        await b('[ Let It Float ]').click();
        const bubble = page.locator('.spirit-overhead-bubble');
        await bubble.waitFor({ state: 'visible' });
        await page.waitForTimeout(180);
        const box = await bubble.boundingBox();
        const headNow = await page.evaluate(() => {
          const head = window.__navScene.getObjectByName('spirit-body').children[2];
          const point = head.localToWorld(head.position.clone().set(0,.075,0)).project(window.__camera);
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + (point.x + 1) * canvas.width / 2, y: canvas.y + (1 - point.y) * canvas.height / 2 };
        });
        assert.ok(Math.abs(box.x + box.width / 2 - headNow.x) < 3, 'Bubble follows head horizontally');
        assert.ok(headNow.y - box.y - box.height >= 8 && headNow.y - box.y - box.height < 35, 'Bubble sits just above the head');
        assert.ok(box.y >= 0 && box.x >= 0 && box.x + box.width <= width + 1, 'Bubble fits phone');
        await page.screenshot({ path: `tests/polish-${id}-${width}.png` });
        await page.getByRole('textbox').fill('A gentle thought, with enough words to wrap onto several lines');
        await b('[ Let It Float ]').click();
        const layout = await page.locator('.stardust-layer').evaluate(el => ({
          bottom: el.getBoundingClientRect().bottom,
          mask: getComputedStyle(el).maskImage,
          thoughts: [...el.children].filter(child => getComputedStyle(child).display !== 'none').map(child => { const r = child.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, text: child.textContent }; }),
        }));
        assert.equal(layout.mask, 'none', 'No vertical fade mask cuts sentences');
        layout.thoughts.forEach(t => assert.ok(t.bottom <= layout.bottom + 1, 'Complete thought fits its natural-height layer'));
        if (layout.thoughts.length > 1) assert.ok(layout.thoughts[1].top >= layout.thoughts[0].bottom + 13, 'Thought rows have room between them');
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS: ${id} centered seating, head bubble, complete thoughts, root clearance and texture`);
    }
    console.log(`PASS: ${process.env.PLANET_ID || 'all four planets'}, 320/390px layouts, proximity audio/scale, idle gesture and cancellation.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
