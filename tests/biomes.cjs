const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { approach, installNavigation } = require('./navigation.cjs');

(async () => {
  const { PLANETS } = await import(pathToFileURL(path.resolve('src/data/roamingData.ts')));
  const expected = {
    OMEGA_01: { angles: [25,80,145,210,275,330], stone: 55, portal: 180 },
    DELTA_02: { angles: [15,65,125,190,245,305], stone: 95, portal: 220 },
    SIGMA_03: { angles: [40,115,175,250,315], stone: 75, portal: 145 },
    PSI_04: { angles: [10,70,135,200,265,325], stone: 105, portal: 295 },
  };
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const b = name => page.getByRole('button', { name, exact: true });
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
    await b('Begin Your Little Escape').click(); await b("I'm Ready →").click();
    await b('Skip and Wander').click(); await b(/^Got It,/).click();
    await installNavigation(page);
    const seen = [], types = new Set();
    for (let visit = 0; visit < 4; visit++) {
      await page.waitForFunction(() => window.__navScene.getObjectByName('interactive-garden').userData.pendingTextures === 0);
      const snapshot = await page.evaluate(() => {
        const garden = window.__navScene.getObjectByName('interactive-garden');
        const angle = object => (Math.atan2(object.position.x, object.position.y) * 180 / Math.PI + 360) % 360;
        return {
          id: garden.userData.planetId,
          props: garden.children.filter(o => o.name.startsWith('garden-cluster-')).map(o => ({ type: o.userData.propType, angle: o.userData.angle, loaded: o.children[0].children[0].material.map.image?.naturalWidth > 0 })),
          stone: angle(window.__navScene.getObjectByName('listening-stone')),
          portal: angle(window.__navScene.getObjectByName('portal-landmark')),
        };
      });
      assert.ok(!seen.includes(snapshot.id), 'Travel selects an unvisited planet');
      seen.push(snapshot.id);
      assert.deepEqual(snapshot.props.map(p => p.angle), expected[snapshot.id].angles, 'Rendered positions match requested degree distribution');
      assert.deepEqual(snapshot.props.map(p => p.type), PLANETS[snapshot.id].props.map(p => p.type), 'Current biome configuration is rendered');
      assert.ok(snapshot.props.every(p => p.loaded), 'All SVG illustrations load');
      for (const type of new Set(snapshot.props.map(p => p.type))) { assert.ok(!types.has(type), 'No plant silhouette is reused between biomes'); types.add(type); }
      assert.ok(Math.abs(snapshot.stone - expected[snapshot.id].stone) < .00001);
      assert.ok(Math.abs(snapshot.portal - expected[snapshot.id].portal) < .00001);
      await page.evaluate(() => { window.__gardenBeforeLanguage = window.__navScene.getObjectByName('interactive-garden'); });
      await b('中文').click(); await b('EN').click();
      assert.equal(await page.evaluate(() => window.__gardenBeforeLanguage === window.__navScene.getObjectByName('interactive-garden')), true, 'Language switching preserves the biome and interaction state');
      await page.screenshot({ path: `tests/biome-${snapshot.id}.png` });
      await approach(page, 'listening-stone', '[ Sit & Listen ]');
      await b('[ Sit & Listen ]').click(); await b('[ Stand Up ]').click();
      if (await b('Got It').count()) await b('Got It').click();
      const controls = await page.evaluate(() => {
        const leave = getComputedStyle(document.querySelector('.leave-control'));
        const language = getComputedStyle(document.querySelector('.language-toggle'));
        return { leaveBg: leave.backgroundColor, langBg: language.backgroundColor, blur: leave.backdropFilter, border: leave.borderStyle, color: leave.color };
      });
      assert.equal(controls.leaveBg, controls.langBg, 'Top-left and top-right glass backgrounds match');
      assert.equal(controls.blur, 'blur(10px)'); assert.equal(controls.border, 'none');
      assert.equal(controls.color, 'rgba(255, 255, 255, 0.85)');
      if (visit === 3) break;
      await approach(page, 'portal-landmark', '[ Enter Portal ]');
      await page.evaluate(() => {
        window.__oldCanvas = document.querySelector('canvas');
        window.__oldGarden = window.__navScene.getObjectByName('interactive-garden');
        window.__disposedArt = 0;
        window.__oldGarden.traverse(o => { if (o.material?.map) o.material.map.addEventListener('dispose', () => window.__disposedArt++); });
      });
      await b('[ Enter Portal ]').click();
      const spin = b('Find My Next Planet');
      // The last remaining planet skips the lottery.
      if (visit < 2) { await spin.waitFor(); await spin.click(); }
      await b(/^Got It,/).waitFor(); await b(/^Got It,/).click();
      assert.equal(await page.evaluate(() => window.__oldCanvas === document.querySelector('canvas')), true, 'Travel updates ecology without recreating WebGL');
      assert.equal(await page.evaluate(() => window.__oldGarden === window.__navScene.getObjectByName('interactive-garden')), false, 'Old biome is replaced');
      assert.ok(await page.evaluate(() => window.__disposedArt) > 0, 'Old SVG textures are disposed');
      console.log(`PASS: ${snapshot.id} biome, configured landmarks, glass exit and in-place travel`);
    }
    assert.equal(seen.length, 4); assert.equal(types.size, 12);
    assert.deepEqual(errors, []);
    console.log('PASS: four distinct biomes / 12 prop types, exact angles, translated hints, safe landmark interaction and live portal switching.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
