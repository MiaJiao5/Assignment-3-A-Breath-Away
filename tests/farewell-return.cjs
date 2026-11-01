const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { completeQuiz, approach, installNavigation } = require('./navigation.cjs');
const { translations: { en } } = require('../src/i18n/translations.ts');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const b = name => page.getByRole('button', { name, exact: true });
    await installControlledNarration(page);
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
    await b(en.INTRO_COPY.startButton).click();
    await page.waitForFunction(() => window.__introUtterance); await page.evaluate(() => window.__finishIntro());
    await b(en.interlude.ready).click(); await completeQuiz(page); await b(en.planetGuide.confirm).click();

    const attach = async () => {
      await installNavigation(page);
      await page.evaluate(() => {
        let fiber = document.querySelector('canvas').parentElement;
        fiber = fiber[Object.keys(fiber).find(k => k.startsWith('__reactFiber'))];
        while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
        window.__returnControls = fiber.memoizedProps;
        if (window.__returnCanvas === window.__navCanvas) return;
        window.__returnCanvas = window.__navCanvas;
        window.__returnCamera = null;
        const render = window.__navRenderer.render.bind(window.__navRenderer);
        window.__navRenderer.render = (scene, camera) => { render(scene, camera); window.__returnCamera = camera; };
      });
      await page.waitForFunction(() => window.__returnCamera);
    };
    const upperView = async label => {
      await page.waitForTimeout(350);
      const view = await page.evaluate(() => {
        const scene = window.__navScene, camera = window.__returnCamera;
        const root = scene.getObjectByName('spirit-surface-root');
        const planet = scene.getObjectByName('planet-surface');
        const center = planet.getWorldPosition(planet.position.clone()).project(camera);
        const body = root.localToWorld(root.position.clone().set(0, .25, 0)).project(camera);
        const controls = window.__returnControls;
        return { id: scene.getObjectByName('interactive-garden').userData.planetId,
          dx: body.x - center.x, dy: body.y - center.y, body: body.toArray(),
          coords: { ...controls.planetCoordsRef.current }, target: { ...controls.targetCoordsRef.current },
          velocity: { ...controls.springVelocityRef.current } };
      });
      assert.ok(view.dy > .15 && Math.abs(view.dx) < .65, `${label}: companion stays above the planet: ${JSON.stringify(view)}`);
      assert.ok(view.body[0] > -.95 && view.body[0] < .95 && view.body[1] > -.95 && view.body[1] < .95, 'Companion remains in frame');
      assert.deepEqual(view.coords, view.target, 'Arrival has no stale spring target');
      assert.deepEqual(view.velocity, { lon: 0, lat: 0 }, 'Arrival has no residual movement');
      assert.equal(await b(en.ROAMING_COPY.leaveButton).count(), 1, 'Leave remains unlocked');
      assert.equal(await page.locator('.planet-instructions, .exit-guide-card').count(), 0, 'Instructions never repeat on return');
      return view.id;
    };
    await attach(); await approach(page, 'listening-stone', '[ Sit & Listen ]');
    await b('[ Sit & Listen ]').click(); await b('[ Stand Up ]').click(); await b(en.exitGuide.confirm).click();
    const visited = [];
    for (let visit = 0; visit < 4; visit++) {
      await attach();
      const id = await page.evaluate(() => window.__navScene.getObjectByName('interactive-garden').userData.planetId);
      assert.ok(!visited.includes(id)); visited.push(id);
      if (visit === 1) {
        // Leaving directly from listening must also return to a standing arrival.
        await approach(page, 'listening-stone', '[ Sit & Listen ]'); await b('[ Sit & Listen ]').click();
      } else {
        // These coordinates are a movement accumulator, not the transported
        // world-space pose. Force a non-initial value through real input.
        await page.keyboard.down('KeyD');
        try { await page.waitForFunction(() => window.__returnControls.planetCoordsRef.current.lon > Math.PI, null, { timeout: 30000 }); }
        finally { await page.keyboard.up('KeyD'); }
      }
      await b(en.ROAMING_COPY.leaveButton).click(); await page.locator('.farewell-spirit').waitFor();
      assert.equal(await page.locator('canvas').count(), 0, 'Farewell unmounts the old stage');
      await b(en.another).click();
      if (visit === 2) {
        // The one remaining destination intentionally travels immediately,
        // without a draw/cancel step that a real visitor could wait to use.
        await page.locator('.portal-discovery-overlay').waitFor({ state: 'hidden' });
        await attach();
        const nextId = await upperView('Direct final-planet transfer');
        assert.ok(!visited.includes(nextId));
        console.log(`PASS: ${id} farewell exit and direct final-planet arrival`);
        continue;
      }
      await b(en.stay).click();
      await attach(); await upperView(`${id} cancelled selection`);
      assert.equal(await b('[ Stand Up ]').count(), 0, 'Returning from farewell is standing');
      for (const [width, height] of [[320,667], [390,844], [414,844], [1280,900]]) {
        await page.setViewportSize({ width, height });
        await upperView(`${id} ${width} return`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `tests/farewell-return-${id}.png` });
      console.log(`PASS: ${id} farewell return/cancel, top-of-planet composition, mobile/desktop framing and idle arrival`);
      if (visit === 3) break;
      await b(en.ROAMING_COPY.leaveButton).click(); await page.locator('.farewell-spirit').waitFor();
      await b(en.another).click();
      if (visit < 2) await b(en.portalDiscovery.spin).click();
      await page.locator('.portal-discovery-overlay').waitFor({ state: 'hidden' });
      await attach();
      const nextId = await upperView('Completed planet draw');
      assert.ok(!visited.includes(nextId), 'Completed selection reaches an unvisited planet');
    }
    assert.equal(new Set(visited).size, 4);
    assert.deepEqual(errors, []);
    console.log('PASS: real walking and seated exits, repeated cancelled/completed farewell draws, all four planets, clean arrival state and no repeated guides.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
