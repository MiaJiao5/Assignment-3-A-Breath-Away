import { useLanguage } from '../i18n/LanguageContext';
import React, { useEffect, useState } from 'react';
import { BilingualText } from '../i18n/BilingualText';

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

  // 第四幕告别特写：三只毛茸茸的白色小精灵簇拥在一起挥手拜拜
  if (pose === 'waving') {
    return (
      <div
        onClick={handleSpiritClick}
        className="relative flex items-center justify-center cursor-pointer select-none"
        style={{ width: 280, height: 220 }}
        title={copy.tapSpirit} aria-label={copy.tapSpirit}
      >
        {/* 背后温暖的喷枪柔焦白色光晕 */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.88) 0%, rgba(255,240,246,0.5) 48%, rgba(255,255,255,0) 75%)',
            filter: 'blur(26px)',
          }}
        />

        <svg
          viewBox="0 0 320 240"
          className={`w-full h-full overflow-visible ${isHopping ? 'animate-spirit-hop' : 'animate-spirit-breathe'}`}
        >
          <defs>
            {/* 毛茸茸边缘置换滤镜 */}
            <filter id="fluffy-fur-trio" x="-25%" y="-25%" width="150%" height="150%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.065"
                numOctaves="4"
                seed="11"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="5.5"
                xChannelSelector="R"
                yChannelSelector="G"
                result="fluffyBody"
              />
              <feDropShadow
                dx="0"
                dy="6"
                stdDeviation="8"
                floodColor="#FFF5F8"
                floodOpacity="0.9"
              />
            </filter>

            <radialGradient id="fluffy-grad-main" cx="46%" cy="36%" r="58%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="72%" stopColor="#FFFDFB" />
              <stop offset="100%" stopColor="#F9EFEA" />
            </radialGradient>

            <radialGradient id="blush-pink" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.72" />
              <stop offset="65%" stopColor="#FBCFE8" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 左侧陪伴小精灵 */}
          <g transform="translate(36, 62) scale(0.76)">
            <ellipse
              cx="65"
              cy="92"
              rx="48"
              ry="45"
              fill="url(#fluffy-grad-main)"
              filter="url(#fluffy-fur-trio)"
            />
            {/* 腮红 */}
            <ellipse cx="42" cy="92" rx="11" ry="7" fill="url(#blush-pink)" />
            <ellipse cx="86" cy="92" rx="11" ry="7" fill="url(#blush-pink)" />
            {/* 温柔弯弯眼 */}
            <path
              d="M 48 83 Q 53 78 58 83"
              stroke="#4A3E3D"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 72 83 Q 77 78 82 83"
              stroke="#4A3E3D"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
            {/* 微小鼻尖 */}
            <ellipse cx="65" cy="87" rx="2.2" ry="1.6" fill="#F4A298" />
            {/* 挥动的小圆手 */}
            <g className="animate-wave-arm" style={{ transformOrigin: '28px 88px' }}>
              <ellipse
                cx="18"
                cy="74"
                rx="12"
                ry="9"
                transform="rotate(-28 18 74)"
                fill="#FFFFFF"
                filter="url(#fluffy-fur-trio)"
              />
            </g>
          </g>

          {/* 右侧陪伴小精灵 */}
          <g transform="translate(178, 64) scale(0.76)">
            <ellipse
              cx="65"
              cy="92"
              rx="48"
              ry="45"
              fill="url(#fluffy-grad-main)"
              filter="url(#fluffy-fur-trio)"
            />
            {/* 腮红 */}
            <ellipse cx="42" cy="92" rx="11" ry="7" fill="url(#blush-pink)" />
            <ellipse cx="86" cy="92" rx="11" ry="7" fill="url(#blush-pink)" />
            {/* 豆豆眼 */}
            {isBlinking || isHopping ? (
              <>
                <path
                  d="M 48 83 Q 53 78 58 83"
                  stroke="#4A3E3D"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 72 83 Q 77 78 82 83"
                  stroke="#4A3E3D"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            ) : (
              <>
                <circle cx="52" cy="82" r="3.4" fill="#433835" />
                <circle cx="76" cy="82" r="3.4" fill="#433835" />
              </>
            )}
            <ellipse cx="64" cy="87" rx="2.2" ry="1.6" fill="#F4A298" />
            {/* 右侧挥动的小圆手 */}
            <g className="animate-wave-arm" style={{ transformOrigin: '102px 88px' }}>
              <ellipse
                cx="112"
                cy="72"
                rx="12"
                ry="9"
                transform="rotate(28 112 72)"
                fill="#FFFFFF"
                filter="url(#fluffy-fur-trio)"
              />
            </g>
          </g>

          {/* 中央主毛绒小精灵（圆润蓬松雪白团子） */}
          <g transform="translate(96, 36)">
            {/* 底部柔光接触阴影 */}
            <ellipse
              cx="64"
              cy="152"
              rx="46"
              ry="10"
              fill="rgba(120, 100, 140, 0.14)"
              style={{ filter: 'blur(6px)' }}
            />
            {/* 蓬松头顶小呆毛团 */}
            <circle
              cx="64"
              cy="34"
              r="14"
              fill="#FFFFFF"
              filter="url(#fluffy-fur-trio)"
            />
            {/* 主身体圆团 */}
            <ellipse
              cx="64"
              cy="96"
              rx="58"
              ry="54"
              fill="url(#fluffy-grad-main)"
              filter="url(#fluffy-fur-trio)"
            />
            {/* 柔和粉色腮红 */}
            <ellipse
              cx="36"
              cy="96"
              rx={isHopping ? '15' : '13'}
              ry="8.5"
              fill="url(#blush-pink)"
            />
            <ellipse
              cx="92"
              cy="96"
              rx={isHopping ? '15' : '13'}
              ry="8.5"
              fill="url(#blush-pink)"
            />

            {/* 极简豆豆眼 */}
            {isBlinking || isHopping ? (
              <>
                <path
                  d="M 44 85 Q 49 79 54 85"
                  stroke="#3E3432"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 74 85 Q 79 79 84 85"
                  stroke="#3E3432"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            ) : (
              <>
                <circle cx="49" cy="84" r="3.8" fill="#3E3432" />
                <circle cx="50.2" cy="82.8" r="1.1" fill="#FFFFFF" />
                <circle cx="79" cy="84" r="3.8" fill="#3E3432" />
                <circle cx="80.2" cy="82.8" r="1.1" fill="#FFFFFF" />
              </>
            )}

            {/* 微小的粉色鼻尖与微笑 */}
            <ellipse cx="64" cy="90" rx="2.8" ry="2" fill="#F29B91" />
            <path
              d="M 60 95 Q 64 98.5 68 95"
              stroke="#8C7370"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* 左手轻抚胸口 */}
            <ellipse
              cx="22"
              cy="106"
              rx="12"
              ry="9"
              transform="rotate(18 22 106)"
              fill="#FFFFFF"
              filter="url(#fluffy-fur-trio)"
            />

            {/* 右手伸出圆圆的小手轻轻挥动拜拜 */}
            <g className="animate-wave-arm" style={{ transformOrigin: '108px 94px' }}>
              <ellipse
                cx="120"
                cy="74"
                rx="14"
                ry="10"
                transform="rotate(-32 120 74)"
                fill="#FFFFFF"
                filter="url(#fluffy-fur-trio)"
              />
            </g>

            {/* 两只圆润的小脚丫 */}
            <ellipse cx="46" cy="146" rx="12" ry="7.5" fill="#FFFDFB" filter="url(#fluffy-fur-trio)" />
            <ellipse cx="82" cy="146" rx="12" ry="7.5" fill="#FFFDFB" filter="url(#fluffy-fur-trio)" />
          </g>
        </svg>
      </div>
    );
  }

  // 单只毛茸茸小精灵（开场引导 / 星球漫步 / 乖巧坐下听歌）
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
