const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { translations: { en } } = require('../src/i18n/translations.ts');
const { installNavigation } = require('./navigation.cjs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const [id, answers] of [['OMEGA_01',[0,0,0]], ['DELTA_02',[1,1,1]], ['SIGMA_03',[2,2,2]], ['PSI_04',[0,1,2]]]) {
      if(process.env.PLANET_ID && process.env.PLANET_ID!==id)continue;
      const page = await browser.newPage({ viewport: { width:390, height:844 }, reducedMotion:'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const b = name => page.getByRole('button', { name, exact:true });
      await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001');
      await b(en.INTRO_COPY.startButton).click(); await b(en.interlude.ready).click();
      for (let i=0;i<3;i++) await b(en.QUIZ_QUESTIONS[i].options[answers[i]].label).click();
      await b(en.planetGuide.confirm).click(); await installNavigation(page);
      await page.evaluate(() => {
        const parent=document.querySelector('canvas').parentElement;
        let fiber=parent[Object.keys(parent).find(k=>k.startsWith('__reactFiber'))];
        while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber=fiber.return;
        window.__controls=fiber.memoizedProps;
        window.__frames=0;
        const render=__navRenderer.render.bind(__navRenderer);
        __navRenderer.render=(scene,camera)=>{ render(scene,camera);window.__camera=camera;window.__frames++; };
        window.__bounds=()=>{
          const scene=__navScene,camera=__camera,canvas=__navRenderer.domElement;
          let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,rightObject='';
          const include=(point,name='globe')=>{
            point.project(camera);
            const x=(point.x+1)*canvas.clientWidth/2, y=(1-point.y)*canvas.clientHeight/2;
            if(x>right)rightObject=name;
            left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
          };
          const meshBounds=object=>{
            if (!object.geometry || !object.visible) return;
            object.geometry.computeBoundingBox();
            const {min,max}=object.geometry.boundingBox;
            for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])include(object.position.clone().set(x,y,z).applyMatrix4(object.matrixWorld),object.name||object.geometry.type);
          };
          const planet=scene.getObjectByName('planet-surface');
          for(const mesh of planet.children.filter(child=>child.geometry?.type==='SphereGeometry')){
            const vertices=mesh.geometry.attributes.position;
            for(let i=0;i<vertices.count;i++)include(mesh.position.clone().fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld));
          }
          for(const name of ['spirit-body','listening-stone','portal-landmark'])scene.getObjectByName(name).traverseVisible(meshBounds);
          const garden=scene.getObjectByName('interactive-garden');
          for(const cluster of garden.children.filter(o=>o.name.startsWith('garden-cluster-')))meshBounds(cluster.children[0].children[0]);
          return {left,right,top,bottom,rightObject,view:camera.view,width:canvas.clientWidth,height:canvas.clientHeight,interactions:garden.children.filter(o=>o.name.startsWith('garden-cluster-')).reduce((n,o)=>n+o.userData.interactions,0)};
        };
      });
      await page.waitForFunction(()=>window.__camera && __navScene.getObjectByName('interactive-garden').userData.pendingTextures===0);
      const pad=await page.locator('.wandering-joystick').boundingBox();
      assert.ok(Math.abs(pad.width-124)<.1 && Math.abs(pad.height-124)<.1);
      assert.ok(Math.abs((await page.locator('.joystick-knob').boundingBox()).width-50)<.1);
      await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();
      await page.mouse.move(pad.x+pad.width+80,pad.y+pad.height/2);
      await page.waitForTimeout(180);
      assert.ok(await page.evaluate(()=>__controls.joystickInputRef.current.x>.99),'Larger pad still gives full directional input');
      await page.mouse.up();
      assert.deepEqual(await page.evaluate(()=>__controls.joystickInputRef.current),{x:0,y:0},'Releasing the larger pad stops movement');
      // Real spherical coordinate steps exercise the existing transport,
      // collision and counter-rotation logic, not a separate display model.
      for(const [width,height] of [[320,568],[320,667],[390,844],[414,844],[1280,900]]){
        await page.setViewportSize({width,height});await page.waitForTimeout(250);
        for(const [dx,dy] of [[1,0],[0,1],[Math.SQRT1_2,Math.SQRT1_2]])for(let step=0;step<12;step++){
          const frame=await page.evaluate(([dx,dy])=>{
            __controls.planetCoordsRef.current.lon+=dx*Math.PI/6;
            __controls.planetCoordsRef.current.lat+=dy*Math.PI/6;
            __controls.targetCoordsRef.current={...__controls.planetCoordsRef.current};
            __controls.springVelocityRef.current={lon:0,lat:0};
            return __frames;
          },[dx,dy]);
          await page.waitForFunction(previous=>__frames>previous,frame);
          const bounds=await page.evaluate(()=>__bounds());
          assert.ok(bounds.left>=15.8 && bounds.right<=bounds.width-15.8,`${id}/${width} horizontal: ${JSON.stringify(bounds)}`);
          assert.ok(bounds.top>=13.8 && bounds.bottom<=bounds.height-17.8,`${id}/${width} vertical: ${JSON.stringify(bounds)}`);
        }
        if(width===390)await page.screenshot({path:`tests/framing-${id}-390.png`});
      }
      // Check actual moving/swaying/enlarging geometry with smooth camera
      // following as well as the immediate reduced-motion composition above.
      await page.emulateMedia({reducedMotion:'no-preference'});
      for(let step=0;step<24;step++){
        const frame=await page.evaluate(()=>{
          __controls.joystickInputRef.current={x:1,y:.15};
          __controls.planetCoordsRef.current.lon+=Math.PI/12;
          __controls.targetCoordsRef.current={...__controls.planetCoordsRef.current};
          __controls.springVelocityRef.current={lon:0,lat:0};return __frames;
        });
        await page.waitForFunction(previous=>__frames>previous,frame);
        const bounds=await page.evaluate(()=>__bounds());
        assert.ok(bounds.left>=15.8 && bounds.right<=bounds.width-15.8 && bounds.top>=13.8 && bounds.bottom<=bounds.height-17.8,`${id}: animated crowns remain complete: ${JSON.stringify(bounds)}`);
      }
      await page.evaluate(()=>{__controls.joystickInputRef.current={x:0,y:0};});
      assert.deepEqual(errors,[]);
      await page.close();console.log(`PASS: ${id}, 180 multi-axis rotation samples, five viewports, enlarged joystick and 24 animated samples`);
    }
    console.log(`PASS: ${process.env.PLANET_ID || 'all four planets'} keep globe, character, landmarks and complete plant planes inside the canvas with safe edges.`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
