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
  PORTAL_COORDS,
  ROCK_COORDS,
  ThreePlanetStage,
} from './components/ThreePlanetStage';
import { BottomPlanetController } from './components/BottomPlanetController';

type AppAct = 'intro' | 'quiz' | 'warp' | 'roaming' | 'farewell';

interface FloatingStardustItem {
  id: number;
  text: string;
  builtinIndex?: number;
  leftPercent: number;
  driftX: number;
}

const LOCAL_STORAGE_KEY = 'brief_roaming_user_stardust_v1';

const clampLat = (lat: number) => Math.max(-0.62, Math.min(0.62, lat));

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
  const [spiritFacing, setSpiritFacing] = useState<'left' | 'right'>('right');
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [whiteNoiseEnabled, setWhiteNoiseEnabled] = useState<boolean>(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

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
  const stepSpringFrameRef = useRef<number | null>(null);

  // 手势滑动 (Touch Swipe / Pointer Drag) 状态追踪 Ref
  const swipeStateRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    vy: number;
  }>({
    active: false,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
  });

  // 是否靠近【🪑 聆听石】或【🌀 引力传送门】
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
  const walkTimeoutRef = useRef<number | null>(null);

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
    return () => {
      soundEngine.stopPlanetMusicImmediate();
      if (stepSpringFrameRef.current) {
        cancelAnimationFrame(stepSpringFrameRef.current);
      }
    };
  }, []);

  const triggerOverheadBubble = useCallback(
    (text: string, isError = false, durationMs = 4000, messageKey?: 'emptyErrorBubble' | 'spiritHint') => {
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
      setAct('roaming');
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [act]);

  // 底部控制器漫步状态同步
  const handleWalkStateChange = useCallback(
    (isWalking: boolean, facing?: 'left' | 'right') => {
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

  /**
   * 步进移动函数 (handleStepMove)：
   * 采用小型弹簧缓动插值逻辑 (Spring-like Interpolation) 平滑更新 planetCoordsRef，
   * 彻底消除点击步进或手势滑动时的瞬间跳跃感。
   */
  const handleStepMove = useCallback((dx: number, dy: number, silent = false) => {
    if (!silent) {
      soundEngine.playSoftClick(dx < 0 ? -30 : 30);
    }
    if (Math.abs(dx) > 0.001) {
      setSpiritFacing(dx < 0 ? 'left' : 'right');
    }

    // 累加弹簧目标坐标并施加初速度脉冲，使 planetCoordsRef 通过弹簧阻尼平滑过渡
    targetCoordsRef.current = {
      lon: targetCoordsRef.current.lon + dx,
      lat: clampLat(targetCoordsRef.current.lat + dy),
    };

    // 注入柔和的弹簧初速度冲量 (spring impulse)，使起步与收尾如丝般顺滑
    springVelocityRef.current.lon += dx * 2.4;
    springVelocityRef.current.lat += dy * 2.4;

    // 启动小型弹簧缓动跟踪，确保小精灵在缓动期间保持漫步姿态并在收敛后自然停步
    if (stepSpringFrameRef.current) {
      cancelAnimationFrame(stepSpringFrameRef.current);
    }

    setSpiritPose((prev) => (prev === 'sitting' ? 'sitting' : 'walking'));

    let lastTimestamp = performance.now();
    const animateSpringStep = (now: number) => {
      const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
      lastTimestamp = now;

      const distLon = targetCoordsRef.current.lon - planetCoordsRef.current.lon;
      const distLat = targetCoordsRef.current.lat - planetCoordsRef.current.lat;
      const remainingDist = Math.hypot(distLon, distLat);
      const currentSpeed = Math.hypot(
        springVelocityRef.current.lon,
        springVelocityRef.current.lat
      );

      // 弹簧阻尼微调补偿，保证即便在低帧率环境下也能柔和收敛至目标点
      if (dt > 0) {
        const springPull = 1 - Math.exp(-12 * dt);
        planetCoordsRef.current.lon += distLon * springPull * 0.25;
        planetCoordsRef.current.lat = clampLat(
          planetCoordsRef.current.lat + distLat * springPull * 0.25
        );
      }

      if (remainingDist > 0.012 || currentSpeed > 0.04) {
        stepSpringFrameRef.current = requestAnimationFrame(animateSpringStep);
      } else {
        stepSpringFrameRef.current = null;
        if (!swipeStateRef.current.active && Math.hypot(joystickInputRef.current.x, joystickInputRef.current.y) < 0.05) {
          setSpiritPose((prev) => (prev === 'walking' ? 'idle' : prev));
        }
      }
    };

    stepSpringFrameRef.current = requestAnimationFrame(animateSpringStep);

    if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
    walkTimeoutRef.current = window.setTimeout(() => {
      if (!swipeStateRef.current.active && Math.hypot(joystickInputRef.current.x, joystickInputRef.current.y) < 0.05) {
        setSpiritPose((prev) => (prev === 'walking' ? 'idle' : prev));
      }
    }, 680);
  }, []);

  /**
   * 手势滑动（Touch Swipe & Mouse Drag）事件监听：
   * 支持手指在星球舞台区域自由滑动旋转星球，松手时附带丝滑的惯性滑行与弹簧缓动。
   */
  const handleStageTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    swipeStateRef.current = {
      active: true,
      lastX: touch.clientX,
      lastY: touch.clientY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0,
    };
  }, []);

  const handleStageTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!swipeStateRef.current.active || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const now = performance.now();
      const dt = Math.max(8, now - swipeStateRef.current.lastTime);

      const deltaX = touch.clientX - swipeStateRef.current.lastX;
      const deltaY = touch.clientY - swipeStateRef.current.lastY;

      swipeStateRef.current.lastX = touch.clientX;
      swipeStateRef.current.lastY = touch.clientY;
      swipeStateRef.current.lastTime = now;

      // 将像素位移映射为球面弧度增量（向左滑则向右走，向上滑则向前走）
      const dLon = -deltaX * 0.0075;
      const dLat = -deltaY * 0.0055;

      // 指数平滑记录手势滑动瞬时速度（用于松手时的惯性滑行）
      swipeStateRef.current.vx = swipeStateRef.current.vx * 0.6 + (dLon / (dt / 1000)) * 0.4;
      swipeStateRef.current.vy = swipeStateRef.current.vy * 0.6 + (dLat / (dt / 1000)) * 0.4;

      if (Math.hypot(deltaX, deltaY) > 1.5) {
        handleStepMove(dLon, dLat, true);
      }
    },
    [handleStepMove]
  );

  const handleStageTouchEnd = useCallback(() => {
    if (!swipeStateRef.current.active) return;
    swipeStateRef.current.active = false;

    // 施加手势滑动惯性尾韵 (Inertial Throw)
    const inertiaLon = Math.max(-0.55, Math.min(0.55, swipeStateRef.current.vx * 0.16));
    const inertiaLat = Math.max(-0.35, Math.min(0.35, swipeStateRef.current.vy * 0.14));

    if (Math.hypot(inertiaLon, inertiaLat) > 0.015) {
      handleStepMove(inertiaLon, inertiaLat, true);
    }
  }, [handleStepMove]);

  // 桌面端鼠标拖拽滑动兼容支持
  const handleStageMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 忽略按钮点击
    if ((e.target as HTMLElement).closest('button')) return;
    swipeStateRef.current = {
      active: true,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0,
    };
  }, []);

  const handleStageMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!swipeStateRef.current.active) return;
      const now = performance.now();
      const dt = Math.max(8, now - swipeStateRef.current.lastTime);

      const deltaX = e.clientX - swipeStateRef.current.lastX;
      const deltaY = e.clientY - swipeStateRef.current.lastY;

      swipeStateRef.current.lastX = e.clientX;
      swipeStateRef.current.lastY = e.clientY;
      swipeStateRef.current.lastTime = now;

      const dLon = -deltaX * 0.007;
      const dLat = -deltaY * 0.005;

      swipeStateRef.current.vx = swipeStateRef.current.vx * 0.6 + (dLon / (dt / 1000)) * 0.4;
      swipeStateRef.current.vy = swipeStateRef.current.vy * 0.6 + (dLat / (dt / 1000)) * 0.4;

      if (Math.hypot(deltaX, deltaY) > 1.5) {
        handleStepMove(dLon, dLat, true);
      }
    },
    [handleStepMove]
  );

  const handleStageMouseUp = useCallback(() => {
    if (!swipeStateRef.current.active) return;
    swipeStateRef.current.active = false;

    const inertiaLon = Math.max(-0.5, Math.min(0.5, swipeStateRef.current.vx * 0.14));
    const inertiaLat = Math.max(-0.3, Math.min(0.3, swipeStateRef.current.vy * 0.12));

    if (Math.hypot(inertiaLon, inertiaLat) > 0.015) {
      handleStepMove(inertiaLon, inertiaLat, true);
    }
  }, [handleStepMove]);

  // 快速漫步前往【🪑 聆听石】或【🌀 引力传送门】（通过弹簧目标平滑漫步过去）
  const handleQuickNavigate = useCallback(
    (target: 'rock' | 'portal') => {
      soundEngine.playSoftClick(55);
      const dest = target === 'rock' ? ROCK_COORDS : PORTAL_COORDS;
      const dx = dest.lon - targetCoordsRef.current.lon;
      const dy = dest.lat - targetCoordsRef.current.lat;
      handleStepMove(dx, dy, true);
    },
    [handleStepMove]
  );

  // 点击 [ 🪑 坐下听歌 ] 或切换起身
  const handleSitAndListen = () => {
    soundEngine.playSoftClick(90);

    // 通过弹簧缓动平滑漫步对齐至【🪑 聆听石】
    targetCoordsRef.current = { lon: ROCK_COORDS.lon, lat: ROCK_COORDS.lat };

    if (spiritPose === 'sitting' && isMusicPlaying) {
      setSpiritPose('idle');
      setIsMusicPlaying(false);
      soundEngine.stopPlanetMusicImmediate();
    } else {
      setSpiritPose('sitting');
      setIsMusicPlaying(true);
      try { soundEngine.startPlanetMusic(planetId); } catch { setFeedback('audioError'); }
    }
  };

  // 树洞放飞心情（含空输入错误处理）
  const handleReleaseMood = (e: React.FormEvent) => {
    e.preventDefault();
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
    soundEngine.playWarpTransition();
    setIsPortalModalOpen(false);
    setPlanetId(nextPlanetId);

    if (isMusicPlaying) {
      try { soundEngine.startPlanetMusic(nextPlanetId); } catch { setFeedback('audioError'); }
    }
  };

  // 点击右上角 [ 👋 先去忙啦 ] 进入告别闭环
  const handleLeaveToFarewell = () => {
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
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

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

  const handleSelect3DLandmark = useCallback(
    (landmark: 'rock' | 'portal') => {
      handleQuickNavigate(landmark);
      if (landmark === 'portal') {
        setIsPortalModalOpen(true);
      }
    },
    [handleQuickNavigate]
  );

  // 根据当前幕次决定背景色盘
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
        <header className="app-header relative z-30 flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium tracking-widest opacity-85"
              style={{ color: currentColors.textSecondary }}
            >
              {act === 'roaming' ? activePlanet.fullName : copy.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {act === 'roaming' && (
              <button
                type="button"
                onClick={handleToggleMute}
                style={softPillStyle}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                title={isMuted ? copy.soundOn : copy.mute} aria-label={isMuted ? copy.soundOn : copy.mute}
              >
                <span>{isMuted ? copy.muted : copy.soundOn}</span>
              </button>
            )}

            {act !== 'farewell' && (
              <button
                type="button"
                onClick={handleLeaveToFarewell}
                style={softPillStyle}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
              >
                {ROAMING_COPY.leaveButton}
              </button>
            )}
          </div>
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
                    onClick={() => setQuizAnswers(prev => {
                      const next = [...prev];
                      next[quizStep] = option.value;
                      return next;
                    })}
                    aria-pressed={quizAnswers[quizStep] === option.value}
                    style={quizAnswers[quizStep] === option.value ? { outline: '2px solid #78649b' } : undefined}
                    className="airbrush-tape-option w-full py-4 px-5 rounded-2xl text-left text-[15px] font-medium text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>{option.label}</span>
                    <span className="text-xs opacity-45 font-normal">{option.value}</span>
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
              <button
                type="button"
                disabled={!quizAnswers[quizStep]}
                className="disabled:opacity-40"
                onClick={() => handleSelectOption(quizAnswers[quizStep])}
              >
                {copy.continue}
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
          <section className="relative z-20 flex-1 flex flex-col justify-between overflow-hidden">
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
              onTouchStart={handleStageTouchStart}
              onTouchMove={handleStageTouchMove}
              onTouchEnd={handleStageTouchEnd}
              onTouchCancel={handleStageTouchEnd}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              onMouseLeave={handleStageMouseUp}
              className="planet-stage relative flex-1 min-h-[250px] flex flex-col items-center justify-center z-20 touch-none"
            >
              <ThreePlanetStage
                planetId={planetId}
                pose={spiritPose}
                isMusicPlaying={isMusicPlaying}
                joystickInputRef={joystickInputRef}
                planetCoordsRef={planetCoordsRef}
                targetCoordsRef={targetCoordsRef}
                springVelocityRef={springVelocityRef}
                overheadBubble={overheadBubble ? { ...overheadBubble, text: overheadBubble.messageKey === 'emptyErrorBubble' ? ROAMING_COPY.emptyErrorBubble : overheadBubble.messageKey === 'spiritHint' ? copy.spiritHint : overheadBubble.text } : null}
                onNearLandmarkChange={handleNearLandmarkChange}
                onTapSpirit={() => {
                  soundEngine.playSpiritChime();
                  if (!overheadBubble) {
                    triggerOverheadBubble('', false, 3000, 'spiritHint');
                  }
                }}
                onSelectLandmark={handleSelect3DLandmark}
              />

              {/* 地标核心操作按钮：[ 🪑 坐下听歌 ] 与 [ 🌀 传送门 ] */}
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
                  [ {isMusicPlaying ? ROAMING_COPY.standUpButton : ROAMING_COPY.sitButton} ]
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSoftClick(70);
                    handleQuickNavigate('portal');
                    setIsPortalModalOpen(true);
                  }}
                  style={softPillStyle}
                  className={`px-4 py-2 rounded-full text-xs font-medium text-slate-800 cursor-pointer whitespace-nowrap transition-transform duration-300 ${
                    isNearPortal ? 'scale-105 ring-2 ring-white' : 'opacity-90'
                  }`}
                >
                  [ {ROAMING_COPY.portalButton} ]
                </button>
              </div>
            </div>

            <p role="status" className={feedback ? "feedback-status relative z-30 text-center text-xs" : "sr-only"}>{feedback ? copy[feedback] : null}</p>
            {/* 底部可折叠控制器与树洞倾诉栏 (Collapsible Bottom Control Dock) */}
            <div className="relative z-30 px-4 pb-4 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setIsDockCollapsed((prev) => !prev)}
                style={softPillStyle}
                className="mb-1.5 px-3 py-0.5 rounded-full text-[10px] font-medium text-slate-600 cursor-pointer whitespace-nowrap"
              >
                {isDockCollapsed ? copy.expand : copy.collapse}
              </button>

              {!isDockCollapsed && (
                <div className="w-full flex flex-col gap-2">
                  {/* 底部漫步控制器（支持360°摇杆、弹簧步进方向键、地标寻向与键盘WASD） */}
                  <BottomPlanetController
                    joystickInputRef={joystickInputRef}
                    onStepMove={handleStepMove}
                    onWalkStateChange={handleWalkStateChange}
                    onQuickNavigate={handleQuickNavigate}
                    isNearRock={isNearListeningRock}
                    isNearPortal={isNearPortal}
                    walkHint={ROAMING_COPY.walkHint}
                  />

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
                </div>
              )}
            </div>

            {/* 【🌀 传送门】引力场切换柔和浮层 */}
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
      </main>
    </div>
  );
}
