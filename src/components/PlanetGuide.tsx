import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export function PlanetGuide({ onConfirm }: { onConfirm: () => void }) {
  const { copy } = useLanguage();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { confirmRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="planet-guide-overlay">
      <section className="planet-guide-card planet-instructions" role="dialog" aria-labelledby="planet-guide-title" aria-describedby="planet-guide-subtitle">
        <div className="planet-guide-scroll">
          <h2 id="planet-guide-title" className="font-serif-soft text-xl font-semibold">{copy.planetGuide.title}</h2>
          <p id="planet-guide-subtitle" className="mt-3 text-sm leading-relaxed text-slate-600">{copy.planetGuide.subtitle}</p>
          <ol className="my-5 flex flex-col gap-4 text-left">
            {copy.planetGuide.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="guide-step-number" aria-hidden="true">{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <button ref={confirmRef} type="button" className="airbrush-pill-btn shrink-0 mt-3 w-full rounded-full px-5 py-3.5 text-sm font-semibold cursor-pointer" onClick={onConfirm}>
          {copy.planetGuide.confirm}
        </button>
      </section>
    </div>
  );
}
