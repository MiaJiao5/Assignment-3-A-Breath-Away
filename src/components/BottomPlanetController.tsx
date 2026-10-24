import React, { useEffect, useRef, useState } from 'react';
import { JoystickVector } from './ThreePlanetStage';

interface BottomPlanetControllerProps {
  joystickInputRef: React.MutableRefObject<JoystickVector>;
  onStepMove: (dx: number, dy: number) => void;
  onWalkStateChange: (isWalking: boolean, facing?: 'left' | 'right') => void;
  onQuickNavigate: (target: 'rock' | 'portal') => void;
  isNearRock: boolean;
  isNearPortal: boolean;
  walkHint: string;
}

export const BottomPlanetController: React.FC<BottomPlanetControllerProps> = ({
  joystickInputRef,
  onStepMove,
  onWalkStateChange,
  onQuickNavigate,
  isNearRock,
  isNearPortal,
  walkHint,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const holdButtonTimerRef = useRef<number | null>(null);

  const MAX_RADIUS = 24;

  // 键盘 WASD / 方向键支持（并在窗口失焦时自动清空按键）
  useEffect(() => {
    const syncKeyboardVector = () => {
      const keys = heldKeysRef.current;
      let vx = 0;
      let vy = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) vx -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) vx += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) vy -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) vy += 1;

      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        const nx = vx / len;
        const ny = vy / len;
        joystickInputRef.current = { x: nx, y: ny };
        setKnobOffset({ x: nx * MAX_RADIUS, y: ny * MAX_RADIUS });
        onWalkStateChange(true, nx < 0 ? 'left' : 'right');
      } else if (!isDragging) {
        joystickInputRef.current = { x: 0, y: 0 };
        setKnobOffset({ x: 0, y: 0 });
        onWalkStateChange(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(
          e.code
        )
      ) {
        // 如果焦点在输入框内则不拦截
        if (document.activeElement?.tagName === 'INPUT') return;
        heldKeysRef.current.add(e.code);
        syncKeyboardVector();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (heldKeysRef.current.has(e.code)) {
        heldKeysRef.current.delete(e.code);
        syncKeyboardVector();
      }
    };

    const handleBlur = () => {
      heldKeysRef.current.clear();
      joystickInputRef.current = { x: 0, y: 0 };
      setKnobOffset({ x: 0, y: 0 });
      onWalkStateChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isDragging, joystickInputRef, onWalkStateChange]);

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobOffset({ x: kx, y: ky });

    const normX = kx / MAX_RADIUS;
    const normY = ky / MAX_RADIUS;
    joystickInputRef.current = { x: normX, y: normY };

    if (Math.hypot(normX, normY) > 0.08) {
      onWalkStateChange(true, normX < 0 ? 'left' : 'right');
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    setKnobOffset({ x: 0, y: 0 });
    joystickInputRef.current = { x: 0, y: 0 };
    onWalkStateChange(false);
  };

  // 长按或轻点左右漫步按钮
  const startHoldDirection = (dx: number, dy: number) => {
    onStepMove(dx * 0.22, dy * 0.16);
    joystickInputRef.current = { x: dx, y: dy };
    setKnobOffset({ x: dx * MAX_RADIUS * 0.85, y: dy * MAX_RADIUS * 0.85 });
    onWalkStateChange(true, dx < 0 ? 'left' : 'right');
  };

  const stopHoldDirection = () => {
    if (holdButtonTimerRef.current) {
      clearInterval(holdButtonTimerRef.current);
      holdButtonTimerRef.current = null;
    }
    joystickInputRef.current = { x: 0, y: 0 };
    setKnobOffset({ x: 0, y: 0 });
    onWalkStateChange(false);
  };

  return (
    <div
      className="w-full rounded-[26px] px-3.5 py-2.5 flex flex-col gap-2"
      style={{
        background:
          'radial-gradient(120% 140% at 50% 25%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.68) 72%, rgba(255,255,255,0.48) 100%)',
        boxShadow:
          '0 12px 32px -6px rgba(85, 72, 115, 0.16), 0 0 24px 6px rgba(255,255,255,0.6), inset 0 0 14px rgba(255,255,255,0.85)',
      }}
    >
      {/* 顶部微提示文案 */}
      <p className="text-[11px] leading-snug text-slate-700 text-center font-medium">
        {walkHint}
      </p>

      {/* 底部控制器核心操作栏：左侧地标导航按键 + 中央 360° 柔光漫步摇杆 + 右侧方向步进按键 */}
      <div className="flex items-center justify-between gap-2">
        {/* 向左漫步 / 前往传送门 */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <button
            type="button"
            onPointerDown={() => startHoldDirection(-1, 0)}
            onPointerUp={stopHoldDirection}
            onPointerLeave={stopHoldDirection}
            onPointerCancel={stopHoldDirection}
            className="w-full py-2 px-2.5 rounded-full text-xs font-medium text-slate-800 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform whitespace-nowrap"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.95) 0%, rgba(245,240,255,0.78) 100%)',
              boxShadow: '0 4px 14px rgba(95,80,125,0.12), 0 0 12px rgba(255,255,255,0.75)',
            }}
          >
            <span>◀</span>
            <span>向左走</span>
          </button>

          <button
            type="button"
            onClick={() => onQuickNavigate('portal')}
            className={`w-full py-1 px-2 rounded-full text-[11px] font-medium cursor-pointer transition-all whitespace-nowrap ${
              isNearPortal ? 'text-purple-900 font-semibold' : 'text-slate-600'
            }`}
            style={{
              background: isNearPortal
                ? 'rgba(233, 213, 255, 0.85)'
                : 'rgba(255, 255, 255, 0.55)',
            }}
          >
            🌀 寻向传送门
          </button>
        </div>

        {/* 中央 360° 喷枪柔光万向漫步控制器 (Virtual Thumbstick) */}
        <div className="flex flex-col items-center shrink-0 mx-1">
          <div
            ref={padRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative w-[74px] h-[74px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(243,232,255,0.75) 65%, rgba(254,215,170,0.5) 100%)',
              boxShadow:
                'inset 0 2px 10px rgba(110, 95, 140, 0.18), 0 0 20px 4px rgba(255,255,255,0.85)',
            }}
            title="拖动摇杆控制小精灵在星球上360°自由行走"
          >
            {/* 十字微刻度指示 */}
            <span className="absolute top-1.5 text-[8px] text-slate-400 pointer-events-none">▲</span>
            <span className="absolute bottom-1.5 text-[8px] text-slate-400 pointer-events-none">▼</span>
            <span className="absolute left-1.5 text-[8px] text-slate-400 pointer-events-none">◀</span>
            <span className="absolute right-1.5 text-[8px] text-slate-400 pointer-events-none">▶</span>

            {/* 毛绒感小爪印摇杆帽 */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
                background:
                  'radial-gradient(circle at 40% 35%, #FFFFFF 0%, #FFF5F7 70%, #FBCFE8 100%)',
                boxShadow:
                  '0 5px 14px rgba(100, 80, 120, 0.24), 0 0 12px 3px rgba(255,255,255,0.95)',
              }}
            >
              <span className="text-xs">🐾</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 tracking-wider">
            漫步摇杆
          </span>
        </div>

        {/* 向右漫步 / 前往聆听石 */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <button
            type="button"
            onPointerDown={() => startHoldDirection(1, 0)}
            onPointerUp={stopHoldDirection}
            onPointerLeave={stopHoldDirection}
            onPointerCancel={stopHoldDirection}
            className="w-full py-2 px-2.5 rounded-full text-xs font-medium text-slate-800 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform whitespace-nowrap"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.95) 0%, rgba(254,243,199,0.78) 100%)',
              boxShadow: '0 4px 14px rgba(95,80,125,0.12), 0 0 12px rgba(255,255,255,0.75)',
            }}
          >
            <span>向右走</span>
            <span>▶</span>
          </button>

          <button
            type="button"
            onClick={() => onQuickNavigate('rock')}
            className={`w-full py-1 px-2 rounded-full text-[11px] font-medium cursor-pointer transition-all whitespace-nowrap ${
              isNearRock ? 'text-amber-900 font-semibold' : 'text-slate-600'
            }`}
            style={{
              background: isNearRock
                ? 'rgba(253, 230, 138, 0.88)'
                : 'rgba(255, 255, 255, 0.55)',
            }}
          >
            🪑 寻向聆听石
          </button>
        </div>
      </div>
    </div>
  );
};
