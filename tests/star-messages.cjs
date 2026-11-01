const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { STAR_MESSAGES, shuffleStarMessages } = require('../src/data/starMessages.ts');

(async () => {
  const ids = Object.keys(STAR_MESSAGES);
  const all = Object.values(STAR_MESSAGES).flat();
  assert.equal(all.length, 20);
  for (const key of ['id', 'en', 'zh']) assert.equal(new Set(all.map(m => m[key])).size, 20);
  for (const id of ids) {
    assert.equal(STAR_MESSAGES[id].length, 5);
    for (let i = 0; i < 50; i++) {
      const previous = STAR_MESSAGES[id][i % 5].id;
      const shuffled = shuffleStarMessages(id, previous);
      assert.equal(new Set(shuffled.map(m => m.id)).size, 5);
      assert.notEqual(shuffled[0].id, previous, 'No immediate repeat across cycle boundaries');
      assert.deepEqual(new Set(shuffled), new Set(STAR_MESSAGES[id]));
    }
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.clock.install();
    await page.goto(`${process.env.APP_URL || 'http://127.0.0.1:3001'}/tests/star-messages.html`);
    await page.waitForFunction(() => !!window.messageFixture);
    await page.evaluate(() => {
      window.__messages = []; window.__maxMessages = 0;
      new MutationObserver(records => {
        window.__maxMessages = Math.max(window.__maxMessages, document.querySelectorAll('.stardust-thought').length);
        for (const record of records) for (const node of record.addedNodes) {
          if (node.nodeType === 1 && node.matches('.stardust-thought')) {
            window.__messages.push({ id: node.dataset.messageId, planet: node.dataset.planetId,
              start: Date.now(), duration: +node.dataset.displayMs, interval: +node.dataset.gapMs });
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    for (const id of ids) {
      await page.evaluate(id => window.messageFixture.planet(id), id);
      await page.clock.runFor(121000);
      const messages = await page.evaluate(id => window.__messages.filter(m => m.planet === id), id);
      assert.ok(messages.length >= 10, 'Two complete cycles are exercised');
      const expected = new Set(STAR_MESSAGES[id].map(m => m.id));
      for (let offset = 0; offset + 5 <= messages.length; offset += 5) {
        assert.deepEqual(new Set(messages.slice(offset, offset + 5).map(m => m.id)), expected);
      }
      messages.forEach((m, index) => {
        assert.ok(expected.has(m.id));
        assert.ok(m.duration >= 6000 && m.duration <= 9000);
        assert.ok(m.interval >= 8000 && m.interval <= 12000);
        if (index) {
          const elapsed = m.start - messages[index - 1].start;
          assert.ok(elapsed >= 7999 && elapsed <= 12001, `8–12 second cadence: ${elapsed}`);
          assert.notEqual(m.id, messages[index - 1].id);
          assert.ok(elapsed > messages[index - 1].duration, 'Fade finishes before the next message starts');
        }
      });
      console.log(`PASS: ${id}, ${messages.length} appearances, complete shuffled cycles and bounded timing`);
    }
    for (let i = 0; i < 12 && !await page.locator('.stardust-thought').count(); i++) await page.clock.runFor(1000);
    const node = await page.locator('.stardust-thought').elementHandle();
    const currentId = await node.getAttribute('data-message-id');
    const current = STAR_MESSAGES.PSI_04.find(m => m.id === currentId);
    assert.equal(await node.$eval('.bilingual-current', el => el.textContent), current.en, 'Fresh Chinese-locale visit still starts in English');
    await page.getByRole('button', { name: '中文', exact: true }).click();
    assert.equal(await node.$eval('.bilingual-current', el => el.textContent), current.zh);
    assert.ok(await node.evaluate(el => el === document.querySelector('.stardust-thought')), 'Translation preserves the active animation node');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    assert.equal(await node.$eval('.bilingual-current', el => el.textContent), current.en);
    // Check every sentence in both languages, including the longest, in real CSS.
    for (const [width, height] of [[320,568], [390,844], [414,844], [1280,900]]) {
      await page.setViewportSize({ width, height });
      for (const id of ids) {
        await page.evaluate(id => window.messageFixture.planet(id), id);
        const checked = new Set();
        for (let n = 0; n < 15 && checked.size < 5; n++) {
          for (let i = 0; i < 14; i++) {
            await page.clock.runFor(1000);
            if (await page.locator('.stardust-thought').count()) break;
          }
          for (const lang of ['EN', '中文']) {
            await page.getByRole('button', { name: lang, exact: true }).click();
            const fit = await page.locator('.stardust-thought').evaluate(el => {
              const r = el.getBoundingClientRect(), sky = el.parentElement.getBoundingClientRect();
              return { x: r.x, right: r.right, bottom: r.bottom, limit: sky.bottom, height: r.height, scroll: el.scrollWidth, width: el.clientWidth };
            });
            assert.ok(fit.x >= 0 && fit.right <= width && fit.bottom <= fit.limit && fit.scroll <= fit.width + 1, JSON.stringify(fit));
          }
          checked.add(await page.locator('.stardust-thought').getAttribute('data-message-id'));
          await page.clock.runFor(9000);
        }
        assert.equal(checked.size, 5, 'Every message is measured in both languages at every viewport');
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (let i = 0; i < 13 && !await page.locator('.stardust-thought').count(); i++) await page.clock.runFor(1000);
    assert.equal(await page.locator('.stardust-thought').evaluate(el => getComputedStyle(el).animationName), 'stardustFade');
    await page.evaluate(() => window.messageFixture.active(false));
    const before = await page.evaluate(() => window.__messages.length);
    await page.clock.runFor(60000);
    assert.equal(await page.locator('.stardust-thought').count(), 0);
    assert.equal(await page.evaluate(() => window.__messages.length), before, 'Inactive planet cancels all timers');
    await page.evaluate(() => window.messageFixture.active(true));
    await page.clock.runFor(13000);
    assert.ok(await page.evaluate(() => window.__messages.length) > before, 'Resuming restarts scheduling');
    await page.evaluate(() => window.messageFixture.mounted(false));
    const unmounted = await page.evaluate(() => window.__messages.length);
    await page.clock.runFor(60000);
    assert.equal(await page.evaluate(() => window.__messages.length), unmounted, 'Leaving the planet cleans up pending callbacks');
    assert.equal(await page.evaluate(() => window.__maxMessages), 1, 'Never display two built-in messages');
    assert.deepEqual(errors, []);
    console.log('PASS: exact 20 unique bilingual entries, immediate in-place translation, all mobile/desktop sentence bounds, reduced motion, single-message rendering and timer cleanup.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
