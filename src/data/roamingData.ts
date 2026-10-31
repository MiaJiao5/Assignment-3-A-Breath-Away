export type QuizChoice = 'A' | 'B' | 'C';

export type PlanetId = 'OMEGA_01' | 'DELTA_02' | 'SIGMA_03' | 'PSI_04';

export type BiomePropType = 'mapleTree' | 'goldenWheat' | 'berryBush'
  | 'cloudTree' | 'grassTuft' | 'mintMushroom'
  | 'softCloud' | 'dandelion' | 'pinwheel'
  | 'jellyfishMushroom' | 'crystalCluster' | 'moonReed';
export interface BiomePalette { primary: string; secondary: string; accent: string; soft: string }
export interface BiomePropConfig {
  type: BiomePropType;
  /** Clockwise degrees from the top of the local globe; independent of language. */
  angle: number;
  latitude: number;
  scale: number;
  colors: BiomePalette;
}
export interface SurfaceLocation { angle: number; latitude: number }
export interface PlanetBiome {
  id: 'autumn' | 'forest' | 'sky' | 'starsea';
  palette: BiomePalette;
  reaction: 'mapleLeaves' | 'morningDew' | 'cloudFluff' | 'starBubbles';
}
export function surfaceCoordinates(location: SurfaceLocation) {
  return { lon: location.angle * Math.PI / 180, lat: location.latitude * Math.PI / 180 };
}

const AUTUMN: BiomePalette = { primary: '#FF6B6B', secondary: '#FFA057', accent: '#FFD166', soft: '#FFE5C0' };
const FOREST: BiomePalette = { primary: '#4ECDC4', secondary: '#56C596', accent: '#F9F871', soft: '#A8E6CF' };
const SKY: BiomePalette = { primary: '#89CFF0', secondary: '#C3B1E1', accent: '#FFB7B2', soft: '#FFFFFF' };
const STARSEA: BiomePalette = { primary: '#9B72CF', secondary: '#FF70A6', accent: '#70D6FF', soft: '#FFE66D' };

export interface QuizQuestion {
  id: number;
  question: string;
  options: {
    value: QuizChoice;
    emoji: string;
    label: string;
  }[];
}

export interface PlanetConfig {
  id: PlanetId;
  code: string;
  /**
   * 预留 <audio> 外部音频文件路径替换接口：
   * 若需要替换为外部音频文件（如 '/audio/omega-01.mp3'），只需在此填入路径即可自动优先使用 <audio> 播放；
   * 默认为空字符串 ''，将使用内置 Web Audio API 实时生成的治愈氛围音乐与环境白噪音。
   */
  externalAudioUrl: string;
  isDarkTheme: boolean;
  biome: PlanetBiome;
  props: BiomePropConfig[];
  landmarks: { stone: SurfaceLocation; portal: SurfaceLocation };
  colors: {
    canvasBg: string;
    outerDesktopBg: string;
    blob1: string;
    blob2: string;
    blob3: string;
    blob4: string;
    planetCore: string;
    planetMid: string;
    planetEdge: string;
    planetGlow: string;
    textPrimary: string;
    textSecondary: string;
    accentSoft: string;
  };
}

/**
 * OPTIONAL MP3 REPLACEMENT POINT
 *
 * Put generated tracks in `public/audio/` and replace any empty string below,
 * for example: OMEGA_01: '/audio/omega-01-amber-sun.mp3'. The shared hidden
 * <audio id="brief-roaming-external-audio"> element in App.tsx will then take
 * priority over the procedural Web Audio melody for that planet.
 */
export const PLANET_AUDIO_URLS: Partial<Record<PlanetId, string>> = {
  OMEGA_01: '/audio/omega-01-copper-afternoon.mp3',
  DELTA_02: '/audio/delta-02-sunlight-on-the-moss.mp3',
  SIGMA_03: '/audio/sigma-03-midday-horizon.mp3',
  PSI_04: '/audio/psi-04-last-active-sensor.mp3',
};

