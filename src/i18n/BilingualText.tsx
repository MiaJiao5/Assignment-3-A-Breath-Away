import { useLanguage } from './LanguageContext';
import { translations, type Copy } from './translations';

/** Both translations participate in layout; only the selected one is exposed.
 * This reserves the same width and wrapped height without shrinking English,
 * clipping text, measuring the DOM, or remounting any interactive components. */
export function BilingualText({ select, className = '' }: {
  select: (copy: Copy) => string;
  className?: string;
}) {
  const { copy, language } = useLanguage();
  return (
    <span className={`bilingual-text ${className}`}>
      <span className="bilingual-reserve" aria-hidden="true" lang="en">{select(translations.en)}</span>
      <span className="bilingual-reserve" aria-hidden="true" lang="zh-CN">{select(translations.zh)}</span>
      <span className="bilingual-current" lang={language === 'en' ? 'en' : 'zh-CN'}>{select(copy)}</span>
    </span>
  );
}
