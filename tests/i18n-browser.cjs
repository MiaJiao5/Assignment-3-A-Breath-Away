// Run against npm run dev. Install playwright, or set PLAYWRIGHT_MODULE to its module path.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
 const { translations: { en, zh } } = await import(pathToFileURL(path.resolve('src/i18n/translations.ts')));
 const leaves = (obj, prefix = '') => Object.entries(obj).flatMap(([k,v]) => typeof v === 'object' ? leaves(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
 assert.deepEqual(leaves(en), leaves(zh), 'Complete translation key parity');
 const browser = await chromium.launch({ ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: 'chrome' }), headless: true, args: ['--enable-unsafe-swiftshader'] });
 const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
 const page = await context.newPage();
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 const base = process.env.APP_URL || 'http://localhost:3000';
 const button = label => page.getByRole('button', { name: label, exact: true });
 const has = async text => { await page.waitForFunction(value => document.body.innerText.includes(value), text); };
 const toggle = async lang => { await button(lang).click(); assert.equal(await button(lang).getAttribute('aria-pressed'), 'true'); };
 const fit = async () => {
   const problems = await page.evaluate(() => [...document.querySelectorAll('button,input')].filter(el => {
     if (!el.getClientRects().length) return false;
     const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2;
   }).map(el => el.textContent));
   assert.deepEqual(problems, [], 'Controls fit viewport and text containers');
   const overlaps = await page.evaluate(() => {
     const a = document.querySelector('.language-toggle').getBoundingClientRect();
     return [...document.querySelectorAll('.app-header button')].some(el => {
       const b = el.getBoundingClientRect(); return b.left < a.right && b.right > a.left && b.top < a.bottom && b.bottom > a.top;
     });
   }); assert.equal(overlaps, false, 'Toggle does not overlap header actions');
 };
 await page.goto(base);
 await has(en.INTRO_COPY.welcome);
 assert.equal(await button(en.ROAMING_COPY.leaveButton).count(), 0, 'No farewell action on onboarding');
 for (const width of [320,375,390,414]) { await page.setViewportSize({width,height:667}); await fit(); }
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('html').getAttribute('lang'), 'en');
 await toggle('中文'); await has(zh.INTRO_COPY.welcome);
 assert.equal(await page.getByRole('group').getAttribute('aria-label'), zh.switchLanguage);
 await page.reload(); await has(zh.INTRO_COPY.welcome); // saved preference
 await toggle('EN'); await button(`[ ${en.INTRO_COPY.startButton} ]`).click();
 for (let i=0; i<3; i++) {
   await has(en.QUIZ_QUESTIONS[i].question);
   assert.equal(await button(en.ROAMING_COPY.leaveButton).count(),0,'No farewell action in quiz');
   const icons = await page.locator('.airbrush-tape-option [aria-hidden="true"]').allTextContents();
   assert.deepEqual(icons,en.QUIZ_QUESTIONS[i].options.map(option=>option.emoji),'English mood icons'); await page.setViewportSize({width:320,height:667}); await fit(); await page.setViewportSize({width:390,height:844});
   await toggle('中文'); await has(zh.QUIZ_QUESTIONS[i].question);
   assert.deepEqual(await page.locator('.airbrush-tape-option [aria-hidden="true"]').allTextContents(), icons, 'Both languages share emoji');
   await toggle('EN');
   if (i > 0) {
     await button(en.back).click();
     await toggle('中文');
     assert.equal(await button('A ' + zh.QUIZ_QUESTIONS[i-1].options[0].label).getAttribute('aria-pressed'), 'true');
     await button('A ' + zh.QUIZ_QUESTIONS[i-1].options[0].label).click();
     await has(zh.QUIZ_QUESTIONS[i].question);
     await toggle('EN');
   }
   await button('A ' + en.QUIZ_QUESTIONS[i].options[0].label).click();
 }
 await has(en.gathering); await toggle('中文'); await has(zh.tuning); await toggle('EN');
 await page.locator('canvas').waitFor();
 await page.getByRole('dialog', {name: en.planetGuide.title}).waitFor();
 await toggle('中文'); await has(zh.planetGuide.title); await toggle('EN');
 await button(en.planetGuide.confirm).click();
 const sit = async () => {
   await page.evaluate(() => {
     const canvas = document.querySelector('canvas');
     let fiber = canvas.parentElement[Object.keys(canvas.parentElement).find(k => k.startsWith('__reactFiber'))];
     while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
     fiber.memoizedProps.onTapSpirit();
   });
   await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).waitFor();
 };
 assert.equal(await page.getByRole('textbox').count(), 0, 'Message input is hidden while wandering');
 assert.equal(await button(`[ ${en.ROAMING_COPY.portalButton} ]`).count(), 0, 'Standalone planet action is removed');
 await has(en.planets.OMEGA_01.fullName); await fit();
 await sit();
 await page.getByRole('form', {name: en.releaseBubble}).waitFor();
 const input = page.getByRole('textbox');
 const message = '  My thought 我的心事  ';
 await input.fill(message); await toggle('中文'); assert.equal(await input.inputValue(), message); assert.equal(await input.getAttribute('aria-label'), zh.inputTitle);
 await toggle('EN'); assert.equal(await input.inputValue(), message);
 await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).click();
 assert.equal(await input.count(), 0, 'Message input is hidden again after standing');
 await sit();
 assert.equal(await input.inputValue(), message, 'Draft survives standing and sitting');
 await input.fill(''); await button(`[ ${en.ROAMING_COPY.releaseButton} ]`).click();
 await has(en.ROAMING_COPY.emptyErrorBubble); await toggle('中文'); await has(zh.ROAMING_COPY.emptyErrorBubble); await toggle('EN');
 await input.fill(message); await button(`[ ${en.ROAMING_COPY.releaseButton} ]`).click();
 await has(en.releaseSuccess); await toggle('中文'); await has(zh.releaseSuccess);
 const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('brief_roaming_user_stardust_v1'))[0]); assert.equal(stored, message);
 await toggle('EN');
 await page.evaluate(async () => {
   const { soundEngine } = await import('/src/audio/soundEngine.ts');
   window.__sound = soundEngine; window.__audioStarts = 0; window.__audioStops = 0;
   for (const [key,counter] of [['startPlanetMusic','__audioStarts'],['stopPlanetMusicImmediate','__audioStops']]) {
     const original = soundEngine[key].bind(soundEngine); soundEngine[key] = (...args) => { window[counter]++; return original(...args); };
   }
   const canvas = document.querySelector('canvas'); window.__canvas = canvas;
   let fiber = canvas.parentElement[Object.keys(canvas.parentElement).find(k => k.startsWith('__reactFiber'))];
   while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
   window.__stageProps = fiber.memoizedProps; window.__coordsRef = fiber.memoizedProps.planetCoordsRef;
 });
 await page.waitForTimeout(1200);
 const coordsBefore = await page.evaluate(() => ({ ...__coordsRef.current }));
 const audioBefore = await page.evaluate(() => ({starts:__audioStarts,stops:__audioStops,loop:__sound.loopTimer,arp:__sound.arpeggioTimer}));
 await toggle('中文'); await button(`[ ${zh.ROAMING_COPY.standUpButton} ]`).waitFor(); await toggle('EN');
 const audioAfter = await page.evaluate(() => ({starts:__audioStarts,stops:__audioStops,loop:__sound.loopTimer,arp:__sound.arpeggioTimer}));
 assert.deepEqual(audioAfter, audioBefore, 'Audio timers and start/stop calls unchanged');
 const coordsAfter = await page.evaluate(() => ({ ...__coordsRef.current }));
 assert.ok(Math.hypot(coordsAfter.lon - coordsBefore.lon, coordsAfter.lat - coordsBefore.lat) < .02, 'Position retained');
 assert.equal(await page.evaluate(() => __canvas === document.querySelector('canvas') && __coordsRef === __stageProps.planetCoordsRef), true, 'Stage and coordinate ref retained');
 await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).click();
 if (!(await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).count())) await sit();
 await button(en.ROAMING_COPY.leaveButton).click();
 await button(en.another).click();
 await page.getByRole('dialog').waitFor(); await toggle('中文');
 for (const planet of Object.values(zh.planets)) await has(planet.fullName);
 await page.setViewportSize({width:320,height:667}); await fit(); await page.setViewportSize({width:390,height:844}); await toggle('EN');
 await page.getByRole('dialog').getByRole('button').filter({hasText:en.planets.SIGMA_03.fullName}).click();
 await page.getByRole('dialog', {name:en.planetGuide.title}).waitFor(); await button(en.planetGuide.confirm).click();
 await has(en.planets.SIGMA_03.fullName); await toggle('中文'); await has(zh.planets.SIGMA_03.fullName); await toggle('EN');
 await page.evaluate(() => window.dispatchEvent(new Event('breath-away-audio-error'))); await has(en.audioError); await toggle('中文'); await has(zh.audioError); await toggle('EN');
 for (const width of [320,375,414]) { await page.setViewportSize({width,height:667}); await fit(); }
 await page.screenshot({path:'tests/planet.png'});
 if (!(await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).count())) await sit();
 await button(en.ROAMING_COPY.leaveButton).click(); await has(en.farewellEnd); await fit();
 await toggle('中文'); await has(zh.farewellEnd); await toggle('EN'); await button(en.another).click(); await page.getByRole('dialog').waitFor();
 await button(en.stay).click(); if (!(await button(`[ ${en.ROAMING_COPY.standUpButton} ]`).count())) await sit();
 await button(en.ROAMING_COPY.leaveButton).click(); await button(en.calm).click(); await has(en.INTRO_COPY.welcome); await fit();
 await button(`[ ${en.INTRO_COPY.startButton} ]`).click(); await button(en.skip).click();
 await page.getByRole('dialog',{name:en.planetGuide.title}).waitFor(); await button(en.planetGuide.confirm).click();
 await sit(); await button(en.ROAMING_COPY.leaveButton).click(); await has(en.farewellEnd);
 assert.deepEqual(errors, [], 'No browser errors');
 const blocked = await browser.newContext({locale:'zh-CN'});
 await blocked.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
 const p2 = await blocked.newPage(); await p2.goto(base); await p2.getByText(en.INTRO_COPY.welcome).waitFor();
 await p2.getByRole('button',{name:'中文',exact:true}).click(); await p2.getByText(zh.INTRO_COPY.welcome).waitFor();
 console.log('PASS: translation parity, English default, persistence/storage failures, all screens and panels, questionnaire/input/planet/stage/audio preservation, mobile layout, localized errors and labels.');
 await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
