import type { BiomePalette, BiomePropType, PlanetBiome } from '../data/roamingData';

// Vector illustrations stay crisp at phone scale. Rounded paths, translucent
// gradients and a color-matched blurred silhouette replace pointed geometry.
export function biomePropSvg(type: BiomePropType, c: BiomePalette): string {
  const star = `<path d="M0-10Q2-2 10 0Q2 2 0 10Q-2 2-10 0Q-2-2 0-10Z" fill="${c.accent}"/>`;
  const wheat = [-1, 0, 1].map((side, i) => {
    const x = 80 + side * 27, top = 65 + Math.abs(side) * 23;
    return `<g transform="rotate(${side * 10} ${x} 170)"><path d="M${x} 174Q${x - 4} 125 ${x} ${top}" stroke="${c.secondary}" stroke-width="4" fill="none"/>${[0,1,2,3].map(j => `<ellipse cx="${x - 7}" cy="${top + j * 15 + 7}" rx="7" ry="11" transform="rotate(-35 ${x - 7} ${top + j * 15 + 7})" fill="url(#warm)"/><ellipse cx="${x + 7}" cy="${top + j * 15 + 7}" rx="7" ry="11" transform="rotate(35 ${x + 7} ${top + j * 15 + 7})" fill="url(#warm)"/>`).join('')}<ellipse cx="${x}" cy="${top - 3}" rx="5" ry="9" fill="${c.accent}"/></g>`;
  }).join('');
  const art: Record<BiomePropType, string> = {
    mapleTree: `<path d="M79 180Q85 143 80 111M82 146L61 127M83 135L104 111" fill="none" stroke="#B87857" stroke-width="10"/>
      <path d="M80 139C67 132 46 142 41 126C20 126 20 109 32 98C13 86 24 71 39 72C30 51 47 40 61 51C61 22 84 21 91 45C105 24 123 37 117 58C142 48 153 70 133 84C155 96 145 117 128 117C129 140 105 139 99 132Q91 143 80 139Z" fill="url(#plant)"/>
      <path d="M80 127L77 67M79 101L53 85M79 116L108 90" fill="none" stroke="${c.soft}" stroke-opacity=".45" stroke-width="3"/>
      <ellipse cx="60" cy="62" rx="16" ry="9" fill="${c.soft}" opacity=".25"/>`,
    goldenWheat: wheat,
    berryBush: `<path d="M79 180L80 151M80 163L57 146M80 161L107 145" stroke="#B87C59" stroke-width="7" fill="none"/>
      <path d="M30 148C13 125 40 101 56 111C58 78 101 78 109 107C137 92 154 127 132 145Q88 170 30 148Z" fill="url(#plant)"/>
      ${[[44,127],[74,111],[105,125],[64,143],[120,144]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${c.secondary}"/><circle cx="${x-3}" cy="${y-3}" r="3" fill="${c.soft}" opacity=".7"/>`).join('')}`,
    cloudTree: `<path d="M79 181Q83 147 78 119M80 150L57 129M81 143L108 122" stroke="${c.accent}" stroke-width="11" fill="none"/>
      <path d="M31 141C13 128 23 110 38 111C35 93 60 88 69 101C82 84 104 92 105 108C125 96 146 114 134 133Q121 151 31 141Z" fill="url(#plant)"/>
      <path d="M39 112C22 102 32 84 47 86C44 68 68 64 77 79C90 59 113 75 110 88C132 79 144 101 126 111Q92 124 39 112Z" fill="${c.secondary}"/>
      <path d="M53 86C36 74 47 58 60 61C56 37 88 33 94 54C112 47 129 66 114 81Q93 95 53 86Z" fill="url(#soft)"/>
      <g transform="translate(106 105) scale(.7)">${star}</g><g transform="translate(61 70) scale(.55)">${star}</g>`,
    grassTuft: `<path d="M70 178C34 170 19 143 27 132C39 123 49 158 70 165C56 139 49 107 60 101C72 94 76 133 79 159C82 124 91 75 103 83C119 96 94 143 88 167C106 147 124 116 133 129C141 144 114 175 89 179Z" fill="url(#plant)"/>
      <path d="M72 174Q52 153 38 145M82 171L96 108M89 174L124 141" stroke="${c.soft}" stroke-opacity=".55" stroke-width="3" fill="none"/>`,
    mintMushroom: `${[[48,143,.72],[90,116,1],[122,153,.55]].map(([x,y,s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 8Q-4 28 0 50" stroke="${c.accent}" stroke-width="13" fill="none"/><path d="M-35 2C-32-35 30-38 36 0Q38 14 0 14Q-38 14-35 2Z" fill="url(#plant)"/><ellipse cx="-13" cy="-5" rx="7" ry="4" fill="${c.soft}"/><ellipse cx="12" cy="-11" rx="6" ry="4" fill="${c.accent}" opacity=".7"/></g>`).join('')}`,
    softCloud: `<ellipse cx="81" cy="149" rx="47" ry="13" fill="${c.accent}" opacity=".25" filter="url(#mist)"/>
      <path d="M31 125C11 104 34 79 53 86C54 51 105 43 115 82C147 80 156 121 132 133Q80 152 31 125Z" fill="url(#soft)"/>
      <ellipse cx="68" cy="89" rx="17" ry="12" fill="${c.soft}" opacity=".55"/>
      <path d="M35 127Q75 145 123 129" stroke="${c.accent}" stroke-opacity=".5" stroke-width="8" fill="none"/>`,
    dandelion: `<path d="M76 181Q91 142 80 101" stroke="${c.secondary}" stroke-width="4" fill="none"/>
      <path d="M80 156Q45 146 52 137Q65 132 80 156Z" fill="${c.primary}" opacity=".65"/>
      <circle cx="80" cy="82" r="34" fill="${c.soft}" opacity=".35" filter="url(#mist)"/>
      ${Array.from({length:10},(_,i) => { const a=i*Math.PI/5, x=80+Math.cos(a)*31, y=82+Math.sin(a)*31; return `<path d="M80 82L${x} ${y}" stroke="${c.soft}" stroke-opacity=".8" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="${c.soft}" opacity=".8"/>`; }).join('')}
      <circle cx="80" cy="82" r="13" fill="url(#soft)"/>`,
    pinwheel: `<path d="M79 182Q84 140 80 98" fill="none" stroke="${c.secondary}" stroke-width="5"/>
      <g transform="translate(80 90)"><path d="M0 0C-37-5-41-43-22-43Q3-42 0 0Z" fill="${c.primary}"/><path d="M0 0C5-37 43-41 43-22Q42 3 0 0Z" fill="${c.accent}"/><path d="M0 0C37 5 41 43 22 43Q-3 42 0 0Z" fill="${c.secondary}"/><path d="M0 0C-5 37-43 41-43 22Q-42-3 0 0Z" fill="${c.soft}"/><circle r="8" fill="${c.accent}"/></g>`,
    jellyfishMushroom: `<g fill="none" stroke-width="4" opacity=".8"><path d="M48 113Q31 140 49 158T47 179" stroke="${c.accent}"/><path d="M68 119Q83 141 65 169" stroke="${c.secondary}"/><path d="M91 119Q76 147 95 174" stroke="${c.accent}"/><path d="M112 112Q129 140 110 160T115 179" stroke="${c.secondary}"/></g>
      <path d="M28 106C31 49 126 47 132 105Q130 127 80 124Q31 126 28 106Z" fill="url(#glass)" stroke="${c.accent}" stroke-opacity=".5" stroke-width="3"/>
      <path d="M41 90Q52 69 73 70" stroke="${c.soft}" stroke-opacity=".6" stroke-width="5" fill="none"/>
      <ellipse cx="80" cy="113" rx="46" ry="9" fill="${c.secondary}" opacity=".4"/>`,
    crystalCluster: `<path d="M62 175Q49 176 49 162L51 83Q51 75 60 68L76 50Q82 45 87 51L106 76Q110 81 109 89L105 169Q105 177 95 178Z" fill="url(#glass)" stroke="${c.accent}" stroke-opacity=".55" stroke-width="3"/>
      <path d="M30 174Q21 170 25 160L28 123Q28 115 35 112L45 105Q51 103 56 110L70 134L66 177Z" fill="url(#plant)" opacity=".85"/>
      <path d="M94 179L94 125Q95 119 100 116L117 103Q123 100 128 106L140 124Q143 130 139 140L131 174Q127 181 119 181Z" fill="url(#soft)" opacity=".85"/>
      <path d="M82 67L78 164M117 117L111 163" stroke="${c.soft}" stroke-opacity=".65" stroke-width="3" fill="none"/>`,
    moonReed: `<g fill="none" stroke="${c.primary}" stroke-width="4"><path d="M63 179Q86 121 49 89"/><path d="M83 180Q61 118 98 67"/><path d="M96 179Q129 146 119 115"/></g>
      <path d="M56 74C29 78 26 113 53 119C41 103 44 87 56 74Z" fill="${c.soft}"/>
      <circle cx="98" cy="65" r="10" fill="${c.accent}"/><circle cx="120" cy="114" r="8" fill="${c.secondary}"/>
      <circle cx="98" cy="65" r="18" fill="${c.accent}" opacity=".22" filter="url(#mist)"/>
      <path d="M72 154Q42 157 48 141Q61 136 72 154Z" fill="${c.accent}" opacity=".45"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 160 200">
    <defs>
      <linearGradient id="plant" x2=".8" y2="1"><stop stop-color="${c.primary}"/><stop offset="1" stop-color="${c.secondary}"/></linearGradient>
      <linearGradient id="warm" x2="1" y2="1"><stop stop-color="${c.soft}"/><stop offset=".45" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.secondary}"/></linearGradient>
      <linearGradient id="soft" x2=".6" y2="1"><stop stop-color="${c.soft}"/><stop offset="1" stop-color="${c.primary}"/></linearGradient>
      <linearGradient id="glass" x2=".7" y2="1"><stop stop-color="${c.accent}" stop-opacity=".5"/><stop offset=".5" stop-color="${c.primary}" stop-opacity=".8"/><stop offset="1" stop-color="${c.secondary}" stop-opacity=".8"/></linearGradient>
      <filter id="mist"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="airbrush" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/><feFlood flood-color="${c.primary}" flood-opacity=".38"/><feComposite in2="blur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <g stroke-linecap="round" stroke-linejoin="round" filter="url(#airbrush)">${art[type]}</g>
  </svg>`;
}

export function biomeParticleSvg(reaction: PlanetBiome['reaction'], colors: BiomePalette, variant: number): string {
  let art: string;
  if (reaction === 'mapleLeaves' && variant % 3 !== 2) {
    art = `<path d="M32 51Q21 57 20 46Q8 47 15 36Q2 29 17 26Q10 13 24 19Q29 3 35 18Q49 7 47 25Q63 27 50 36Q57 49 42 46Q40 55 32 51Z" fill="${colors.primary}"/><path d="M32 55L31 24" stroke="${colors.accent}" stroke-width="2"/>`;
  } else if (reaction === 'morningDew' && variant % 2 === 0) {
    art = `<path d="M14 45Q9 15 50 14Q54 49 20 50Z" fill="${colors.soft}"/><path d="M16 48L43 23" stroke="${colors.secondary}" stroke-width="2"/>`;
  } else if (reaction === 'cloudFluff') {
    art = `<path d="M31 53L31 23M31 28Q11 9 10 26M31 27Q51 9 54 24M31 26Q30 4 24 10" fill="none" stroke="#FFFFFF" stroke-width="3"/><circle cx="31" cy="24" r="6" fill="#FFFFFF" opacity=".65"/>`;
  } else if (reaction === 'starBubbles') {
    art = `<circle cx="32" cy="32" r="19" fill="${colors.accent}" fill-opacity=".16" stroke="${variant % 2 ? colors.secondary : colors.accent}" stroke-opacity=".8" stroke-width="2"/><path d="M22 23Q25 18 31 18" stroke="${colors.soft}" stroke-width="3" fill="none"/>`;
  } else {
    art = `<circle cx="32" cy="32" r="11" fill="${reaction === 'morningDew' ? colors.soft : colors.accent}"/><circle cx="32" cy="32" r="20" fill="${colors.accent}" opacity=".2"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g stroke-linecap="round" stroke-linejoin="round">${art}</g></svg>`;
}
