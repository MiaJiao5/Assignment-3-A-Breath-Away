import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { LanguageProvider, LanguageToggle } from '../src/i18n/LanguageContext';
import { PlanetStarMessages } from '../src/components/PlanetStarMessages';
import type { PlanetId } from '../src/data/roamingData';
import '../src/index.css';

// Virtual time advances timers faster than React's real MessageChannel queue.
// Flush timer-driven commits in this isolated fixture so none are skipped by
// the test clock; production continues to use normal React scheduling.
const schedule = window.setTimeout.bind(window);
window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
  schedule(typeof handler === 'function' ? () => flushSync(() => handler(...args)) : handler, delay)
) as typeof window.setTimeout;

declare global {
  interface Window {
    messageFixture: {
      planet: (id: PlanetId) => void;
      active: (active: boolean) => void;
      mounted: (mounted: boolean) => void;
    };
  }
}
function Fixture() {
  const [planet, setPlanet] = useState<PlanetId>('OMEGA_01');
  const [active, setActive] = useState(true);
  const [mounted, setMounted] = useState(true);
  window.messageFixture = { planet: setPlanet, active: setActive, mounted: setMounted };
  return <LanguageProvider>
    <LanguageToggle />
    <div style={{ position: 'relative', width: '100%', height: 202, marginTop: 120, background: '#695c85' }}>
      <div className="stardust-layer">{mounted && <PlanetStarMessages planetId={planet} active={active} />}</div>
    </div>
  </LanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
