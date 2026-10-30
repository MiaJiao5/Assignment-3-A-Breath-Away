import type { QuizQuestion } from '../data/roamingData';

export type Language = 'en' | 'zh';

const en = {
  "INTRO_COPY": {
    "welcome": "Take a few minutes for yourself. Leave the noise outside for a little while.",
    "startButton": "Begin Your Little Escape"
  },
  "QUIZ_QUESTIONS": [
    {
      "id": 1,
      "question": "The background noise in your mind feels like...",
      "options": [
        {
          "value": "A",
          "label": "A fog of tiredness and heaviness",
          "emoji": "🌫️"
        },
        {
          "value": "B",
          "label": "A tangled ball of thoughts",
          "emoji": "🧶"
        },
        {
          "value": "C",
          "label": "A quiet, empty daydream",
          "emoji": "🫧"
        }
      ]
    },
    {
      "id": 2,
      "question": "Where would you like to bring your attention right now?",
      "options": [
        {
          "value": "A",
          "label": "The view outside a window and a gentle breeze",
          "emoji": "🪟"
        },
        {
          "value": "B",
          "label": "Your paused footsteps and the rhythm of your breathing",
          "emoji": "👣"
        },
        {
          "value": "C",
          "label": "A cloud drifting slowly across the sky",
          "emoji": "☁️"
        }
      ]
    },
    {
      "id": 3,
      "question": "If you could go somewhere for a little while, where would you go?",
      "options": [
        {
          "value": "A",
          "label": "A warm, sunlit place where you can unwind",
          "emoji": "🍊"
        },
        {
          "value": "B",
          "label": "A cool morning breeze passing through the leaves",
          "emoji": "🌿"
        },
        {
          "value": "C",
          "label": "An endless sky where everything feels weightless",
          "emoji": "☁️"
        }
      ]
    }
  ],
  "BUILTIN_STARDUST_QUOTES": [
    "A long meeting is over. Hide here for three little minutes.",
    "You worked hard today. Remember a warm drink later.",
    "Take a breath. You may daydream for five minutes.",
    "With each note, the tangled thoughts slowly unwind.",
    "Leave your worries beyond gravity. This moment is yours."
  ],
  "ROAMING_COPY": {
    "walkHint": "Follow the glowing arc to the Listening Stone. Tap the stone or your companion to sit.",
    "sitButton": "Sit & Listen",
    "standUpButton": "Resume Wandering",
    "portalButton": "Choose a Planet",
    "portalPrompt": "Choose a Planet. Another little sky is waiting for you.",
    "inputPlaceholder": "What would you like to say to yourself today?",
    "releaseButton": "Let It Float",
    "emptyErrorBubble": "Your bubble is still empty. Add a few words before letting it float away~",
    "leaveButton": "Leave for Now",
    "farewellText": "Come back whenever you need a little space.",
    "restartButton": "Take a Little Calm With You"
  },
  "planets": {
    "OMEGA_01": {
      "name": "Amber Sun",
      "fullName": "Ω-01 · Amber Sun",
      "subtitle": "Golden fields and a little sunlit warmth to unwind in.",
      "noiseLabel": "Wheatfield breeze"
    },
    "DELTA_02": {
      "name": "Mint Breeze",
      "fullName": "Δ-02 · Mint Breeze",
      "subtitle": "Cool morning mist and a breeze through the leaves.",
      "noiseLabel": "Morning leaves"
    },
    "SIGMA_03": {
      "name": "Zero-Gravity Sky",
      "fullName": "Σ-03 · Zero-Gravity Sky",
      "subtitle": "Clear your mind among weightless clouds.",
      "noiseLabel": "Cloud currents"
    },
    "PSI_04": {
      "name": "Quiet Starsea",
      "fullName": "Ψ-04 · Quiet Starsea",
      "subtitle": "Gentle stardust woven from twilight pink and dreamy blue.",
      "noiseLabel": "Starsea tides"
    }
  },
  "title": "A Breath Away",
  "support": "Headphones are recommended, but you can enjoy this experience without sound.",
  "switchLanguage": "Switch language",
  "back": "Back",
  "continue": "Continue",
  "skip": "Skip and Wander",
  "progress": "Question {n} of 3",
  "quizHint": "Follow your intuition and choose an answer",
  "gathering": "Gathering your scattered thoughts...",
  "tuning": "Tuning into your planet...",
  "soundOn": "Sound On",
  "mute": "Mute",
  "muted": "Muted",
  "playing": "Playing",
  "on": "On",
  "off": "Off",
  "expand": "Show movement controls",
  "collapse": "Hide controls",
  "current": "You are here",
  "visit": "Visit",
  "stay": "Stay on This Planet",
  "inputTitle": "Leave a Little Thought",
  "releaseSuccess": "Letting your words drift into the stars...",
  "audioError": "The sound isn't available right now, but you can still wander in silence.",
  "farewellHeading": "Go on, then.",
  "farewellMiddle": "You don’t have to figure everything out right now.",
  "farewellEnd": "Come back whenever you need a little space.",
  "calm": "Take a Little Calm With You",
  "another": "Visit Another Planet",
  "left": "Walk Left",
  "right": "Walk Right",
  "portalNav": "Find Portal",
  "rockNav": "Find Listening Stone",
  "joystick": "Wandering Joystick",
  "joystickHint": "Drag the joystick to walk, or use arrow keys / WASD",
  "stageHint": "Use the joystick to follow the glowing arc. Tap your companion to sit anywhere.",
  "spiritHint": "Purr~ Use the joystick to take me for a stroll!",
  "tapSpirit": "Tap the little spirit",
  "releaseBubble": "Release Your Bubble",
  "restHint": "Stay here for a while. Choose Resume Wandering when you are ready to move.",
  "stoneGuide": "Follow the glowing arc to the Listening Stone. You can also tap your companion to sit anywhere.",
  "stoneArrived": "You are here. Tap the Listening Stone or your companion to sit and listen.",
  "planetGuide": {
    "title": "A Little Guide to Your Planet",
    "subtitle": "There is no hurry. Here is how to find a little quiet.",
    "steps": [
      {
        "title": "Follow the light",
        "body": "Use the joystick to walk. Follow the glowing arc toward the Listening Stone."
      },
      {
        "title": "Sit and listen",
        "body": "Tap the stone when you are close, or tap your companion to sit anywhere. The view will ease in behind you."
      },
      {
        "title": "Let a thought float",
        "body": "While sitting, write a little thought and let it drift away. Leave for Now appears after three seconds of rest."
      }
    ],
    "controls": "You can also move with WASD or arrow keys. Choose Resume Wandering when you feel ready.",
    "confirm": "Got It, Let’s Wander"
  }
};

