import { useId } from 'react';

/** Real script type; every line samples the same continuous page-space paint. */
export function CoverTitle() {
  const gradient = `cover-script-${useId().replace(/:/g, '')}`;
  const fill = `url(#${gradient})`;
  return <h1 className="intro-title" data-script="true" lang="en" aria-label="A Breath Away">
    <svg className="intro-title-composition" viewBox="0 -50 1200 1480" aria-hidden="true" focusable="false">
      <defs>
        {/* One shared field keeps the left flourishes lavender, the middle-right
            warm, and the lower line cool; no word restarts its own gradient. */}
        <linearGradient id={`${gradient}-base`} gradientUnits="userSpaceOnUse" x1="0" y1="700" x2="1150" y2="1250">
          <stop offset="0%" stopColor="#B88ACF" />
          <stop offset="20%" stopColor="#B88ACF" />
          <stop offset="46%" stopColor="#91A9F2" />
          <stop offset="70%" stopColor="#80C5ED" />
          <stop offset="100%" stopColor="#83D9C5" />
        </linearGradient>
        <radialGradient id={`${gradient}-warm`} gradientUnits="userSpaceOnUse" cx="1100" cy="650" r="850" gradientTransform="translate(0 325) scale(1 .5)">
          <stop offset="0%" stopColor="#FFD36F" />
          <stop offset="42%" stopColor="#FFD36F" />
          <stop offset="65%" stopColor="#F6B66F" stopOpacity=".95" />
          <stop offset="85%" stopColor="#F29AB3" stopOpacity=".75" />
          <stop offset="100%" stopColor="#DE91C4" stopOpacity="0" />
        </radialGradient>
        <pattern id={gradient} patternUnits="userSpaceOnUse" width="1200" height="1500">
          <rect width="1200" height="1500" fill={`url(#${gradient}-base)`} />
          <rect width="1200" height="1500" fill={`url(#${gradient}-warm)`} />
        </pattern>
      </defs>
      <text className="intro-title-line intro-title-line-1" x="20" y="325" fontSize="460" fill={fill}>A</text>
      <text className="intro-title-line intro-title-line-2" x="40" y="730" fontSize="400" fill={fill}><tspan fontSize="550">B</tspan>reath</text>
      <text className="intro-title-line intro-title-line-3" x="5" y="1180" fontSize="430" fill={fill}><tspan fontSize="550">A</tspan>way</text>
    </svg>
  </h1>;
}
