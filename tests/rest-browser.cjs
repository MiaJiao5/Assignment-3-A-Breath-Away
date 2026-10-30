const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { Vector3, Quaternion } = await import('three');
  const browser = await chromium.launch({ ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {channel:'chrome'}), headless:true, args:['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const button = name => page.getByRole('button',{name,exact:true});
    await page.goto(process.env.APP_URL || 'http://localhost:3000');
    await button('[ Begin Your Little Escape ]').click(); await button('Skip and Wander').click();
    await page.locator('canvas').waitFor();
    await page.evaluate(() => {
      const canvas=document.querySelector('canvas');
      let fiber=canvas.parentElement[Object.keys(canvas.parentElement).find(k=>k.startsWith('__reactFiber'))];
      while(fiber&&!fiber.memoizedProps?.planetCoordsRef) fiber=fiber.return;
      window.__controls=fiber.memoizedProps;
      let hook=fiber.memoizedState; while(hook&&!hook.memoizedState?.current?.renderer) hook=hook.next;
      const renderer=hook.memoizedState.current.renderer;
      const render=renderer.render.bind(renderer);
      renderer.render=(scene,camera)=>{
        render(scene,camera);
        const planet=scene.getObjectByName('planet-surface');
        const spirit=scene.getObjectByName('spirit-surface-root');
        const body=scene.getObjectByName('spirit-body');
        const shadow=scene.getObjectByName('spirit-contact-shadow');
        const rock=scene.getObjectByName('listening-stone');
        const position=spirit.getWorldPosition(spirit.position.clone());
        const q=body.getWorldQuaternion(body.quaternion.clone());
        const front=position.clone().set(0,0,1).applyQuaternion(q);
        const toCamera=camera.position.clone().sub(position).normalize();
        const normal=spirit.position.clone().normalize().applyQuaternion(planet.quaternion);
        const projected=position.clone().addScaledVector(normal,.24).project(camera);
        const stone=rock.getWorldPosition(rock.position.clone()).addScaledVector(rock.position.clone().normalize().applyQuaternion(planet.quaternion),.12).project(camera);
        const surfaceVisibility=normal.dot(camera.position.clone().sub(planet.position));
        if(window.__watchVisibility) window.__visibilityMin=Math.min(window.__visibilityMin,surfaceVisibility);
        window.__view={
          coords:{...__controls.planetCoordsRef.current},
          position:spirit.position.toArray(), radius:spirit.position.length(), planetQuaternion:planet.quaternion.toArray(),
          alignment:position.clone().set(0,1,0).applyQuaternion(spirit.getWorldQuaternion(spirit.quaternion.clone())).dot(normal),
          shadowDistance:shadow.getWorldPosition(shadow.position.clone()).distanceTo(position),
          guide:scene.getObjectByName('listening-guide').visible,
          destination:scene.getObjectByName('listening-guide').userData.destination,
          clearance:spirit.position.distanceTo(rock.position),
          stoneGlow:rock.children.find(child=>child.geometry?.type==='CylinderGeometry').material.emissiveIntensity,
          facing:front.dot(toCamera), distance:camera.position.distanceTo(position),
          character:[projected.x,projected.y], stone:[stone.x,stone.y], surfaceVisibility,
          portal:(()=>{const portal=scene.getObjectByName('portal-landmark');const v=portal.getWorldPosition(portal.position.clone()).addScaledVector(portal.position.clone().normalize().applyQuaternion(planet.quaternion),.2).project(camera);return [v.x,v.y];})(),
          portalDirection:(()=>{const v=scene.getObjectByName('portal-landmark').position.clone().normalize().applyQuaternion(spirit.quaternion.clone().invert());return [v.x,v.z/.75];})(),
          stoneDirection:(()=>{const v=rock.position.clone().normalize().applyQuaternion(spirit.quaternion.clone().invert());return [v.x,v.z/.75];})()
        };
      };
    });
    await page.waitForFunction(()=>window.__view);
    await page.getByRole('dialog',{name:'A Little Guide to Your Planet'}).waitFor();
    const beforeGuide=await page.evaluate(()=>({...__controls.planetCoordsRef.current}));
    await page.keyboard.press('KeyD');
    await page.evaluate(()=>{ __controls.joystickInputRef.current={x:1,y:1}; __controls.onSelectLandmark('rock'); });
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(()=>({...__controls.planetCoordsRef.current})),beforeGuide,'Guide blocks movement and sitting until confirmation');
    await page.setViewportSize({width:320,height:667});
    const confirmBounds=await button(/^Got It,/).boundingBox();
    assert.ok(confirmBounds.y>=0 && confirmBounds.y+confirmBounds.height<=667,'Guide confirmation remains visible on small screens');
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'tests/planet-guide.png'});
    await button('中文').click(); await page.getByRole('dialog',{name:'漫游前，先看一眼'}).waitFor(); await button('EN').click();
    await button(/^Got It,/).click();
    const padSize=await page.locator('.wandering-joystick').boundingBox();
    assert.ok(padSize.width>=120 && padSize.height>=120,'Larger touch joystick');
    const tap = async key => {
      const p=await page.evaluate(k=>__view[k],key);const box=await page.locator('canvas').boundingBox();
      await page.locator('canvas').click({position:{x:(p[0]+1)*box.width/2,y:(1-p[1])*box.height/2}});
    };
    const approachLandmark = async (target='stone') => {
      const label=target==='portal'?'[ Enter Portal ]':'[ Sit & Listen ]';
      const pad=await page.locator('.wandering-joystick').boundingBox();
      const x=pad.x+pad.width/2, y=pad.y+pad.height/2;
      await page.mouse.move(x,y); await page.mouse.down();
      try {
        for(let i=0;i<120;i++) {
          if(await button(label).count()) return;
          const [dx,dy]=await page.evaluate(target=>__view[target+'Direction'],target);
          const length=Math.hypot(dx,dy)||1;
          await page.mouse.move(x+dx/length*28,y+dy/length*28);
          await page.waitForTimeout(80);
        }
      } finally { await page.mouse.up(); }
      await button(label).waitFor();
    };
    const approachStone=()=>approachLandmark('stone');
    const checkSurface = async () => {
      const v=await page.evaluate(()=>__view);
      assert.ok(Math.abs(v.radius-1.68)<1e-6,'Root remains on spherical surface');
      assert.ok(v.alignment>.99999,'Character up follows surface normal');
      assert.ok(Math.abs(v.shadowDistance-.015)<1e-6,'Contact shadow stays aligned beneath feet');
      assert.ok(v.clearance>=.585-1e-6,'Character and stone preserve physical clearance');
    };
    const checkRollDirection = async before => {
      const after = await page.evaluate(()=>__view);
      const previousRotation = new Quaternion().fromArray(before.planetQuaternion);
      const rotation = new Quaternion().fromArray(after.planetQuaternion);
      const previousPosition = new Vector3().fromArray(before.position);
      const groundTravel = previousPosition.clone().applyQuaternion(rotation).sub(previousPosition.clone().applyQuaternion(previousRotation));
      const characterTravel = new Vector3().fromArray(after.position).sub(previousPosition).applyQuaternion(previousRotation);
      assert.ok(groundTravel.dot(characterTravel) < 0, 'Ground rolls opposite the walking direction');
      assert.ok(previousRotation.angleTo(rotation) > .002, 'Walking visibly rotates the planet');
    };
    assert.equal(await page.locator('.planet-stage button').count(),0,'No pre-sit action buttons');
    assert.equal(await page.locator('.joystick-panel button').count(),0,'Joystick is the only movement control');
    assert.equal(await page.getByRole('textbox').count(),0);
    assert.equal(await page.getByRole('button',{name:/Sound On|Mute|Muted/}).count(),0,'Sound toggle removed');
    assert.equal(await page.evaluate(()=>__view.guide),true,'Initial light arc guides the walk');
    await checkSurface();
    await page.screenshot({path:'tests/wandering.png'});
    for(const [key,axis,sign] of [['KeyD','lon',1],['KeyS','lat',1],['KeyA','lon',-1],['KeyW','lat',-1]]) {
      const before=await page.evaluate(()=>__view);
      await page.keyboard.down(key);
      await page.waitForFunction(({axis,value,sign})=>(__view.coords[axis]-value)*sign>.055,{axis,value:before.coords[axis],sign});
      await page.keyboard.up(key); await checkSurface(); await checkRollDirection(before);
    }
    // Follow the guide using real keyboard movement until the contextual stone prompt appears.
    await page.keyboard.down('KeyD'); await page.waitForFunction(()=>__view.coords.lon>.45); await page.keyboard.up('KeyD');
    await button('[ Sit & Listen ]').waitFor();
    await checkSurface();
    await page.waitForFunction(()=>__view.stoneGlow>.1);
    assert.equal(await page.evaluate(()=>__view.destination),'rock','First guide points to the Listening Stone');
    await tap('character');
    assert.equal(await button('[ Stand Up ]').count(),0,'Tapping the companion does not sit');
    await tap('stone');
    assert.equal(await button('[ Stand Up ]').count(),0,'Tapping the stone does not sit');
    const action=await button('[ Sit & Listen ]').boundingBox();
    const joystick=await page.locator('.wandering-joystick').boundingBox();
    assert.ok(action.y+action.height<joystick.y,'Contextual action is above joystick');
    await page.screenshot({path:'tests/stone-sit-action.png'});
    await button('[ Sit & Listen ]').click();
    await button('[ Stand Up ]').waitFor();
    const seated=await page.evaluate(()=>({...__controls.planetCoordsRef.current}));
    const seatedAt=Date.now();
    assert.equal(await button('Leave for Now').count(),0,'Exit stays locked until the first Stand Up');
    assert.equal(await page.getByRole('textbox').count(),0,'Message panel waits before appearing');
    await page.waitForTimeout(3200);
    assert.equal(await page.getByRole('textbox').count(),0,'Message panel remains hidden before five seconds');
    await button('中文').click(); await button('EN').click();
    await page.getByRole('textbox').waitFor({state:'visible'});
    assert.ok(Date.now()-seatedAt>=4700,'Message panel waits five seconds');
    assert.equal(await button('Leave for Now').count(),0,'Sitting alone does not unlock exit');
    assert.equal(await page.locator('.message-panel').evaluate(el=>getComputedStyle(el).animationName),'messageReveal');
    const quote=page.locator('.animate-stardust-float').first();
    await quote.waitFor();
    const motion=await quote.evaluate(el=>({duration:getComputedStyle(el).animationDuration,x:new DOMMatrixReadOnly(getComputedStyle(el).transform).m41}));
    assert.equal(motion.duration,'24s');
    await page.waitForTimeout(900);
    const moved=await quote.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
    assert.ok(moved>motion.x && moved-motion.x<60,'Thoughts drift slowly left to right');
    const seatedRotation=await page.evaluate(()=>__view.planetQuaternion);
    assert.equal(await page.getByRole('textbox').count(),1);
    assert.equal(await page.locator('.joystick-panel').isVisible(),false,'Joystick disappears during rest');
    // The rear camera now fits the entire globe rather than cropping it for a close-up.
    await page.waitForFunction(()=>__view.facing<-.85);
    assert.equal(await page.evaluate(()=>__view.guide),false,'Guidance ends on sitting');
    await page.screenshot({path:'tests/resting.png'});
    await page.keyboard.press('ArrowRight');
    await page.evaluate(()=>{__controls.joystickInputRef.current={x:1,y:1};__controls.onSelectLandmark('portal');__controls.onSelectLandmark('rock');});
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(()=>({...__controls.planetCoordsRef.current})),seated,'Rest locks all movement');
    assert.deepEqual(await page.evaluate(()=>__view.planetQuaternion),seatedRotation,'Rest freezes planet rotation');
    assert.equal(await page.getByRole('dialog').count(),0);
    await button('中文').click(); await button('[ 起身 ]').waitFor(); await button('EN').click();
    assert.deepEqual(await page.evaluate(()=>({...__controls.planetCoordsRef.current})),seated);
    await button('[ Stand Up ]').click();
    await page.getByRole('dialog',{name:'Leave Whenever You Like'}).waitFor();
    const leaveBounds=await button('Leave for Now').boundingBox();
    const languageBounds=await page.locator('.language-toggle').boundingBox();
    assert.ok(leaveBounds.x<30 && Math.abs(leaveBounds.y-languageBounds.y)<2,'Exit is mirrored at the top left');
    await page.screenshot({path:'tests/exit-guide.png'});
    await button('Got It').click();
    await page.locator('.joystick-panel').waitFor({state:'visible'});
    await page.waitForFunction(()=>__view.guide && __view.destination==='portal');
    assert.equal(await page.getByRole('textbox').count(),0);
    assert.equal(await button('Leave for Now').count(),1,'Exit remains available after standing');
    await page.waitForFunction(()=>__view.distance>4.5);
    await approachLandmark('portal');
    const portalAction=await button('[ Enter Portal ]').boundingBox();
    const portalPad=await page.locator('.wandering-joystick').boundingBox();
    assert.ok(portalAction.y+portalAction.height<portalPad.y,'Portal action appears above joystick');
    await tap('portal'); assert.equal(await page.getByRole('dialog').count(),0,'Scene tap does not automatically open portal');
    await button('[ Enter Portal ]').click();
    await page.getByRole('dialog',{name:'Let the Stars Choose'}).waitFor();
    assert.equal(await page.locator('.planet-orbit-slot').count(),3);
    const paused=await page.evaluate(()=>({...__controls.planetCoordsRef.current}));
    await page.keyboard.press('KeyD'); await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>({...__controls.planetCoordsRef.current})),paused,'Discovery freezes movement');
    await page.screenshot({path:'tests/planet-discovery.png'});
    await button('Stay on This Planet').click();
    // Pointer dragging walks the companion and rolls the surface together.
    const pad=await page.locator('.wandering-joystick').boundingBox();
    const lon=await page.evaluate(()=>__view.coords.lon);
    await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();
    await page.mouse.move(pad.x+pad.width/2-20,pad.y+pad.height/2);
    await page.waitForFunction(value=>__view.coords.lon<value-.05,lon);await page.mouse.up();await checkSurface();
    // Hold through the old boundaries, a complete circuit, and both pole regions.
    await page.evaluate(()=>{window.__watchVisibility=true;window.__visibilityMin=Infinity;});
    for(const [key,axis,sign,distance] of [['KeyD','lon',1,Math.PI*2.1],['KeyW','lat',-1,Math.PI*2.1]]) {
      const origin=await page.evaluate(axis=>__view.coords[axis],axis);
      await page.keyboard.down(key);
      await page.waitForFunction(({axis,origin,sign,distance})=>(__view.coords[axis]-origin)*sign>distance,{axis,origin,sign,distance},{timeout:30000});
      await page.keyboard.up(key); await checkSurface();
      await page.waitForFunction(()=>Math.abs(__view.character[0])<.95 && Math.abs(__view.character[1])<.95 && __view.surfaceVisibility>1.68);
    }
    assert.ok(await page.evaluate(()=>__visibilityMin)>1.68,'Following camera keeps feet visible throughout long journeys');
    await page.evaluate(()=>{window.__watchVisibility=false;});
    await page.screenshot({path:'tests/full-globe-walk.png'});
    await approachStone(); await button('[ Sit & Listen ]').click(); await button('[ Stand Up ]').waitFor();
    // Input remains usable and drafts survive standing up.
    await page.getByRole('textbox').waitFor({state:'visible'});
    await page.getByRole('textbox').fill('A small thought');
    await button('[ Stand Up ]').click();await button('[ Sit & Listen ]').click();
    await page.getByRole('textbox').waitFor({state:'visible'});
    assert.equal(await page.getByRole('textbox').inputValue(),'A small thought');
    for(const width of [320,375,414]) {
      await page.setViewportSize({width,height:667});
      const overflows=await page.evaluate(()=>[...document.querySelectorAll('button,input')].filter(el=>el.getClientRects().length).some(el=>el.getBoundingClientRect().right>innerWidth+1||el.getBoundingClientRect().left<0));
      assert.equal(overflows,false,'Controls fit mobile viewport');
    }
    await button('Leave for Now').click();await button('Visit Another Planet').click();await page.getByRole('dialog').waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS: unrestricted full-globe walking and camera follow, four-direction counter-rotation, surface walking and world-space foot/shadow alignment, contextual sit button, stone clearance/glow, stone-to-portal guidance, rear resting view, frozen seated rotation, language/drafts, mobile layouts.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
