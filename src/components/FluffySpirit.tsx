import { useLanguage } from '../i18n/LanguageContext';
import React, { useEffect, useState } from 'react';
import { BilingualText } from '../i18n/BilingualText';
import { FarewellSpirit } from './FarewellSpirit';

export type SpiritPose = 'idle' | 'walking' | 'sitting' | 'waving';

export interface OverheadBubbleData {
  id: number;
  text: string;
  isError?: boolean;
  messageKey?: 'emptyErrorBubble' | 'spiritHint' | 'stoneGuide';
}

interface FluffySpiritProps {
  pose: SpiritPose;
  facing?: 'left' | 'right';
  overheadBubble?: OverheadBubbleData | null;
  onTapSpirit?: () => void;
  size?: 'normal' | 'large';
}

export const FluffySpirit: React.FC<FluffySpiritProps> = ({
  pose,
  facing = 'right',
  overheadBubble = null,
  onTapSpirit,
  size = 'normal',
}) => {
  const { copy } = useLanguage();
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHopping, setIsHopping] = useState(false);

  // 自然随机眨眼动画
  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 170);
    }, 3400);
    return () => clearInterval(interval);
  }, []);

  const handleSpiritClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHopping) return;
    setIsHopping(true);
    onTapSpirit?.();
    window.setTimeout(() => {
      setIsHopping(false);
    }, 700);
  };

  // One continuous SVG spirit with independent waving motion.
  if (pose === 'waving') return <FarewellSpirit onTap={onTapSpirit} />;

  const containerSize = size === 'large' ? 148 : 126;

  const animationClass = isHopping
    ? 'animate-spirit-hop'
    : pose === 'walking'
    ? 'animate-spirit-walk'
    : pose === 'sitting'
    ? 'animate-spirit-sit'
    : 'animate-spirit-breathe';

  const horizontalFlip = facing === 'left' && pose === 'walking' ? 'scaleX(-1)' : 'scaleX(1)';

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* 头顶云朵状白色气泡（正常倾诉 4秒 / 空输入错误轻柔晃动提示） */}
      {overheadBubble && (
        <div
          key={overheadBubble.id}
          className={`absolute -top-20 left-1/2 -translate-x-1/2 z-30 min-w-[200px] max-w-[268px] px-4 py-2.5 rounded-3xl text-center pointer-events-none transition-all duration-500 ${
            overheadBubble.isError
              ? 'airbrush-cloud-bubble animate-soft-wobble text-rose-700/90'
              : 'airbrush-cloud-bubble text-slate-700'
          }`}
        >
          <p className="text-xs leading-relaxed font-medium tracking-wide break-words whitespace-pre-wrap">
            {overheadBubble.text}
          </p>
          {/* 云朵气泡下方两个柔和的小圆点尾巴 */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white/85"
            style={{ boxShadow: '0 0 10px rgba(255,255,255,0.8)' }}
          />
          <div
            className="absolute -bottom-4 left-1/2 translate-x-1 w-2 h-2 rounded-full bg-white/75"
            style={{ boxShadow: '0 0 8px rgba(255,255,255,0.75)' }}
          />
        </div>
      )}

      {/* 点击互动时的温柔小星芒/音符浮现 */}
      {isHopping && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none text-xs font-medium text-amber-200/95 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-bounce">
          ✦ <BilingualText select={c => c.spiritPurr} /> ✦
        </div>
      )}

      {/* 坐下听歌时身旁轻轻漂浮的柔和光点与音符 */}
      {pose === 'sitting' && !overheadBubble && (
        <div className="absolute -top-5 right-1 pointer-events-none flex items-center gap-1.5 opacity-85 animate-pulse">
          <span
            className="text-xs text-white"
            style={{ textShadow: '0 0 10px rgba(255,255,255,0.95)' }}
          >
            ♪
          </span>
          <span
            className="text-[10px] text-white/90 -mt-3"
            style={{ textShadow: '0 0 10px rgba(255,255,255,0.95)' }}
          >
            ✦
          </span>
        </div>
      )}

      {/* 柔和外发光光晕底层 */}
      <div
        className="absolute inset-2 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,245,250,0.52) 52%, rgba(255,255,255,0) 78%)',
          filter: 'blur(16px)',
        }}
      />

      <div
        onClick={handleSpiritClick}
        className={`w-full h-full cursor-pointer ${animationClass}`}
        title={copy.tapSpirit} aria-label={copy.tapSpirit}
      >
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full overflow-visible"
          style={{ transform: horizontalFlip, transition: 'transform 0.3s ease' }}
        >
          <defs>
            {/* SVG feTurbulence + feDisplacementMap 制作蓬松毛绒边缘 */}
            <filter id="fluffy-spirit-edge" x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.07"
                numOctaves="4"
                seed="7"
                result="furNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="furNoise"
                scale="5.8"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="7"
                floodColor="#FFFFFF"
                floodOpacity="0.85"
              />
            </filter>

            <radialGradient id="spirit-body-grad" cx="45%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#FFFDFB" />
              <stop offset="100%" stopColor="#F8EFEA" />
            </radialGradient>

            <radialGradient id="spirit-cheek-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.78" />
              <stop offset="60%" stopColor="#FBCFE8" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 小精灵脚下柔和阴影 */}
          <ellipse
            cx="80"
            cy="138"
            rx={pose === 'sitting' ? '44' : '36'}
            ry="8"
            fill="rgba(100, 85, 120, 0.16)"
            style={{ filter: 'blur(5px)' }}
          />

          {/* 头顶蓬松小绒球 */}
          <circle
            cx="80"
            cy={pose === 'sitting' ? '38' : '32'}
            r="12"
            fill="#FFFFFF"
            filter="url(#fluffy-spirit-edge)"
          />

          {pose === 'sitting' ? (
            /* ===== 乖巧抱膝坐下姿态 ===== */
            <g>
              {/* 坐下时更圆润微扁的雪白毛绒身体 */}
              <ellipse
                cx="80"
                cy="94"
                rx="52"
                ry="44"
                fill="url(#spirit-body-grad)"
                filter="url(#fluffy-spirit-edge)"
              />

              {/* 抱在身前的两只圆润小膝盖/小手团 */}
              <ellipse
                cx="62"
                cy="116"
                rx="16"
                ry="13"
                transform="rotate(-12 62 116)"
                fill="#FFFFFF"
                filter="url(#fluffy-spirit-edge)"
              />
              <ellipse
                cx="98"
                cy="116"
                rx="16"
                ry="13"
                transform="rotate(12 98 116)"
                fill="#FFFFFF"
                filter="url(#fluffy-spirit-edge)"
              />
              {/* 乖巧合拢的小手搭在膝盖上 */}
              <ellipse
                cx="66"
                cy="108"
                rx="11"
                ry="8"
                transform="rotate(18 66 108)"
                fill="#FFFDFB"
                filter="url(#fluffy-spirit-edge)"
              />
              <ellipse
                cx="94"
                cy="108"
                rx="11"
                ry="8"
                transform="rotate(-18 94 108)"
                fill="#FFFDFB"
                filter="url(#fluffy-spirit-edge)"
              />

              {/* 柔和粉色腮红 */}
              <ellipse cx="52" cy="88" rx="13" ry="8.5" fill="url(#spirit-cheek-glow)" />
              <ellipse cx="108" cy="88" rx="13" ry="8.5" fill="url(#spirit-cheek-glow)" />

              {/* 听歌时微闭享受或温柔眨动的豆豆眼 */}
              <path
                d="M 60 79 Q 65 74 70 79"
                stroke="#433835"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 90 79 Q 95 74 100 79"
                stroke="#433835"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* 微小的鼻尖 */}
              <ellipse cx="80" cy="84" rx="2.6" ry="1.9" fill="#F29B91" />
              {/* 治愈浅笑 */}
              <path
                d="M 76.5 89 Q 80 92 83.5 89"
                stroke="#8C7370"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            /* ===== 站立呼吸 / 星球漫步姿态 ===== */
            <g>
              {/* 漫步或站立的兩只小圆脚 */}
              <ellipse
                cx={pose === 'walking' ? '62' : '65'}
                cy={pose === 'walking' ? '131' : '133'}
                rx="11"
                ry="7.5"
                transform={pose === 'walking' ? 'rotate(-14 62 131)' : undefined}
                fill="#FFFDFB"
                filter="url(#fluffy-spirit-edge)"
              />
              <ellipse
                cx={pose === 'walking' ? '98' : '95'}
                cy={pose === 'walking' ? '134' : '133'}
                rx="11"
                ry="7.5"
                transform={pose === 'walking' ? 'rotate(14 98 134)' : undefined}
                fill="#FFFDFB"
                filter="url(#fluffy-spirit-edge)"
              />

              {/* 圆润蓬松的毛绒团子主躯干 */}
              <ellipse
                cx="80"
                cy="86"
                rx="49"
                ry="47"
                fill="url(#spirit-body-grad)"
                filter="url(#fluffy-spirit-edge)"
              />

              {/* 两侧圆滚滚的小手 */}
              <ellipse
                cx="34"
                cy="92"
                rx="10.5"
                ry="8"
                transform={pose === 'walking' ? 'rotate(-28 34 92)' : 'rotate(-15 34 92)'}
                fill="#FFFFFF"
                filter="url(#fluffy-spirit-edge)"
              />
              <ellipse
                cx="126"
                cy="92"
                rx="10.5"
                ry="8"
                transform={pose === 'walking' ? 'rotate(28 126 92)' : 'rotate(15 126 92)'}
                fill="#FFFFFF"
                filter="url(#fluffy-spirit-edge)"
              />

              {/* 柔和粉色腮红 */}
              <ellipse
                cx="53"
                cy="84"
                rx={isHopping ? '14.5' : '12.5'}
                ry="8"
                fill="url(#spirit-cheek-glow)"
              />
              <ellipse
                cx="107"
                cy="84"
                rx={isHopping ? '14.5' : '12.5'}
                ry="8"
                fill="url(#spirit-cheek-glow)"
              />

              {/* 极简豆豆眼 */}
              {isBlinking || isHopping ? (
                <>
                  <path
                    d="M 61 75 Q 66 70 71 75"
                    stroke="#3E3432"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 89 75 Q 94 70 99 75"
                    stroke="#3E3432"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              ) : (
                <>
                  <circle cx="66" cy="74" r="3.5" fill="#3E3432" />
                  <circle cx="67.1" cy="72.8" r="1.1" fill="#FFFFFF" />
                  <circle cx="94" cy="74" r="3.5" fill="#3E3432" />
                  <circle cx="95.1" cy="72.8" r="1.1" fill="#FFFFFF" />
                </>
              )}

              {/* 微小的鼻尖 */}
              <ellipse cx="80" cy="79.5" rx="2.5" ry="1.8" fill="#F29B91" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
