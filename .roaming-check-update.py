from pathlib import Path
p=Path('tests/rest-browser.cjs');s=p.read_text(encoding='utf-8')
s=s.replace('        window.__view={', '''        const surfaceVisibility=normal.dot(camera.position.clone().sub(planet.position));
        if(window.__watchVisibility) window.__visibilityMin=Math.min(window.__visibilityMin,surfaceVisibility);
        window.__view={''')
s=s.replace('          character:[projected.x,projected.y], stone:[stone.x,stone.y]', '          character:[projected.x,projected.y], stone:[stone.x,stone.y], surfaceVisibility')
s=s.replace("    assert.equal(await page.getByRole('textbox').count(),0);\n    assert.equal(await page.evaluate(()=>__view.guide)", "    assert.equal(await page.getByRole('textbox').count(),0);\n    assert.equal(await page.getByRole('button',{name:/Sound On|Mute|Muted/}).count(),0,'Sound toggle removed');\n    assert.equal(await page.evaluate(()=>__view.guide)")
needle="    await tap('character');await button('[ Resume Wandering ]').waitFor();"
s=s.replace(needle,'''    // Hold through the old boundaries, a complete circuit, and both pole regions.
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
'''+needle,1)
s=s.replace('four-direction counter-rotation, surface walking', 'unrestricted full-globe walking and camera follow, four-direction counter-rotation, surface walking')
p.write_text(s,encoding='utf-8')
p=Path('README.md');s=p.read_text(encoding='utf-8').replace('The walk stays within the visible portion of the sphere.', 'Walking continues around the entire sphere without artificial borders. The camera follows the local surface frame so the companion remains visible through full circuits and pole crossings.').replace('The language and sound controls remain available.', 'The language control remains available. The Sound On / mute toggle has been removed; sitting still starts the ambient music.');p.write_text(s,encoding='utf-8')
p=Path('PROCESS.md');s=p.read_text(encoding='utf-8').replace('Both coordinate limits keep the walk on the visible portion of the globe.', 'The previous longitude/latitude limits are removed. Movement now transports a quaternion tangent frame over the sphere, so pole crossings and complete circuits remain continuous. The camera follows that frame while keeping the resting view, foot contact, and world-space shadow aligned.').replace('A quaternion maps the current surface normal back toward its initial normal, applying 45% of that inverse rotation to the shared planet parent.', 'Each surface step applies 45% of its inverse rotation to the shared planet parent.').replace('Language and sound remain available.', 'Language remains available. The Sound On / mute toggle is removed, while sitting continues to start the music.');s+='''
## Continuous roaming and raised layout

The globe, movement instructions, and joystick are raised using a shorter planet header and additional space below the planet scene. The farewell button occupies reserved header space so appearing after three seconds does not shift the scene. The camera follows the transported surface frame, maintaining consistent input directions and visibility on the far side and across poles. The resting regression includes held input for complete horizontal and vertical circuits, checks that the old boundaries no longer stop movement, and measures surface visibility and foot/shadow alignment throughout.
''';p.write_text(s,encoding='utf-8')
