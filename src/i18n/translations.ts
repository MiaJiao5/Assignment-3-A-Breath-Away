import type { QuizQuestion } from '../data/roamingData';

export type Language = 'en' | 'zh';

const en = {
  "INTRO_COPY": {
    "welcome": "Take a few minutes for yourself. Leave the noise outside for a little while.",
    "startButton": "Begin Your Little Escape"
  },
  "interlude": {
    "title": "A Moment to Tune In",
    "firstLine": "Take a few minutes for yourself. Leave the noise outside for a little while.",
    "secondLine": "🎧 Put on your headphones for a gentle audio journey",
    "headphonesLabel": "Headphones with soft sound ripples",
    "ready": "I'm Ready →",
    "tapToContinue": "You can also tap anywhere to continue."
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
    "walkHint": "Follow the gentle light to the Listening Stone. Choose Sit & Listen when you are close.",
    "sitButton": "Sit & Listen",
    "standUpButton": "Stand Up",
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
      "noiseLabel": "Wheatfield breeze",
      "biomeHint": "Wander among maple trees, golden wheat and warm berry bushes. Tiny leaves may follow your footsteps."
    },
    "DELTA_02": {
      "name": "Mint Breeze",
      "fullName": "Δ-02 · Mint Breeze",
      "subtitle": "Cool morning mist and a breeze through the leaves.",
      "noiseLabel": "Morning leaves",
      "biomeHint": "Meet cloud trees, tender grasses and mint mushrooms. A few morning dewdrops are waiting to say hello."
    },
    "SIGMA_03": {
      "name": "Zero-Gravity Sky",
      "fullName": "Σ-03 · Zero-Gravity Sky",
      "subtitle": "Clear your mind among weightless clouds.",
      "noiseLabel": "Cloud currents",
      "biomeHint": "Drift past little clouds, dandelions and pastel pinwheels. Watch their soft fluff float away."
    },
    "PSI_04": {
      "name": "Quiet Starsea",
      "fullName": "Ψ-04 · Quiet Starsea",
      "subtitle": "Gentle stardust woven from twilight pink and dreamy blue.",
      "noiseLabel": "Starsea tides",
      "biomeHint": "Explore glowing jellyfish mushrooms, rounded crystals and moon reeds. They shine a little brighter as you pass."
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
  "stoneLabel": "Listening Stone",
  "portalLabel": "Star Portal",
  "gardenHint": "Wander past the flowers and star trees. They may have a little surprise for you.",
  "joystick": "Wandering Joystick",
  "joystickHint": "Drag the joystick to walk, or use arrow keys / WASD",
  "stageHint": "Use the joystick to approach the Listening Stone, then choose Sit & Listen above the joystick.",
  "spiritHint": "Purr~ Use the joystick to take me for a stroll!",
  "tapSpirit": "Tap the little spirit",
  "releaseBubble": "Release Your Bubble",
  "restHint": "Stay here for a while. Choose Stand Up when you are ready to move.",
  "stoneGuide": "Follow the gentle light to the Listening Stone. A Sit & Listen button will appear when you are close.",
  "stoneArrived": "You are here. Choose Sit & Listen whenever you feel ready to rest.",
  "portalGuide": "Ready for another little sky? Follow the gentle light to the portal.",
  "portalArrived": "You found it. Choose Enter Portal above the joystick to discover your next sky.",
  "portalDiscovery": {
    "enter": "Enter Portal",
    "title": "Let the Stars Choose",
    "intro": "There are {n} unvisited skies in this journey.",
    "transmittingTitle": "Through a Little Starlight",
    "transmitting": "The portal is opening. Your next sky is waiting...",
    "lastPlanet": "Just one sky left. The portal will take you straight there...",
    "destinations": "Unvisited planets",
    "readyHint": "The planets drift clockwise. Let the stars choose your next stop.",
    "spin": "Find My Next Planet",
    "spinningButton": "Following the Stars...",
    "spinning": "A little spin, a little surprise...",
    "arriving": "Next stop: {planet}. Drifting there now...",
    "departing": "On Our Way...",
    "completeTitle": "You Have Wandered Every Sky",
    "completeBody": "All four planets have been part of your journey. Linger here, or begin a new little orbit.",
    "completeHint": "A new journey opens the other three skies again.",
    "resetRoute": "Begin Another Journey"
  },
  "exitGuide": {
    "title": "Leave Whenever You Like",
    "body": "Your little escape can end whenever you need. Tap Leave for Now in the top-left corner to say goodbye.",
    "confirm": "Got It"
  },
  "planetGuide": {
    "title": "A Little Guide to Your Planet",
    "subtitle": "Use the controls below to explore.",
    "steps": [
      {
        "title": "Move around",
        "body": "Drag the joystick below. WASD and arrow keys work too."
      },
      {
        "title": "Listening Stone",
        "body": "Walk close, then tap Sit & Listen above the joystick for music and a closer view. Tap Stand Up to continue."
      },
      {
        "title": "Star Portal",
        "body": "After resting, follow the light here. Walk close and tap Enter Portal above the joystick to visit another planet."
      }
    ],
    "confirm": "Got It, Let’s Wander"
  }
};

type Copy = Omit<typeof en, 'QUIZ_QUESTIONS'> & { QUIZ_QUESTIONS: QuizQuestion[] };

const zh: Copy = {
  "INTRO_COPY": {
    "welcome": "给自己几分钟，把外面的喧闹暂时留在门外。",
    "startButton": "开启短暂漫游"
  },
  "interlude": {
    "title": "先让声音轻轻靠近",
    "firstLine": "给自己留几分钟吧，把外面的喧嚣暂时留在门外。",
    "secondLine": "🎧 建议戴上耳机，开启这段温柔的声音漫游",
    "headphonesLabel": "耳机与轻柔扩散的声波",
    "ready": "准备好了 →",
    "tapToContinue": "也可以轻点空白处继续。"
  },
  "QUIZ_QUESTIONS": [
    {
      "id": 1,
      "question": "脑海里还没散去的背景音，听起来像是……",
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
      "question": "此刻，你想把注意力收回到哪里？",
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
      "question": "闭上眼深呼吸，以下哪个地方是你最想去的？",
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
    "walkHint": "跟着柔光去找聆听石吧，走近后点「坐下听歌」。",
    "sitButton": "坐下听歌",
    "standUpButton": "起身",
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
      "noiseLabel": "麦浪微风",
      "biomeHint": "走过红枫、金麦和暖橘浆果丛，看看有没有小枫叶跟上你的脚步。"
    },
    "DELTA_02": {
      "name": "薄荷晨风",
      "fullName": "Δ-02 · 薄荷晨风",
      "subtitle": "穿过树叶的清凉晨风",
      "noiseLabel": "林间晨风",
      "biomeHint": "去认识云朵树、嫩草和薄荷小蘑菇吧，清晨露珠正等着与你打招呼。"
    },
    "SIGMA_03": {
      "name": "晴空零度",
      "fullName": "Σ-03 · 晴空零度",
      "subtitle": "无重力云端上的澄澈放空",
      "noiseLabel": "云端气流",
      "biomeHint": "经过小云朵、蒲公英和粉紫风车，看几缕软绒绒的光点轻轻飘远。"
    },
    "PSI_04": {
      "name": "静谧星海",
      "fullName": "Ψ-04 · 静谧星海",
      "subtitle": "暮光与梦幻星尘，轻轻环绕着你",
      "noiseLabel": "星海潮汐",
      "biomeHint": "找找水母小蘑菇、星光水晶和弯月芦苇，你经过时，它们会悄悄亮起来。"
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
  "stoneLabel": "聆听石",
  "portalLabel": "星光传送门",
  "gardenHint": "走近小花和星星树，听听它们藏着的小惊喜。",
  "joystick": "漫步摇杆",
  "joystickHint": "拖动摇杆漫步，也可以使用方向键或 WASD",
  "stageHint": "用摇杆走近聆听石，再点摇杆上方的「坐下听歌」。",
  "spiritHint": "呼噜呼噜～用摇杆带我走走吧！",
  "tapSpirit": "轻点小精灵",
  "releaseBubble": "放飞你的气泡",
  "restHint": "就在这里歇一会儿吧。想走走时，点「起身」。",
  "stoneGuide": "跟着柔光去找聆听石吧，走近后会出现「坐下听歌」。",
  "stoneArrived": "到啦，想歇一会儿时，点「坐下听歌」。",
  "portalGuide": "想看看另一片天空吗？跟着柔光，去传送门走走吧。",
  "portalArrived": "到啦，点摇杆上方的「进入传送门」，让星光带你去下一站。",
  "portalDiscovery": {
    "enter": "进入传送门",
    "title": "让星光，选下一站",
    "intro": "这一程，还有 {n} 颗星球等你去看看。",
    "transmittingTitle": "穿过一小片星光",
    "transmitting": "传送门正在打开，下一片天空在等你……",
    "lastPlanet": "只剩最后一片天空啦，这就带你直接过去……",
    "destinations": "尚未到访的星球",
    "readyHint": "星球正顺时针轻轻转动，让星光替你选一站吧。",
    "spin": "摇一摇，去下一站",
    "spinningButton": "跟着星光转一转……",
    "spinning": "转呀转，下一站会是哪里呢……",
    "arriving": "下一站：{planet}。这就轻轻飘过去……",
    "departing": "出发啦……",
    "completeTitle": "每片天空，都留下了你的足迹",
    "completeBody": "四颗星球都去过啦。可以再待一会儿，也可以开启新一轮小小漫游。",
    "completeHint": "开启新一轮，就能再遇见另外三片天空。",
    "resetRoute": "再漫游一圈"
  },
  "exitGuide": {
    "title": "想走的时候，随时出发",
    "body": "之后你随时都可以离开。点左上角的「先去忙啦」，就能告别这颗星球。",
    "confirm": "知道啦"
  },
  "planetGuide": {
    "title": "漫游前，先看一眼",
    "subtitle": "用下方控件，开始探索。",
    "steps": [
      {
        "title": "移动小精灵",
        "body": "拖动下方摇杆移动，也可以使用 WASD 或方向键。"
      },
      {
        "title": "聆听石",
        "body": "走近后，点击摇杆上方的「坐下听歌」，音乐会渐渐响起，镜头也会拉近。点击「起身」继续探索。"
      },
      {
        "title": "传送门",
        "body": "听完歌后起身，跟着光走近传送门。点击摇杆上方的「进入传送门」，前往下一颗星球。"
      }
    ],
    "confirm": "知道啦，开始漫游"
  }
};

export const translations: Record<Language, Copy> = { en: en as Copy, zh };
