import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, type Language } from './translations';
export const LANGUAGE_STORAGE_KEY = 'a_breath_away_language';

export function readLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

const Context = createContext({
  language: 'en' as Language,
  setLanguage: (_: Language) => {},
  copy: translations.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, update] = useState<Language>(readLanguage);
  const setLanguage = (next: Language) => {
    update(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // The selected language still works for this visit when storage is unavailable.
    }
  };

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = translations[language].title;
  }, [language]);

  return (
    <Context.Provider value={{ language, setLanguage, copy: translations[language] }}>
      {children}
    </Context.Provider>
  );
}

export const useLanguage = () => useContext(Context);

export function LanguageToggle() {
  const { language, setLanguage, copy } = useLanguage();
  return (
    <div className="language-toggle" role="group" aria-label={copy.switchLanguage}>
      {(['en', 'zh'] as const).map(value => (
        <button
          key={value}
          type="button"
          lang={value === 'zh' ? 'zh-CN' : 'en'}
          aria-pressed={language === value}
          onClick={() => setLanguage(value)}
        >
          {value === 'en' ? 'EN' : '中文'}
        </button>
      ))}
    </div>
  );
}
