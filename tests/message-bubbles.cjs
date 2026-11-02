const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { installControlledNarration } = require('./interlude-fixture.cjs');
const { completeQuiz, approach, installNavigation } = require('./navigation.cjs');
const { translations: { en, zh } } = require('../src/i18n/translations.ts');

// The real questionnaire, joystick, music and scene run throughout. No browser
// clock or fabricated React state drives the release or its animation.
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await installControlledNarration(page);
    await page.addInitScript(() => {
      window.__planetPlayCalls = 0;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function(...args) {
        if (this.id === 'brief-roaming-external-audio') window.__planetPlayCalls++;
        return play.apply(this, args);
      };
    });
    const b = name => page.getByRole('button', { name, exact: true });
    await page.goto(process.env.APP_URL || 'http://localhost:3001');
    await b(en.INTRO_COPY.startButton).click();
    await page.waitForFunction(() => window.__introUtterance);
    await page.evaluate(() => window.__finishIntro());
    await b(en.interlude.ready).click();
    await completeQuiz(page); await b(en.planetGuide.confirm).click();
    await installNavigation(page); await approach(page, 'listening-stone', '[ Sit & Listen ]');
    await b('[ Sit & Listen ]').click(); await page.getByRole('textbox').waitFor();
    await page.evaluate(() => {
      const render = window.__navRenderer.render.bind(window.__navRenderer);
      window.__navRenderer.render = (scene, camera) => { window.__bubbleCamera = camera; return render(scene, camera); };
    });
    await page.waitForFunction(() => window.__bubbleCamera);
    const selector = page.locator('.bubble-shape-selector');
    await selector.waitFor();
    assert.equal(await selector.getByRole('button').count(), 3, 'Exactly three real shape options');
    assert.equal(await selector.getByRole('button', { name: en.bubbleShapes.cloud, exact: true }).getAttribute('aria-pressed'), 'true', 'Cloud is selected initially');
    for (const label of [en.bubbleShapes.cloud, en.bubbleShapes.circle, en.bubbleShapes.rounded]) {
      assert.equal(await selector.getByRole('button', { name: label, exact: true }).locator('svg').count(), 1, `${label}: actual SVG preview`);
    }
    const canvas = await page.locator('canvas').elementHandle();
    const baseline = await page.evaluate(() => {
      const root = window.__navScene.getObjectByName('spirit-surface-root');
      return { position: root.position.toArray(), rotation: root.quaternion.toArray(), planet: window.__navScene.getObjectByName('interactive-garden').userData.planetId,
        audioTime: document.getElementById('brief-roaming-external-audio').currentTime, plays: window.__planetPlayCalls };
    });
    const release = async text => {
      await page.getByRole('textbox').fill(text);
      await b('[ Let It Float ]').click();
      await page.locator('.spirit-overhead-bubble[data-release="true"]').waitFor({ state: 'visible' });
    };
    const released = () => page.locator('.spirit-overhead-bubble[data-release="true"]');
    const body = () => released().locator('.released-bubble-body');
    const fit = async () => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return body().evaluate(el => {
      const text = el.querySelector('p');
      const box = el.querySelector('.released-bubble-text-box');
      const rect = el.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();
      return { width: el.offsetWidth, height: el.offsetHeight,
        textFits: text.scrollWidth <= box.clientWidth + 1 && text.scrollHeight <= box.clientHeight + 1,
        textInside: textRect.left >= boxRect.left - 1 && textRect.right <= boxRect.right + 1 && textRect.top >= boxRect.top - 1 && textRect.bottom <= boxRect.bottom + 1,
        box: { width: box.clientWidth, height: box.clientHeight }, text: { width: text.scrollWidth, height: text.scrollHeight, fontSize: getComputedStyle(text).fontSize },
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
      });
    };
    const layoutFindings = [];
    const checkAboveCharacter = async label => {
      const geometry = await page.evaluate(() => {
        const mount = document.querySelector('.planet-canvas-mount');
        const mountRect = mount.getBoundingClientRect();
        const tuft = window.__navScene.getObjectByName('spirit-top-tuft');
        const point = tuft.localToWorld(tuft.position.clone().set(0, .075, 0)).project(window.__bubbleCamera);
        const bubble = document.querySelector('.released-bubble-body').getBoundingClientRect();
        return { bottom: bubble.bottom, headY: mountRect.top + (1 - point.y) * mount.clientHeight / 2,
          headX: mountRect.left + (1 + point.x) * mount.clientWidth / 2,
          body: { x: bubble.x, y: bubble.y, width: bubble.width, height: bubble.height },
          stage: { x: mountRect.x, y: mountRect.y, width: mountRect.width, height: mountRect.height } };
      });
      console.log('BUBBLE GEOMETRY:', label, JSON.stringify(geometry));
      if (geometry.bottom > geometry.headY - 8) layoutFindings.push({ label, issue: 'Bubble overlaps character head', ...geometry });
    };
    const visibleScreenshot = async (path, label) => {
      await page.waitForTimeout(1000);
      assert.ok(await body().evaluate(el => Number(getComputedStyle(el).opacity)) > .6, 'Screenshots show the visible balloon');
      await checkAboveCharacter(label);
      await page.screenshot({ path });
    };

    // Validation remains an anchored companion message, independent of shape.
    await b('[ Let It Float ]').click();
    await page.locator('.spirit-overhead-bubble[data-release="false"]').waitFor();
    assert.ok((await page.locator('.spirit-overhead-bubble').textContent()).includes(en.ROAMING_COPY.emptyErrorBubble));

    const userText = '  A little calm, exactly as I typed it.  ';
    await release(userText);
    assert.equal(await released().getAttribute('data-shape'), 'cloud');
    assert.equal(await released().textContent(), userText, 'User text keeps its whitespace');
    assert.equal(await page.getByRole('textbox').inputValue(), '', 'A release clears only the draft');
    const bubbleId = await released().evaluate(el => { window.__releasedBubble = el; return true; });
    assert.equal(bubbleId, true);
    await selector.getByRole('button', { name: en.bubbleShapes.circle, exact: true }).click();
    assert.equal(await released().getAttribute('data-shape'), 'cloud', 'Changing the selector cannot reshape a flying bubble');
    await b('\u4e2d\u6587').click();
    assert.equal(await selector.getByRole('button', { name: zh.bubbleShapes.circle, exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await released().textContent(), userText, 'Language switching never translates user content');
    assert.equal(await released().evaluate(el => el === window.__releasedBubble), true, 'Language changes keep the existing release node and timeline');
    await b('EN').click();
    await visibleScreenshot('tests/message-cloud-390.png', 'cloud-390');

    // A balloon travels up while moving first to one side and then the other.
    // Sample the rendered geometry, not an independent animation timer.
    const points = [];
    for (let sample = 0; sample < 7; sample++) {
      const rect = await body().boundingBox();
      points.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width });
      if (sample < 6) await page.waitForTimeout(850);
    }
    assert.ok(points.at(-1).y < points[0].y - 30, 'The released message rises into the sky');
    const deltas = points.slice(1).map((point, index) => point.x - points[index].x);
    assert.ok(deltas.some(value => value > 1) && deltas.some(value => value < -1), 'The flight curves gently from side to side');
    assert.ok(points.at(-1).width < points[0].width, 'The balloon becomes smaller as it moves away');
    await released().waitFor({ state: 'detached', timeout: 12000 });

    for (const [shape, label, text] of [
      ['circle', en.bubbleShapes.circle, 'A small wish for a softer day.'],
      ['rounded', en.bubbleShapes.rounded, 'A long gentle thought has plenty of room to breathe here.'],
    ]) {
      await selector.getByRole('button', { name: label, exact: true }).click();
      await release(text);
      await visibleScreenshot(`tests/message-${shape}-390.png`, `${shape}-390`);
    }

    await page.setViewportSize({ width: 320, height: 667 });
    await selector.getByRole('button', { name: en.bubbleShapes.circle, exact: true }).click();
    // Long text deliberately uses wide glyphs to exercise circular wrapping.
    await release('W'.repeat(60));
    assert.equal(await released().getAttribute('data-shape'), 'circle');
    const circle = await fit();
    assert.equal(circle.width, circle.height, 'Circle remains perfectly circular');
    if (!circle.textFits || !circle.textInside) layoutFindings.push({ label: 'circle-320-en', issue: 'Long English text outside safe area', ...circle });
    await visibleScreenshot('tests/message-circle-320.png', 'circle-320');
    await b('\u4e2d\u6587').click();
    const draft = '\u4eca\u5929\u4e5f\u60f3\u6162\u6162\u6765';
    await page.getByRole('textbox').fill(draft); await b('EN').click();
    assert.equal(await page.getByRole('textbox').inputValue(), draft, 'Language changes retain the current draft');
    await release('\u5b81'.repeat(60));
    const chineseCircle = await fit();
    assert.equal(chineseCircle.width, chineseCircle.height);
    if (!chineseCircle.textFits || !chineseCircle.textInside) layoutFindings.push({ label: 'circle-320-zh', issue: 'Long Chinese text outside safe area', ...chineseCircle });

    await selector.getByRole('button', { name: en.bubbleShapes.rounded, exact: true }).click();
    await release('A long gentle thought has plenty of room to breathe here.');
    assert.equal(await released().getAttribute('data-shape'), 'rounded');
    const rounded = await fit();
    assert.ok(rounded.width > rounded.height, 'Rounded Rectangle remains horizontal');
    assert.ok(rounded.textFits && rounded.textInside);
    const boxes = await selector.getByRole('button').all();
    const rects = await Promise.all(boxes.map(option => option.boundingBox()));
    assert.ok(rects.every(rect => rect.x >= 0 && rect.x + rect.width <= 320 + 1 && rect.height >= 44), 'Compact shape choices have mobile touch targets and fit the screen');
    assert.ok(rects.every(rect => Math.abs(rect.y - rects[0].y) < 2), 'All three options stay in one horizontal row');
    await visibleScreenshot('tests/message-rounded-320.png', 'rounded-320');

    // The shortest supported phone still exposes every input and action.
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(300);
    for (const [shape, label] of [['cloud', en.bubbleShapes.cloud], ['circle', en.bubbleShapes.circle], ['rounded', en.bubbleShapes.rounded]]) {
      await selector.getByRole('button', { name: label, exact: true }).click();
      await release('W'.repeat(60));
      await visibleScreenshot(`tests/message-${shape}-320-568.png`, `${shape}-320-568`);
      const fitted = await fit();
      if (!fitted.textFits || !fitted.textInside) layoutFindings.push({ label: `${shape}-320-568`, issue: 'Text outside silhouette safe area', ...fitted });
      await release('\u5b81'.repeat(60));
      const chineseFit = await fit();
      if (!chineseFit.textFits || !chineseFit.textInside) layoutFindings.push({ label: `${shape}-320-568-zh`, issue: 'Chinese text outside silhouette safe area', ...chineseFit });
    }
    for (const [label, control] of [['selector', selector], ['input', page.getByRole('textbox')], ['release', b('[ Let It Float ]')], ['stand', b('[ Stand Up ]')]]) {
      const rect = await control.boundingBox();
      if (rect.x < 0 || rect.x + rect.width > 321 || rect.y < 0 || rect.y + rect.height > 569) layoutFindings.push({ label, issue: 'Control outside short phone', rect });
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await selector.getByRole('button', { name: en.bubbleShapes.cloud, exact: true }).click();
    await release('A quiet cloud.');
    const quiet = await body().boundingBox(); await page.waitForTimeout(700);
    const still = await body().boundingBox();
    assert.ok(Math.abs((quiet.x + quiet.width / 2) - (still.x + still.width / 2)) < 2 && Math.abs((quiet.y + quiet.height / 2) - (still.y + still.height / 2)) < 5,
      'Reduced motion removes the spatial balloon flight');

    const final = await page.evaluate(() => {
      const root = window.__navScene.getObjectByName('spirit-surface-root');
      const audio = document.getElementById('brief-roaming-external-audio');
      return { position: root.position.toArray(), rotation: root.quaternion.toArray(), planet: window.__navScene.getObjectByName('interactive-garden').userData.planetId,
        audioTime: audio.currentTime, paused: audio.paused, plays: window.__planetPlayCalls };
    });
    assert.deepEqual(final.position, baseline.position); assert.deepEqual(final.rotation, baseline.rotation); assert.equal(final.planet, baseline.planet);
    assert.equal(final.plays, baseline.plays, 'Shape, release and language changes never restart planet music');
    assert.ok(!final.paused && final.audioTime > baseline.audioTime, 'The current planet track continues playing');
    assert.equal(await canvas.evaluate(el => el === document.querySelector('canvas')), true, 'The WebGL scene is never remounted');

    // Repeated submit replaces the previous release; leaving a listening session
    // cancels its timers so they cannot erase a later session's new balloon.
    await release('An earlier release.'); await page.waitForTimeout(100);
    await release('A replacement release.'); await page.waitForTimeout(100);
    await b('[ Stand Up ]').click();
    assert.equal(await page.locator('.spirit-overhead-bubble[data-release="true"]').count(), 0, 'Standing up removes the current release immediately');
    await b(en.exitGuide.confirm).click();
    await b('[ Sit & Listen ]').click(); await page.getByRole('textbox').waitFor();
    await release('This new session keeps its own timer.');
    await page.waitForTimeout(4200);
    assert.equal(await released().textContent(), 'This new session keeps its own timer.', 'Old release timers cannot erase the next listening session');
    await b('[ Stand Up ]').click();
    assert.equal(await page.locator('.spirit-overhead-bubble[data-release="true"]').count(), 0);
    console.log('LAYOUT FINDINGS:', JSON.stringify(layoutFindings));
    assert.deepEqual(layoutFindings, [], 'Balloons, safe text areas and controls fit all checked phone sizes');
    assert.deepEqual(errors, []);
    console.log('PASS: three bilingual shape previews, Cloud default, shape snapshots, curved balloon flight, circular long-text wrapping, mobile layout, validation, draft retention, reduced motion and uninterrupted scene/music.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
