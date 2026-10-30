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
    await button('[ Begin Your Little Escape ]').click();
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
        // Sample the maximum pulsing halo, not only its current animation size.
        for (let lat = 0; lat <= 32; lat++) {
          for (let lon = 0; lon < 64; lon++) {
            const phi = lat / 32 * Math.PI, theta = lon / 64 * Math.PI * 2;
            points.push(planet.position.clone().set(
              Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta),
            ).multiplyScalar(1.68 * 1.065 * 1.035).add(planet.position).project(camera));
          }
        }
        for (const name of ['spirit-body', 'listening-stone', 'portal-landmark']) {
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
      assert.ok(view.bounds.left > -.99 && view.bounds.right < .99, `${name}: complete scene fits horizontally`);
      assert.ok(view.bounds.top < .99 && view.bounds.bottom > -.99, `${name}: globe bottom and models remain in the canvas`);
      assert.ok(view.facing < -.85, `${name}: rear seated perspective is preserved`);
      assert.ok(view.distance >= 4.2, `${name}: camera respects its nearest seated distance`);
      assert.ok(view.fov <= 48 && view.fov >= 47.9, `${name}: seated lens stays within its limit`);
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
    const candidates = await page.evaluate(() => {
      const scene = window.__scene, original = window.__camera;
      const planet = scene.getObjectByName('planet-surface');
      const root = scene.getObjectByName('spirit-surface-root');
      const body = scene.getObjectByName('spirit-body');
      const normal = root.position.clone().normalize().applyQuaternion(planet.quaternion);
      const forward = normal.clone().set(0,0,1).applyQuaternion(root.quaternion).applyQuaternion(planet.quaternion);
      const rootWorld = root.getWorldPosition(root.position.clone());
      const front = normal.clone().set(0,0,1).applyQuaternion(body.getWorldQuaternion(body.quaternion.clone()));
      const torso = body.children[0], vertices = torso.geometry.attributes.position;
      const result = [];
      for (const fov of [48,54,58,60,64]) for (const elevation of [.52,.65,.75,.85]) {
        const camera = original.clone(); camera.fov = fov; camera.updateProjectionMatrix();
        const back = forward.clone().addScaledVector(normal,elevation).normalize();
        const right = normal.clone().cross(back).normalize();
        const up = back.clone().cross(right).normalize();
        const {fullWidth:w,fullHeight:h,offsetY} = camera.view;
        const sky = Math.min(144,Math.max(120,h*.24));
        const tan = Math.tan(fov*Math.PI/360);
        const side = tan*camera.aspect*(1-24/w);
        const top = tan*(1-2*(sky+offsetY)/h), bottom = tan*(1-2*(12-offsetY)/h);
        let distance=0, topBound=-Infinity, bottomBound=Infinity;
        for (const [object,height,radius] of [[planet,0,1.68*1.065*1.035],[root,.25,.46],[scene.getObjectByName('listening-stone'),.19,.42],[scene.getObjectByName('portal-landmark'),.22,.4]]) {
          const p=object.localToWorld(normal.clone().set(0,height,0)).sub(planet.position);
          const x=p.dot(right), y=p.dot(up), z=p.dot(back);
          distance=Math.max(distance,z+(Math.abs(x)+radius*Math.hypot(1,side))/side);
          topBound=Math.max(topBound,y+top*z+radius*Math.hypot(1,top));
          bottomBound=Math.min(bottomBound,y-bottom*z-radius*Math.hypot(1,bottom));
        }
        distance=Math.max(distance,(topBound-bottomBound)/(top+bottom),1.68*back.dot(normal)+4.2);
        const focusHeight=(topBound-top*distance+bottomBound+bottom*distance)/2;
        const focus=planet.position.clone().addScaledVector(up,focusHeight);
        camera.position.copy(focus).addScaledVector(back,distance); camera.up.copy(normal);camera.lookAt(focus);camera.updateMatrixWorld(true);
        const xs=[];
        for(let i=0;i<vertices.count;i++) xs.push(normal.clone().fromBufferAttribute(vertices,i).applyMatrix4(torso.matrixWorld).project(camera).x);
        result.push({fov,elevation,width:(Math.max(...xs)-Math.min(...xs))*w/2,distance:camera.position.distanceTo(rootWorld),facing:front.dot(camera.position.clone().sub(rootWorld).normalize())});
      }
      return result;
    });
    console.log('CANDIDATES',JSON.stringify(candidates));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
