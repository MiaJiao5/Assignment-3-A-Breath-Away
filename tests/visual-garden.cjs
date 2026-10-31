const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { approach } = require('./navigation.cjs');

(async () => {
  const { translations: { en, zh } } = await import(pathToFileURL(path.resolve('src/i18n/translations.ts')));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    for (const [planet, answers] of [['OMEGA_01', [0,0,0]], ['DELTA_02', [1,1,1]], ['SIGMA_03', [2,2,2]], ['PSI_04', [0,1,2]]]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript(() => {
        window.__audioNotes = [];
        const start = OscillatorNode.prototype.start;
        OscillatorNode.prototype.start = function (...args) {
          window.__audioNotes.push(this.frequency.value);
          return start.apply(this, args);
        };
      });
      page.on('pageerror', error => errors.push(error.message));
      const button = name => page.getByRole('button', { name, exact: true });
      await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
      if (planet === 'OMEGA_01') {
        assert.equal(await page.getByText(en.title, { exact: true }).count(), 1, 'One opening title');
        await page.screenshot({ path: 'tests/visual-intro.png' });
      }
      await button(en.INTRO_COPY.startButton).click();
      await button(en.interlude.ready).click();
      if (planet === 'OMEGA_01') {
        assert.equal(await page.getByText(en.progress.replace('{n}', '1'), { exact: true }).count(), 0, 'Progress text is visually removed');
        await page.setViewportSize({ width: 320, height: 667 });
        await page.screenshot({ path: 'tests/visual-quiz-320.png' });
        await page.setViewportSize({ width: 390, height: 844 });
      }
      for (let i = 0; i < 3; i++) await button(en.QUIZ_QUESTIONS[i].options[answers[i]].label).click();
      await page.getByRole('dialog', { name: en.planetGuide.title }).waitFor();
      await button(en.planetGuide.confirm).click();
      await page.waitForTimeout(900);
      await page.evaluate(async () => {
        const parent = document.querySelector('canvas').parentElement;
        let fiber = parent[Object.keys(parent).find(key => key.startsWith('__reactFiber'))];
        while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
        let hook = fiber.memoizedState;
        while (hook && !hook.memoizedState?.current?.renderer) hook = hook.next;
        const renderer = hook.memoizedState.current.renderer;
        const render = renderer.render.bind(renderer);
        renderer.render = (scene, camera) => { render(scene, camera); window.__scene = scene; };
      });
      await page.waitForFunction(() => window.__scene);
      const clusters = await page.evaluate(() => window.__scene.getObjectByName('interactive-garden').children.filter(child => child.name.startsWith('garden-cluster-')).length);
      assert.equal(clusters, planet === 'SIGMA_03' ? 5 : 6, 'Planet-specific surface props');
      await page.waitForFunction(() => window.__scene.getObjectByName('interactive-garden').userData.pendingTextures === 0);
      await page.screenshot({ path: `tests/visual-${planet}.png` });
      if (planet !== 'OMEGA_01') {
        await approach(page, 'garden-cluster-0');
        const effect = await page.evaluate(() => {
          const g = window.__scene.getObjectByName('interactive-garden');
          return { reaction: g.userData.reaction, particles: g.children.filter(o => o.name === 'biome-reaction-particle' && o.visible).length };
        });
        assert.equal(effect.reaction, { DELTA_02: 'morningDew', SIGMA_03: 'cloudFluff', PSI_04: 'starBubbles' }[planet]);
        assert.ok(effect.particles > 0, 'Walking triggers the biome-specific particles');
        await page.screenshot({ path: `tests/interaction-${planet}.png` });
      }
      if (planet === 'OMEGA_01') {
        const audioBefore = await page.evaluate(() => window.__audioNotes.length);
        await approach(page, 'garden-cluster-0');
        assert.ok(await page.evaluate(before => window.__audioNotes.length > before, audioBefore), 'Walking near a plant plays a soft chime');
        const gardenState = () => {
          const g = window.__scene.getObjectByName('interactive-garden');
          return { footprints: g.children.filter(o => o.name === 'walking-footprint' && o.visible).length, bursts: g.children.filter(o => o.name === 'biome-reaction-particle' && o.visible).length };
        };
        const during = await page.evaluate(gardenState);
        assert.ok(during.footprints > 0, 'Walking leaves visible surface footprints');
        await page.screenshot({ path: 'tests/visual-garden-encounter.png' });
        await page.waitForTimeout(2000);
        assert.equal((await page.evaluate(gardenState)).footprints, 0, 'Footprints fade after stopping');
        const chimeCount = await page.evaluate(() => window.__scene.getObjectByName('garden-cluster-0').userData.interactions);
        await page.waitForTimeout(1200);
        assert.equal(await page.evaluate(() => window.__scene.getObjectByName('garden-cluster-0').userData.interactions), chimeCount, 'Standing by a plant does not repeatedly chime');
        await button('中文').click();
        assert.ok((await page.locator('.landmark-label').allTextContents()).some(text => text.includes(zh.stoneLabel)), 'Landmark labels translate immediately');
        await page.setViewportSize({ width: 320, height: 667 });
        await page.screenshot({ path: 'tests/visual-garden-zh-320.png' });
      }
      await page.close();
      console.log(`PASS: ${planet} palette and surface scene`);
    }
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('PASS: opening/quiz layout, four palettes, plant proximity chime, fading footprints, stationary cooldown and bilingual landmark labels.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
