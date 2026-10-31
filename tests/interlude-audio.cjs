const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { approach } = require('./navigation.cjs');

(async () => {
  const { translations: { en, zh } } = await import(pathToFileURL(path.resolve('src/i18n/translations.ts')));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const base = process.env.APP_URL || 'http://127.0.0.1:3001';
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
    await page.route(/\/src\/audio\/introVoice\.ts(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const INTRO_VOICE_URLS = {en: null, zh: null};' }));
    page.on('pageerror', e => errors.push(e.message));
    const requests = [];
    page.on('request', r => { if (/voice_.*mp3/.test(r.url())) requests.push(r.url()); });
    await page.addInitScript(() => {
      window.__speechLog = [];
      let current = null;
      const synth = {
        getVoices: () => [{ name: 'Samantha', lang: 'en-US', localService: true }, { name: 'Xiaoxiao', lang: 'zh-CN', localService: true }],
        speak: utterance => {
          current = utterance;
          window.__speechLog.push({ type: 'speak', lang: utterance.lang, at: performance.now() });
          setTimeout(() => { if (current === utterance) utterance.onend?.(); }, 1000);
        },
        cancel: () => { current = null; window.__speechLog.push({ type: 'cancel' }); },
        addEventListener() {}, removeEventListener() {},
      };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (text) { this.text = text; } });
    });
    const button = text => page.getByRole('button', { name: text, exact: true });
    await page.goto(base);
    assert.equal(await page.getByText(en.title, { exact: true }).count(), 1);
    assert.equal(await page.getByText(en.INTRO_COPY.welcome, { exact: true }).count(), 0, 'Cover has no long copy');
    assert.equal(await page.locator('.animate-spirit-breathe').count(), 0, 'No early companion');
    await page.screenshot({ path: 'tests/aura-cover.png' });
    const began = await page.evaluate(() => performance.now());
    await button(en.INTRO_COPY.startButton).click();
    assert.equal(await page.locator('.headphone-ripple').count(), 3);
    assert.equal(await page.locator('#intro-voice-en').getAttribute('src'), null);
    await page.waitForFunction(() => window.__speechLog.some(e => e.type === 'speak'));
    const first = await page.evaluate(() => window.__speechLog.find(e => e.type === 'speak'));
    assert.equal(first.lang, 'en-US', 'English default even with Chinese browser locale');
    assert.ok(first.at - began >= 450, 'Narration waits for entry');
    const subtitle = page.locator('.interlude-first');
    const animationTime = await subtitle.evaluate(el => el.getAnimations()[0].currentTime);
    await button('中文').click();
    await page.waitForFunction(() => window.__speechLog.filter(e => e.type === 'speak').length === 2);
    const spoken = await page.evaluate(() => window.__speechLog.filter(e => e.type === 'speak').map(e => e.lang));
    assert.deepEqual(spoken, ['en-US', 'zh-CN'], 'Only selected-language speech plays');
    assert.ok(await subtitle.evaluate(el => el.getAnimations()[0].currentTime) >= animationTime, 'Subtitle animation does not restart on language change');
    assert.equal(await subtitle.innerText(), zh.interlude.firstLine);
    await page.waitForTimeout(4300);
    await page.screenshot({ path: 'tests/headphone-interlude-zh.png' });
    assert.equal(await page.locator('main').getAttribute('data-act'), 'interlude', 'Voice end does not auto-advance');
    await page.locator('.interlude-scene').click({ position: { x: 12, y: 12 } });
    await page.locator('.quiz-scene').waitFor();
    await button(zh.back).click();
    await button(zh.interlude.ready).click();
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => window.__speechLog.filter(e => e.type === 'speak').length), 2, 'Quick continue cancels pending narration');
    assert.deepEqual(requests, [], 'Unset voice recordings create no 404 requests');
    await page.close();

    const silent = await browser.newPage({ viewport: { width: 320, height: 667 }, reducedMotion: 'reduce' });
    await silent.route(/\/src\/audio\/introVoice\.ts(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const INTRO_VOICE_URLS = {en: null, zh: null};' }));
    silent.on('pageerror', e => errors.push(e.message));
    await silent.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }); });
    await silent.goto(base);
    await silent.getByRole('button', { name: en.INTRO_COPY.startButton, exact: true }).click();
    await silent.screenshot({ path: 'tests/headphone-interlude-320.png' });
    assert.equal(await silent.locator('.headphone-icon').evaluate(el => getComputedStyle(el).animationName), 'none');
    await silent.getByRole('button', { name: en.interlude.ready, exact: true }).click();
    await silent.locator('.quiz-scene').waitFor();
    await silent.close();
    console.log('PASS: minimal cover, delayed and selected-language narration, staggered subtitles, language continuity, blank-tap continue, quick skip, missing recordings and reduced motion.');

    const tracks = [
      ['OMEGA_01', [0,0,0], 'omega-01-copper-afternoon.mp3'],
      ['DELTA_02', [1,1,1], 'delta-02-sunlight-on-the-moss.mp3'],
      ['SIGMA_03', [2,2,2], 'sigma-03-midday-horizon.mp3'],
      ['PSI_04', [0,1,2], 'psi-04-last-active-sensor.mp3'],
    ];
    for (const [planet, answers, filename] of tracks) {
      const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await p.addInitScript(() => {
        const create = AudioContext.prototype.createMediaElementSource;
        AudioContext.prototype.createMediaElementSource = function (element) {
          const source = create.call(this, element), connect = source.connect.bind(source);
          source.connect = destination => { if (element.id === 'brief-roaming-external-audio') window.__trackGain = destination.gain; return connect(destination); };
          return source;
        };
      });
      p.on('pageerror', e => errors.push(e.message));
      const b = name => p.getByRole('button', { name, exact: true });
      await p.goto(base);
      await b(en.INTRO_COPY.startButton).click(); await b(en.interlude.ready).click();
      for (let i = 0; i < 3; i++) await b(en.QUIZ_QUESTIONS[i].options[answers[i]].label).click();
      await b(en.planetGuide.confirm).click();
      assert.equal(await p.locator('#brief-roaming-external-audio').getAttribute('src'), null, 'No planet melody before sitting');
      await p.evaluate(() => {
        const el = document.querySelector('canvas').parentElement;
        let fiber = el[Object.keys(el).find(k => k.startsWith('__reactFiber'))];
        while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
        let hook = fiber.memoizedState;
        while (hook && !hook.memoizedState?.current?.renderer) hook = hook.next;
        const renderer = hook.memoizedState.current.renderer;
        const render = renderer.render.bind(renderer);
        renderer.render = (scene, camera) => { render(scene, camera); window.__scene = scene; window.__camera = camera; };
        window.__measure = () => {
          const body = __scene.getObjectByName('spirit-body').children[0];
          const positions = body.geometry.attributes.position;
          const xs = [];
          for (let i = 0; i < positions.count; i++) xs.push(body.position.clone().fromBufferAttribute(positions, i).applyMatrix4(body.matrixWorld).project(__camera).x);
          const rect = renderer.domElement.getBoundingClientRect();
          return { bodyWidth: (Math.max(...xs) - Math.min(...xs)) * rect.width / 2, height: rect.height };
        };
      });
      await approach(p, 'listening-stone', '[ Sit & Listen ]');
      await p.waitForTimeout(1600);
      const walking = await p.evaluate(() => window.__measure());
      await b('[ Sit & Listen ]').click();
      await p.waitForFunction(() => { const a = document.querySelector('#brief-roaming-external-audio'); return !a.paused && a.currentTime > .05 && window.__trackGain; });
      const initialGain = await p.evaluate(() => window.__trackGain.value);
      await p.waitForTimeout(650);
      const growingGain = await p.evaluate(() => window.__trackGain.value);
      assert.ok(initialGain >= 0 && initialGain < growingGain && growingGain < .9, 'Sitting increases music gradually instead of jumping to full volume');
      await p.getByRole('textbox').waitFor();
      await p.waitForFunction(name => { const a = document.querySelector('#brief-roaming-external-audio'); return a.src.endsWith(name) && a.readyState >= 3 && !a.paused && a.currentTime > .1; }, filename);
      const media = await p.locator('#brief-roaming-external-audio').evaluate(a => ({ src: a.src, loop: a.loop, duration: a.duration, time: a.currentTime }));
      assert.ok(media.duration > 5 && media.loop, 'MP3 decodes and loops');
      await b('中文').click(); await p.waitForTimeout(300); await b('EN').click();
      assert.ok(await p.locator('#brief-roaming-external-audio').evaluate(a => a.currentTime) > media.time, 'Language does not restart MP3');
      await p.waitForFunction(() => {
        const canvas = document.querySelector('canvas');
        return Math.abs(canvas.getBoundingClientRect().height - canvas.parentElement.getBoundingClientRect().height) < 1;
      });
      const resting = await p.evaluate(() => window.__measure());
      const heightDifference = resting.height - walking.height;
      for (const [width, height] of [[390,844], [320,667], [414,667], [1280,900]]) {
        await p.setViewportSize({ width, height });
        await p.waitForTimeout(2800);
        const view = await p.evaluate(() => window.__measure());
        const referenceWidth = walking.bodyWidth * (view.height - heightDifference) / walking.height;
        const ratio = view.bodyWidth / referenceWidth;
        assert.ok(ratio >= 1.25 && ratio <= 1.4, `${planet} ${width}: bounded 1.3x zoom, got ${ratio}`);
        await p.screenshot({ path: `tests/focus-${planet}-${width}.png` });
      }
      await p.locator('#brief-roaming-external-audio').evaluate(a => { a.currentTime = a.duration - .25; });
      await p.waitForFunction(() => document.querySelector('#brief-roaming-external-audio').currentTime < 1, null, { timeout: 7000 });
      assert.equal(await p.locator('#brief-roaming-external-audio').evaluate(a => a.paused), false, 'Actual end-of-track loop continues');
      await b('[ Stand Up ]').click();
      await b(en.exitGuide.confirm).click();
      await b('[ Sit & Listen ]').click();
      await p.waitForTimeout(1600);
      assert.equal(await p.locator('#brief-roaming-external-audio').evaluate(a => a.paused), false, 'Old fade does not pause a quick re-sit');
      await b('[ Stand Up ]').click();
      await p.waitForTimeout(300);
      const gainEarly = await p.evaluate(() => window.__trackGain.value);
      assert.equal(await p.locator('#brief-roaming-external-audio').evaluate(a => a.paused), false, 'Music keeps playing during its fade-out');
      await p.waitForTimeout(700);
      const gainLater = await p.evaluate(() => window.__trackGain.value);
      assert.ok(gainEarly > gainLater && gainLater > 0, 'Music gradually gets quieter before stopping');
      await p.waitForTimeout(1500);
      assert.equal(await p.locator('#brief-roaming-external-audio').evaluate(a => a.paused), true, 'Standing finishes the fade and pauses playback');
      await p.close();
      console.log(`PASS: ${planet} real MP3, loop, language continuity, rapid re-sit and zoom at four sizes`);
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
