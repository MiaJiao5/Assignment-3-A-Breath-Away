import { LanguageToggle, useLanguage } from './i18n/LanguageContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PLANETS,
  PLANET_LIST,
  PlanetId,
  QuizChoice,
  calculateAssignedPlanet,
} from './data/roamingData';
import { soundEngine } from './audio/soundEngine';
import { FluffySpirit, OverheadBubbleData, SpiritPose } from './components/FluffySpirit';
import {
  JoystickVector,
  ThreePlanetStage,
} from './components/ThreePlanetStage';
import { BottomPlanetController } from './components/BottomPlanetController';
import { PlanetGuide } from './components/PlanetGuide';

type AppAct = 'intro' | 'quiz' | 'warp' | 'roaming' | 'farewell';

interface FloatingStardustItem {
  id: number;
  text: string;
  builtinIndex?: number;
  leftPercent: number;
  driftX: number;
}

const LOCAL_STORAGE_KEY = 'brief_roaming_user_stardust_v1';

export default function App() {
  const { copy } = useLanguage();
  const { INTRO_COPY, QUIZ_QUESTIONS, ROAMING_COPY, BUILTIN_STARDUST_QUOTES } = copy;
  const [feedback, setFeedback] = useState<'releaseSuccess' | 'audioError' | null>(null);
  const [act, setAct] = useState<AppAct>('intro');
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizChoice[]>([]);
  const [planetId, setPlanetId] = useState<PlanetId>('OMEGA_01');

  // 第三幕 & 第四幕：星球漫步与小精灵状态
  const [spiritPose, setSpiritPose] = useState<SpiritPose>('idle');
  // Gate input synchronously, including pointer events queued before React renders.
  const isRestingRef = useRef(false);
  const isGuideOpenRef = useRef(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [canLeave, setCanLeave] = useState(false);
  const [spiritFacing, setSpiritFacing] = useState<'left' | 'right'>('right');
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [whiteNoiseEnabled, setWhiteNoiseEnabled] = useState<boolean>(true);

  // 3D 星球控制器输入向量、当前球面经纬度、弹簧目标经纬度与速度 Ref
  const joystickInputRef = useRef<JoystickVector>({ x: 0, y: 0 });
  const planetCoordsRef = useRef<{ lon: number; lat: number }>({
    lon: 0.28,
    lat: 0.04,
  });
  const targetCoordsRef = useRef<{ lon: number; lat: number }>({
    lon: 0.28,
    lat: 0.04,
  });
  const springVelocityRef = useRef<{ lon: number; lat: number }>({
    lon: 0,
    lat: 0,
  });
  const [isNearListeningRock, setIsNearListeningRock] = useState<boolean>(false);
  const [isNearPortal, setIsNearPortal] = useState<boolean>(false);

  // 星尘文字循环队列（内置 5 条 + 本地持久化用户心情）
  const [userQuotes, setUserQuotes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const [floatingStardust, setFloatingStardust] = useState<FloatingStardustItem[]>([]);
  const quoteCursorRef = useRef<number>(0);

  // 树洞输入与头顶气泡
  const [moodInput, setMoodInput] = useState<string>('');
  const [overheadBubble, setOverheadBubble] = useState<OverheadBubbleData | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);

  // 传送门浮层开关
  const [isPortalModalOpen, setIsPortalModalOpen] = useState<boolean>(false);

  const activePlanet = { ...PLANETS[planetId], ...copy.planets[planetId] };
  const planetList = PLANET_LIST.map(p => ({ ...p, ...copy.planets[p.id] }));

  // 当进入坐下听歌状态（isMusicPlaying === true）时，每隔 3.5 秒从星球背后飘出一句星尘文字
  useEffect(() => {
    if (act !== 'roaming' || !isMusicPlaying) {
      return;
    }

    const allQuotes = [...userQuotes, ...BUILTIN_STARDUST_QUOTES];
    if (allQuotes.length === 0) return;

    const spawnStardust = (customText?: string) => {
      const cursor = quoteCursorRef.current % allQuotes.length;
      const builtinIndex = !customText && cursor >= userQuotes.length ? cursor - userQuotes.length : undefined;
      const text =
        customText ?? allQuotes[quoteCursorRef.current % allQuotes.length];
      if (!customText) {
        quoteCursorRef.current += 1;
      }

      const id = Date.now() + Math.random();
      const leftPercent = 12 + Math.random() * 44;
      const driftX = (Math.random() - 0.5) * 32;

      setFloatingStardust((prev) => [...prev.slice(-5), { id, text, builtinIndex, leftPercent, driftX }]);
    };

    const initialTimer = window.setTimeout(() => {
      spawnStardust();
    }, 450);

    // 每隔 3.5 秒缓缓向上飘出半透明治愈文字
    const interval = window.setInterval(() => {
      spawnStardust();
    }, 3500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [act, isMusicPlaying, userQuotes]);

  useEffect(() => {
    const onAudioError = () => setFeedback('audioError');
    window.addEventListener('breath-away-audio-error', onAudioError);
    return () => window.removeEventListener('breath-away-audio-error', onAudioError);
  }, []);

  // 组件卸载时清理音频与动画帧
  useEffect(() => {
    soundEngine.setMuted(false);
    return () => {
      soundEngine.stopPlanetMusicImmediate();
    };
  }, []);

  const triggerOverheadBubble = useCallback(
    (text: string, isError = false, durationMs = 4000, messageKey?: 'emptyErrorBubble' | 'spiritHint' | 'stoneGuide') => {
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current);
      }
      setOverheadBubble({
        id: Date.now(),
        text,
        isError,
        messageKey,
      });
      bubbleTimerRef.current = window.setTimeout(() => {
        setOverheadBubble(null);
      }, durationMs);
    },
    []
  );

  // 【第一幕 -> 第二幕】开始短暂漫游
  const handleStartRoaming = () => {
    try { soundEngine.unlock(); } catch { setFeedback('audioError'); }
    soundEngine.playSoftClick(40);
    setQuizAnswers([]);
    setQuizStep(0);
    setAct('quiz');
  };

  // 【第二幕】回答三步心境校准问卷
  const handleSelectOption = (choice: QuizChoice) => {
    soundEngine.playSoftClick(choice === 'A' ? 0 : choice === 'B' ? 60 : 120);
    const updated = [...quizAnswers];
    updated[quizStep] = choice;
    setQuizAnswers(updated);

    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // 完成第 3 题，计算映射星球并进入 1.5 秒曲速过渡动画
      const assigned = calculateAssignedPlanet(updated);
      setPlanetId(assigned);
      setAct('warp');
      soundEngine.playWarpTransition();
    }
  };

  const handleSkipQuiz = () => {
    setPlanetId(calculateAssignedPlanet(quizAnswers));
    soundEngine.playWarpTransition();
    setAct('warp');
  };

  useEffect(() => {
    if (act !== 'warp') return;
    const timer = window.setTimeout(() => {
      planetCoordsRef.current = { lon: 0.28, lat: 0.04 };
      targetCoordsRef.current = { lon: 0.28, lat: 0.04 };
      springVelocityRef.current = { lon: 0, lat: 0 };
      joystickInputRef.current = { x: 0, y: 0 };
      setSpiritPose('idle');
      setIsMusicPlaying(false);
      isGuideOpenRef.current = true;
      setIsGuideOpen(true);
      setAct('roaming');
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [act]);

  useEffect(() => {
    setCanLeave(false);
    if (act !== 'roaming' || spiritPose !== 'sitting') return;
    const timer = window.setTimeout(() => setCanLeave(true), 3000);
    return () => window.clearTimeout(timer);
  }, [act, spiritPose]);

  // 底部控制器漫步状态同步
  const handleWalkStateChange = useCallback(
    (isWalking: boolean, facing?: 'left' | 'right') => {
      if (isRestingRef.current || isGuideOpenRef.current) return;
      if (facing) {
        setSpiritFacing(facing);
      }
      setSpiritPose((prev) => {
        if (prev === 'sitting') return 'sitting';
        return isWalking ? 'walking' : 'idle';
      });
    },
    []
  );

  // Rest exactly where the visitor stopped, cancelling all queued movement.
  const stopMovement = () => {
    joystickInputRef.current = { x: 0, y: 0 };
    targetCoordsRef.current = { ...planetCoordsRef.current };
    springVelocityRef.current = { lon: 0, lat: 0 };
  };

  const handleSitAndListen = () => {
    if (isGuideOpenRef.current) return;
    setCanLeave(false);
    soundEngine.playSoftClick(90);
    stopMovement();

    if (isRestingRef.current) {
      isRestingRef.current = false;
      setSpiritPose('idle');
      setIsMusicPlaying(false);
      soundEngine.stopPlanetMusicImmediate();
    } else {
      isRestingRef.current = true;
      setSpiritPose('sitting');
      setIsMusicPlaying(true);
      try { soundEngine.startPlanetMusic(planetId); } catch {
        setIsMusicPlaying(false);
        setFeedback('audioError');
      }
    }
  };

  // 树洞放飞心情（含空输入错误处理）
  const handleReleaseMood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRestingRef.current || act !== 'roaming') return;
    const trimmed = moodInput;

    if (!trimmed.trim()) {
      soundEngine.playSoftClick(-80);
      triggerOverheadBubble('', true, 3600, 'emptyErrorBubble');
      return;
    }

    soundEngine.playSpiritChime();
    setMoodInput('');
    setFeedback('releaseSuccess');

    // 1. 头顶弹出边缘柔和的云朵状白色气泡显示 4 秒
    triggerOverheadBubble(trimmed, false, 4000);

    // 2. 加入背景飘出文字的循环队列并持久化至 localStorage
    const nextUserQuotes = [trimmed, ...userQuotes.filter((q) => q !== trimmed)].slice(0, 30);
    setUserQuotes(nextUserQuotes);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextUserQuotes));
    } catch {
      // Ignore storage error
    }

    // 3. 立即在背景光晕中也生成一缕星尘飘起
    const id = Date.now() + Math.random();
    setFloatingStardust((prev) => [
      ...prev.slice(-5),
      {
        id,
        text: trimmed,
        leftPercent: 18 + Math.random() * 38,
        driftX: (Math.random() - 0.5) * 26,
      },
    ]);
  };

  // 通过【🌀 传送门】切换体验另外 3 个星球
  const handleSwitchPlanet = (nextPlanetId: PlanetId) => {
    if (isRestingRef.current) return;
    soundEngine.playWarpTransition();
    setIsPortalModalOpen(false);
    setPlanetId(nextPlanetId);
    stopMovement();
    setSpiritPose('idle');
    isGuideOpenRef.current = true;
    setIsGuideOpen(true);

    if (isMusicPlaying) {
      try { soundEngine.startPlanetMusic(nextPlanetId); } catch { setFeedback('audioError'); }
    }
  };

  // 点击右上角 [ 👋 先去忙啦 ] 进入告别闭环
  const handleLeaveToFarewell = () => {
    if (!canLeave || act !== 'roaming' || !isRestingRef.current) return;
    isRestingRef.current = false;
    isGuideOpenRef.current = false;
    setIsGuideOpen(false);
    stopMovement();
    soundEngine.playSoftClick(20);
    soundEngine.fadeOutAndStop(1.4);
    joystickInputRef.current = { x: 0, y: 0 };
    setIsMusicPlaying(false);
    setIsPortalModalOpen(false);
    setOverheadBubble(null);
    setSpiritPose('waving');
    setAct('farewell');
  };

  // 点击 [ 重新开启漫游 ] 重置状态回到开场
  const handleRestartAll = () => {
    isRestingRef.current = false;
    isGuideOpenRef.current = false;
    setIsGuideOpen(false);
    stopMovement();
    soundEngine.playSoftClick(60);
    soundEngine.stopPlanetMusicImmediate();
    joystickInputRef.current = { x: 0, y: 0 };
    setQuizAnswers([]);
    setQuizStep(0);
    setFloatingStardust([]);
    setFeedback(null);
    setOverheadBubble(null);
    setSpiritPose('idle');
    setIsMusicPlaying(false);
    setAct('intro');
  };

  // 静音与环境白噪音切换
  const handleToggleWhiteNoise = () => {
    const next = !whiteNoiseEnabled;
    setWhiteNoiseEnabled(next);
    soundEngine.setWhiteNoiseEnabled(next);
    soundEngine.playSoftClick(50);
  };

  const handleNearLandmarkChange = useCallback((nearRock: boolean, nearPortal: boolean) => {
    setIsNearListeningRock(nearRock);
    setIsNearPortal(nearPortal);
  }, []);

  const handleSelect3DLandmark = (landmark: 'rock' | 'portal') => {
    if (isRestingRef.current || isGuideOpenRef.current) return;
    if (landmark === 'rock') {
      if (isNearListeningRock) handleSitAndListen();
      else triggerOverheadBubble('', false, 3000, 'stoneGuide');
    } else if (isNearPortal) {
      setIsPortalModalOpen(true);
    }
  };

  const isPlanetThemeActive = act === 'warp' || act === 'roaming' || act === 'farewell';
  const currentColors = isPlanetThemeActive
    ? activePlanet.colors
    : {
        canvasBg: 'linear-gradient(165deg, #FFFDF9 0%, #FCE7F3 48%, #E0E7FF 100%)',
        outerDesktopBg: 'radial-gradient(circle at 50% 50%, #FBCFE8 0%, #DDD6FE 50%, #FDE68A 100%)',
        blob1: '#FBCFE8',
        blob2: '#FDE68A',
        blob3: '#C4B5FD',
        blob4: '#E0F2FE',
        planetCore: '#FFFFFF',
        planetMid: '#FBCFE8',
        planetEdge: '#FDE68A',
        planetGlow: 'rgba(251, 207, 232, 0.65)',
        textPrimary: '#4A3B52',
        textSecondary: '#7A6885',
        accentSoft: 'rgba(251, 207, 232, 0.65)',
      };

  // WebGL 激活时避免使用 backdrop-filter，保证软件/硬件渲染 60fps 丝滑
  const softPillStyle: React.CSSProperties = {
    background:
      'radial-gradient(120% 140% at 50% 25%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 70%, rgba(255,255,255,0.5) 100%)',
    boxShadow:
      '0 8px 24px -4px rgba(95, 80, 125, 0.16), 0 0 18px 4px rgba(255,255,255,0.6), inset 0 0 12px rgba(255,255,255,0.85)',
  };

  return (
    <div
      className="w-screen h-screen flex items-center justify-center overflow-hidden transition-colors duration-1000"
      style={{
        background: currentColors.outerDesktopBg,
      }}
    >
      {/* 电脑端外围柔和环境光晕层 */}
      <div
        className="hidden sm:block fixed inset-0 pointer-events-none opacity-65"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.45) 0%, rgba(20,16,38,0.35) 100%)',
        }}
      />

      {/* 预留 <audio> 外部音频文件播放标签 */}
      <audio onError={() => setFeedback('audioError')} id="brief-roaming-external-audio" preload="auto" className="hidden" />

      {/* 核心手机竖屏比例容器 (max-width: 414px; height: 100vh; max-height: 860px; border-radius: 28px) */}
      <main
        className="roaming-mobile-frame flex flex-col justify-between select-none"
        style={{
          background: currentColors.canvasBg,
          color: currentColors.textPrimary,
        }}
      >
        {/* ================= 1. 全局最顶层：彩铅/纸张噪点肌理 (SVG feTurbulence 透明度 0.08) ================= */}
        <svg
          className="pointer-events-none absolute inset-0 z-50 w-full h-full opacity-[0.08] mix-blend-overlay"
          aria-hidden="true"
        >
          <filter id="paper-grain-overlay">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-grain-overlay)" />
        </svg>

        {/* ================= 2. 喷枪柔焦与弥散光晕背景层 (Airbrush & Aura Blobs) ================= */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div
            className={`absolute -top-12 -left-14 w-72 h-72 rounded-full transition-colors duration-1000 ${
              isMusicPlaying ? 'blob-music-1' : 'blob-idle-1'
            }`}
            style={{
              background: `radial-gradient(circle, ${currentColors.blob1} 0%, transparent 72%)`,
              filter: 'blur(48px)',
              opacity: isMusicPlaying ? 0.94 : 0.75,
            }}
          />
          <div
            className={`absolute top-1/4 -right-16 w-80 h-80 rounded-full transition-colors duration-1000 ${
              isMusicPlaying ? 'blob-music-2' : 'blob-idle-2'
            }`}
            style={{
              background: `radial-gradient(circle, ${currentColors.blob2} 0%, transparent 72%)`,
              filter: 'blur(55px)',
              opacity: isMusicPlaying ? 0.92 : 0.72,
            }}
          />
          <div
            className={`absolute bottom-24 -left-16 w-80 h-80 rounded-full transition-colors duration-1000 ${
              isMusicPlaying ? 'blob-music-3' : 'blob-idle-3'
            }`}
            style={{
              background: `radial-gradient(circle, ${currentColors.blob3} 0%, transparent 74%)`,
              filter: 'blur(52px)',
              opacity: isMusicPlaying ? 0.9 : 0.7,
            }}
          />
          <div
            className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full transition-colors duration-1000 ${
              isMusicPlaying ? 'blob-music-4' : 'blob-idle-1'
            }`}
            style={{
              background: `radial-gradient(circle, ${currentColors.blob4} 0%, transparent 75%)`,
              filter: 'blur(58px)',
              opacity: isMusicPlaying ? 0.94 : 0.68,
            }}
          />
        </div>

        {/* ================= 3. 顶部轻量状态栏与常驻告别按钮 ================= */}
        <LanguageToggle />
        <header inert={isGuideOpen} className={`app-header relative z-30 flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-1 ${act === 'roaming' ? 'planet-header' : ''}`}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium tracking-widest opacity-85"
              style={{ color: currentColors.textSecondary }}
            >
              {act === 'roaming' ? activePlanet.fullName : copy.title}
            </span>
          </div>

            {act === 'roaming' && spiritPose === 'sitting' && canLeave && (
              <button
                type="button"
                onClick={handleLeaveToFarewell}
                style={softPillStyle}
                className="absolute right-5 top-4 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
              >
                {ROAMING_COPY.leaveButton}
              </button>
            )}
        </header>

        {/* ================= 第一幕：开场引导页 ================= */}
        {act === 'intro' && (
          <section className="relative z-20 flex-1 flex flex-col items-center justify-between px-7 pt-6 pb-10">
            <div className="text-center mt-4">
              <p className="text-xs tracking-[0.25em] opacity-65 mb-2">{copy.title}</p>
              <h1 className="font-serif-soft text-2xl font-semibold tracking-wider">
                {copy.title}
              </h1>
            </div>

            <div className="my-auto flex flex-col items-center">
              <FluffySpirit
                pose="idle"
                size="large"
                onTapSpirit={() => soundEngine.playSpiritChime()}
              />

              <div className="airbrush-soft-card mt-8 px-6 py-6 rounded-[32px] max-w-[330px] text-center">
                <p className="text-[15px] leading-relaxed font-normal tracking-wide text-slate-700">
                  {INTRO_COPY.welcome}
                </p>
                <p className="mt-3 text-xs text-slate-600">
                  {copy.support}
                </p>
              </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartRoaming}
                className="airbrush-pill-btn w-full max-w-[310px] py-4 px-6 rounded-full text-[15px] font-medium tracking-wider text-slate-800 cursor-pointer whitespace-nowrap"
              >
                [ {INTRO_COPY.startButton} ]
              </button>
            </div>
          </section>
        )}

        {/* ================= 第二幕：三步心境校准（分支评估问卷） ================= */}
        {act === 'quiz' && (
          <section className="relative z-20 flex-1 flex flex-col items-center justify-between px-6 pt-4 pb-10">
            <div role="status" className="text-xs text-center">{copy.progress.replace('{n}', String(quizStep + 1))}</div>
            <div className="flex items-center gap-3 mt-2">
              {QUIZ_QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: idx === quizStep ? 28 : 8,
                    background:
                      idx <= quizStep
                        ? 'rgba(255, 255, 255, 0.92)'
                        : 'rgba(255, 255, 255, 0.38)',
                    boxShadow:
                      idx === quizStep ? '0 0 12px rgba(255, 255, 255, 0.9)' : 'none',
                  }}
                />
              ))}
            </div>

            <div className="mt-2">
              <FluffySpirit
                pose="idle"
                onTapSpirit={() => soundEngine.playSpiritChime()}
              />
            </div>

            <div
              key={QUIZ_QUESTIONS[quizStep].id}
              className="w-full max-w-[348px] my-auto flex flex-col gap-5 transition-all duration-500"
            >
              <div className="airbrush-soft-card px-6 py-5 rounded-[28px] text-center">
                <h2 className="font-serif-soft text-[17px] leading-relaxed font-medium text-slate-800">
                  {QUIZ_QUESTIONS[quizStep].question}
                </h2>
              </div>

              <div className="flex flex-col gap-3.5">
                {QUIZ_QUESTIONS[quizStep].options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectOption(option.value)}
                    aria-pressed={quizAnswers[quizStep] === option.value}
                    style={quizAnswers[quizStep] === option.value ? { outline: '2px solid #78649b' } : undefined}
                    className="airbrush-tape-option w-full py-4 px-5 rounded-2xl text-left text-[15px] font-medium text-slate-700 flex items-center gap-3 cursor-pointer"
                  >
                    <span className="text-[24px] leading-none font-semibold shrink-0 w-5">{option.value}</span>
                    <span className="text-[25px] leading-none shrink-0" aria-hidden="true">{option.emoji}</span>
                    <span className="min-w-0 flex-1">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs my-3">
              <button type="button" onClick={() => {
                if (quizStep > 0) setQuizStep(quizStep - 1);
                else setAct('intro');
              }}>
                {copy.back}
              </button>
              <button type="button" onClick={handleSkipQuiz}>
                {copy.skip}
              </button>
            </div>
            <p className="text-xs opacity-60 tracking-wider">
              {copy.quizHint}
            </p>
          </section>
        )}

        {/* ================= 曲速过渡动画（1.5秒） ================= */}
        {act === 'warp' && (
          <section className="relative z-20 flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="mb-6">
              <FluffySpirit pose="walking" facing={spiritFacing} size="large" />
            </div>
            <div className="airbrush-soft-card px-7 py-6 rounded-[32px] max-w-[330px]">
              <p className="text-[15px] leading-relaxed font-medium text-slate-800 tracking-wide">
                {copy.gathering}<br />{copy.tuning}<br />{activePlanet.fullName}
              </p>
            </div>
          </section>
        )}

        {/* ================= 第三幕 & 第四幕：3D 星球漫步、手势滑动、底部控制器、坐下听歌与星尘树洞 ================= */}
        {act === 'roaming' && (
          <section inert={isGuideOpen} className="planet-scene relative z-20 flex-1 flex flex-col justify-between overflow-hidden">
            {/* 顶部星球氛围副标题与听歌白噪音控制 */}
            <div className="px-5 pt-0.5 text-center z-20">
              <p
                className="text-xs tracking-wider opacity-85"
                style={{ color: currentColors.textSecondary }}
              >
                {activePlanet.subtitle}
              </p>

              {isMusicPlaying && (
                <div
                  className="mt-1.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full"
                  style={softPillStyle}
                >
                  <span className="text-[11px] text-slate-700 font-medium">
                    ♪ {copy.playing}: {activePlanet.name}
                  </span>
                  <span className="text-slate-400">·</span>
                  <button
                    type="button"
                    onClick={handleToggleWhiteNoise}
                    className="text-[11px] font-medium text-slate-700 underline decoration-dotted cursor-pointer whitespace-nowrap"
                  >
                    {whiteNoiseEnabled
                      ? `🌿 ${activePlanet.noiseLabel}: ${copy.on}`
                      : `🌿 ${activePlanet.noiseLabel}: ${copy.off}`}
                  </button>
                </div>
              )}
            </div>

            {/* 星球背后的半透明柔光星尘文字飘出层（每隔 3.5 秒向上飘出） */}
            <div className="pointer-events-none absolute inset-x-0 top-16 bottom-60 z-10 overflow-hidden">
              {floatingStardust.map((item) => (
                <div
                  key={item.id}
                  className="animate-stardust-float absolute bottom-4 max-w-[250px] px-4 py-2 rounded-full"
                  style={
                    {
                      left: `${item.leftPercent}%`,
                      '--drift-x': `${item.driftX}px`,
                      background:
                        'radial-gradient(circle, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.35) 82%, transparent 100%)',
                      boxShadow: '0 0 22px 6px rgba(255,255,255,0.52)',
                    } as React.CSSProperties
                  }
                >
                  <p className="text-xs text-slate-700 font-medium leading-relaxed text-center whitespace-pre-wrap break-words">
                    {item.builtinIndex === undefined ? item.text : BUILTIN_STARDUST_QUOTES[item.builtinIndex]}
                  </p>
                </div>
              ))}
            </div>

            {/* 中央 3D 星球与毛茸茸白色小精灵互动舞台（绑定 Touch Swipe 与 Mouse Drag 丝滑旋转手势） */}
            <div
              className="planet-stage relative flex-1 min-h-[250px] flex flex-col items-center justify-center z-20 touch-none"
            >
              <ThreePlanetStage
                planetId={planetId}
                pose={spiritPose}
                isMusicPlaying={isMusicPlaying}
                interactionEnabled={!isGuideOpen && !isPortalModalOpen}
                joystickInputRef={joystickInputRef}
                planetCoordsRef={planetCoordsRef}
                targetCoordsRef={targetCoordsRef}
                springVelocityRef={springVelocityRef}
                overheadBubble={overheadBubble ? { ...overheadBubble, text: overheadBubble.messageKey === 'emptyErrorBubble' ? ROAMING_COPY.emptyErrorBubble : overheadBubble.messageKey ? copy[overheadBubble.messageKey] : overheadBubble.text } : null}
                onNearLandmarkChange={handleNearLandmarkChange}
                onTapSpirit={() => {
                  if (!isRestingRef.current) handleSitAndListen();
                }}
                onSelectLandmark={handleSelect3DLandmark}
              />

              {/* 原地坐下或继续漫步 */}
              {spiritPose === 'sitting' && (
                <div className="planet-actions relative z-30 -mt-3 mb-1 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleSitAndListen}
                    style={softPillStyle}
                    className={`px-4 py-2 rounded-full text-xs font-medium text-slate-800 cursor-pointer whitespace-nowrap transition-transform duration-300 ${
                      isNearListeningRock || isMusicPlaying
                        ? 'scale-105 ring-2 ring-white'
                        : 'opacity-90'
                    }`}
                  >
                    [ {ROAMING_COPY.standUpButton} ]
                  </button>
                </div>
              )}
            </div>

            <p role="status" className={feedback ? "feedback-status relative z-30 text-center text-xs" : "sr-only"}>{feedback ? copy[feedback] : null}</p>
            {/* 底部可折叠控制器与树洞倾诉栏 (Collapsible Bottom Control Dock) */}
            <div className="relative z-30 px-4 pb-4 flex flex-col items-center">
              <div className="w-full flex flex-col gap-2">
                <BottomPlanetController
                  disabled={spiritPose === 'sitting' || isGuideOpen || isPortalModalOpen}
                  joystickInputRef={joystickInputRef}
                  onWalkStateChange={handleWalkStateChange}
                  walkHint={isNearListeningRock ? copy.stoneArrived : copy.stoneGuide}
                />
                {spiritPose === 'sitting' && (
                  <>
                    <h2 className="text-xs text-center">{copy.inputTitle}</h2>
                    {/* 第四幕：树洞气泡输入框与 [ 放飞 ] 按钮 */}
                    <form aria-label={copy.releaseBubble}
                      onSubmit={handleReleaseMood}
                      className="flex items-center gap-2 p-1.5 rounded-full"
                      style={softPillStyle}
                    >
                      <input
                        type="text"
                        value={moodInput}
                        onChange={(e) => setMoodInput(e.target.value)}
                        maxLength={60}
                        placeholder={ROAMING_COPY.inputPlaceholder}
                        aria-label={copy.inputTitle}
                        className="min-w-0 flex-1 bg-transparent px-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-500/85 focus:outline-none"
                      />
                      <button
                        type="submit"
                        style={softPillStyle}
                        className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        [ {ROAMING_COPY.releaseButton} ]
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            {isPortalModalOpen && (
              <div
                onClick={() => setIsPortalModalOpen(false)}
                className="absolute inset-0 z-40 flex items-center justify-center px-6"
                style={{ background: 'rgba(255, 255, 255, 0.48)' }}
              >
                <div
                  role="dialog" aria-label={ROAMING_COPY.portalButton}
                  onKeyDown={(e) => { if (e.key === 'Escape') setIsPortalModalOpen(false); }}
                  onClick={(e) => e.stopPropagation()}
                  className="planet-picker w-full max-w-[340px] p-6 rounded-[32px] text-center text-slate-800"
                  style={{
                    background:
                      'radial-gradient(120% 120% at 50% 20%, rgba(255,255,255,0.96) 0%, rgba(255,248,252,0.9) 100%)',
                    boxShadow:
                      '0 20px 55px -8px rgba(70, 55, 100, 0.25), 0 0 36px 8px rgba(255,255,255,0.8)',
                  }}
                >
                  <p className="text-sm leading-relaxed font-medium mb-4">
                    {ROAMING_COPY.portalPrompt}
                  </p>

                  <div className="flex flex-col gap-2.5">
                    {planetList.map((p) => {
                      const isCurrent = p.id === planetId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSwitchPlanet(p.id)}
                          style={softPillStyle}
                          className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-left cursor-pointer ${
                            isCurrent ? 'ring-2 ring-amber-300' : ''
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              {p.fullName}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {p.subtitle}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-slate-700 whitespace-nowrap ml-2">
                            {isCurrent ? copy.current : copy.visit}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPortalModalOpen(false)}
                    className="mt-4 text-xs text-slate-600 hover:text-slate-900 py-1.5 px-4 cursor-pointer"
                  >
                    {copy.stay}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= 第四幕：右上角告别闭环画面 ================= */}
        {act === 'farewell' && (
          <section className="relative z-20 flex-1 flex flex-col items-center justify-between px-7 pt-6 pb-10 text-center">
            <div className="mt-2">
              <p
                className="text-xs tracking-[0.2em] opacity-75"
                style={{ color: currentColors.textSecondary }}
              >
                {copy.farewellHeading}
              </p>
            </div>

            <div className="my-auto flex flex-col items-center">
              <FluffySpirit
                pose="waving"
                onTapSpirit={() => soundEngine.playSpiritChime()}
              />

              <div className="airbrush-soft-card mt-6 px-6 py-6 rounded-[32px] max-w-[330px]">
                <p className="font-serif-soft text-[16px] leading-relaxed font-medium text-slate-800">
                  {copy.farewellMiddle}<br /><br />{copy.farewellEnd}
                </p>
              </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRestartAll}
                className="airbrush-pill-btn w-full max-w-[280px] py-4 px-6 rounded-full text-[15px] font-medium tracking-wider text-slate-800 cursor-pointer whitespace-nowrap"
              >
                {copy.calm}
              </button>
              <button type="button" className="airbrush-pill-btn rounded-full px-4 py-3 text-sm" onClick={() => { setSpiritPose('idle'); setAct('roaming'); setIsPortalModalOpen(true); }}>{copy.another}</button>
            </div>
          </section>
        )}
        {act === 'roaming' && isGuideOpen && (
          <PlanetGuide onConfirm={() => {
            stopMovement();
            isGuideOpenRef.current = false;
            setIsGuideOpen(false);
            requestAnimationFrame(() => document.querySelector<HTMLElement>('.wandering-joystick')?.focus());
          }} />
        )}
      </main>
    </div>
  );
}
