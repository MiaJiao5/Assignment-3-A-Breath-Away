// Run against a production preview built with the GitHub Pages repository base.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { translations: { en, zh } } = require('../src/i18n/translations.ts');
const { completeQuiz, approach } = require('./navigation.cjs');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'zh-CN' });
    const base = new URL(process.env.APP_URL || 'http://127.0.0.1:4175/Assignment-3-A-Breath-Away/');
    const errors = [], failedAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(base.origin) && response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
    });
    const button = name => page.getByRole('button', { name, exact: true });
    const audioProgress = selector => page.waitForFunction(s => {
      const audio = document.querySelector(s);
      return audio && !audio.paused && audio.currentTime > .1;
    }, selector, { timeout: 15000 });
    await page.goto(base.href);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Fresh mobile visit is English even with a Chinese browser locale');
    await button(en.INTRO_COPY.startButton).waitFor();
    const screenshots = process.env.SUBMISSION_SCREENSHOTS;
    if (screenshots) {
      fs.mkdirSync(screenshots, { recursive: true });
      await page.screenshot({ path: path.join(screenshots, 'cover.png') });
    }
    const assets = ['fonts/Allura-Regular.ttf', 'audio/intro-voice-en.wav', 'audio/intro-voice-zh.mp3', 'audio/beginning-music.mp3',
      'audio/omega-01-copper-afternoon.mp3', 'audio/delta-02-sunlight-on-the-moss.mp3', 'audio/sigma-03-midday-horizon.mp3', 'audio/psi-04-last-active-sensor.mp3'];
    for (const asset of assets) {
      const response = await page.request.get(new URL(asset, base).href);
      assert.ok(response.ok(), `Bundled asset loads under the hosted subpath: ${asset}`);
      assert.ok(Number(response.headers()['content-length']) > 1000, 'Actual media/font bytes, not an HTML fallback');
      assert.ok(!response.headers()['content-type'].includes('text/html'));
    }
    await button(en.INTRO_COPY.startButton).click();
    await audioProgress('#intro-voice-en');
    assert.ok((await page.locator('#intro-voice-en').getAttribute('src')).startsWith(base.pathname));
    // Finish the actual recorded file near its end, avoiding a full narration wait.
    await page.evaluate(() => {
      const audio = document.querySelector('#intro-voice-en');
      audio.currentTime = Math.max(0, audio.duration - .15);
    });
    await button(en.interlude.ready).waitFor({ state: 'visible', timeout: 15000 });
    await button(en.interlude.ready).click();
    await audioProgress('#beginning-music');
    assert.equal(await page.locator('#beginning-music').evaluate(el => el.volume), .7);
    await completeQuiz(page, [0,0,0]);
    await button(en.planetGuide.confirm).click();
    await page.locator('canvas').waitFor();
    await approach(page, 'listening-stone', `[ ${en.ROAMING_COPY.sitButton} ]`);
    await button(`[ ${en.ROAMING_COPY.sitButton} ]`).click();
    await audioProgress('#brief-roaming-external-audio');
    const music = page.locator('#brief-roaming-external-audio');
    assert.ok((await music.evaluate(el => el.currentSrc)).endsWith(`${base.pathname}audio/omega-01-copper-afternoon.mp3`));
    await page.getByRole('textbox').waitFor();
    await page.waitForTimeout(1800);
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'listening.png') });
    await button(`[ ${en.ROAMING_COPY.releaseButton} ]`).click();
    await page.locator('.bilingual-current').filter({ hasText: en.ROAMING_COPY.emptyErrorBubble }).waitFor();
    const before = await music.evaluate(el => el.currentTime);
    await button('\u4e2d\u6587').click();
    await page.locator('.bilingual-current').filter({ hasText: zh.ROAMING_COPY.emptyErrorBubble }).waitFor();
    const text = 'A little room to breathe.';
    await page.getByRole('textbox').fill(text);
    await button('EN').click();
    assert.equal(await page.getByRole('textbox').inputValue(), text);
    assert.ok(await music.evaluate((el, time) => !el.paused && el.currentTime >= time, before), 'Language switching retains music progress');
    await button(`[ ${en.ROAMING_COPY.releaseButton} ]`).click();
    await page.getByText(text, { exact: true }).waitFor();
    await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).click();
    await button(en.exitGuide.confirm).click();
    await button(en.ROAMING_COPY.leaveButton).click();
    await page.locator('.farewell-spirit').waitFor();
    assert.deepEqual(failedAssets, []);
    assert.deepEqual(errors, []);
    console.log('PASS: clean mobile production flow on a repository subpath, bundled fonts/all audio, real narration and music playback, empty-input feedback, bilingual draft/music continuity and farewell.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
