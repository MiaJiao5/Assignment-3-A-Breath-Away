/** A light balloon approaches a gentle terminal rise speed while changing wind
 * accelerates its sideways drift. Dense samples let the browser interpolate a
 * continuous flight, without stopping at a sequence of animation waypoints. */
export function balloonKeyframes(durationMs: number, rise: number, drift: number, phase: number, reduced: boolean): Keyframe[] {
  const steps = 240;
  const dt = durationMs / 1000 / steps;
  const samples: { x: number; y: number; vx: number }[] = [];
  let x = 0, y = 0, vx = 0, vy = .22;
  for (let step = 0; step <= steps; step++) {
    samples.push({ x, y, vx });
    const time = step * dt;
    const wind = Math.sin(time * .95 + phase) + .16 * Math.sin(time * 1.73 + phase * 2);
    vx += (wind * .8 - vx * .9 - x * .045) * dt;
    vy += (.54 - vy * .62) * dt;
    x += vx * dt;
    y += vy * dt;
  }
  const horizontal = Math.max(.01, ...samples.map(sample => Math.abs(sample.x)));
  const velocity = Math.max(.01, ...samples.map(sample => Math.abs(sample.vx)));
  const height = samples.at(-1)!.y;
  const smooth = (value: number) => { const p = Math.max(0, Math.min(1, value)); return p * p * (3 - 2 * p); };
  return samples.map((sample, step) => {
    const p = step / steps;
    const opacity = .94 * smooth(p / .08) * (1 - smooth((p - .64) / .36));
    if (reduced) return { offset: p, opacity };
    const scale = 1 - .56 * smooth((p - .22) / .78);
    const tilt = sample.vx / velocity * 2.1;
    return { offset: p, opacity,
      transform: `translate3d(${sample.x / horizontal * drift}px, ${-sample.y / height * rise}px, 0) rotate(${tilt}deg) scale(${scale})`,
      filter: `blur(${smooth((p - .67) / .33) * 2}px) drop-shadow(0 4px 9px #35294718) drop-shadow(0 0 7px #fff4e628)`,
    };
  });
}
