import { LanguageToggle, useLanguage } from './i18n/LanguageContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PLANETS,
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
import { ExitGuide } from './components/ExitGuide';
import { PlanetDiscovery } from './components/PlanetDiscovery';
import { BreathingAuraOrb } from './components/BreathingAuraOrb';
import { IntroInterlude } from './components/IntroInterlude';

type AppAct = 'intro' | 'interlude' | 'quiz' | 'warp' | 'roaming' | 'farewell';

interface FloatingStardustItem {
  id: number;
  text: string;
  builtinIndex?: number;
  topPercent: number;
}

const LOCAL_STORAGE_KEY = 'brief_roaming_user_stardust_v1';

export default function App() {
  const { copy } = useLanguage();
  const { INTRO_COPY, QUIZ_QUESTIONS, ROAMING_COPY, BUILTIN_STARDUST_QUOTES } = copy;
  const [feedback, setFeedback] = useState<'releaseSuccess' | 'audioError' | null>(null);
  const [act, setAct] = useState<AppAct>('intro');
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizChoice[]>([]);
  const [quizGlow, setQuizGlow] = useState<{ id: number; x: number; y: number } | null>(null);
  const [planetId, setPlanetId] = useState<PlanetId>('OMEGA_01');
  const [visitedPlanetIds, setVisitedPlanetIds] = useState<PlanetId[]>([]);

  // 第三幕 & 第四幕：星球漫步与小精灵状态
  const [spiritPose, setSpiritPose] = useState<SpiritPose>('idle');
  // Gate input synchronously, including pointer events queued before React renders.
  const isRestingRef = useRef(false);
  const isGuideOpenRef = useRef(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isExitGuideOpen, setIsExitGuideOpen] = useState(false);
  const isHelpOpen = isGuideOpen || isExitGuideOpen;
  const [canLeave, setCanLeave] = useState(false);
  const [isMessageReady, setIsMessageReady] = useState(false);
  const [hasRestedOnPlanet, setHasRestedOnPlanet] = useState(false);
  const restActionRef = useRef<HTMLButtonElement>(null);
  const [spiritFacing, setSpiritFacing] = useState<'left' | 'right'>('right');
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

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

  useEffect(() => {
    if (act !== 'roaming') return;
    setVisitedPlanetIds(previous => previous.includes(planetId) ? previous : [...previous, planetId]);
  }, [act, planetId]);

  // Leave space between slow, horizontal thoughts while listening.
  useEffect(() => {
    if (act !== 'roaming' || !isMusicPlaying) {
      setFloatingStardust([]);
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
      // Three separate sky lanes keep simultaneous, slow-moving thoughts from
      // touching vertically while their 24-second animations overlap.
      const topPercent = 4 + (cursor % 3) * 33;

      setFloatingStardust((prev) => [...prev.slice(-3), { id, text, builtinIndex, topPercent }]);
    };

    const initialTimer = window.setTimeout(() => {
      spawnStardust();
    }, 3000);

    const interval = window.setInterval(() => {
      spawnStardust();
    }, 10000);

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
      soundEngine.stopAllImmediate();
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
    soundEngine.startPreludeAmbience();
    setQuizAnswers([]);
    setQuizStep(0);
    setVisitedPlanetIds([]);
    setAct('interlude');
  };

  const handleInterludeContinue = useCallback(() => {
    soundEngine.stopIntroNarration();
    setAct('quiz');
  }, []);

  // 【第二幕】回答三步心境校准问卷
  const handleSelectOption = (choice: QuizChoice) => {
    soundEngine.playQuizRipple(choice === 'A' ? 0 : choice === 'B' ? 45 : 90);
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
      soundEngine.liftPreludeForWarp();
      soundEngine.playWarpTransition();
    }
  };

  const handleSkipQuiz = () => {
    setPlanetId(calculateAssignedPlanet(quizAnswers));
    soundEngine.liftPreludeForWarp();
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
      setHasRestedOnPlanet(false);
      isGuideOpenRef.current = true;
      setIsGuideOpen(true);
      setAct('roaming');
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [act]);

  useEffect(() => {
    setIsMessageReady(false);
    if (act !== 'roaming' || spiritPose !== 'sitting') return;
    const timer = window.setTimeout(() => setIsMessageReady(true), 5000);
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
    if (isGuideOpenRef.current || isPortalModalOpen || (!isRestingRef.current && !isNearListeningRock)) return;
    soundEngine.playSoftClick(90);
    stopMovement();

    if (isRestingRef.current) {
      isRestingRef.current = false;
      setHasRestedOnPlanet(true);
      if (!canLeave) {
        setCanLeave(true);
        isGuideOpenRef.current = true;
        setIsExitGuideOpen(true);
      }
      setSpiritPose('idle');
      setIsMusicPlaying(false);
      soundEngine.fadeOutPlanetMusic();
      soundEngine.setPreludeBehindMusic(false);
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
    if (!isRestingRef.current || !isMessageReady || act !== 'roaming') return;
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
        topPercent: 4 + (quoteCursorRef.current++ % 3) * 33,
      },
    ]);
  };

  // 通过【🌀 传送门】切换体验另外 3 个星球
  const handleSwitchPlanet = (nextPlanetId: PlanetId) => {
    if (isRestingRef.current || nextPlanetId === planetId || visitedPlanetIds.includes(nextPlanetId)) return;
    setIsPortalModalOpen(false);
    setPlanetId(nextPlanetId);
    setHasRestedOnPlanet(false);
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
    if (!canLeave || act !== 'roaming') return;
    isRestingRef.current = false;
    isGuideOpenRef.current = false;
    setIsGuideOpen(false);
    setIsExitGuideOpen(false);
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
    setIsExitGuideOpen(false);
    setCanLeave(false);
    stopMovement();
    soundEngine.playSoftClick(60);
    soundEngine.stopAllImmediate();
    joystickInputRef.current = { x: 0, y: 0 };
    setQuizAnswers([]);
    setQuizStep(0);
    setVisitedPlanetIds([]);
    setFloatingStardust([]);
    setFeedback(null);
    setOverheadBubble(null);
    setSpiritPose('idle');
    setIsMusicPlaying(false);
    setAct('intro');
  };

  const handleNearLandmarkChange = useCallback((nearRock: boolean, nearPortal: boolean) => {
    setIsNearListeningRock(nearRock);
    setIsNearPortal(nearPortal);
  }, []);

  const handleEnterPortal = () => {
    if (isRestingRef.current || isGuideOpenRef.current || !isNearPortal || isPortalModalOpen) return;
    stopMovement();
    setSpiritPose('idle');
    soundEngine.playWarpTransition();
    setIsPortalModalOpen(true);
  };

  const handleSelect3DLandmark = (landmark: 'rock' | 'portal') => {
    if (isRestingRef.current || isGuideOpenRef.current) return;
    if (landmark === 'rock') {
      if (isNearListeningRock) restActionRef.current?.focus();
      else triggerOverheadBubble('', false, 3000, 'stoneGuide');
    } else if (isNearPortal) {
      restActionRef.current?.focus();
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

      {/* Optional MP3 target. Configure PLANET_AUDIO_URLS in roamingData.ts. */}
      <audio onError={() => setFeedback('audioError')} id="brief-roaming-external-audio" preload="auto" className="hidden" />
      {/* Optional /audio/voice_en.mp3 and /audio/voice_zh.mp3 are configured in
          audio/introVoice.ts. No src is set while recordings are unavailable. */}
      <audio id="intro-voice-en" preload="none" className="hidden" />
      <audio id="intro-voice-zh" preload="none" className="hidden" />

      {/* 核心手机竖屏比例容器 (max-width: 414px; height: 100vh; max-height: 860px; border-radius: 28px) */}
      <main
        className="roaming-mobile-frame flex flex-col justify-between select-none"
        data-act={act}
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
        {act === 'quiz' && quizGlow && (
          <div key={quizGlow.id} className="quiz-selection-glow" aria-hidden="true"
            style={{ left: quizGlow.x, top: quizGlow.y }} onAnimationEnd={() => setQuizGlow(null)} />
        )}
        {act === 'roaming' && canLeave && (
          <button type="button" onClick={handleLeaveToFarewell} className="leave-control">
            {ROAMING_COPY.leaveButton}
          </button>
        )}
        <header inert={isHelpOpen || isPortalModalOpen} className={`app-header relative z-30 flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-1 ${act === 'roaming' ? 'planet-header' : ''}`}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium tracking-widest opacity-85"
              style={{ color: currentColors.textSecondary }}
            >
              {act === 'roaming' ? activePlanet.fullName : null}
            </span>
          </div>

        </header>

        {/* ================= 第一幕：开场引导页 ================= */}
        {act === 'intro' && (
          <section className="intro-scene relative z-20 flex-1 flex flex-col items-center justify-between px-7 pt-6 pb-10">
            <div className="intro-title-slot text-center mt-4">
              <h1 className="intro-title" data-script={copy.title.split(' ').length === 3} aria-label={copy.title}>
                {copy.title.split(' ').length === 3
                  ? copy.title.split(' ').map((word, index) => (
                    <React.Fragment key={word}>
                      <span className={`intro-title-line intro-title-line-${index + 1}`} aria-hidden="true">{word}</span>
                      {index < 2 ? ' ' : null}
                    </React.Fragment>
                  ))
                  : <span className="intro-title-localized" aria-hidden="true">{copy.title}</span>}
              </h1>
            </div>

            <div className="my-auto flex flex-col items-center">
              <BreathingAuraOrb />
            </div>

            <div className="w-full flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartRoaming}
                className="escape-cloud-button w-full max-w-[310px] py-4 px-6 text-[15px] font-medium tracking-wide cursor-pointer"
              >
                {INTRO_COPY.startButton}
              </button>
            </div>
          </section>
        )}

        {act === 'interlude' && <IntroInterlude onContinue={handleInterludeContinue} />}

        {/* ================= 第二幕：三步心境校准（分支评估问卷） ================= */}
        {act === 'quiz' && (
          <section className="quiz-scene relative z-20 flex-1 flex flex-col items-center justify-between px-6 pt-4 pb-10">
            <div role="status" aria-label={copy.progress.replace('{n}', String(quizStep + 1))} className="quiz-progress flex items-center gap-3 mt-2">
              {QUIZ_QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: 5,
                    height: 5,
                    background:
                      idx <= quizStep
                        ? 'rgba(133, 104, 164, 0.8)'
                        : 'rgba(133, 104, 164, 0.22)',
                    boxShadow:
                      idx === quizStep ? '0 0 10px rgba(179, 141, 209, 0.55)' : 'none',
                  }}
                />
              ))}
            </div>

            <div
              key={QUIZ_QUESTIONS[quizStep].id}
              className="w-full max-w-[348px] my-auto flex flex-col gap-5 transition-all duration-500"
            >
              <div className="quiz-question px-1 py-2 text-center">
                <h2 className="font-serif-soft text-[23px] leading-snug font-medium">
                  {QUIZ_QUESTIONS[quizStep].question}
                </h2>
              </div>

              <div className="quiz-options flex flex-col gap-5">
                {QUIZ_QUESTIONS[quizStep].options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={event => {
                      const frame = event.currentTarget.closest('main')!.getBoundingClientRect();
                      const optionBox = event.currentTarget.getBoundingClientRect();
                      setQuizGlow({ id: Date.now(), x: optionBox.x + optionBox.width / 2 - frame.x, y: optionBox.y + optionBox.height / 2 - frame.y });
                      handleSelectOption(option.value);
                    }}
                    aria-pressed={quizAnswers[quizStep] === option.value}
                    className="airbrush-tape-option w-full py-4 px-5 rounded-2xl text-left text-[14px] font-medium text-slate-700 flex items-center gap-3 cursor-pointer"
                  >
                    <span className="text-[25px] leading-none shrink-0" aria-hidden="true">{option.emoji}</span>
                    <span className="min-w-0 flex-1">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs my-3">
              <button type="button" onClick={() => {
                if (quizStep > 0) setQuizStep(quizStep - 1);
                else setAct('interlude');
              }}>
                {copy.back}
              </button>
              <button type="button" onClick={handleSkipQuiz}>
                {copy.skip}
              </button>
            </div>
          </section>
        )}

        {/* ================= 曲速过渡动画（1.5秒） ================= */}
        {act === 'warp' && (
          <section className="relative z-20 flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="mb-6">
              <BreathingAuraOrb compact traveling />
            </div>
            <div className="px-7 py-6 max-w-[330px]">
              <p className="text-[15px] leading-relaxed font-medium tracking-wide">
                {copy.gathering}<br />{copy.tuning}<br />{activePlanet.fullName}
              </p>
            </div>
          </section>
        )}

        {/* ================= 第三幕 & 第四幕：3D 星球漫步、手势滑动、底部控制器、坐下听歌与星尘树洞 ================= */}
        {act === 'roaming' && (
          <section inert={isHelpOpen || isPortalModalOpen} className="planet-scene relative z-20 flex-1 flex flex-col justify-between overflow-hidden">
            {/* Planet interaction instructions */}
            <div className="px-5 pt-0.5 text-center z-20">
              <p
                id="wandering-instructions"
                role="status"
                className="text-xs leading-relaxed opacity-85"
                style={{ color: currentColors.textSecondary }}
              >
                {spiritPose === 'sitting' ? copy.restHint : hasRestedOnPlanet ? (isNearPortal ? copy.portalArrived : copy.portalGuide) : (isNearListeningRock ? copy.stoneArrived : copy.stoneGuide)}
              </p>

            </div>

            {/* Central 3D stage and the sky above the companion */}
            <div
              className="planet-stage relative flex-1 min-h-[250px] flex flex-col items-center justify-center z-20 touch-none"
            >
              <div className="stardust-layer pointer-events-none" aria-hidden="true">
                {floatingStardust.map((item) => (
                  <div
                    key={item.id}
                    className="animate-stardust-float absolute left-0 max-w-[260px] px-4 py-1.5 rounded-full"
                    onAnimationEnd={() => setFloatingStardust(prev => prev.filter(quote => quote.id !== item.id))}
                    style={
                      {
                        top: `${item.topPercent}%`,
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

              <ThreePlanetStage
                planetId={planetId}
                pose={spiritPose}
                isMusicPlaying={isMusicPlaying}
                interactionEnabled={!isHelpOpen && !isPortalModalOpen}
                guideToPortal={hasRestedOnPlanet}
                joystickInputRef={joystickInputRef}
                planetCoordsRef={planetCoordsRef}
                targetCoordsRef={targetCoordsRef}
                springVelocityRef={springVelocityRef}
                overheadBubble={overheadBubble ? { ...overheadBubble, text: overheadBubble.messageKey === 'emptyErrorBubble' ? ROAMING_COPY.emptyErrorBubble : overheadBubble.messageKey ? copy[overheadBubble.messageKey] : overheadBubble.text } : null}
                onNearLandmarkChange={handleNearLandmarkChange}
                onSelectLandmark={handleSelect3DLandmark}
              />

            </div>

            <p role="status" className={feedback ? "feedback-status relative z-30 text-center text-xs" : "sr-only"}>{feedback ? copy[feedback] : null}</p>
            {/* 底部可折叠控制器与树洞倾诉栏 (Collapsible Bottom Control Dock) */}
            <div className="relative z-30 px-4 pb-4 flex flex-col items-center">
              <div className="w-full flex flex-col gap-2">
                <div className="rest-action-slot">
                  <button
                    ref={restActionRef}
                    type="button"
                    onClick={spiritPose !== 'sitting' && isNearPortal ? handleEnterPortal : handleSitAndListen}
                    style={softPillStyle}
                    className="rest-action flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-slate-800 cursor-pointer"
                    data-visible={!isHelpOpen && !isPortalModalOpen && (spiritPose === 'sitting' || isNearListeningRock || isNearPortal)}
                    aria-hidden={isHelpOpen || isPortalModalOpen || (spiritPose !== 'sitting' && !isNearListeningRock && !isNearPortal)}
                    disabled={isHelpOpen || isPortalModalOpen || (spiritPose !== 'sitting' && !isNearListeningRock && !isNearPortal)}
                  >
                    <span aria-hidden="true">{spiritPose === 'sitting' ? '🐾' : isNearPortal ? '🌀' : '🪑'}</span>
                    <span>[ {spiritPose === 'sitting' ? ROAMING_COPY.standUpButton : isNearPortal ? copy.portalDiscovery.enter : ROAMING_COPY.sitButton} ]</span>
                  </button>
                </div>
                <BottomPlanetController
                  disabled={spiritPose === 'sitting' || isHelpOpen || isPortalModalOpen}
                  joystickInputRef={joystickInputRef}
                  onWalkStateChange={handleWalkStateChange}
                />
                {spiritPose === 'sitting' && (
                  <div className="message-slot">
                    {isMessageReady && (
                      <div className="message-panel flex flex-col gap-2">
                        <h2 className="text-xs text-center">{copy.inputTitle}</h2>
                        {/* 第四幕：树洞气泡输入框与 [ 放飞 ] 按钮 */}
                        <form aria-label={copy.releaseBubble}
                          onSubmit={handleReleaseMood}
                          className="flex w-full min-w-0 items-center gap-2 p-1.5 rounded-full"
                          style={softPillStyle}
                        >
                          <input
                            type="text"
                            value={moodInput}
                            onChange={(e) => setMoodInput(e.target.value)}
                            maxLength={60}
                            placeholder={ROAMING_COPY.inputPlaceholder}
                            aria-label={copy.inputTitle}
                            className="w-0 min-w-0 flex-1 bg-transparent px-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-500/85 focus:outline-none"
                          />
                          <button
                            type="submit"
                            style={softPillStyle}
                            className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            [ {ROAMING_COPY.releaseButton} ]
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

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
              <button type="button" className="airbrush-pill-btn rounded-full px-4 py-3 text-sm" onClick={() => { soundEngine.startPreludeAmbience(); soundEngine.liftPreludeForWarp(); soundEngine.playWarpTransition(); setSpiritPose('idle'); setAct('roaming'); setIsPortalModalOpen(true); }}>{copy.another}</button>
            </div>
          </section>
        )}
        {act === 'roaming' && isPortalModalOpen && (
          <PlanetDiscovery
            key={`${planetId}:${visitedPlanetIds.join(',')}`}
            currentPlanetId={planetId}
            visitedPlanetIds={visitedPlanetIds}
            onClose={() => {
              setIsPortalModalOpen(false);
              requestAnimationFrame(() => restActionRef.current?.focus());
            }}
            onTravel={handleSwitchPlanet}
            onResetRoute={() => { soundEngine.playWarpTransition(); setVisitedPlanetIds([planetId]); }}
          />
        )}
        {act === 'roaming' && isGuideOpen && (
          <PlanetGuide onConfirm={() => {
            stopMovement();
            isGuideOpenRef.current = false;
            setIsGuideOpen(false);
            requestAnimationFrame(() => document.querySelector<HTMLElement>('.wandering-joystick')?.focus());
          }} />
        )}
        {act === 'roaming' && isExitGuideOpen && (
          <ExitGuide onConfirm={() => {
            isGuideOpenRef.current = false;
            setIsExitGuideOpen(false);
            requestAnimationFrame(() => document.querySelector<HTMLElement>('.wandering-joystick')?.focus());
          }} />
        )}
      </main>
    </div>
  );
}
