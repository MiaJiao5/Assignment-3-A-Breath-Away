const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { completeQuiz, approach, installNavigation } = require('./navigation.cjs');
const { translations: { en } } = require('../src/i18n/translations.ts');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await installControlledNarration(page);
    const b = name => page.getByRole('button', { name, exact: true });
    await page.goto(process.env.APP_URL || 'http://localhost:3001');
    await b(en.INTRO_COPY.startButton).click();
    await page.waitForFunction(() => window.__introUtterance); await page.evaluate(() => window.__finishIntro());
    await b(en.interlude.ready).click(); await completeQuiz(page, [2, 2, 2]); await b(en.planetGuide.confirm).click();
    await installNavigation(page);
    const material = await page.evaluate(() => {
      const body = window.__navScene.getObjectByName('spirit-body');
      const torso = window.__navScene.getObjectByName('spirit-torso');
      const outlined = []; body.traverse(o => { if (o.isMesh && o.material.side === 1) outlined.push(o.name); });
      window.__plushDisposed = false; window.__glowDisposed = false;
      torso.material.bumpMap.addEventListener('dispose', () => window.__plushDisposed = true);
      window.__navScene.getObjectByName('spirit-soft-glow').material.map.addEventListener('dispose', () => window.__glowDisposed = true);
      return { outlined, physical: torso.material.isMeshPhysicalMaterial, sheen: torso.material.sheen, bump: torso.material.bumpScale, shadow: !!window.__navScene.getObjectByName('spirit-contact-shadow') };
    });
    assert.deepEqual(material.outlined, [], 'No expanded back-face outline remains on any spirit part');
    assert.ok(material.physical && material.sheen > 0 && material.bump > 0 && material.shadow, 'Soft volume, plush shading and contact shadow remain');
    const atmosphere = page.locator('.planet-atmosphere');
    assert.equal(await atmosphere.getAttribute('aria-hidden'), 'true');
    assert.equal(await atmosphere.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await page.locator('.atmosphere-dust i').count(), 14);
    assert.equal(await page.locator('.atmosphere-meteors i').count(), 2);
    const mistBefore = await page.locator('.atmosphere-mist-far').evaluate(el => getComputedStyle(el).transform);
    await approach(page, 'listening-stone', '[ Sit & Listen ]');
    await page.evaluate(() => {
      const body = window.__navScene.getObjectByName('spirit-body');
      window.__listeningFrames = [];
      window.__wasListening = false;
      const render = window.__navRenderer.render.bind(window.__navRenderer);
      window.__navRenderer.render = (scene, camera) => {
        const resting = document.querySelector('.three-planet-stage').dataset.resting === 'true';
        if (resting && !window.__wasListening) window.__beforeSitRotation = window.__lastWalkRotation;
        if (!resting) window.__lastWalkRotation = body.quaternion.toArray();
        if (resting) {
          const tuft = scene.getObjectByName('spirit-top-tuft');
          const base = body.getWorldPosition(body.position.clone());
          const root = scene.getObjectByName('spirit-surface-root');
          const baseline = root.localToWorld(root.position.clone().set(0, .018, 0));
          const r = window.__navRenderer.domElement.getBoundingClientRect();
          base.project(camera); baseline.project(camera);
          window.__listeningFrames.push({ rotation: body.quaternion.toArray(),
            tuft: [...tuft.position.toArray(), ...tuft.quaternion.toArray(), ...tuft.scale.toArray()],
            floatPixels: (base.y - baseline.y) * r.height / 2 });
        }
        window.__wasListening = resting;
        return render(scene, camera);
      };
      window.__lastWalkRotation = body.quaternion.toArray();
    });
    await b('[ Sit & Listen ]').click();
    await page.getByRole('textbox').waitFor();
    assert.equal(await page.locator('.atmosphere-meteors[data-listening="true"] i').count(), 4, 'Listening adds a sparse four-streak shower');
    assert.notEqual(await page.locator('.atmosphere-mist-far').evaluate(el => getComputedStyle(el).transform), mistBefore, 'Atmospheric layers drift over time');
    const view = () => page.evaluate(() => {
      const root = window.__navScene.getObjectByName('spirit-surface-root');
      const body = window.__navScene.getObjectByName('spirit-body');
      const torso = window.__navScene.getObjectByName('spirit-torso');
      return { root: root.position.toArray(), quaternion: root.quaternion.toArray(), rotation: body.quaternion.toArray(), scale: torso.scale.toArray(), bob: body.position.y };
    });
    const first = await view(); await page.waitForTimeout(1300); const second = await view();
    assert.deepEqual(first.root, second.root); assert.deepEqual(first.quaternion, second.quaternion);
    assert.notEqual(first.scale[1], second.scale[1], 'Seated breathing changes the silhouette subtly');
    assert.deepEqual(first.rotation, second.rotation, 'Listening never rotates the body');
    assert.ok(Math.abs(second.bob - first.bob) < .04, 'Listening float stays restrained');
    await page.waitForTimeout(6500);
    const frames = await page.evaluate(() => window.__listeningFrames);
    const orientation = await page.evaluate(() => window.__beforeSitRotation);
    frames.forEach(frame => {
      assert.deepEqual(frame.rotation, orientation, 'No entry turn, look-back, head/body tilt or idle pose during listening');
      assert.deepEqual(frame.tuft, frames[0].tuft, 'Tuft has no independent animation');
    });
    const floatRange = Math.max(...frames.slice(15).map(f => f.floatPixels)) - Math.min(...frames.slice(15).map(f => f.floatPixels));
    assert.ok(floatRange >= 1.5 && floatRange <= 3.2, `Vertical float stays around 2–3px: ${floatRange}`);
    const musicResponse = async () => page.evaluate(() => {
      const s = window.__navScene.getObjectByName('spirit-torso').scale;
      // Separate the independent breathing and music terms in the scale vector.
      return ((s.x - 1.12) - (s.y - .86) * .005 / .007) / (1 - .5 * .005 / .007);
    });
    const sounding = await musicResponse();
    assert.ok(sounding > .00001 && sounding <= .00301, 'Actual playing audio contributes only a tiny volume response');
    const music = page.locator('#brief-roaming-external-audio');
    const timeBeforePause = await music.evaluate(el => { el.pause(); return el.currentTime; });
    await page.waitForTimeout(3200);
    assert.ok(await musicResponse() < sounding * .4, 'Music response eases away when actual audio becomes silent');
    assert.deepEqual((await view()).rotation, orientation, 'Silence never changes the listening orientation');
    await music.evaluate(el => el.play()); await page.waitForTimeout(1700);
    assert.ok(await music.evaluate(el => el.currentTime) > timeBeforePause, 'Analysis never restarts the music');
    const canvas = await page.locator('canvas').elementHandle();
    const audioTime = await page.locator('#brief-roaming-external-audio').evaluate(el => el.currentTime);
    await b('\u4e2d\u6587').click(); await b('EN').click();
    assert.equal(await canvas.evaluate(el => el === document.querySelector('canvas')), true);
    assert.ok(await page.locator('#brief-roaming-external-audio').evaluate(el => el.currentTime) >= audioTime, 'Refinement preserves music during translation');
    assert.deepEqual((await view()).rotation, orientation, 'Language switching preserves sitting orientation');
    for (const [width, height] of [[390,844], [320,667], [414,844], [1280,900]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(1700);
      assert.deepEqual((await view()).rotation, orientation, 'Resizing never rotates the seated spirit');
      const input = await page.getByRole('textbox').boundingBox();
      assert.ok(input.x >= 0 && input.x + input.width <= width && input.y + input.height <= height + 1);
      await page.screenshot({ path: `tests/spirit-sky-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const direction = await page.locator('.atmosphere-meteors i').evaluateAll(els => els.map(el => {
      const a = el.getAnimations()[0], timing = a.effect.getTiming();
      a.pause(); a.currentTime = Number(timing.duration) * .08 + timing.delay;
      const start = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      a.currentTime = Number(timing.duration) * .18 + timing.delay;
      const end = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return { dx: end.m41 - start.m41, dy: end.m42 - start.m42, angle: Math.atan2(end.m12, end.m11) * 180 / Math.PI };
    }));
    direction.forEach(d => assert.ok(d.dx > 0 && d.dy > 0 && Math.abs(d.angle - 32) < .1, 'Streaks fall diagonally from top-left to bottom-right'));
    assert.ok(await page.locator('.atmosphere-meteors i').first().evaluate(el => Number(getComputedStyle(el).opacity) > .1), 'Occasional meteor has a visible soft streak');
    await page.screenshot({ path: 'tests/spirit-sky-meteor.png' });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(600);
    assert.equal(await page.locator('.atmosphere-meteors').isVisible(), false);
    assert.ok(await atmosphere.locator('i, .atmosphere-mist').evaluateAll(els => els.every(el => getComputedStyle(el).animationName === 'none')));
    const still = await view(); await page.waitForTimeout(600);
    assert.deepEqual((await view()).scale, still.scale, 'Reduced motion freezes breathing');
    assert.equal((await view()).bob, still.bob, 'Reduced motion also freezes floating and music response');
    await b('[ Stand Up ]').click(); await b(en.exitGuide.confirm).click(); await b(en.ROAMING_COPY.leaveButton).click();
    assert.equal(await atmosphere.count(), 0, 'Decorations are removed outside the planet screen');
    assert.ok(await page.evaluate(() => window.__plushDisposed && window.__glowDisposed), 'Plush and glow textures are released on exit');
    assert.deepEqual(errors, []);
    console.log('PASS: fixed sitting orientation from entry, no independent tuft motion, slow breathing, 2–3px floating, actual audio-level response, independent atmosphere, mobile controls, language/music continuity, reduced motion and cleanup.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
