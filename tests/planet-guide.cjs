const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { completeQuiz } = require('./navigation.cjs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const b = name => page.getByRole('button', { name, exact: true });
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
    await b('Find Your Calm Zone').click(); await b("I'm Ready →").click(); await completeQuiz(page);
    const guide = page.getByRole('dialog', { name: 'A Little Guide to Your Planet' });
    await guide.waitFor();
    for (const language of ['EN', '中文']) {
      await b(language).click();
      const text = await page.locator('.planet-instructions').innerText();
      assert.equal(await page.locator('.planet-instructions ol li').count(), 3);
      assert.ok(!/headphones|Wander past|five seconds|耳机|云朵树|放飞/i.test(text), 'Guide contains only movement, stone and portal instructions');
      assert.ok(/WASD/.test(text));
      assert.ok(language === 'EN' ? /Listening Stone/.test(text) && /Star Portal/.test(text) : /聆听石/.test(text) && /传送门/.test(text));
      for (const [width, height] of [[320,568], [320,667], [390,844]]) {
        await page.setViewportSize({ width, height });
        const content = await page.locator('.planet-guide-scroll').evaluate(el => {
          const style = getComputedStyle(el), scrollbar = getComputedStyle(el, '::-webkit-scrollbar');
          return { hidden: style.scrollbarWidth === 'none' && scrollbar.display === 'none', clientHeight: el.clientHeight, scrollHeight: el.scrollHeight };
        });
        assert.ok(content.hidden, 'Native scrollbar is invisible');
        const confirm = await b(language === 'EN' ? 'Got It, Let’s Wander' : '知道啦，开始漫游').boundingBox();
        assert.ok(confirm.y >= 0 && confirm.y + confirm.height <= height, 'Confirm remains visible on short phones');
        if (height >= 667) assert.ok(content.scrollHeight <= content.clientHeight + 2, 'Concise instructions fit without scrolling on a normal phone');
        await page.screenshot({ path: `tests/guide-${language === 'EN' ? 'en' : 'zh'}-${width}x${height}.png` });
      }
    }
    await b('知道啦，开始漫游').click();
    await page.locator('.joystick-panel').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
    console.log('PASS: concise bilingual move/stone/portal guide, no headphones or ecology text, hidden scrollbar and reachable confirmation at 320px short/normal phone sizes.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
