import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { soundEngine } from '../audio/soundEngine';
import { BilingualText } from '../i18n/BilingualText';

type InterludePhase = 'welcome' | 'fading' | 'headphones' | 'ready';

export function IntroInterlude({ onContinue }: { onContinue: () => void }) {
  const { language, copy } = useLanguage();
  const enteredAt = useRef(performance.now());
  const [voiceDone, setVoiceDone] = useState(false);
  const [phase, setPhase] = useState<InterludePhase>('welcome');
  const phaseRef = useRef<InterludePhase>('welcome');
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const showPhase = useCallback((next: InterludePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    // Once the headphone invitation is visible, translating it preserves the
    // current stage rather than replaying the opening narration.
    if (phaseRef.current === 'headphones' || phaseRef.current === 'ready') return;
    let active = true;
    setVoiceDone(false);
    showPhase('welcome');
    const delay = Math.max(0, 500 - (performance.now() - enteredAt.current));
    const timer = window.setTimeout(() => {
      soundEngine.startIntroNarration(language, copy.interlude.firstLine, () => {
        if (active) setVoiceDone(true);
      });
    }, delay);
    return () => { active = false; clearTimeout(timer); soundEngine.stopIntroNarration(); };
  }, [language, copy.interlude.firstLine, showPhase]);

  useEffect(() => {
    if (!voiceDone) return;
    const fadeOutMs = reducedMotion ? 0 : 700;
    const secondFadeMs = reducedMotion ? 0 : 900;
    // These delays start at the selected recording/speech completion event,
    // not at entry, so language-specific recordings keep their natural timing.
    const timers = [
      window.setTimeout(() => showPhase('fading'), 1000),
      window.setTimeout(() => showPhase('headphones'), 1000 + fadeOutMs),
      window.setTimeout(() => showPhase('ready'), 1000 + fadeOutMs + secondFadeMs + 250),
    ];
    return () => timers.forEach(clearTimeout);
  }, [voiceDone, reducedMotion, showPhase]);

  const showHeadphones = phase === 'headphones' || phase === 'ready';
  const canTap = phase === 'ready';
  return (
    <section className="interlude-scene relative z-20 flex-1" data-phase={phase} aria-labelledby="interlude-title"
      onClick={event => {
        if (canTap && !(event.target as HTMLElement).closest('button')) onContinue();
      }}>
      <h1 id="interlude-title" className="sr-only">{copy.interlude.title}</h1>
      <div className="interlude-center">
        <div className="headphone-aura" aria-hidden={!showHeadphones}>
          <span className="headphone-ripple" /><span className="headphone-ripple" /><span className="headphone-ripple" />
          <svg className="headphone-icon" viewBox="0 0 120 120" role="img" aria-label={copy.interlude.headphonesLabel}>
            <defs>
              <linearGradient id="headphone-color" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#bb8faf" /><stop offset="1" stopColor="#84a9bb" />
              </linearGradient>
            </defs>
            {/* A pair of unbranded in-ear buds, with no overhead band. */}
            <g transform="rotate(-16 37 58)">
              <rect x="34" y="45" width="12" height="45" rx="6" fill="url(#headphone-color)" />
              <path d="M24 31C15 37 17 55 29 59C41 64 51 55 50 43C49 30 36 25 24 31Z" fill="url(#headphone-color)" />
              <ellipse cx="25" cy="42" rx="7" ry="10" fill="#8b829f" />
              <ellipse cx="24" cy="41" rx="3.5" ry="6" fill="#ece1ec" opacity=".85" />
              <path d="M39 61v21M32 33q8-1 11 7" stroke="#fff7ef" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
            <g transform="translate(120 0) scale(-1 1)">
              <g transform="rotate(-16 37 58)">
                <rect x="34" y="45" width="12" height="45" rx="6" fill="url(#headphone-color)" />
                <path d="M24 31C15 37 17 55 29 59C41 64 51 55 50 43C49 30 36 25 24 31Z" fill="url(#headphone-color)" />
                <ellipse cx="25" cy="42" rx="7" ry="10" fill="#8b829f" />
                <ellipse cx="24" cy="41" rx="3.5" ry="6" fill="#ece1ec" opacity=".85" />
                <path d="M39 61v21M32 33q8-1 11 7" stroke="#fff7ef" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            </g>
          </svg>
        </div>
        <div className="interlude-subtitles" aria-live="polite" aria-atomic="true">
          <p className="interlude-first interlude-panel" aria-hidden={showHeadphones}><BilingualText className="bilingual-block interlude-welcome-reveal" select={c => c.interlude.firstLine} /></p>
          <p className="interlude-second interlude-panel" aria-hidden={!showHeadphones}><BilingualText className="bilingual-block" select={c => c.interlude.secondLine} /></p>
        </div>
      </div>
      <button type="button" className="escape-cloud-button interlude-ready" disabled={!canTap} aria-hidden={!canTap} tabIndex={canTap ? 0 : -1} onClick={event => { event.stopPropagation(); if (canTap) onContinue(); }}>
        <BilingualText select={c => c.interlude.ready} />
      </button>
      {canTap && <span className="sr-only">{copy.interlude.tapToContinue}</span>}
    </section>
  );
}