export const PLANETS: Record<PlanetId, PlanetConfig> = {
  OMEGA_01: {
    id: 'OMEGA_01',
    code: 'Ω-01',
    externalAudioUrl: PLANET_AUDIO_URLS.OMEGA_01 ?? '',
    isDarkTheme: false,
    biome: { id: 'autumn', palette: AUTUMN, reaction: 'mapleLeaves' },
    props: [
      { type: 'mapleTree', angle: 25, latitude: -18, scale: 1.05, colors: AUTUMN },
      { type: 'goldenWheat', angle: 80, latitude: 15, scale: .85, colors: AUTUMN },
      { type: 'berryBush', angle: 145, latitude: 18, scale: .9, colors: AUTUMN },
      { type: 'mapleTree', angle: 210, latitude: -12, scale: .95, colors: AUTUMN },
      { type: 'goldenWheat', angle: 275, latitude: 10, scale: 1, colors: AUTUMN },
      { type: 'berryBush', angle: 330, latitude: -15, scale: .8, colors: AUTUMN },
    ],
    landmarks: { stone: { angle: 55, latitude: 4 }, portal: { angle: 180, latitude: -4 } },
    colors: {
      canvasBg: 'linear-gradient(155deg, #C77065 0%, #D88A54 46%, #A85479 100%)',
      outerDesktopBg: 'radial-gradient(ellipse at 50% 45%, #D3916E, #70445D 85%)',
      blob1: '#EBC252',
      blob2: '#EF8953',
      blob3: '#D9588D',
      blob4: '#EEC286',
      planetCore: '#F7DCBC',
      planetMid: '#E8B18E',
      planetEdge: '#CB7B98',
      planetGlow: 'rgba(253, 186, 116, 0.65)',
      textPrimary: '#FFF6EA',
      textSecondary: '#FFF0DA',
      accentSoft: 'rgba(254, 215, 170, 0.72)',
    },
  },
  DELTA_02: {
    id: 'DELTA_02',
    code: 'Δ-02',
    externalAudioUrl: PLANET_AUDIO_URLS.DELTA_02 ?? '',
    isDarkTheme: false,
    biome: { id: 'forest', palette: FOREST, reaction: 'morningDew' },
    props: [
      { type: 'grassTuft', angle: 15, latitude: 18, scale: .85, colors: FOREST },
      { type: 'cloudTree', angle: 65, latitude: -14, scale: 1.05, colors: FOREST },
      { type: 'mintMushroom', angle: 125, latitude: 12, scale: .9, colors: FOREST },
      { type: 'grassTuft', angle: 190, latitude: -17, scale: 1, colors: FOREST },
      { type: 'cloudTree', angle: 245, latitude: 10, scale: .95, colors: FOREST },
      { type: 'mintMushroom', angle: 305, latitude: -12, scale: .8, colors: FOREST },
    ],
    landmarks: { stone: { angle: 95, latitude: 4 }, portal: { angle: 220, latitude: -4 } },
    colors: {
      canvasBg: 'linear-gradient(155deg, #205D56 0%, #348578 48%, #3D6B73 100%)',
      outerDesktopBg: 'radial-gradient(ellipse at 50% 45%, #518A77, #203E47 85%)',
      blob1: '#25AF88',
      blob2: '#73C8B5',
      blob3: '#E1C864',
      blob4: '#326A74',
      planetCore: '#D0EBD6',
      planetMid: '#8DC5AC',
      planetEdge: '#699DAB',
      planetGlow: 'rgba(110, 231, 183, 0.62)',
      textPrimary: '#EFFAE9',
      textSecondary: '#DAF1E3',
      accentSoft: 'rgba(167, 243, 208, 0.72)',
    },
  },
  SIGMA_03: {
    id: 'SIGMA_03',
    code: 'Σ-03',
    externalAudioUrl: PLANET_AUDIO_URLS.SIGMA_03 ?? '',
    isDarkTheme: false,
    biome: { id: 'sky', palette: SKY, reaction: 'cloudFluff' },
    props: [
      { type: 'softCloud', angle: 40, latitude: -16, scale: .95, colors: SKY },
      { type: 'dandelion', angle: 115, latitude: 17, scale: .9, colors: SKY },
      { type: 'pinwheel', angle: 175, latitude: -15, scale: .85, colors: SKY },
      { type: 'softCloud', angle: 250, latitude: 12, scale: 1.1, colors: SKY },
      { type: 'dandelion', angle: 315, latitude: -10, scale: .85, colors: SKY },
    ],
    landmarks: { stone: { angle: 75, latitude: 4 }, portal: { angle: 145, latitude: -4 } },
    colors: {
      canvasBg: 'linear-gradient(155deg, #294CAB 0%, #4662C4 45%, #6654A9 100%)',
      outerDesktopBg: 'radial-gradient(ellipse at 50% 45%, #5971B9, #27355E 85%)',
      blob1: '#2458CB',
      blob2: '#9E7BCA',
      blob3: '#E9A3A3',
      blob4: '#567DDD',
      planetCore: '#D3DDF0',
      planetMid: '#9EBAE2',
      planetEdge: '#BC93C4',
      planetGlow: 'rgba(186, 230, 253, 0.68)',
      textPrimary: '#F8F5FF',
      textSecondary: '#E7E8FF',
      accentSoft: 'rgba(221, 214, 254, 0.72)',
    },
  },
  PSI_04: {
    id: 'PSI_04',
    code: 'Ψ-04',
    externalAudioUrl: PLANET_AUDIO_URLS.PSI_04 ?? '',
    isDarkTheme: true,
    biome: { id: 'starsea', palette: STARSEA, reaction: 'starBubbles' },
    props: [
      { type: 'jellyfishMushroom', angle: 10, latitude: -18, scale: 1, colors: STARSEA },
      { type: 'crystalCluster', angle: 70, latitude: 14, scale: .9, colors: STARSEA },
      { type: 'moonReed', angle: 135, latitude: -12, scale: .95, colors: STARSEA },
      { type: 'jellyfishMushroom', angle: 200, latitude: 17, scale: .9, colors: STARSEA },
      { type: 'crystalCluster', angle: 265, latitude: -14, scale: 1, colors: STARSEA },
      { type: 'moonReed', angle: 325, latitude: 12, scale: .85, colors: STARSEA },
    ],
    landmarks: { stone: { angle: 105, latitude: 4 }, portal: { angle: 295, latitude: -4 } },
    colors: {
      canvasBg: 'linear-gradient(155deg, #211B50 0%, #33246A 48%, #612D68 100%)',
      outerDesktopBg: 'radial-gradient(circle at 50% 50%, #312E81 0%, #4C1D95 50%, #1E1B4B 100%)',
      blob1: '#535EB0', // 梦幻钴蓝
      blob2: '#C54D9B', // 暮光玫粉
      blob3: '#E9B64F', // 星尘暖黄
      blob4: '#5B21B6', // 深海柔和紫
      planetCore: '#CDBBDD',
      planetMid: '#9991C4',
      planetEdge: '#B36E9F',
      planetGlow: 'rgba(244, 114, 182, 0.55)',
      textPrimary: '#FDF4FF',
      textSecondary: '#E9D5FF',
      accentSoft: 'rgba(167, 139, 250, 0.45)',
    },
  },
};

export const PLANET_LIST: PlanetConfig[] = [
  PLANETS.OMEGA_01,
  PLANETS.DELTA_02,
  PLANETS.SIGMA_03,
  PLANETS.PSI_04,
];

/**
 * 四个星球的映射算法：
 * - 选 A 达到 2 个或 3 个 -> Ω-01（琥珀暖阳）
 * - 选 B 达到 2 个或 3 个 -> Δ-02（薄荷晨风）
 * - 选 C 达到 2 个或 3 个 -> Σ-03（晴空零度）
 * - A、B、C 各选 1 个（平票混合态） -> Ψ-04（静谧星海）
 */
export function calculateAssignedPlanet(answers: QuizChoice[]): PlanetId {
  const counts: Record<QuizChoice, number> = { A: 0, B: 0, C: 0 };
  for (const ans of answers) {
    counts[ans] = (counts[ans] || 0) + 1;
  }
  if (counts.A >= 2) return 'OMEGA_01';
  if (counts.B >= 2) return 'DELTA_02';
  if (counts.C >= 2) return 'SIGMA_03';
  return 'PSI_04';
}