type Copy = Omit<typeof en, 'QUIZ_QUESTIONS'> & { QUIZ_QUESTIONS: QuizQuestion[] };

const zh: Copy = {
  "INTRO_COPY": {
    "welcome": "给自己几分钟，把外面的喧闹暂时留在门外。",
    "startButton": "开始短暂漫游"
  },
  "QUIZ_QUESTIONS": [
    {
      "id": 1,
      "question": "Q1：脑海里还没散去的背景音，听起来像是……",
      "options": [
        {
          "value": "A",
          "label": "灰蒙蒙的困倦与沉重",
          "emoji": "🌫️"
        },
        {
          "value": "B",
          "label": "乱糟糟解不开的线团",
          "emoji": "🧶"
        },
        {
          "value": "C",
          "label": "稍微有点空落落的发呆",
          "emoji": "🫧"
        }
      ]
    },
    {
      "id": 2,
      "question": "Q2：此刻，你想把注意力收回到哪里？",
      "options": [
        {
          "value": "A",
          "label": "眼前的一方窗景与微风",
          "emoji": "🪟"
        },
        {
          "value": "B",
          "label": "暂缓的脚步与呼吸起伏",
          "emoji": "👣"
        },
        {
          "value": "C",
          "label": "天空里慢慢飘过的一朵云",
          "emoji": "☁️"
        }
      ]
    },
    {
      "id": 3,
      "question": "Q3：闭上眼深呼吸，以下哪个地方是你最想去的？",
      "options": [
        {
          "value": "A",
          "label": "晒过太阳的微温与松弛",
          "emoji": "🍊"
        },
        {
          "value": "B",
          "label": "穿过树叶的微凉晨风",
          "emoji": "🌿"
        },
        {
          "value": "C",
          "label": "无重力的万里晴空",
          "emoji": "☁️"
        }
      ]
    }
  ],
  "BUILTIN_STARDUST_QUOTES": [
    "刚开完一个漫长的会，来这里躲 3 分钟。",
    "今天的工作辛苦啦，等下记得去喝杯温水。",
    "深呼吸，没什么大不了的，允许自己发呆五分钟。",
    "在这里听着歌，感觉脑子里的线团慢慢解开了。",
    "把烦恼留在引力场外，此刻只属于你自己。"
  ],
  "ROAMING_COPY": {
    "walkHint": "沿着发光弧线去找聆听石吧，轻点石头或小精灵就能坐下。",
    "sitButton": "坐下听歌",
    "standUpButton": "继续漫步",
    "portalButton": "选择一颗星球",
    "portalPrompt": "去别的引力场看看吗？那里的风吹向另一片天空。",
    "inputPlaceholder": "写下一句现在的心情，让它化作星尘留在这里...",
    "releaseButton": "放飞",
    "emptyErrorBubble": "气泡还是轻飘飘的呢，写两个字再放飞吧~",
    "leaveButton": "先去忙啦",
    "farewellText": "去忙吧，累了随时来找我，我会一直在这里等你。",
    "restartButton": "重新开启漫游"
  },
  "planets": {
    "OMEGA_01": {
      "name": "琥珀暖阳",
      "fullName": "Ω-01 · 琥珀暖阳",
      "subtitle": "金黄麦浪与晒过太阳的微温松弛",
      "noiseLabel": "麦浪微风"
    },
    "DELTA_02": {
      "name": "薄荷晨风",
      "fullName": "Δ-02 · 薄荷晨风",
      "subtitle": "穿过树叶的清凉晨风",
      "noiseLabel": "林间晨风"
    },
    "SIGMA_03": {
      "name": "晴空零度",
      "fullName": "Σ-03 · 晴空零度",
      "subtitle": "无重力云端上的澄澈放空",
      "noiseLabel": "云端气流"
    },
    "PSI_04": {
      "name": "静谧星海",
      "fullName": "Ψ-04 · 静谧星海",
      "subtitle": "暮光与梦幻星尘，轻轻环绕着你",
      "noiseLabel": "星海潮汐"
    }
  },
  "title": "一息之外",
  "support": "推荐戴上耳机，也可以安静地享受这段漫游。",
  "switchLanguage": "切换语言",
  "back": "返回",
  "continue": "继续",
  "skip": "跳过，直接漫游",
  "progress": "第 {n} 题，共 3 题",
  "quizHint": "跟着直觉，选一个就好",
  "gathering": "正在收集你散落的思绪……",
  "tuning": "正在接通你的星球……",
  "soundOn": "声音开启",
  "mute": "静音",
  "muted": "已静音",
  "playing": "正在播放",
  "on": "开启",
  "off": "关闭",
  "expand": "展开漫步控制器",
  "collapse": "收起控制栏",
  "current": "当前所在",
  "visit": "前往",
  "stay": "留在这颗星球",
  "inputTitle": "留下一点小心事",
  "releaseSuccess": "让你的话，慢慢飘进星光里……",
  "audioError": "声音暂时迷路了，不过你依然可以安静地漫游。",
  "farewellHeading": "先去忙吧。",
  "farewellMiddle": "不必现在就把一切想明白。",
  "farewellEnd": "想透口气的时候，随时回来。",
  "calm": "带上一点平静",
  "another": "再访一颗星球",
  "left": "向左走",
  "right": "向右走",
  "portalNav": "寻找传送门",
  "rockNav": "寻找聆听石",
  "joystick": "漫步摇杆",
  "joystickHint": "拖动摇杆漫步，也可以使用方向键或 WASD",
  "stageHint": "用摇杆跟着光弧走，轻点小精灵，在哪里都能坐下。",
  "spiritHint": "呼噜呼噜～用摇杆带我走走吧！",
  "tapSpirit": "轻点小精灵",
  "releaseBubble": "放飞你的气泡",
  "restHint": "就在这里歇一会儿吧。想走走时，点「继续漫步」。",
  "stoneGuide": "跟着发光弧线去找聆听石吧，也可以轻点小精灵原地坐下。",
  "stoneArrived": "到啦，轻点聆听石或小精灵，坐下听一会儿吧。",
  "planetGuide": {
    "title": "漫游前，先看一眼",
    "subtitle": "不赶时间，先认识这颗小星球。",
    "steps": [
      {
        "title": "跟着光走",
        "body": "用摇杆移动小精灵，沿着发光弧线去找聆听石。"
      },
      {
        "title": "坐下听听",
        "body": "走近后轻点石头，也可以轻点小精灵原地坐下。镜头会慢慢来到你的身后。"
      },
      {
        "title": "放飞一点心事",
        "body": "坐下后可以写几句话，让它们飘向星空。歇满三秒后，会出现「先去忙啦」。"
      }
    ],
    "controls": "也可以用 WASD 或方向键移动。想走走时，点「继续漫步」。",
    "confirm": "知道啦，开始漫游"
  }
};

export const translations: Record<Language, Copy> = { en: en as Copy, zh };
