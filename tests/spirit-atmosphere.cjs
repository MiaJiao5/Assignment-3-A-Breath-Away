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
    await approach(page, 'listening-stone', '[ Sit & Listen ]'); await b('[ Sit & Listen ]').click();
    await page.getByRole('textbox').waitFor();
    assert.notEqual(await page.locator('.atmosphere-mist-far').evaluate(el => getComputedStyle(el).transform), mistBefore, 'Atmospheric layers drift over time');
    const view = () => page.evaluate(() => {
      const root = window.__navScene.getObjectByName('spirit-surface-root');
      const body = window.__navScene.getObjectByName('spirit-body');
      const torso = window.__navScene.getObjectByName('spirit-torso');
      return { root: root.position.toArray(), quaternion: root.quaternion.toArray(), scale: torso.scale.toArray(), bob: body.position.y, lean: body.rotation.x, sway: body.rotation.z };
    });
    const first = await view(); await page.waitForTimeout(1300); const second = await view();
    assert.deepEqual(first.root, second.root); assert.deepEqual(first.quaternion, second.quaternion);
    assert.notEqual(first.scale[1], second.scale[1], 'Seated breathing changes the silhouette subtly');
    assert.ok(Math.abs(second.bob - first.bob) < .01 && Math.abs(second.sway) <= .019 && Math.abs(second.lean) < .04, 'Listening motion is restrained');
    const canvas = await page.locator('canvas').elementHandle();
    const audioTime = await page.locator('#brief-roaming-external-audio').evaluate(el => el.currentTime);
    await b('\u4e2d\u6587').click(); await b('EN').click();
    assert.equal(await canvas.evaluate(el => el === document.querySelector('canvas')), true);
    assert.ok(await page.locator('#brief-roaming-external-audio').evaluate(el => el.currentTime) >= audioTime, 'Refinement preserves music during translation');
    for (const [width, height] of [[390,844], [320,667], [414,844], [1280,900]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(1700);
      const input = await page.getByRole('textbox').boundingBox();
      assert.ok(input.x >= 0 && input.x + input.width <= width && input.y + input.height <= height + 1);
      await page.screenshot({ path: `tests/spirit-sky-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.atmosphere-meteors i').evaluateAll(els => els.forEach(el => {
      const a = el.getAnimations()[0], timing = a.effect.getTiming();
      a.pause(); a.currentTime = Number(timing.duration) * .84 + timing.delay;
    }));
    assert.ok(await page.locator('.atmosphere-meteors i').first().evaluate(el => Number(getComputedStyle(el).opacity) > .1), 'Occasional meteor has a visible soft streak');
    await page.screenshot({ path: 'tests/spirit-sky-meteor.png' });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(600);
    assert.equal(await page.locator('.atmosphere-meteors').isVisible(), false);
    assert.ok(await atmosphere.locator('i, .atmosphere-mist').evaluateAll(els => els.every(el => getComputedStyle(el).animationName === 'none')));
    const still = await view(); await page.waitForTimeout(600);
    assert.deepEqual((await view()).scale, still.scale, 'Reduced motion freezes breathing');
    await b('[ Stand Up ]').click(); await b(en.exitGuide.confirm).click(); await b(en.ROAMING_COPY.leaveButton).click();
    assert.equal(await atmosphere.count(), 0, 'Decorations are removed outside the planet screen');
    assert.ok(await page.evaluate(() => window.__plushDisposed && window.__glowDisposed), 'Plush and glow textures are released on exit');
    assert.deepEqual(errors, []);
    console.log('PASS: no hard outline, plush 3D material/contact shadow, calm seated breathing with fixed position, sparse layered sky, mobile controls, music/language continuity, reduced motion and texture disposal.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
