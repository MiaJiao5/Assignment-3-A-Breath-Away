const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { advanceFluffyGait, FLUFFY_STEP_DISTANCE } = require('../src/animation/fluffyGait.ts');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { installFootstepCapture } = require('./footstep-fixture.cjs');
const { completeQuiz, approach, installNavigation } = require('./navigation.cjs');
const { translations: { en } } = require('../src/i18n/translations.ts');

(async () => {
  for (const fps of [12, 30, 60]) for (const speed of [.3, 1, 2.1]) {
    let phase = 0; const contacts = [];
    for (let frame = 0; frame < fps * 6; frame++) {
      const next = advanceFluffyGait(phase, speed / fps); phase = next.phase;
      if (next.landing) {
        contacts.push(next.landing);
        assert.ok(Math.abs(Math.sin(next.posePhase)) < 1e-12, 'Every contact is rendered on the ground');
      }
    }
    assert.equal(contacts.length, Math.floor(speed * 6 / FLUFFY_STEP_DISTANCE), 'Cadence follows travel, independently of frame rate');
    contacts.forEach((foot, i) => assert.equal(foot, i % 2 ? 'right' : 'left'));
    assert.equal(advanceFluffyGait(phase, 0).landing, null);
    assert.equal(advanceFluffyGait(phase, 0).phase, phase, 'Stopping does not advance a separate clock');
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const base = process.env.APP_URL || 'http://127.0.0.1:3001';
    const offlinePage = await browser.newPage();
    await offlinePage.goto(base);
    const rendered = await offlinePage.evaluate(async () => {
      const { FluffyFootsteps } = await import('/src/audio/fluffyFootsteps.ts');
      const ctx = new OfflineAudioContext(2, 48000 * 3, 48000);
      const synth = new FluffyFootsteps(ctx, ctx.destination);
      const times = Array.from({ length: 8 }, (_, i) => .1 + i * .32);
      times.forEach((time, i) => synth.play(i % 2 ? 'right' : 'left', 1.6, time));
      const audio = await ctx.startRendering();
      const channels = [audio.getChannelData(0), audio.getChannelData(1)];
      return { voices: synth.voices.size, windows: times.map((time, i) => {
        const from = Math.round(time * audio.sampleRate), to = from + Math.round(.13 * audio.sampleRate);
        let peak = 0, delta = 0; const energy = [0, 0];
        for (let c = 0; c < 2; c++) for (let n = from; n < to; n++) {
          peak = Math.max(peak, Math.abs(channels[c][n])); energy[c] += channels[c][n] ** 2;
          if (n > from) delta = Math.max(delta, Math.abs(channels[c][n] - channels[c][n - 1]));
        }
        const tail = channels.every(ch => ch.slice(to, from + Math.round(.3 * audio.sampleRate)).every(x => Math.abs(x) < 1e-7));
        return { foot: i % 2 ? 'right' : 'left', peak, delta, energy, tail };
      }) };
    });
    assert.equal(rendered.voices, 0, 'Ended nodes are cleaned up');
    rendered.windows.forEach(w => {
      assert.ok(w.peak > .002 && w.peak < .08, 'Impacts remain quiet with generous headroom');
      assert.ok(w.delta < .01 && w.tail, `Smooth transients finish within 130ms, with no repeating tail: ${JSON.stringify(w)}`);
      assert.ok(w.foot === 'left' ? w.energy[0] > w.energy[1] : w.energy[1] > w.energy[0], 'Alternating stereo placement is subtle and correct');
    });
    assert.ok(new Set(rendered.windows.map(w => w.peak.toFixed(6))).size > 4, 'Natural per-contact variation');
    await offlinePage.close();
    console.log('PASS: distance-driven gait at three frame rates and speeds; original offline audio, smooth quiet transients, stereo variation, short tails and node cleanup.');

    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    const errors = [], recordings = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/\/audio\/footsteps\.mp3/.test(r.url())) recordings.push(r.url()); });
    const b = name => page.getByRole('button', { name, exact: true });
    await installControlledNarration(page); await page.goto(base);
    await b(en.INTRO_COPY.startButton).click();
    await page.waitForFunction(() => window.__introUtterance); await page.evaluate(() => window.__finishIntro());
    await b(en.interlude.ready).click(); await completeQuiz(page);
    await b(en.planetGuide.confirm).waitFor(); await installFootstepCapture(page);
    await page.keyboard.press('KeyD');
    assert.equal(await page.evaluate(() => window.__footsteps.length), 0, 'Guide blocks footsteps');
    await b(en.planetGuide.confirm).click(); await installNavigation(page);
    const count = () => page.evaluate(() => window.__footsteps.length);
    const quiet = async label => {
      const n = await count(); await page.waitForTimeout(350);
      assert.equal(await count(), n, label);
      assert.equal(await page.evaluate(() => window.__footstepEngine.footstepSynth?.voices.size || 0), 0, 'Stopped voices release their nodes');
    };
    const pad = await page.locator('.wandering-joystick').boundingBox();
    const x = pad.x + pad.width / 2, y = pad.y + pad.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 11, y);
    await page.waitForFunction(() => window.__footsteps.length >= 4);
    await page.mouse.up(); await quiet('Release immediately stops new landings');
    const slow = await page.evaluate(() => window.__footsteps.slice());
    const beforeFast = await count(); await page.keyboard.down('KeyD');
    await page.waitForFunction(n => window.__footsteps.length >= n + 6, beforeFast);
    await b('中文').click(); await b('EN').click();
    const fast = await page.evaluate(n => window.__footsteps.slice(n), beforeFast);
    await page.keyboard.up('KeyD'); await quiet('Stopping leaves no fixed audio loop');
    const meanInterval = events => events.slice(1).reduce((sum, e, i) => sum + e.time - events[i].time, 0) / (events.length - 1);
    assert.ok(meanInterval(fast) < meanInterval(slow) * .8, 'Faster real input produces faster contacts');
    assert.ok(fast.reduce((s,e)=>s+e.speed,0)/fast.length > slow.reduce((s,e)=>s+e.speed,0)/slow.length, 'Cadence uses accepted movement speed');

    await page.keyboard.down('KeyD'); await page.waitForTimeout(400);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await quiet('Hidden pages generate no footsteps');
    await page.keyboard.up('KeyD');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.keyboard.down('KeyD'); await page.waitForTimeout(300);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await quiet('Window blur clears held movement and sound'); await page.keyboard.up('KeyD');

    await approach(page, 'listening-stone', '[ Sit & Listen ]');
    const stoneDirection = await page.evaluate(() => {
      const root = window.__navScene.getObjectByName('spirit-surface-root');
      const stone = window.__navScene.getObjectByName('listening-stone');
      const v = stone.position.clone().normalize().applyQuaternion(root.quaternion.clone().invert());
      const length = Math.hypot(v.x, v.z / .75); return [v.x / length, v.z / .75 / length];
    });
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + stoneDirection[0] * 28, y + stoneDirection[1] * 28);
    await page.waitForTimeout(1400); await quiet('Pressing against the stone does not march or make footfalls');
    await page.mouse.up();
    await b('[ Sit & Listen ]').click();
    await page.keyboard.press('KeyD'); await quiet('Listening cancels footsteps');
    const steps = await page.evaluate(() => window.__footsteps);
    steps.forEach((s, i) => {
      if (i) assert.notEqual(s.foot, steps[i - 1].foot, 'Left/right order survives stops and language changes');
      assert.ok(Math.abs(s.leftY - .045) < 1e-6 && Math.abs(s.rightY - .045) < 1e-6 && Math.abs(s.bodyY) < 1e-6, 'Every audible contact coincides with the rendered landing pose');
    });
    assert.equal(await page.locator('#walking-footsteps').count(), 0);
    assert.deepEqual(recordings, []); assert.deepEqual(errors, []);
    console.log('PASS: actual two-foot contacts, analog/keyboard speed, alternating feet, language continuity, release/blur/visibility/collision/rest silence, and zero recording requests.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
