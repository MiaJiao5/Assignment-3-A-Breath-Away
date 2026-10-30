import { useLanguage } from '../i18n/LanguageContext';
import React, { useEffect, useRef, useState } from 'react';
import { JoystickVector } from './ThreePlanetStage';

interface BottomPlanetControllerProps {
  disabled?: boolean;
  joystickInputRef: React.MutableRefObject<JoystickVector>;
  onWalkStateChange: (isWalking: boolean, facing?: 'left' | 'right') => void;
}

export const BottomPlanetController: React.FC<BottomPlanetControllerProps> = ({
  disabled = false,
  joystickInputRef,
  onWalkStateChange,
}) => {
  const { copy } = useLanguage();
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const heldKeysRef = useRef<Set<string>>(new Set());

  const MAX_RADIUS = 32;

  // 键盘 WASD / 方向键支持（并在窗口失焦时自动清空按键）
  useEffect(() => {
    if (disabled) {
      heldKeysRef.current.clear();
      joystickInputRef.current = { x: 0, y: 0 };
      setKnobOffset({ x: 0, y: 0 });
      setIsDragging(false);
      const blockMovementKeys = (e: KeyboardEvent) => {
        if (document.activeElement?.matches('input, textarea, [contenteditable="true"]')) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) {
          e.preventDefault();
        }
      };
      window.addEventListener('keydown', blockMovementKeys);
      return () => window.removeEventListener('keydown', blockMovementKeys);
    }
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
        if (document.activeElement?.matches('input, textarea, [contenteditable="true"]')) return;
        e.preventDefault();
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
  }, [disabled, isDragging, joystickInputRef, onWalkStateChange]);

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    if (disabled) return;
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
    if (disabled) return;
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

  return (
    <div className="joystick-panel" hidden={disabled}>
      <div
        ref={padRef}
        role="group"
        tabIndex={0}
        aria-label={copy.joystick}
        aria-describedby="wandering-instructions"
        title={copy.joystickHint}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="wandering-joystick"
      >
        <span className="absolute top-2 text-[9px] opacity-45" aria-hidden="true">▲</span>
        <span className="absolute bottom-2 text-[9px] opacity-45" aria-hidden="true">▼</span>
        <span className="absolute left-2 text-[9px] opacity-45" aria-hidden="true">◀</span>
        <span className="absolute right-2 text-[9px] opacity-45" aria-hidden="true">▶</span>
        <div className="joystick-knob" style={{ transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)` }} aria-hidden="true">🐾</div>
      </div>
    </div>
  );
};
