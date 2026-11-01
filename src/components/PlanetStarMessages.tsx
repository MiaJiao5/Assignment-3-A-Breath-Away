import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PLANETS, type PlanetId } from '../data/roamingData';
import { shuffleStarMessages, type StarMessage } from '../data/starMessages';
import { BilingualText } from '../i18n/BilingualText';

interface Appearance {
  planetId: PlanetId; message: StarMessage; token: number;
  duration: number; interval: number; position: number; elevation: number; rise: number; drift: number;
}
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export function PlanetStarMessages({ planetId, active }: { planetId: PlanetId; active: boolean }) {
  const [visible, setVisible] = useState<Appearance | null>(null);
  const cycles = useRef<Partial<Record<PlanetId, { queue: StarMessage[]; lastId?: string }>>>({});
  const sequence = useRef(0);

  useEffect(() => {
    setVisible(null);
    if (!active) return;
    let cancelled = false;
    let nextTimer: number;
    let hideTimer: number;
    const showNext = () => {
      if (cancelled) return;
      const cycle = cycles.current[planetId] ??= { queue: [] };
      if (!cycle.queue.length) cycle.queue = shuffleStarMessages(planetId, cycle.lastId);
      const message = cycle.queue.shift()!;
      cycle.lastId = message.id;
      const interval = randomBetween(8000, 12000);
      // Always leave a quiet gap, even when a short interval meets a long fade.
      const duration = Math.min(randomBetween(6000, 9000), interval - 600);
      const token = ++sequence.current;
      setVisible({ planetId, message, token, duration, interval,
        position: Math.random(), elevation: Math.random(), rise: randomBetween(16, 26), drift: randomBetween(-5, 5) });
      hideTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(current => current?.token === token ? null : current);
      }, duration);
      nextTimer = window.setTimeout(showNext, interval);
    };
    nextTimer = window.setTimeout(showNext, randomBetween(8000, 12000));
    return () => { cancelled = true; clearTimeout(nextTimer); clearTimeout(hideTimer); };
  }, [planetId, active]);

  // Hide stale state synchronously during travel; language never keys this node.
  if (!active || !visible || visible.planetId !== planetId) return null;
  return <div key={visible.token} className="animate-stardust-float stardust-thought rounded-full"
    data-message-id={visible.message.id} data-planet-id={planetId}
    data-display-ms={visible.duration} data-gap-ms={visible.interval}
    style={{ '--star-life': `${visible.duration}ms`, '--star-position': visible.position,
      '--star-height': visible.elevation, '--star-rise': `${visible.rise}px`, '--star-drift': `${visible.drift}px`,
      color: PLANETS[planetId].colors.textPrimary,
    } as CSSProperties}>
    <p className="text-xs leading-[18px] text-center"><BilingualText className="bilingual-block" text={visible.message} /></p>
  </div>;
}
