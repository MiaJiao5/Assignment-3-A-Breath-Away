export type QuizChoice = 'A' | 'B' | 'C';

export type PlanetId = 'OMEGA_01' | 'DELTA_02' | 'SIGMA_03' | 'PSI_04';

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

export const PLANETS: Record<PlanetId, PlanetConfig> = {
  OMEGA_01: {
    id: 'OMEGA_01',
    code: 'Ω-01',
    externalAudioUrl: '', // 可填入外部音频路径，如 '/audio/omega-01-amber-sun.mp3'
    isDarkTheme: false,
    colors: {
      canvasBg: 'linear-gradient(165deg, #FFFDF7 0%, #FFF3DB 48%, #FFE4D6 100%)',
      outerDesktopBg: 'radial-gradient(circle at 50% 50%, #FDE68A 0%, #FDBA74 45%, #E29578 100%)',
      blob1: '#FDE68A', // 金黄麦浪色
      blob2: '#FDBA74', // 暖阳橘
      blob3: '#FBCFE8', // 蜜桃粉
      blob4: '#FFFBEB', // 柔和奶白
      planetCore: '#FFFBEB',
      planetMid: '#FDE68A',
      planetEdge: '#FDBA74',
      planetGlow: 'rgba(253, 186, 116, 0.65)',
      textPrimary: '#5C3D2E',
      textSecondary: '#8C624C',
      accentSoft: 'rgba(254, 215, 170, 0.72)',
    },
  },
  DELTA_02: {
    id: 'DELTA_02',
    code: 'Δ-02',
    externalAudioUrl: '', // 可填入外部音频路径，如 '/audio/delta-02-mint-breeze.mp3'
    isDarkTheme: false,
    colors: {
      canvasBg: 'linear-gradient(165deg, #F4FDF8 0%, #E2FAEE 50%, #ECFCCB 100%)',
      outerDesktopBg: 'radial-gradient(circle at 50% 50%, #A7F3D0 0%, #6EE7B7 45%, #34D399 100%)',
      blob1: '#A7F3D0', // 薄荷青绿
      blob2: '#BBF7D0', // 嫩草绿
      blob3: '#FEF08A', // 柠檬微黄
      blob4: '#F0FDF4', // 晨雾白
      planetCore: '#F0FDF4',
      planetMid: '#A7F3D0',
      planetEdge: '#6EE7B7',
      planetGlow: 'rgba(110, 231, 183, 0.62)',
      textPrimary: '#234E43',
      textSecondary: '#487A6B',
      accentSoft: 'rgba(167, 243, 208, 0.72)',
    },
  },
  SIGMA_03: {
    id: 'SIGMA_03',
    code: 'Σ-03',
    externalAudioUrl: '', // 可填入外部音频路径，如 '/audio/sigma-03-zero-sky.mp3'
    isDarkTheme: false,
    colors: {
      canvasBg: 'linear-gradient(165deg, #F8FAFC 0%, #E0F2FE 50%, #EDE9FE 100%)',
      outerDesktopBg: 'radial-gradient(circle at 50% 50%, #BAE6FD 0%, #C4B5FD 50%, #93C5FD 100%)',
      blob1: '#BAE6FD', // 纯净晴空蓝
      blob2: '#E0F2FE', // 粉蓝云朵
      blob3: '#DDD6FE', // 浅薰衣草紫
      blob4: '#F8FAFC', // 柔白光晕
      planetCore: '#F8FAFC',
      planetMid: '#BAE6FD',
      planetEdge: '#C4B5FD',
      planetGlow: 'rgba(186, 230, 253, 0.68)',
      textPrimary: '#313E5B',
      textSecondary: '#5B6B8C',
      accentSoft: 'rgba(221, 214, 254, 0.72)',
    },
  },
  PSI_04: {
    id: 'PSI_04',
    code: 'Ψ-04',
    externalAudioUrl: '', // 可填入外部音频路径，如 '/audio/psi-04-star-sea.mp3'
    isDarkTheme: true,
    colors: {
      canvasBg: 'linear-gradient(165deg, #281B4E 0%, #372963 48%, #4A2759 100%)',
      outerDesktopBg: 'radial-gradient(circle at 50% 50%, #312E81 0%, #4C1D95 50%, #1E1B4B 100%)',
      blob1: '#818CF8', // 梦幻钴蓝
      blob2: '#F472B6', // 暮光玫粉
      blob3: '#FDE047', // 星尘暖黄
      blob4: '#5B21B6', // 深海柔和紫
      planetCore: '#F5D0FE',
      planetMid: '#818CF8',
      planetEdge: '#F472B6',
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
