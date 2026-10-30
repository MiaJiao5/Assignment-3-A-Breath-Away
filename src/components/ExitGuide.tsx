import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export function ExitGuide({ onConfirm }: { onConfirm: () => void }) {
  const { copy } = useLanguage();
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { confirmRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="planet-guide-overlay">
      <section className="planet-guide-card" role="dialog" aria-labelledby="exit-guide-title" aria-describedby="exit-guide-body">
        <div className="planet-guide-scroll">
          <span className="block mb-4 text-3xl text-purple-400" aria-hidden="true">↖</span>
          <h2 id="exit-guide-title" className="font-serif-soft text-2xl font-semibold">{copy.exitGuide.title}</h2>
          <p id="exit-guide-body" className="mt-4 text-sm leading-relaxed text-slate-600">{copy.exitGuide.body}</p>
        </div>
        <button ref={confirmRef} type="button" className="airbrush-pill-btn shrink-0 mt-6 w-full rounded-full px-5 py-3.5 text-sm font-semibold cursor-pointer" onClick={onConfirm}>
          {copy.exitGuide.confirm}
        </button>
      </section>
    </div>
  );
}
