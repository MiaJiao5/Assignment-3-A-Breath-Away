// Run against npm run dev. Requires Playwright and a local Chrome installation.
// APP_URL and PLAYWRIGHT_MODULE may select another preview/module location.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { completeQuiz, approach, installNavigation } = require('./navigation.cjs');
const { translations: { en, zh } } = require('../src/i18n/translations.ts');

const phones = [[375, 667], [390, 844], [414, 896], [430, 932]];
const shapeLabels = { cloud: en.bubbleShapes.cloud, circle: en.bubbleShapes.circle, rounded: en.bubbleShapes.rounded };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', locale: 'zh-CN' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await installControlledNarration(page);
    await page.addInitScript(() => {
      window.__refinementMusicPlays = 0;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function(...args) {
        if (this.id === 'brief-roaming-external-audio') window.__refinementMusicPlays++;
        return play.apply(this, args);
      };
    });
    const b = label => page.getByRole('button', { name: label, exact: true });
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'A fresh visit remains English, even with a Chinese browser locale');
    const coverArt = await page.locator('.intro-title svg').elementHandle();
    for (const [width, height] of [...phones, [320, 568]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
      const cover = await page.locator('.intro-title').evaluate(element => {
        const cta = document.querySelector('.escape-cloud-button');
        return { art: element.getBoundingClientRect().toJSON(), button: cta.getBoundingClientRect().toJSON(),
          artFont: getComputedStyle(element).fontFamily, weight: getComputedStyle(element).fontWeight,
          buttonFont: parseFloat(getComputedStyle(cta).fontSize),
          lines: [...element.querySelectorAll('text')].map(line => ({ text: line.textContent, size: line.getAttribute('font-size'), stroke: getComputedStyle(line).stroke })),
          capitals: [...element.querySelectorAll('tspan')].map(capital => capital.getAttribute('font-size')) };
      });
      assert.ok(cover.artFont.includes('Allura') && cover.weight === '400', 'The decorative cover type remains Allura Regular');
      assert.deepEqual(cover.lines.map(line => line.text), ['A', 'Breath', 'Away']);
      assert.deepEqual(cover.lines.map(line => line.size), ['460', '400', '430']);
      assert.deepEqual(cover.capitals, ['550', '550']);
      assert.ok(cover.lines.every(line => line.stroke === 'none'), 'UI text enlargement adds no stroke to the calligraphy');
      assert.ok(cover.buttonFont >= 16, 'Cover navigation copy is slightly larger');
      assert.ok(cover.button.y >= cover.art.bottom + 10 && cover.button.y + cover.button.height < height - 12, `The raised cover action preserves breathing room: ${JSON.stringify(cover)}`);
      if (width === 390 && height === 844) assert.ok(cover.button.y < 739.5, 'The cover action sits noticeably above its previous y749.5 position');
      await b('\u4e2d\u6587').click();
      const translated = await page.locator('.escape-cloud-button').boundingBox();
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(translated[key] - cover.button[key]) <= 1, 'Cover action geometry is stable across languages');
      assert.equal(await coverArt.evaluate(element => element === document.querySelector('.intro-title svg')), true);
      await b('EN').click();
      await page.screenshot({ path: `tests/mobile-cover-${width}-${height}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await b(en.INTRO_COPY.startButton).click();
    await page.waitForFunction(() => window.__introUtterance);
    await page.evaluate(() => window.__finishIntro());
    await b(en.interlude.ready).click();
    await completeQuiz(page); await b(en.planetGuide.confirm).click();
    await installNavigation(page); await approach(page, 'listening-stone', '[ Sit & Listen ]');
    await b('[ Sit & Listen ]').click(); await page.getByRole('textbox').waitFor();
    const baseline = await page.evaluate(() => {
      const root = window.__navScene.getObjectByName('spirit-surface-root');
      window.__refinementCanvas = document.querySelector('canvas');
      return { position: root.position.toArray(), rotation: root.quaternion.toArray(), plays: window.__refinementMusicPlays,
        time: document.getElementById('brief-roaming-external-audio').currentTime };
    });
    const selector = page.locator('.bubble-shape-selector');
    for (const [css, minimum] of [['.bubble-shape-heading', 13], ['.bubble-shape-option', 12], ['.message-panel input', 13], ['#wandering-instructions', 13]]) {
      const fontSize = await page.locator(css).first().evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      assert.ok(fontSize >= minimum, `${css}: ordinary interface copy is slightly larger (${fontSize})`);
    }
    const released = () => page.locator('.spirit-overhead-bubble[data-release="true"]');
    const body = () => released().locator('.released-bubble-body');
    const release = async text => {
      await page.getByRole('textbox').fill(text);
      await b('[ Let It Float ]').click();
      await released().waitFor({ state: 'visible' });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    const metrics = () => body().evaluate(element => {
      const box = element.querySelector('.released-bubble-text-box');
      const text = element.querySelector('p');
      return { width: element.offsetWidth, height: element.offsetHeight, fontSize: parseFloat(getComputedStyle(text).fontSize),
        weight: Number(getComputedStyle(text).fontWeight), fits: text.scrollWidth <= box.clientWidth + 1 && text.scrollHeight <= box.clientHeight + 1,
        content: text.textContent, box: [box.clientWidth, box.clientHeight], text: [text.scrollWidth, text.scrollHeight] };
    });
    assert.equal(await selector.getByRole('button').count(), 3);
    assert.equal(await selector.getByRole('button', { name: shapeLabels.cloud, exact: true }).getAttribute('aria-pressed'), 'true');
    for (const shape of ['cloud', 'circle', 'rounded']) {
      await selector.getByRole('button', { name: shapeLabels[shape], exact: true }).click();
      await release('bybye');
      const short = await metrics();
      assert.equal(await released().getAttribute('data-shape'), shape);
      assert.ok(short.width < 190, `${shape}: short thoughts use a compact bubble: ${JSON.stringify(short)}`);
      assert.ok(short.fontSize >= 15 && short.weight >= 500, `${shape}: short thoughts are larger and stronger than the previous 14px/400 copy: ${JSON.stringify(short)}`);
      assert.ok(short.fits, `${shape}: short text fits`);
      if (shape === 'circle') assert.ok(Math.abs(short.width - short.height) <= 1, 'The compact circle remains circular');
      await page.waitForTimeout(850);
      await page.screenshot({ path: `tests/mobile-compact-${shape}.png` });
      await release('A longer thought can have a little more room to breathe.');
      const long = await metrics();
      assert.ok(long.width > short.width + 10, `${shape}: the bubble grows with its actual content: ${JSON.stringify({ short, long })}`);
      assert.ok(long.fits, `${shape}: longer text fits its adaptive silhouette`);
    }

    await release('A small wish.');
    const node = await released().elementHandle();
    await selector.getByRole('button', { name: shapeLabels.cloud, exact: true }).click();
    await b('\u4e2d\u6587').click();
    assert.equal(await released().getAttribute('data-shape'), 'rounded', 'An in-flight bubble retains its selected shape');
    assert.equal(await released().textContent(), 'A small wish.', 'User text is never translated');
    assert.equal(await node.evaluate(element => element === document.querySelector('.spirit-overhead-bubble[data-release="true"]')), true, 'Language changes retain the existing flight');
    const draft = '\u4eca\u5929\u4e5f\u60f3\u6162\u6162\u6765';
    await page.getByRole('textbox').fill(draft); await b('EN').click();
    assert.equal(await page.getByRole('textbox').inputValue(), draft);

    // Sample the actual rendered balloon. No test clock or separate timer drives
    // the production motion; this catches jumps and stationary/straight releases.
    await selector.getByRole('button', { name: shapeLabels.rounded, exact: true }).click();
    await release('A little calm.');
    await page.waitForTimeout(400);
    const points = [];
    for (let index = 0; index < 31; index++) {
      const rect = await body().boundingBox();
      points.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width });
      if (index < 30) await page.waitForTimeout(175);
    }
    assert.ok(points.at(-1).y < points[0].y - 20, 'The balloon continuously rises into the sky');
    assert.ok(Math.max(...points.map(point => point.x)) - Math.min(...points.map(point => point.x)) > 3, 'A soft breeze produces visible lateral drift');
    assert.ok(points.at(-1).width < points[0].width, 'The balloon recedes as it rises');
    const jumps = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
    assert.ok(jumps.every(distance => distance < 35), `The flight has no abrupt jumps: ${JSON.stringify(jumps)}`);

    const findings = [];
    for (const [width, height] of [...phones, [320, 568]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
      for (const shape of ['cloud', 'circle', 'rounded']) {
        await selector.getByRole('button', { name: shapeLabels[shape], exact: true }).click();
        for (const text of ['W'.repeat(60), '\u5b81'.repeat(60)]) {
          await release(text);
          const measured = await metrics();
          if (!measured.fits) findings.push({ viewport: [width, height], shape, issue: 'Long text outside safe area', ...measured });
          if (shape === 'circle' && Math.abs(measured.width - measured.height) > 1) findings.push({ viewport: [width, height], shape, issue: 'Circle distorted', ...measured });
        }
      }
      for (const [label, locator] of [['selector', selector], ['input', page.getByRole('textbox')], ['release', b('[ Let It Float ]')], ['stand', b('[ Stand Up ]')]]) {
        // A smaller-than-requested stress viewport may use the permitted
        // scrolling fallback; the four requested phones must fit immediately.
        if (height < 667) await locator.scrollIntoViewIfNeeded();
        const rect = await locator.boundingBox();
        if (rect.x < 0 || rect.x + rect.width > width + 1 || rect.y < 0 || rect.y + rect.height > height - 12) findings.push({ viewport: [width, height], label, issue: 'Planet control lacks safe visible space', rect });
      }
      const releaseTarget = await b('[ Let It Float ]').boundingBox();
      if (releaseTarget.height < 44) findings.push({ viewport: [width, height], issue: 'Release target too small', rect: releaseTarget });
      await release('A softer day.'); await page.waitForTimeout(800);
      await page.screenshot({ path: `tests/mobile-listening-${width}-${height}.png` });
      await b('\u4e2d\u6587').click(); await b('EN').click();
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await release('A quiet pause.'); await page.waitForTimeout(450);
    const quiet = await body().boundingBox(); await page.waitForTimeout(600);
    const still = await body().boundingBox();
    assert.ok(Math.abs(quiet.x - still.x) < 2 && Math.abs(quiet.y - still.y) < 3, 'Reduced motion removes the spatial flight');
    const final = await page.evaluate(() => {
      const root = window.__navScene.getObjectByName('spirit-surface-root');
      const audio = document.getElementById('brief-roaming-external-audio');
      return { position: root.position.toArray(), rotation: root.quaternion.toArray(), time: audio.currentTime,
        paused: audio.paused, plays: window.__refinementMusicPlays, canvasRetained: window.__refinementCanvas === document.querySelector('canvas') };
    });
    assert.deepEqual(final.position, baseline.position); assert.deepEqual(final.rotation, baseline.rotation);
    assert.equal(final.plays, baseline.plays); assert.ok(!final.paused && final.time > baseline.time); assert.ok(final.canvasRetained);

    await page.setViewportSize({ width: 390, height: 844 });
    await b('[ Stand Up ]').click(); await b(en.exitGuide.confirm).click();
    const planetBackground = await page.locator('main').evaluate(element => element.style.background);
    await b(en.ROAMING_COPY.leaveButton).click();
    await page.locator('.farewell-scene').waitFor();
    assert.equal(await page.locator('main').evaluate(element => element.style.background), planetBackground, 'Farewell preserves the selected planet background');
    assert.equal(await page.locator('.farewell-spirit').count(), 1);
    const spirit = await page.locator('.farewell-spirit svg').elementHandle();
    for (const [width, height] of phones) {
      await page.setViewportSize({ width, height });
      for (const language of ['en', 'zh']) {
        await b(language === 'en' ? 'EN' : '\u4e2d\u6587').click();
        await page.locator('.farewell-scene').evaluate(element => { element.scrollTop = 0; });
        const rects = {};
        for (const [label, css] of Object.entries({ kicker: '.farewell-kicker', spirit: '.farewell-spirit', copy: '.farewell-copy', primary: '.farewell-primary', secondary: '.farewell-secondary', actions: '.farewell-actions' })) {
          rects[label] = await page.locator(css).boundingBox();
          const rect = rects[label];
          if (rect.x < -1 || rect.x + rect.width > width + 1 || rect.y < 0 || rect.y + rect.height > height - 8) findings.push({ viewport: [width, height], language, label, issue: 'Farewell content outside safe viewport', rect });
        }
        if (rects.primary.height < 48 || rects.secondary.height < 48) findings.push({ viewport: [width, height], language, issue: 'Farewell actions need 48px targets', rects });
        if (rects.secondary.width < rects.primary.width - 2) findings.push({ viewport: [width, height], language, issue: 'Secondary action is narrower than the primary action row', rects });
        if (rects.spirit.y + rects.spirit.height > rects.copy.y + 2 || rects.copy.y + rects.copy.height > rects.primary.y + 2 || rects.primary.y + rects.primary.height > rects.secondary.y + 1) findings.push({ viewport: [width, height], language, issue: 'Farewell items overlap', rects });
        const originalSpiritHeight = height <= 740 ? 250 : 330;
        if (Math.abs(rects.spirit.height - originalSpiritHeight) > 2) findings.push({ viewport: [width, height], language, issue: 'Farewell mascot changed size', rects });
        assert.equal(await spirit.evaluate(element => element === document.querySelector('.farewell-spirit svg')), true, 'Language and responsive layout retain the mascot SVG');
        await page.screenshot({ path: `tests/mobile-farewell-${width}-${height}-${language}.png` });
      }
    }
    await b('EN').click();
    const row = await page.locator('.farewell-secondary').boundingBox();
    await page.mouse.click(row.x + 12, row.y + row.height / 2);
    await page.locator('.portal-discovery-overlay').waitFor();
    await page.keyboard.press('Escape'); await page.locator('.portal-discovery-overlay').waitFor({ state: 'detached' });
    await b(en.ROAMING_COPY.leaveButton).click();
    await page.locator('.farewell-primary').click();
    await b(en.INTRO_COPY.startButton).waitFor();
    assert.deepEqual(findings, [], `Responsive findings: ${JSON.stringify(findings)}`);
    assert.deepEqual(errors, []);
    console.log('PASS: compact adaptive bilingual bubbles, larger stronger copy, smooth balloon drift, circle/long-text fitting, preserved scene/music, safe mobile controls, responsive farewell, unchanged spirit and full-row 48px actions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
