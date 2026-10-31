const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { completeQuiz } = require('./navigation.cjs');

(async () => {
  const { translations: { en, zh } } = await import(pathToFileURL(path.resolve('src/i18n/translations.ts')));
  const browser = await chromium.launch({
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: 'chrome' }),
    headless: true, args: ['--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { Math.random = () => .65; });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const button = name => page.getByRole('button', { name, exact: true });
    const phase = () => page.locator('.portal-discovery-overlay').getAttribute('data-phase');
    const waitPhase = async value => page.waitForFunction(value => document.querySelector('.portal-discovery-overlay')?.dataset.phase === value, value);
    const options = () => page.locator('.planet-orbit-slot').evaluateAll(nodes => nodes.map(node => node.dataset.planetId));
    const angle = () => page.locator('.planet-orbit-track').evaluate(node => parseFloat(node.style.getPropertyValue('--orbit-turn')) || 0);
    const open = async () => {
      await button(en.ROAMING_COPY.leaveButton).click();
      await button(en.another).click();
      await page.locator('.portal-discovery-overlay').waitFor();
    };
    const assertHeader = async id => assert.ok((await page.locator('.app-header').innerText()).includes(en.planets[id].fullName));
    const assertCoverage = async () => {
      const { frame, veil, parent } = await page.evaluate(() => {
        const overlay = document.querySelector('.portal-discovery-overlay');
        const rect = node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
        return { frame: rect(document.querySelector('main')), veil: rect(overlay), parent: overlay.parentElement.tagName };
      });
      assert.equal(parent, 'MAIN', 'Veil covers header and scene from the common app root');
      frame.forEach((value, index) => assert.ok(Math.abs(value - veil[index]) < 1, 'Single full-frame veil'));
      const action = await button(en.portalDiscovery.spin).boundingBox();
      assert.ok(action.y >= 0 && action.y + action.height <= page.viewportSize().height, 'Spin action stays on screen');
    };

    await page.goto(process.env.APP_URL || 'http://localhost:3000');
    await button(en.INTRO_COPY.startButton).click();
    await button(en.interlude.ready).click();
    await completeQuiz(page);
    await button(en.planetGuide.confirm).click();
    await page.keyboard.down('KeyD');
    try { await button(`[ ${en.ROAMING_COPY.sitButton} ]`).waitFor(); }
    finally { await page.keyboard.up('KeyD'); }
    await button(`[ ${en.ROAMING_COPY.sitButton} ]`).click();
    await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).click();
    await button(en.exitGuide.confirm).click();
    let current = 'PSI_04';
    const visited = [current];

    // Entry animation precedes the orbit; cancelling never counts as an arrival.
    await open();
    assert.equal(await phase(), 'entering');
    assert.equal(await page.locator('.portal-flight-ring').count(), 3);
    assert.equal(await page.locator('.planet-orbit-slot').count(), 0);
    await page.screenshot({ path: 'tests/portal-flight.png' });
    await button(en.stay).click();
    await page.waitForTimeout(1400);
    await assertHeader(current);
    assert.equal(await page.locator('.portal-discovery-overlay').count(), 0);

    await open(); await waitPhase('ready');
    assert.equal((await options()).length, 3);
    for (const [width, height] of [[320, 667], [414, 667], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await assertCoverage();
    }
    const a = await angle();
    await page.waitForTimeout(450);
    assert.ok(await angle() > a, 'Idle orbit rotates clockwise');
    await page.screenshot({ path: 'tests/planet-orbit-mobile.png' });
    await button(en.portalDiscovery.spin).click();
    assert.equal(await phase(), 'spinning');
    await button(en.stay).click();
    await page.waitForTimeout(6300);
    await assertHeader(current);
    assert.equal(await page.getByRole('dialog').count(), 0, 'Cancelled spin cannot travel later');

    for (const count of [3, 2]) {
      await open(); await waitPhase('ready');
      const ids = await options();
      assert.equal(ids.length, count);
      assert.equal(new Set(ids).size, count);
      assert.ok(ids.every(id => !visited.includes(id)), 'Visited planets stay out of the draw');
      const expected = ids[Math.floor(.65 * count)];
      await button(en.portalDiscovery.spin).click();
      assert.equal(await button(en.portalDiscovery.spinningButton).isDisabled(), true, 'Only one draw is accepted');
      const before = await angle();
      await page.waitForTimeout(250);
      assert.ok(await angle() > before, 'Draw keeps rotating clockwise');
      await button('中文').click();
      assert.equal(await phase(), 'spinning');
      assert.equal(await page.locator('.planet-orbit-track').getAttribute('aria-label'), zh.portalDiscovery.destinations);
      await button('EN').click();
      await waitPhase('arriving');
      const winner = page.locator('.planet-orbit-slot[aria-current="true"]');
      assert.equal(await winner.getAttribute('data-planet-id'), expected, 'Random index determines the destination');
      const targetAngle = ids.indexOf(expected) * 360 / count + await angle();
      assert.ok(Math.min(targetAngle % 360, 360 - targetAngle % 360) < .001, 'Winner stops under the top pointer');
      await page.screenshot({ path: `tests/planet-orbit-${count}-result.png` });
      await page.locator('.portal-discovery-overlay').waitFor({state:'hidden'});
      assert.equal(await page.locator('.planet-instructions').count(),0,'No repeated entry guide after travel');
      await button(en.ROAMING_COPY.leaveButton).waitFor();
      current = expected; visited.push(current);
      await assertHeader(current);
    }

    // One remaining destination bypasses the lottery and travels after the portal effect.
    const last = Object.keys(en.planets).find(id => !visited.includes(id));
    await open();
    assert.equal(await phase(), 'entering');
    assert.equal(await page.getByRole('button', { name: en.portalDiscovery.spin }).count(), 0);
    await page.waitForFunction(text=>document.querySelector('#planet-discovery-status .bilingual-current')?.textContent===text,en.portalDiscovery.lastPlanet);
    await page.locator('.portal-discovery-overlay').waitFor({state:'hidden',timeout:4000});
    assert.equal(await page.locator('.planet-instructions').count(),0,'Last-planet travel does not reopen instructions');
    current = last; visited.push(current);
    assert.equal(new Set(visited).size, 4, 'All four arrivals are distinct');
    await assertHeader(current);

    await open(); await waitPhase('complete');
    assert.equal(await page.locator('.planet-orbit-slot').count(), 0);
    await button(en.portalDiscovery.resetRoute).click();
    await waitPhase('ready');
    assert.equal((await options()).length, 3, 'Explicit new journey resets the visited set');
    assert.ok(!(await options()).includes(current));
    // Escape also works after moving focus to the global language switch.
    await button('EN').click(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.portal-discovery-overlay').count(), 0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(); await waitPhase('ready');
    const started = Date.now();
    await button(en.portalDiscovery.spin).click();
    await page.locator('.portal-discovery-overlay').waitFor({state:'hidden',timeout:2500});
    assert.ok(Date.now() - started < 2500, 'Reduced motion shortens the draw and automatic travel');
    assert.equal(await page.locator('.planet-instructions').count(),0);
    await open(); await waitPhase('ready');
    assert.equal((await options()).length, 2);
    await button(en.portalDiscovery.spin).click();
    await button(en.ROAMING_COPY.leaveButton).click();
    await page.waitForTimeout(700);
    await page.locator('.farewell-scene .bilingual-current').filter({hasText:en.farewellEnd}).waitFor();
    assert.equal(await page.locator('.portal-discovery-overlay').count(), 0, 'Global exit cancels pending travel');
    await button(en.calm).click();
    await button(en.INTRO_COPY.startButton).click();
    await button(en.interlude.ready).click();
    await completeQuiz(page); await button(en.planetGuide.confirm).click();
    assert.deepEqual(errors, []);
    console.log('PASS: entry effect, clockwise orbit and exact winner alignment, 3/2/1 unvisited route, automatic travel, cancellation cleanup, new journey, languages, full-screen veil, mobile controls, reduced motion and global exit.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
