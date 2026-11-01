import type { CSSProperties } from 'react';
import { PLANETS, type PlanetId } from '../data/roamingData';

const DUST = Array.from({ length: 14 }, (_, i) => ({
  left: `${7 + (i * 29) % 87}%`, top: `${8 + (i * 17) % 76}%`,
  '--dust-delay': `${-i * 2.7}s`, '--dust-duration': `${22 + i % 5 * 4}s`,
}));
const STARS = [{ left: '16%', top: '18%' }, { left: '79%', top: '28%' }, { left: '64%', top: '9%' }, { left: '30%', top: '46%' }];
const LISTENING_METEORS = [
  { left: '-6%', top: '2%', '--meteor-duration': '20s', '--meteor-delay': '0s', '--meteor-width': '78px' },
  { left: '20%', top: '9%', '--meteor-duration': '24s', '--meteor-delay': '5s', '--meteor-width': '58px' },
  { left: '42%', top: '-2%', '--meteor-duration': '29s', '--meteor-delay': '11s', '--meteor-width': '70px' },
  { left: '3%', top: '23%', '--meteor-duration': '33s', '--meteor-delay': '17s', '--meteor-width': '50px' },
];

/** Decorative depth only: no timers, input handlers, canvas or layout footprint. */
export function PlanetAtmosphere({ planetId, resting }: { planetId: PlanetId; resting: boolean }) {
  const { colors } = PLANETS[planetId];
  return <div className={`planet-atmosphere ${planetId === 'SIGMA_03' ? 'is-sky' : ''}`} data-resting={resting} aria-hidden="true" style={{
    '--mist-cool': colors.blob2, '--mist-warm': colors.blob3, '--atmosphere-light': colors.planetCore,
  } as CSSProperties}>
    <div className="atmosphere-halo" />
    <div className="atmosphere-mist atmosphere-mist-far" />
    <div className="atmosphere-mist atmosphere-mist-near" />
    <div className="atmosphere-dust">{DUST.map((style, i) => <i key={i} style={style as CSSProperties} />)}</div>
    <div className="atmosphere-stars">{STARS.map((style, i) => <i key={i} style={{ ...style, animationDelay: `${-i * 2.1}s` }} />)}</div>
    {(resting || planetId === 'SIGMA_03') && <div className="atmosphere-meteors" data-listening={resting}>
      {resting ? LISTENING_METEORS.map((style, i) => <i key={i} style={style as CSSProperties} />) : <><i /><i /></>}
    </div>}
  </div>;
}
