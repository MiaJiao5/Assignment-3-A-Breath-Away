import React, { useEffect, useRef } from 'react';
import { BilingualText } from '../i18n/BilingualText';

export function ExitGuide({ onConfirm }: { onConfirm: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { confirmRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="planet-guide-overlay">
      <section className="planet-guide-card exit-guide-card" role="dialog" aria-labelledby="exit-guide-title" aria-describedby="exit-guide-body">
        <div className="planet-guide-scroll">
          <span className="exit-guide-arrow text-purple-400" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 19 5 5M5 5v8M5 5h8" />
            </svg>
          </span>
          <h2 id="exit-guide-title" className="font-serif-soft font-medium"><BilingualText className="bilingual-block" select={c => c.exitGuide.title} /></h2>
          <p id="exit-guide-body" className="text-sm text-slate-600"><BilingualText className="bilingual-block" select={c => c.exitGuide.body} /></p>
        </div>
        <button ref={confirmRef} type="button" className="airbrush-pill-btn exit-guide-confirm shrink-0 w-full rounded-full px-5 py-3.5 text-sm font-medium cursor-pointer" onClick={onConfirm}>
          <BilingualText select={c => c.exitGuide.confirm} />
        </button>
      </section>
    </div>
  );
}
