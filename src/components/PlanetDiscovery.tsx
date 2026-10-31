import React, { useEffect, useRef, useState } from 'react';
import { PLANETS, PLANET_LIST, type PlanetId } from '../data/roamingData';
import { useLanguage } from '../i18n/LanguageContext';
import { soundEngine } from '../audio/soundEngine';
import { BilingualText } from '../i18n/BilingualText';
import type { Copy } from '../i18n/translations';

type DiscoveryPhase = 'entering' | 'ready' | 'spinning' | 'arriving' | 'complete';

export function PlanetDiscovery({ currentPlanetId, visitedPlanetIds, onClose, onTravel, onResetRoute }: {
  currentPlanetId: PlanetId;
  visitedPlanetIds: readonly PlanetId[];
  onClose: () => void;
  onTravel: (planetId: PlanetId) => void;
  onResetRoute: () => void;
}) {
  const { copy } = useLanguage();
  const text = copy.portalDiscovery;
  const [destinations] = useState(() => PLANET_LIST
    .filter(planet => planet.id !== currentPlanetId && !visitedPlanetIds.includes(planet.id))
    .map(planet => planet.id));
  const [phase, setPhase] = useState<DiscoveryPhase>(destinations.length ? 'entering' : 'complete');
  const [selectedId, setSelectedId] = useState<PlanetId | null>(null);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dialogRef = useRef<HTMLDivElement>(null);
  const spinButtonRef = useRef<HTMLButtonElement>(null);
  const orbitRef = useRef<HTMLUListElement>(null);
  const angleRef = useRef(0);
  const spinPlanRef = useRef({ from: 0, to: 0 });
  const busyRef = useRef(false);
  const cancelledRef = useRef(false);
  const committedRef = useRef(false);
  const callbacksRef = useRef({ onTravel, onClose });
  callbacksRef.current = { onTravel, onClose };

  const close = () => {
    cancelledRef.current = true;
    callbacksRef.current.onClose();
  };

  useEffect(() => {
    cancelledRef.current = false;
    dialogRef.current?.focus({ preventScroll: true });
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      cancelledRef.current = true;
      callbacksRef.current.onClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      cancelledRef.current = true;
      window.removeEventListener('keydown', onEscape);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'entering') return;
    const timer = window.setTimeout(() => {
      if (cancelledRef.current) return;
      if (destinations.length === 1) {
        committedRef.current = true;
        callbacksRef.current.onTravel(destinations[0]);
      } else {
        setPhase('ready');
      }
    }, reducedMotion ? 150 : 1200);
    return () => window.clearTimeout(timer);
  }, [phase, destinations, reducedMotion]);

  useEffect(() => {
    if (phase === 'ready') spinButtonRef.current?.focus({ preventScroll: true });
    if (phase !== 'ready' && phase !== 'spinning') return;
    const startedAt = performance.now();
    let previousTime = startedAt;
    let frame = 0;
    const tick = (now: number) => {
      if (cancelledRef.current) return;
      if (phase === 'ready') {
        if (!reducedMotion) angleRef.current += Math.min(now - previousTime, 100) * 0.018;
      } else {
        const progress = Math.min(1, (now - startedAt) / (reducedMotion ? 300 : 4600));
        const eased = 1 - Math.pow(1 - progress, 3);
        const { from, to } = spinPlanRef.current;
        angleRef.current = from + (to - from) * eased;
        if (progress === 1) {
          orbitRef.current?.style.setProperty('--orbit-turn', `${to}deg`);
          soundEngine.playSpiritChime();
          setPhase('arriving');
          return;
        }
      }
      orbitRef.current?.style.setProperty('--orbit-turn', `${angleRef.current}deg`);
      previousTime = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'arriving' || !selectedId) return;
    const timer = window.setTimeout(() => {
      if (cancelledRef.current || committedRef.current) return;
      committedRef.current = true;
      callbacksRef.current.onTravel(selectedId);
    }, reducedMotion ? 180 : 1400);
    return () => window.clearTimeout(timer);
  }, [phase, selectedId, reducedMotion]);

  const spin = () => {
    if (phase !== 'ready' || busyRef.current) return;
    busyRef.current = true;
    const index = Math.min(destinations.length - 1, Math.floor(Math.random() * destinations.length));
    const from = angleRef.current;
    const alignment = (360 - index * 360 / destinations.length) % 360;
    spinPlanRef.current = { from, to: from + 4 * 360 + (alignment - from % 360 + 360) % 360 };
    setSelectedId(destinations[index]);
    soundEngine.playSoftClick(70);
    setPhase('spinning');
  };

  const entering = phase === 'entering';
  const complete = phase === 'complete';
  const arriving = phase === 'arriving';
  const status = (c: Copy) => entering
    ? (destinations.length === 1 ? c.portalDiscovery.lastPlanet : c.portalDiscovery.transmitting)
    : arriving && selectedId ? c.portalDiscovery.arriving.replace('{planet}', c.planets[selectedId].fullName)
    : phase === 'spinning' ? c.portalDiscovery.spinning : c.portalDiscovery.readyHint;

  return (
    <div className="portal-discovery-overlay" onClick={close} data-phase={phase}>
      <div ref={dialogRef} tabIndex={-1} className="planet-discovery-card" role="dialog"
        aria-labelledby="planet-discovery-title" aria-describedby="planet-discovery-status"
        onClick={event => event.stopPropagation()}>
        <div className="discovery-content">
          <h2 id="planet-discovery-title" className="font-serif-soft text-xl font-semibold">
            <BilingualText className="bilingual-block" select={c => complete ? c.portalDiscovery.completeTitle : entering ? c.portalDiscovery.transmittingTitle : c.portalDiscovery.title} />
          </h2>
          {!entering && <p className="mt-3 text-xs leading-relaxed text-slate-600">
            <BilingualText className="bilingual-block" select={c => complete ? c.portalDiscovery.completeBody : c.portalDiscovery.intro.replace('{n}', String(destinations.length))} />
          </p>}
          {entering ? (
            <div className="portal-flight" aria-hidden="true">
              <span className="portal-flight-ring" /><span className="portal-flight-ring" />
              <span className="portal-flight-ring" /><span className="portal-flight-star">✦</span>
            </div>
          ) : !complete && (
            <div className="planet-orbit">
              <span className="orbit-pointer" aria-hidden="true">▾</span>
              <span className="orbit-center" aria-hidden="true">✦</span>
              <ul ref={orbitRef} className="planet-orbit-track" aria-label={text.destinations}>
                {destinations.map((id, index) => {
                  const colors = PLANETS[id].colors;
                  return (
                    <li key={id} className="planet-orbit-slot" data-planet-id={id}
                      data-selected={arriving && selectedId === id}
                      aria-current={arriving && selectedId === id ? 'true' : undefined}
                      style={{ '--slot-angle': `${index * 360 / destinations.length}deg` } as React.CSSProperties}>
                      <div className="planet-orbit-option">
                        <span className="orbit-planet" aria-hidden="true" style={{
                          background: `radial-gradient(circle at 34% 28%, ${colors.planetCore}, ${colors.planetMid} 55%, ${colors.planetEdge})`,
                          boxShadow: `0 0 22px ${colors.planetGlow}`,
                        }} />
                        <span className="orbit-planet-name"><BilingualText className="bilingual-block" select={c => c.planets[id].fullName} /></span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <div className="discovery-footer">
          <p id="planet-discovery-status" className="discovery-status" role="status" aria-live="polite" aria-atomic="true">
            <BilingualText className="bilingual-block" select={c => complete ? c.portalDiscovery.completeHint : status(c)} />
          </p>
          {!entering && !complete && <button ref={spinButtonRef} type="button" onClick={spin}
            disabled={phase !== 'ready'}
            className="discovery-spin airbrush-pill-btn w-full rounded-full py-3 px-4 text-sm font-semibold cursor-pointer">
            <BilingualText select={c => phase === 'ready' ? c.portalDiscovery.spin : arriving ? c.portalDiscovery.departing : c.portalDiscovery.spinningButton} />
          </button>}
          {complete && <button type="button" onClick={onResetRoute}
            className="airbrush-pill-btn w-full rounded-full py-3 px-4 text-sm font-semibold cursor-pointer"><BilingualText select={c => c.portalDiscovery.resetRoute} /></button>}
          <button type="button" onClick={close} className="discovery-cancel px-4 py-2 text-xs text-slate-600 cursor-pointer"><BilingualText select={c => c.stay} /></button>
        </div>
      </div>
    </div>
  );
}
