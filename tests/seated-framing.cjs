const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: 'chrome' }),
    headless: true, args: ['--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const button = name => page.getByRole('button', { name, exact: true });
    await page.goto(process.env.APP_URL || 'http://localhost:3000');
    await button('Begin Your Little Escape').click();
    await button("I'm Ready →").click();
    await button('Skip and Wander').click();
    await page.locator('canvas').waitFor();
    await page.evaluate(() => {
      const parent = document.querySelector('canvas').parentElement;
      let fiber = parent[Object.keys(parent).find(key => key.startsWith('__reactFiber'))];
      while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
      let hook = fiber.memoizedState;
      while (hook && !hook.memoizedState?.current?.renderer) hook = hook.next;
      const renderer = hook.memoizedState.current.renderer;
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        render(scene, camera);
        window.__scene = scene;
        window.__camera = camera;
      };
      window.__framing = () => {
        const scene = window.__scene, camera = window.__camera;
        const planet = scene.getObjectByName('planet-surface');
        const spirit = scene.getObjectByName('spirit-body');
        const canvas = renderer.domElement.getBoundingClientRect();
        const points = [], bodyPoints = [], torsoPoints = [];
        for (const name of ['spirit-body', 'listening-stone']) {
          scene.getObjectByName(name).traverseVisible(object => {
            if (!object.geometry) return;
            object.geometry.computeBoundingBox();
            const { min, max } = object.geometry.boundingBox;
            for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
              const point = object.position.clone().set(x, y, z).applyMatrix4(object.matrixWorld).project(camera);
              points.push(point);
              if (name === 'spirit-body') bodyPoints.push(point);
            }
          });
        }
        // Use the torso's actual silhouette; rotated box corners overestimate
        // a round character differently in the walking and rear views.
        const torso = spirit.children[0];
        const vertices = torso.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
          torsoPoints.push(torso.position.clone().fromBufferAttribute(vertices, i).applyMatrix4(torso.matrixWorld).project(camera));
        }
        const bounds = {
          left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
          top: Math.max(...points.map(p => p.y)), bottom: Math.min(...points.map(p => p.y)),
        };
        const position = spirit.getWorldPosition(spirit.position.clone());
        const front = position.clone().set(0, 0, 1).applyQuaternion(spirit.getWorldQuaternion(spirit.quaternion.clone()));
        return {
          bounds, facing: front.dot(camera.position.clone().sub(position).normalize()),
          distance: camera.position.distanceTo(scene.getObjectByName('spirit-surface-root').getWorldPosition(position.clone())),
          fov: camera.fov,
          bodyWidth: (Math.max(...torsoPoints.map(p => p.x)) - Math.min(...torsoPoints.map(p => p.x))) * canvas.width / 2,
          bodyTop: canvas.y + (1 - Math.max(...bodyPoints.map(p => p.y))) * canvas.height / 2,
          canvas: { top: canvas.y, bottom: canvas.bottom, height: canvas.height },
        };
      };
    });
    await button(/^Got It,/).click();
    await page.keyboard.down('KeyD');
    await button('[ Sit & Listen ]').waitFor();
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(1600);
    const walkingView = await page.evaluate(() => window.__framing());
    await button('[ Sit & Listen ]').click();
    await page.getByRole('textbox').waitFor();
    const check = async (name) => {
      // Allow the camera's smooth transition to settle after resizing/layout changes.
      await page.waitForTimeout(3800);
      const view = await page.evaluate(() => window.__framing());
      const sky = await page.locator('.stardust-layer').boundingBox();
      assert.ok(view.bounds.left > -.98 && view.bounds.right < .98, `${name}: companion and cushion fit horizontally`);
      assert.ok(view.bounds.top < .98 && view.bounds.bottom > -.98, `${name}: companion and cushion fit vertically`);
      assert.ok(view.facing < -.6, `${name}: rear seated perspective is preserved`);
      assert.ok(view.distance >= 3.8, `${name}: camera respects its nearest seated distance`);
      assert.ok(view.fov <= 34.01 && view.fov >= 33.99, `${name}: seated lens stays within its limit`);
      assert.ok(sky.y + sky.height <= view.bodyTop, `${name}: the thought lanes are reserved above the character`);
      for (const quote of await page.locator('.animate-stardust-float').all()) {
        const box = await quote.boundingBox();
        if (box) assert.ok(box.y + box.height < view.bodyTop, `${name}: thoughts stay in the sky above the character`);
      }
      const action = await button('[ Stand Up ]').boundingBox();
      const input = await page.getByRole('textbox').boundingBox();
      assert.ok(view.canvas.bottom <= action.y + 1, `${name}: controls do not cover the scene`);
      assert.ok(input.y + input.height <= page.viewportSize().height, `${name}: message input stays on screen`);
      const release = await button('[ Let It Float ]').boundingBox();
      const frame = await page.locator('main').boundingBox();
      assert.ok(release.x + release.width <= frame.x + frame.width, `${name}: release button fits the form`);
      await page.screenshot({ path: `tests/seated-${name}.png` });
      console.log(name, JSON.stringify(view));
    };
    await check('390x844');
    const restingView = await page.evaluate(() => window.__framing());
    console.log('Camera comparison', JSON.stringify({ walking: walkingView, resting: restingView }));
    assert.ok(restingView.distance < walkingView.distance, 'Sitting gently moves the camera closer');
    assert.ok(restingView.bodyWidth > walkingView.bodyWidth * 1.25, 'Companion grows at least 25% after sitting');
    assert.ok(restingView.bodyWidth < walkingView.bodyWidth * 1.4, 'Seated enlargement remains restrained');
    const draft = 'A thought stays here';
    await page.getByRole('textbox').fill(draft);
    for (const [width, height] of [[320, 667], [414, 667], [1280, 900]]) {
      await page.setViewportSize({ width, height });
      await check(`${width}x${height}`);
      assert.equal(await page.getByRole('textbox').inputValue(), draft);
    }
    await button('中文').click();
    await page.getByRole('textbox').fill('星星会慢慢听我说'.repeat(7).slice(0, 60));
    await page.getByRole('button', { name: '[ 放飞 ]', exact: true }).click();
    await page.waitForTimeout(3800);
    const view = await page.evaluate(() => window.__framing());
    for (const quote of await page.locator('.animate-stardust-float').all()) {
      const box = await quote.boundingBox();
      assert.ok(box.y + box.height < view.bodyTop, 'Long Chinese thoughts stay above the character');
    }
    await page.screenshot({ path: 'tests/seated-chinese.png' });
    assert.deepEqual(errors, []);
    await button('EN').click();
    await button('[ Stand Up ]').click();
    await page.waitForFunction(() => window.__camera.fov === 38);
    const standingView = await page.evaluate(() => window.__framing());
    assert.equal(standingView.fov, 38, 'Standing restores the walking lens');
    console.log('PASS: local seated focus and 1.3x zoom; companion/cushion fit mobile/desktop; thoughts, rear view, controls, drafts and language switching remain intact.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
