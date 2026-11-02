const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { completeQuiz, approach, installNavigation } = require('./navigation.cjs');
const { translations: { en } } = require('../src/i18n/translations.ts');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const [id, answers] of [['OMEGA_01',[0,0,0]],['DELTA_02',[1,1,1]],['SIGMA_03',[2,2,2]],['PSI_04',[0,1,2]]]) {
      if (process.env.PLANET_ID && process.env.PLANET_ID !== id) continue;
      const page = await browser.newPage({ viewport: {width:390,height:844} });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const b = name => page.getByRole('button', { name, exact:true });
      await installControlledNarration(page);
      await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
      await b(en.INTRO_COPY.startButton).click(); await page.waitForFunction(() => window.__introUtterance);
      await page.evaluate(() => window.__finishIntro()); await b(en.interlude.ready).click();
      await completeQuiz(page, answers); await b(en.planetGuide.confirm).click();
      await installNavigation(page);
      await page.evaluate(() => {
        const parent = document.querySelector('canvas').parentElement;
        let fiber = parent[Object.keys(parent).find(key=>key.startsWith('__reactFiber'))];
        while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber=fiber.return;
        window.__directionControls=fiber.memoizedProps;
        window.__directionSamples=[]; window.__directionCase=null;
        const render=window.__navRenderer.render.bind(window.__navRenderer);
        let previous=null;
        window.__navRenderer.render=(scene,camera)=>{
          render(scene,camera);
          const root=scene.getObjectByName('spirit-surface-root');
          const planet=scene.getObjectByName('planet-surface');
          const input=window.__directionControls.joystickInputRef.current;
          const active=window.__directionCase;
          if(previous && active && performance.now()>active.start+160) {
            const start=previous.position.clone().applyMatrix4(previous.world).applyMatrix4(previous.view);
            const end=root.position.clone().applyMatrix4(previous.world).applyMatrix4(previous.view);
            const dx=(end.x-start.x)*390, dy=(start.y-end.y)*window.__navRenderer.domElement.clientHeight;
            const length=Math.hypot(dx,dy);
            if(length>.025 && Math.hypot(input.x,input.y)>.06) {
              window.__directionSamples.push({case:active.name,dx,dy,length,
                dot:(dx*active.x+dy*active.y)/length, position:root.position.toArray()});
            }
          }
          previous={position:root.position.clone(),world:planet.matrixWorld.clone(),
            view:camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse)};
        };
      });
      const start = (name,x,y) => page.evaluate(([name,x,y]) => {window.__directionCase={name,x,y,start:performance.now()};},[name,x,y]);
      const end = () => page.evaluate(() => {window.__directionCase=null;});
      async function key(code,x,y,phase) {
        await start(`${phase}/${code}`,x,y); await page.keyboard.down(code);
        await page.waitForTimeout(500); await page.keyboard.up(code); await end(); await page.waitForTimeout(200);
      }
      async function stick(x,y,phase) {
        const pad=await page.locator('.wandering-joystick').boundingBox();
        const px=pad.x+pad.width/2, py=pad.y+pad.height/2;
        await page.mouse.move(px,py); await page.mouse.down();
        await start(`${phase}/stick(${x},${y})`,x,y);
        await page.mouse.move(px+x*26,py+y*26); await page.waitForTimeout(500);
        await page.mouse.up(); await end(); await page.waitForTimeout(200);
      }
      for(const [code,x,y] of [['ArrowLeft',-1,0],['ArrowUp',0,-1],['ArrowRight',1,0],['ArrowDown',0,1],['KeyA',-1,0],['KeyW',0,-1],['KeyD',1,0],['KeyS',0,1]]) await key(code,x,y,'arrival');
      // Walk around the actual 3D world before checking the pad again.
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1800); await page.keyboard.up('ArrowRight');
      await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1400); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(400);
      for(const [x,y] of [[-1,0],[0,-1],[1,0],[0,1]]) await stick(x,y,'rotated');
      await approach(page,'listening-stone','[ Sit & Listen ]');
      await b('[ Sit & Listen ]').click(); await page.waitForTimeout(1900);
      await b('[ Stand Up ]').click(); await b(en.exitGuide.confirm).click();
      // Input is available while the rear listening camera is easing back.
      for(const [code,x,y] of [['ArrowLeft',-1,0],['ArrowUp',0,-1],['ArrowRight',1,0],['ArrowDown',0,1]]) await key(code,x,y,'after-standing');
      await b('\u4e2d\u6587').click(); await b('EN').click();
      await stick(-1,0,'after-language'); await stick(0,-1,'after-language');
      const samples=await page.evaluate(()=>window.__directionSamples);
      const reversed=samples.filter(sample=>sample.dot<-.08);
      assert.ok(samples.length>20, `${id}: enough real rendered movement samples (${samples.length})`);
      assert.deepEqual(reversed,[],`${id}: movement must not reverse the control: ${JSON.stringify(reversed.slice(0,8))}`);
      for(const axis of ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown']) assert.ok(samples.some(sample=>sample.case.includes(axis)&&sample.dot>.7), `${id}: ${axis} moves in its screen direction`);
      assert.deepEqual(errors,[]);
      await page.screenshot({path:`tests/directions-${id}.png`});
      console.log(`PASS: ${id}, ${samples.length} live direction samples for arrows/WASD, joystick, rotated travel and immediate return from listening`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
