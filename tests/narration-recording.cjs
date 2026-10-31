const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const base = process.env.APP_URL || 'http://127.0.0.1:3001';
  const errors = [];
  try {
    const actual = await browser.newPage({ viewport: { width: 320, height: 667 } });
    actual.on('pageerror', e => errors.push(e.message));
    await actual.addInitScript(() => {
      window.__speechFallbacks = 0;
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (text) { this.text = text; } });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], addEventListener() {}, removeEventListener() {}, cancel() {},
        speak: () => { window.__speechFallbacks++; },
      } });
    });
    await actual.goto(base);
    await actual.getByRole('button', { name: 'Begin Your Little Escape', exact: true }).click();
    await actual.waitForFunction(() => { const a = document.getElementById('intro-voice-en'); return a.src.endsWith('intro-voice-en.wav') && a.readyState >= 3 && a.currentTime > .1 && !a.paused; });
    assert.equal(await actual.locator('#intro-voice-zh').getAttribute('src'), null, 'Only the selected language is loaded initially');
    await actual.getByRole('button', { name: '中文', exact: true }).click();
    await actual.waitForFunction(() => { const a = document.getElementById('intro-voice-zh'); return a.src.endsWith('intro-voice-zh.mp3') && a.readyState >= 3 && a.currentTime > .1 && !a.paused; });
    assert.equal(await actual.locator('#intro-voice-en').evaluate(a => a.paused), true);
    assert.equal(await actual.evaluate(() => window.__speechFallbacks), 0, 'Owner recordings replace system speech');
    await actual.getByRole('button', { name: '准备好了 →', exact: true }).click();
    assert.equal(await actual.locator('#intro-voice-zh').evaluate(a => a.paused), true);
    const spacing = await actual.locator('.quiz-options').evaluate(el => ({ gap: parseFloat(getComputedStyle(el).rowGap), bottom: el.getBoundingClientRect().bottom, viewport: innerHeight }));
    assert.equal(spacing.gap, 20, 'Quiz options have more breathing room');
    assert.ok(spacing.bottom < spacing.viewport, 'Spaced options fit a narrow phone');
    await actual.waitForTimeout(550);
    await actual.screenshot({ path: 'tests/quiz-spacing-320-zh.png' });
    await actual.close();
    console.log('PASS: actual supplied English WAV / Chinese MP3 replace system narration, selected-language playback and 20px quiz spacing.');

    // Existing music files are fixtures for optional recording playback, not
    // production narration. Route only the voice URL configuration in this page.
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/\/src\/audio\/introVoice\.ts(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const INTRO_VOICE_URLS = { en: "/audio/omega-01-copper-afternoon.mp3", zh: "/audio/delta-02-sunlight-on-the-moss.mp3" };' }));
    await page.addInitScript(() => {
      window.__sources = {};
      window.__voiceGains = {};
      const create = AudioContext.prototype.createMediaElementSource;
      AudioContext.prototype.createMediaElementSource = function (element) {
        window.__sources[element.id] = (window.__sources[element.id] || 0) + 1;
        const source = create.call(this, element);
        const connect = source.connect.bind(source);
        source.connect = destination => {
          if (element.id.startsWith('intro-voice-')) window.__voiceGains[element.id] = destination.gain;
          return connect(destination);
        };
        return source;
      };
    });
    const b = name => page.getByRole('button', { name, exact: true });
    await page.goto(base);
    await b('Begin Your Little Escape').click();
    await page.waitForFunction(() => { const a = document.getElementById('intro-voice-en'); return a.currentTime > .1 && !a.paused; });
    const rising = await page.evaluate(() => window.__voiceGains['intro-voice-en'].value);
    assert.ok(rising > 0 && rising < .8, 'Recorded voice fades in through GainNode');
    await page.waitForTimeout(1600);
    assert.ok(await page.evaluate(() => window.__voiceGains['intro-voice-en'].value) > .79, 'Voice reaches its gentle target gain');
    await b('中文').click();
    await page.waitForFunction(() => !document.getElementById('intro-voice-zh').paused && document.getElementById('intro-voice-zh').currentTime > .1);
    assert.equal(await page.locator('#intro-voice-en').evaluate(a => a.paused), true, 'Old language recording stops');
    await b('EN').click();
    await page.waitForFunction(() => !document.getElementById('intro-voice-en').paused && document.getElementById('intro-voice-en').currentTime > .1);
    assert.equal(await page.locator('#intro-voice-zh').evaluate(a => a.paused), true);
    assert.deepEqual(await page.evaluate(() => window.__sources), { 'intro-voice-en': 1, 'intro-voice-zh': 1 }, 'Media sources are reused when returning to a language');
    await b("I'm Ready →").click();
    assert.equal(await page.locator('#intro-voice-en').evaluate(a => a.paused), true);
    await b('Back').click();
    await b("I'm Ready →").click();
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#intro-voice-en').evaluate(a => a.paused), true, 'Quick continue leaves no late playback');
    await page.close();

    const unavailable = await browser.newPage({ reducedMotion: 'reduce' });
    await unavailable.route(/\/src\/audio\/introVoice\.ts(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const INTRO_VOICE_URLS = {en: null, zh: null};' }));
    unavailable.on('pageerror', e => errors.push(e.message));
    await unavailable.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }));
    await unavailable.goto(base);
    await unavailable.getByRole('button', { name: 'Begin Your Little Escape', exact: true }).click();
    await unavailable.waitForTimeout(6800);
    await unavailable.locator('.interlude-scene').click({ position: { x: 12, y: 12 } });
    await unavailable.locator('.quiz-scene').waitFor();
    await unavailable.close();

    const failure = await browser.newPage();
    failure.on('pageerror', e => errors.push(e.message));
    await failure.route(/\/src\/audio\/introVoice\.ts(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const INTRO_VOICE_URLS = { en: "/audio/voice_en.mp3", zh: null };' }));
    await failure.route('**/audio/voice_en.mp3', route => route.abort('failed'));
    await failure.addInitScript(() => {
      window.__fallbackCount = 0;
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (text) { this.text = text; } });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [], addEventListener() {}, removeEventListener() {}, cancel() {},
        speak: () => { window.__fallbackCount++; },
      } });
    });
    await failure.goto(base);
    await failure.getByRole('button', { name: 'Begin Your Little Escape', exact: true }).click();
    await failure.waitForFunction(() => window.__fallbackCount === 1);
    await failure.waitForTimeout(500);
    assert.equal(await failure.evaluate(() => window.__fallbackCount), 1, 'Media error and play rejection only start one fallback');
    await failure.getByRole('button', { name: "I'm Ready →", exact: true }).click();
    await failure.locator('.quiz-scene').waitFor();
    await failure.close();
    assert.deepEqual(errors, [], 'Recorded narration and failure fallback have no uncaught errors');
    console.log('PASS: optional recorded narration, 1.5s GainNode fade, selected language, media-source reuse, quick skip, unavailable speech and single fallback on load failure.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
