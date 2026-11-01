const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { approach, installNavigation, completeQuiz } = require('./navigation.cjs');
const { installFootstepCapture } = require('./footstep-fixture.cjs');

(async () => {
  const { PLANETS } = await import(pathToFileURL(path.resolve('src/data/roamingData.ts')));
  const { STAR_MESSAGES } = await import(pathToFileURL(path.resolve('src/data/starMessages.ts')));
  const { translations: {en,zh} } = await import(pathToFileURL(path.resolve('src/i18n/translations.ts')));
  const expected = {
    OMEGA_01: { angles: [25,80,145,210,275,330], stone: 55, portal: 180 },
    DELTA_02: { angles: [15,65,125,190,245,305], stone: 95, portal: 220 },
    SIGMA_03: { angles: [40,115,175,250,315], stone: 75, portal: 145 },
    PSI_04: { angles: [10,70,135,200,265,325], stone: 105, portal: 295 },
  };
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const b = name => page.getByRole('button', { name, exact: true });
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
    await page.evaluate(()=>{
      window.__helpOpenCounts={planet:0,exit:0};let planet=false,exit=false;
      new MutationObserver(()=>{
        const nextPlanet=!!document.querySelector('.planet-instructions');
        const nextExit=!!document.querySelector('.exit-guide-card');
        if(nextPlanet&&!planet)window.__helpOpenCounts.planet++;
        if(nextExit&&!exit)window.__helpOpenCounts.exit++;
        planet=nextPlanet;exit=nextExit;
      }).observe(document.body,{childList:true,subtree:true});
    });
    await b('Begin Your Little Escape').click(); await b("I'm Ready →").click();
    await completeQuiz(page);
    await b(/^Got It,/).waitFor();
    await installFootstepCapture(page);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(450); await page.keyboard.up('ArrowRight');
    assert.equal(await page.evaluate(() => window.__footsteps.length), 0, 'Instructions block walking sounds as well as movement');
    await b(/^Got It,/).click();
    await installNavigation(page);
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => window.__footsteps.length >= 2);
    await b('中文').click(); await b('EN').click();
    await page.keyboard.up('ArrowLeft');
    const released = await page.evaluate(() => window.__footsteps.length);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => window.__footsteps.length), released, 'Release stops new contacts immediately');
    const seen = [], types = new Set();
    for (let visit = 0; visit < 4; visit++) {
      await page.waitForFunction(() => window.__navScene.getObjectByName('interactive-garden').userData.pendingTextures === 0);
      const snapshot = await page.evaluate(() => {
        const garden = window.__navScene.getObjectByName('interactive-garden');
        const angle = object => (Math.atan2(object.position.x, object.position.y) * 180 / Math.PI + 360) % 360;
        return {
          id: garden.userData.planetId,
          props: garden.children.filter(o => o.name.startsWith('garden-cluster-')).map(o => ({ type: o.userData.propType, angle: o.userData.angle, loaded: o.children[0].children[0].material.map.image?.naturalWidth > 0 })),
          stone: angle(window.__navScene.getObjectByName('listening-stone')),
          portal: angle(window.__navScene.getObjectByName('portal-landmark')),
        };
      });
      assert.ok(!seen.includes(snapshot.id), 'Travel selects an unvisited planet');
      seen.push(snapshot.id);
      assert.deepEqual(snapshot.props.map(p => p.angle), expected[snapshot.id].angles, 'Rendered positions match requested degree distribution');
      assert.deepEqual(snapshot.props.map(p => p.type), PLANETS[snapshot.id].props.map(p => p.type), 'Current biome configuration is rendered');
      assert.ok(snapshot.props.every(p => p.loaded), 'All SVG illustrations load');
      for (const type of new Set(snapshot.props.map(p => p.type))) { assert.ok(!types.has(type), 'No plant silhouette is reused between biomes'); types.add(type); }
      assert.ok(Math.abs(snapshot.stone - expected[snapshot.id].stone) < .00001);
      assert.ok(Math.abs(snapshot.portal - expected[snapshot.id].portal) < .00001);
      await page.locator('.stardust-thought').waitFor();
      const thought = await page.locator('.stardust-thought').elementHandle();
      assert.equal(await thought.getAttribute('data-planet-id'), snapshot.id);
      const messageId = await thought.getAttribute('data-message-id');
      const message = STAR_MESSAGES[snapshot.id].find(m => m.id === messageId);
      assert.ok(message, 'The actual scene displays only its own messages');
      assert.equal(await thought.$eval('.bilingual-current', el => el.textContent), message.en);
      await page.evaluate(() => { window.__gardenBeforeLanguage = window.__navScene.getObjectByName('interactive-garden'); });
      await b('中文').click();
      assert.equal(await thought.$eval('.bilingual-current', el => el.textContent), message.zh);
      await b('EN').click();
      assert.equal(await thought.$eval('.bilingual-current', el => el.textContent), message.en);
      assert.equal(await page.evaluate(() => window.__gardenBeforeLanguage === window.__navScene.getObjectByName('interactive-garden')), true, 'Language switching preserves the biome and interaction state');
      await page.screenshot({ path: `tests/biome-${snapshot.id}.png` });
      // Visit the real portal first, before resting on this particular planet.
      // Global Leave access from a previous planet must not unlock this one.
      await approach(page, 'portal-landmark', () => {
        const root = window.__navScene.getObjectByName('spirit-surface-root');
        const portal = window.__navScene.getObjectByName('portal-landmark');
        return root.position.clone().normalize().angleTo(portal.position.clone().normalize()) < .4;
      });
      assert.equal(await b('[ Enter Portal ]').count(), 0, 'No portal action before resting on the current planet');
      // The spring may take a moment to settle after releasing the joystick.
      await page.waitForTimeout(450);
      const stoppedSteps = await page.evaluate(() => window.__footsteps.length);
      await page.waitForTimeout(650);
      assert.equal(await page.evaluate(() => window.__footsteps.length), stoppedSteps, 'Footsteps stop when actual movement stops');
      assert.equal(await page.evaluate(() => window.__footstepEngine.footstepSynth?.voices.size || 0), 0);
      assert.equal(await page.locator('.rest-action').isDisabled(), true, 'Locked portal cannot be activated with keyboard or pointer');
      assert.equal(await page.evaluate(() => window.__navScene.getObjectByName('listening-beacon').parent.name), 'listening-stone', 'Guidance still points to the stone before resting');
      await b('中文').click();
      assert.equal(await b(`[ ${zh.portalDiscovery.enter} ]`).count(), 0, 'Chinese interface also keeps the portal locked');
      await b('EN').click();
      await approach(page, 'listening-stone', '[ Sit & Listen ]');
      // A transfer can place the companion beside the portal already; the
      // subsequent walk to the separate stone guarantees actual movement.
      assert.ok(await page.evaluate(id => window.__footsteps.some(step => step.id === id), snapshot.id), 'Actual walking produces footsteps for this planet');
      await b('[ Sit & Listen ]').click();
      const seatedSteps = await page.evaluate(() => window.__footsteps.length);
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
      assert.equal(await page.evaluate(() => window.__footsteps.length), seatedSteps, 'Sitting remains silent even if a direction is pressed');
      assert.equal(await page.evaluate(() => window.__footstepEngine.footstepSynth?.voices.size || 0), 0);
      assert.equal(await b(en.ROAMING_COPY.leaveButton).count(),visit===0?0:1,'Leave stays unlocked on later planets, including while seated');
      assert.equal(await page.locator('.atmosphere-meteors[data-listening="true"] i').count(), 4, 'Every listening planet has a sparse meteor shower');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const meteorMotion = await page.locator('.atmosphere-meteors i').evaluateAll(elements => elements.map(el => {
        const animation = el.getAnimations()[0], timing = animation.effect.getTiming();
        animation.pause(); animation.currentTime = Number(timing.duration) * .08 + timing.delay;
        const from = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        animation.currentTime = Number(timing.duration) * .18 + timing.delay;
        const to = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return [to.m41 - from.m41, to.m42 - from.m42, Number(getComputedStyle(el).opacity)];
      }));
      meteorMotion.forEach(([x, y, opacity]) => assert.ok(x > 0 && y > 0 && opacity > .1, 'Visible streaks fall from upper-left to lower-right'));
      await page.screenshot({ path: `tests/listening-meteors-${snapshot.id}.png` });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.atmosphere-meteors').isVisible(), false, 'Reduced motion hides the shower');
      await b('[ Stand Up ]').click();
      if(visit===0){
        await page.getByRole('dialog',{name:en.exitGuide.title}).waitFor();
        await b('中文').click();await b(zh.ROAMING_COPY.leaveButton).waitFor();
        await page.getByRole('dialog',{name:zh.exitGuide.title}).waitFor();
        await b('EN').click();await b(en.exitGuide.confirm).click();
        // A second rest on the same planet must not open another exit guide.
        await b('[ Sit & Listen ]').click();await b(en.ROAMING_COPY.leaveButton).waitFor();
        await b('[ Stand Up ]').click();
      }
      assert.equal(await page.locator('.exit-guide-card').count(),0,'Exit guidance appears only after the first Stand Up of the journey');
      await b(en.ROAMING_COPY.leaveButton).waitFor();
      const controls = await page.evaluate(() => {
        const leave = getComputedStyle(document.querySelector('.leave-control'));
        const language = getComputedStyle(document.querySelector('.language-toggle'));
        return { leaveBg: leave.backgroundColor, langBg: language.backgroundColor, blur: leave.backdropFilter, border: leave.borderStyle, color: leave.color };
      });
      assert.equal(controls.leaveBg, controls.langBg, 'Top-left and top-right glass backgrounds match');
      assert.equal(controls.blur, 'blur(10px)'); assert.equal(controls.border, 'none');
      assert.equal(controls.color, 'rgba(255, 255, 255, 0.85)');
      await approach(page, 'portal-landmark', '[ Enter Portal ]');
      assert.equal(await page.evaluate(() => window.__navScene.getObjectByName('listening-beacon').parent.name), 'portal-landmark', 'After resting, guidance leads to the unlocked portal');
      await page.screenshot({ path: `tests/portal-unlocked-${snapshot.id}.png` });
      if (visit === 3) break;
      await page.evaluate(() => {
        window.__oldCanvas = document.querySelector('canvas');
        window.__oldGarden = window.__navScene.getObjectByName('interactive-garden');
        window.__disposedArt = 0;
        window.__oldGarden.traverse(o => { if (o.material?.map) o.material.map.addEventListener('dispose', () => window.__disposedArt++); });
      });
      await b('[ Enter Portal ]').click();
      await b(en.ROAMING_COPY.leaveButton).waitFor();
      const spin = b('Find My Next Planet');
      // The last remaining planet skips the lottery.
      if (visit < 2) { await spin.waitFor(); await spin.click(); }
      await page.locator('.portal-discovery-overlay').waitFor({state:'hidden'});
      await page.waitForFunction(()=>window.__oldGarden!==window.__navScene.getObjectByName('interactive-garden'));
      assert.equal(await page.locator('.planet-instructions').count(),0,'Transfers never repeat the initial planet guide');
      await page.locator('.wandering-joystick').waitFor({state:'visible'});
      await b(en.ROAMING_COPY.leaveButton).waitFor();
      assert.equal(await page.evaluate(() => window.__oldCanvas === document.querySelector('canvas')), true, 'Travel updates ecology without recreating WebGL');
      assert.equal(await page.evaluate(() => window.__oldGarden === window.__navScene.getObjectByName('interactive-garden')), false, 'Old biome is replaced');
      assert.ok(await page.evaluate(() => window.__disposedArt) > 0, 'Old SVG textures are disposed');
      console.log(`PASS: ${snapshot.id} biome, configured landmarks, glass exit and in-place travel`);
    }
    assert.equal(seen.length, 4); assert.equal(types.size, 12);
    const steps = await page.evaluate(() => window.__footsteps);
    assert.equal(new Set(steps.map(step => step.id)).size, 4, 'All four planets have movement sounds');
    steps.forEach((step, i) => {
      assert.ok(step.speed > .035 && (step.foot === 'left' || step.foot === 'right'));
      assert.ok(Math.abs(step.leftY - .045) < 1e-6 && Math.abs(step.rightY - .045) < 1e-6, 'Audible events coincide with foot contacts');
      if (i) assert.notEqual(step.foot, steps[i - 1].foot, 'Feet alternate through language changes and planet transfers');
    });
    assert.equal(await page.locator('#walking-footsteps').count(), 0, 'No recording loop remains');
    assert.deepEqual(await page.evaluate(()=>window.__helpOpenCounts),{planet:1,exit:1},'Each guide opens once across all four planets and repeated rests');
    await b(en.ROAMING_COPY.leaveButton).click();await b(en.another).click();
    await page.locator('.portal-discovery-overlay[data-phase="complete"]').waitFor();
    await b(en.portalDiscovery.resetRoute).click();
    await page.locator('.portal-discovery-overlay[data-phase="ready"]').waitFor();
    await b(en.ROAMING_COPY.leaveButton).waitFor();await b(en.stay).click();
    assert.deepEqual(await page.evaluate(()=>window.__helpOpenCounts),{planet:1,exit:1},'A new planet circuit does not reset guidance or exit access');
    assert.deepEqual(errors, []);
    console.log('PASS: original alternating foot-contact synthesis on all four planets, shared animation timing, language continuity, release/rest/panel silence, portal locks and safe transfers.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
