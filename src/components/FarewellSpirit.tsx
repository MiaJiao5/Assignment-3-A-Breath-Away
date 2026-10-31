import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/** A single continuous, plush silhouette; all motion stays inside its fixed box. */
export function FarewellSpirit({ onTap }: { onTap?: () => void }) {
  const { copy } = useLanguage();
  const id = useId().replace(/:/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  return (
    <button type="button" className="farewell-spirit" onClick={onTap} aria-label={copy.tapSpirit} title={copy.tapSpirit}>
      <span className="farewell-spirit-aura" aria-hidden="true" />
      <svg viewBox="28 9 224 215" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-plush`} cx="37%" cy="25%" r="80%">
            <stop offset="0" stopColor="#FFFEFC" />
            <stop offset=".58" stopColor="#FAF7F3" />
            <stop offset="1" stopColor="#E8E0DB" />
          </radialGradient>
          <radialGradient id={`${id}-cheek`}>
            <stop stopColor="#EAA9B2" stopOpacity=".55" />
            <stop offset="1" stopColor="#F4C6CE" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-limb`} x1="0" y1="0" x2=".7" y2="1">
            <stop stopColor="#FFFDFA" /><stop offset="1" stopColor="#EDE6E1" />
          </linearGradient>
          <filter id={`${id}-depth`} x="-25%" y="-25%" width="150%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#514154" floodOpacity=".16" />
          </filter>
          <filter id={`${id}-soft`} x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id={`${id}-fur`} x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency=".19" numOctaves="2" seed="7" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g className="farewell-starfield" fill="var(--farewell-starlight, #F5DFEC)" opacity=".65">
          <path d="M47 90 Q49 97 54 98 Q49 100 47 106 Q45 100 40 98 Q45 97 47 90Z" />
          <path d="M224 161 Q226 167 231 168 Q226 170 224 176 Q222 170 217 168 Q222 167 224 161Z" />
          <path d="M66 180 Q67 184 71 185 Q67 186 66 190 Q65 186 61 185 Q65 184 66 180Z" />
          <circle cx="48" cy="148" r="3" fill="var(--farewell-spark, #FFE3B4)" filter={paint('soft')} />
          <circle cx="220" cy="67" r="3" fill="var(--farewell-spark, #FFE3B4)" filter={paint('soft')} />
        </g>
        <ellipse cx="140" cy="207" rx="51" ry="7" fill="var(--farewell-cloud, #BDB4D6)" opacity=".5" filter={paint('soft')} />
        <g className="farewell-spirit-float" strokeLinecap="round" strokeLinejoin="round">
          <g className="farewell-spirit-feet" fill={paint('limb')} filter={paint('fur')}>
            <path d="M113 181 C102 184 100 196 110 199 C120 203 132 199 132 192 C132 185 122 180 113 181Z" />
            <path d="M156 182 C148 183 145 193 152 198 C159 203 174 200 176 193 C178 186 166 180 156 182Z" />
          </g>
          <g className="farewell-spirit-body" filter={paint('depth')}>
            <path d="M128 60 C119 51 119 41 126 37 C132 33 137 29 143 34 C150 40 152 50 149 58 C174 58 195 72 203 93 C213 101 216 117 212 132 C217 150 206 168 192 177 C181 192 160 195 142 192 C123 198 101 190 91 178 C74 171 64 154 68 137 C61 119 67 103 77 94 C82 74 104 61 128 60Z"
              fill={paint('plush')} stroke="#D9D0CC" strokeOpacity=".18" strokeWidth=".8" filter={paint('fur')} />
            <path d="M92 91 C103 77 115 75 126 73" fill="none" stroke="#FFFFFF" strokeOpacity=".52" strokeWidth="4" />
          </g>
          <g className="farewell-spirit-face">
            <ellipse cx="104" cy="134" rx="17" ry="10" fill={paint('cheek')} />
            <ellipse cx="176" cy="134" rx="17" ry="10" fill={paint('cheek')} />
            <g className="farewell-spirit-eyes">
              <ellipse cx="119" cy="120" rx="3.5" ry="4.2" fill="#4A4142" />
              <ellipse cx="160" cy="120" rx="3.5" ry="4.2" fill="#4A4142" />
              <circle cx="120" cy="118.6" r="1" fill="#FFFDF9" />
              <circle cx="161" cy="118.6" r="1" fill="#FFFDF9" />
            </g>
            <path d="M134 136 Q140 142 146 136" stroke="#9B7776" strokeWidth="1.8" fill="none" />
          </g>
          <g className="farewell-spirit-arms" fill={paint('limb')} filter={paint('fur')}>
            <path d="M81 135 C74 129 67 133 68 140 C69 148 81 153 87 148 C91 144 86 138 81 135Z" />
            <g className="farewell-spirit-wave">
              <path d="M192 118 C196 114 199 104 204 99 C210 93 217 96 217 103 C219 110 210 123 202 127 C196 129 191 125 192 118Z" />
            </g>
          </g>
        </g>
      </svg>
    </button>
  );
}
