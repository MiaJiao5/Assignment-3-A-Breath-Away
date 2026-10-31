// Drive the real joystick toward the current spherical landmark instead of
// assuming every planet places its stone at the same longitude.
async function installNavigation(page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (window.__navCanvas === canvas) return;
    const parent = canvas.parentElement;
    let fiber = parent[Object.keys(parent).find(key => key.startsWith('__reactFiber'))];
    while (fiber && !fiber.memoizedProps?.planetCoordsRef) fiber = fiber.return;
    let hook = fiber.memoizedState;
    while (hook && !hook.memoizedState?.current?.renderer) hook = hook.next;
    const renderer = hook.memoizedState.current.renderer;
    const render = renderer.render.bind(renderer);
    renderer.render = (scene, camera) => { render(scene, camera); window.__navScene = scene; };
    window.__navCanvas = canvas;
    window.__navRenderer = renderer;
  });
  await page.waitForFunction(() => window.__navScene);
}

async function approach(page, objectName, label) {
  await installNavigation(page);
  const pad = await page.locator('.wandering-joystick').boundingBox();
  const x = pad.x + pad.width / 2, y = pad.y + pad.height / 2;
  let previousPosition = null, stalled = 0, detour = 0, detourSide = 1;
  await page.mouse.move(x, y); await page.mouse.down();
  try {
    for (let i = 0; i < 240; i++) {
      const reached = typeof label === 'function' ? await page.evaluate(label) : label
        ? await page.getByRole('button', { name: label, exact: true }).isVisible()
        : await page.evaluate(name => window.__navScene.getObjectByName(name).userData.interactions > 0, objectName);
      if (reached) return;
      let [dx, dy, ...position] = await page.evaluate(name => {
        const root = window.__navScene.getObjectByName('spirit-surface-root');
        const target = window.__navScene.getObjectByName(name);
        const local = target.position.clone().normalize().applyQuaternion(root.quaternion.clone().invert());
        return [local.x, local.z / .75, ...root.position.toArray()];
      }, objectName);
      if (previousPosition && Math.hypot(...position.map((value,index)=>value-previousPosition[index])) < .001) stalled++;
      else stalled = Math.max(0, stalled-1);
      previousPosition = position;
      // A direct route can meet a solid plant/landmark. Steer around its edge
      // through the same joystick, without teleporting or bypassing collisions.
      if (stalled >= 7) { detour = 18; detourSide *= -1; stalled = 0; }
      if (detour > 0) {
        [dx,dy] = [dx*.2+dy*detourSide, dy*.2-dx*detourSide];
        detour--;
      }
      const length = Math.hypot(dx, dy);
      await page.mouse.move(x + (length > .0001 ? dx / length : 1) * 22, y + (length > .0001 ? dy / length : 0) * 22);
      await page.waitForTimeout(70);
    }
    throw new Error(`Could not approach ${objectName}`);
  } finally { await page.mouse.up(); }
}
// Complete the real questionnaire instead of relying on a removed skip action.
// The mixed default answers preserve the old tests' starting planet, Psi.
async function completeQuiz(page, choices = [0, 1, 2]) {
  const { translations } = require('../src/i18n/translations.ts');
  for (let step = 0; step < 3; step++) {
    const language = await page.locator('html').getAttribute('lang');
    const copy = translations[language === 'zh-CN' ? 'zh' : 'en'];
    await page.getByRole('button', { name: copy.QUIZ_QUESTIONS[step].options[choices[step]].label, exact: true }).click();
  }
}
module.exports = { approach, installNavigation, completeQuiz };
