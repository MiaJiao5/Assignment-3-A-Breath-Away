import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { soundEngine } from '../audio/soundEngine';

export function IntroInterlude({ onContinue }: { onContinue: () => void }) {
  const { language, copy } = useLanguage();
  const enteredAt = useRef(performance.now());
  const [voiceDone, setVoiceDone] = useState(false);
  const [subtitlesDone, setSubtitlesDone] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const timer = window.setTimeout(() => setSubtitlesDone(true), 4700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setVoiceDone(false);
    const delay = Math.max(0, 500 - (performance.now() - enteredAt.current));
    const timer = window.setTimeout(() => {
      const text = `${copy.interlude.firstLine} ${copy.interlude.secondLine.replace(/^🎧\s*/u, '')}`;
      soundEngine.startIntroNarration(language, text, () => setVoiceDone(true));
    }, delay);
    return () => { clearTimeout(timer); soundEngine.stopIntroNarration(); };
  }, [language, copy.interlude.firstLine, copy.interlude.secondLine]);

  const canTap = voiceDone && subtitlesDone;
  return (
    <section className="interlude-scene relative z-20 flex-1" aria-labelledby="interlude-title"
      onClick={event => {
        if (canTap && !(event.target as HTMLElement).closest('button')) onContinue();
      }}>
      <h1 id="interlude-title" className="sr-only">{copy.interlude.title}</h1>
      <div className="interlude-center">
        <div className="headphone-aura">
          <span className="headphone-ripple" /><span className="headphone-ripple" /><span className="headphone-ripple" />
          <svg className="headphone-icon" viewBox="0 0 120 120" role="img" aria-label={copy.interlude.headphonesLabel}>
            <defs>
              <linearGradient id="headphone-color" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#bb8faf" /><stop offset="1" stopColor="#84a9bb" />
              </linearGradient>
            </defs>
            <path d="M25 66V56a35 35 0 0 1 70 0v10" fill="none" stroke="url(#headphone-color)" strokeWidth="5" strokeLinecap="round" />
            <path d="M32 46a29 29 0 0 1 56 0" fill="none" stroke="#fff8ed" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
            <rect x="19" y="58" width="18" height="34" rx="9" fill="url(#headphone-color)" />
            <rect x="83" y="58" width="18" height="34" rx="9" fill="url(#headphone-color)" />
            <path d="M25 65v19M89 65v19" stroke="#fff6e9" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="interlude-subtitles">
          <p className="interlude-first font-serif-soft">{copy.interlude.firstLine}</p>
          <p className="interlude-second">{copy.interlude.secondLine}</p>
        </div>
      </div>
      <button type="button" className="escape-cloud-button interlude-ready" onClick={event => { event.stopPropagation(); onContinue(); }}>
        {copy.interlude.ready}
      </button>
      {canTap && <span className="sr-only">{copy.interlude.tapToContinue}</span>}
    </section>
  );
}
