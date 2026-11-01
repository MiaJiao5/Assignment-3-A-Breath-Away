async function installFootstepCapture(page) {
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/audio/soundEngine.ts')?.name;
    const { soundEngine } = await import(url || '/src/audio/soundEngine.ts');
    window.__footstepEngine = soundEngine;
    window.__footsteps = [];
    const play = soundEngine.playFluffyFootstep.bind(soundEngine);
    soundEngine.playFluffyFootstep = (foot, speed) => {
      const played = play(foot, speed);
      if (played) {
        const scene = window.__navScene;
        window.__footsteps.push({ foot, speed, time: performance.now(),
          id: scene?.getObjectByName('interactive-garden')?.userData.planetId,
          leftY: scene?.getObjectByName('spirit-left-foot')?.position.y,
          rightY: scene?.getObjectByName('spirit-right-foot')?.position.y,
          bodyY: scene?.getObjectByName('spirit-body')?.position.y });
      }
      return played;
    };
  });
}
module.exports = { installFootstepCapture };
