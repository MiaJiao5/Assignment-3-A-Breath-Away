const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { translations: { en, zh } } = require('../src/i18n/translations.ts');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'zh-CN' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await installControlledNarration(page); await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(en.INTRO_COPY.startButton, 'Begin Your Little Escape');
    assert.equal(await page.locator('.intro-scene').evaluate(el => getComputedStyle(el).overflow), 'visible', 'Blurred color fields are not cut off at the header');
    assert.equal(await page.locator('.intro-title linearGradient').count(), 1);
    assert.equal(await page.locator('.intro-title linearGradient').getAttribute('gradientUnits'), 'userSpaceOnUse');
    const fills = await page.locator('.intro-title text').evaluateAll(els => els.map(el => el.getAttribute('fill')));
    assert.equal(new Set(fills).size, 1, 'All lines use the same gradient coordinate system');
    assert.deepEqual(await page.locator('.intro-title text').allTextContents(), ['A', 'Breath', 'Away']);
    const client = await page.context().newCDPSession(page);
    await client.send('DOM.enable'); await client.send('CSS.enable');
    const { root } = await client.send('DOM.getDocument');
    for (let i = 1; i <= 3; i++) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: `.intro-title-line-${i}` });
      const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
      assert.ok(fonts.some(f => f.familyName === 'Allura' && f.isCustomFont && f.glyphCount > 0), 'Real Allura glyphs are rendered, not a cursive fallback');
    }
    const svg = await page.locator('.intro-title svg').elementHandle();
    for (const [width, height] of [[320,568], [320,667], [390,844], [414,844], [1280,900]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(300);
      await page.mouse.move(0, 0);
      const bounds = await page.locator('.intro-title').evaluate(el => {
        const svg = el.querySelector('svg'), view = svg.viewBox.baseVal;
        const button = document.querySelector('.escape-cloud-button');
        return { box: el.getBoundingClientRect().toJSON(), button: button.getBoundingClientRect().toJSON(),
          lines: [...el.querySelectorAll('text')].map(text => {
            const r = text.getBBox(), style = getComputedStyle(text);
            return { x: r.x, y: r.y, right: r.x + r.width, bottom: r.y + r.height,
              weight: style.fontWeight, stroke: style.stroke, synthesis: style.fontSynthesis };
          }), view: { x: view.x, y: view.y, width: view.width, height: view.height } };
      });
      assert.ok(bounds.box.bottom <= bounds.button.top - 10, 'Title keeps breathing space above the raised CTA');
      assert.ok(bounds.button.left >= 0 && bounds.button.right <= width && bounds.button.bottom <= height - 12,
        'The responsive cover action remains within the safe visible viewport');
      for (const line of bounds.lines) {
        assert.ok(line.x >= bounds.view.x && line.right <= bounds.view.x + bounds.view.width && line.y >= bounds.view.y && line.bottom <= bounds.view.y + bounds.view.height, `Complete flourishes fit inside the SVG: ${JSON.stringify(line)}`);
        assert.equal(line.weight, '400'); assert.equal(line.stroke, 'none'); assert.equal(line.synthesis, 'none');
      }
      if (width === 390 && height === 844) {
        assert.ok(bounds.button.y < 739.5, 'The cover action is raised from its previous y749.5 position');
        assert.equal(bounds.button.width, 310, 'The original oval action width is preserved');
      }
      await page.screenshot({ path: `tests/cover-v2-en-${width}-${height}.png` });
      await page.getByRole('button', { name: '中文', exact: true }).click();
      await page.getByRole('button', { name: zh.INTRO_COPY.startButton, exact: true }).waitFor();
      assert.ok(await svg.evaluate(el => el === document.querySelector('.intro-title svg')), 'Language switching retains the English brand composition');
      const translated = await page.locator('.escape-cloud-button').boundingBox();
      for (const key of ['x','y','width','height']) assert.ok(Math.abs(translated[key] - bounds.button[key]) < .75, 'CTA geometry is identical in both languages');
      await page.screenshot({ path: `tests/cover-v2-zh-${width}-${height}.png` });
      await page.getByRole('button', { name: 'EN', exact: true }).click();
    }
    assert.equal(await page.locator('.intro-scene img, .intro-title image, .planet-atmosphere, canvas').count(), 0);
    await page.getByRole('button', { name: en.INTRO_COPY.startButton, exact: true }).click();
    await page.locator('.interlude-scene').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: verified real Allura Regular glyphs, shared SVG paint, complete flourishes at five viewports, responsive raised CTA, bilingual geometry and cover navigation.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
