const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { translations: { en, zh } } = require('../src/i18n/translations.ts');
const { approach } = require('./navigation.cjs');
const { installControlledNarration } = require('./interlude-fixture.cjs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await installControlledNarration(page);
    const b = name => page.getByRole('button', { name, exact: true });
    const toggle = async name => { await b(name).click(); await page.waitForTimeout(160); };
    const snapshot = async selectors => {
      // Compare resting layouts, without a previous click leaving one version
      // hovered and therefore scaled by the intentional interaction animation.
      await page.mouse.move(0, 0); await page.waitForTimeout(260);
      return page.evaluate(selectors => {
      const result = [];
      for (const selector of selectors) document.querySelectorAll(selector).forEach((el, index) => {
        if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return;
        const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
        result.push({ key: `${selector}:${index}`, x: rect.x, y: rect.y, width: rect.width, height: rect.height, font: style.fontSize, lineHeight: style.lineHeight, weight: style.fontWeight });
      });
      return result;
      }, selectors);
    };
    const compare = (name, english, chinese) => {
      assert.deepEqual(chinese.map(r => r.key), english.map(r => r.key), `${name}: same elements`);
      english.forEach((rect, index) => {
        const other = chinese[index];
        for (const dimension of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(rect[dimension] - other[dimension]) <= .75,
          `${name} ${rect.key} ${dimension}: EN ${rect[dimension]}, ZH ${other[dimension]}`);
        for (const metric of ['font', 'lineHeight', 'weight']) assert.equal(other[metric], rect[metric], `${name}: same ${metric}`);
      });
    };
    const layouts = [[320,568], [320,667], [390,844], [414,844], [1280,900]];
    const check = async (name, selectors, sizes = layouts) => {
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height }); await page.waitForTimeout(280);
        const english = await snapshot(selectors);
        await toggle('中文');
        const chinese = await snapshot(selectors);
        compare(`${name} ${width}x${height}`, english, chinese);
        const overflow = await page.evaluate(() => [...document.querySelectorAll('button,input')].filter(el => {
          const r = el.getBoundingClientRect();
          // Native text fields scroll their user-entered text horizontally;
          // that is separate from a control or translated button overflowing.
          return r.width && r.height && getComputedStyle(el).visibility !== 'hidden' && (r.left < -1 || r.right > innerWidth + 1 || (el.tagName !== 'INPUT' && el.scrollWidth > el.clientWidth + 2));
        }).map(el => el.innerText));
        assert.deepEqual(overflow, [], `${name}: no control overflows`);
        if (width === 390) await page.screenshot({ path: `tests/layout-${name}-zh.png` });
        await toggle('EN');
        compare(`${name} round trip`, english, await snapshot(selectors));
        if (width === 390) await page.screenshot({ path: `tests/layout-${name}-en.png` });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      console.log(`PASS: ${name} identical bilingual geometry and typography`);
    };
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
    await b(en.INTRO_COPY.startButton).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await check('cover', ['.intro-title', '.escape-cloud-button']);
    await b(en.INTRO_COPY.startButton).click();
    await check('interlude-welcome', ['.interlude-center', '.interlude-subtitles', '.interlude-first']);
    assert.equal(await page.getByRole('img', {name:en.interlude.headphonesLabel}).count(),0);
    await page.waitForFunction(()=>window.__introUtterance);
    await page.evaluate(()=>window.__finishIntro());
    await page.locator('.interlude-scene[data-phase="ready"]').waitFor();
    await check('interlude-headphones', ['.interlude-center', '.interlude-subtitles', '.headphone-aura', '.interlude-second', '.interlude-ready']);
    await b(en.interlude.ready).click();
    for (let step = 0; step < 3; step++) {
      await check(`quiz-${step + 1}`, ['.quiz-question', '.quiz-question h2', '.quiz-options', '.airbrush-tape-option', '.quiz-scene button']);
      await b(en.QUIZ_QUESTIONS[step].options[0].label).click();
    }
    await page.getByRole('dialog', { name: en.planetGuide.title }).waitFor();
    await check('guide', ['.planet-instructions', '#planet-guide-title', '.planet-instructions li', '.planet-instructions button']);
    await b(en.planetGuide.confirm).click();
    await check('walking', ['.planet-header', '#wandering-instructions', '.planet-stage', '.planet-control-dock', '.wandering-joystick']);
    await approach(page, 'listening-stone', '[ Sit & Listen ]');
    await check('sit-action', ['.rest-action', '.wandering-joystick'], [[390,844]]);
    await b('[ Sit & Listen ]').click(); await page.getByRole('textbox').waitFor();
    await page.getByRole('textbox').fill('Keep this thought unchanged');
    await check('seated', ['#wandering-instructions', '.planet-stage', '.rest-action', '.message-panel', '.message-panel h2', '.message-panel form', '.message-panel input', '.message-panel button']);
    assert.equal(await page.getByRole('textbox').inputValue(), 'Keep this thought unchanged');
    await page.getByRole('textbox').fill(''); await b('[ Let It Float ]').click();
    const bubbleEN = await page.locator('.spirit-overhead-bubble').boundingBox();
    await toggle('中文');
    const bubbleZH = await page.locator('.spirit-overhead-bubble').boundingBox();
    assert.ok(Math.abs(bubbleEN.width - bubbleZH.width) < .1);
    assert.ok(Math.abs(bubbleEN.height - bubbleZH.height) < .1);
    await toggle('EN');
    await b('[ Stand Up ]').click();
    await page.getByRole('dialog', { name: en.exitGuide.title }).waitFor();
    await check('exit-guide', ['.planet-guide-card', '#exit-guide-title', '#exit-guide-body', '.planet-guide-card button']);
    await b(en.exitGuide.confirm).click();
    await check('leave-action', ['.leave-control'], [[320,667], [390,844]]);
    await b(en.ROAMING_COPY.leaveButton).click();
    await check('farewell', ['.farewell-scene > div', '.farewell-scene .airbrush-soft-card', '.farewell-scene p', '.farewell-scene button']);
    await b(en.another).click(); await b(en.portalDiscovery.spin).waitFor();
    await check('portal', ['.planet-discovery-card', '#planet-discovery-title', '.planet-orbit', '.orbit-planet-name', '.discovery-footer', '.discovery-status', '.discovery-spin', '.discovery-cancel']);
    assert.deepEqual(errors, []);
    console.log('PASS: 5 viewport sizes, all major scenes and panels, identical font sizes/line heights/weights and control positions; drafts retained.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
