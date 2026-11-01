import type { PlanetId } from './roamingData';

export interface StarMessage { readonly id: string; readonly en: string; readonly zh: string }
type FiveMessages = readonly [StarMessage, StarMessage, StarMessage, StarMessage, StarMessage];

export const STAR_MESSAGES = {
  OMEGA_01: [
    { id: 'amber-01', en: "You've done enough for today. The rest can wait.", zh: '今天已经很努力了，剩下的事可以慢慢来。' },
    { id: 'amber-02', en: 'Let a little warmth make your tiredness feel lighter.', zh: '愿这一点暖意，陪你把疲惫放轻一些。' },
    { id: 'amber-03', en: "You don't have to shine all the time. Just enjoy the sunshine.", zh: '不必一直发光，晒晒太阳也很好。' },
    { id: 'amber-04', en: "Take a sip of water and stretch. That's caring for yourself, too.", zh: '喝口水，伸个懒腰，也算认真照顾自己。' },
    { id: 'amber-05', en: "For now, there's nowhere you need to rush. Just breathe.", zh: '愿你此刻什么都不用赶，只管好好呼吸。' },
  ],
  DELTA_02: [
    { id: 'mint-01', en: 'Let your shoulders soften. The breeze can carry some of the tension away.', zh: '把肩膀放松一点，风会替你带走一点紧绷。' },
    { id: 'mint-02', en: "You don't have to figure it all out. Just take the next small step.", zh: '不用一次理清所有事情，先做好眼前这一小步。' },
    { id: 'mint-03', en: 'The breeze outside reminds you: you can begin again.', zh: '窗外的风一直在提醒你：可以重新开始。' },
    { id: 'mint-04', en: 'Breathe in gently, breathe out slowly, and return to this moment.', zh: '深呼吸，慢慢吐气，把自己还给此刻。' },
    { id: 'mint-05', en: "Let your tangled thoughts loosen. You don't have to untie them yet.", zh: '让脑海里的线团先松一松，不急着解开。' },
  ],
  SIGMA_03: [
    { id: 'sky-01', en: 'Sometimes doing nothing is its own kind of progress.', zh: '偶尔什么也不做，也是一种很好的前进。' },
    { id: 'sky-02', en: "Look up at the clouds. There's more to life than a to-do list.", zh: '抬头看看云，世界不只有待办清单。' },
    { id: 'sky-03', en: 'Let your thoughts drift. Not every minute needs an answer.', zh: '允许思绪飘一会儿，不必每分钟都有答案。' },
    { id: 'sky-04', en: 'This little pause belongs to you.', zh: '这一小段空白，也是属于你的时间。' },
    { id: 'sky-05', en: 'May you feel a little lighter, without carrying it all for now.', zh: '愿你轻一点，再轻一点，暂时不必背起所有事。' },
  ],
  PSI_04: [
    { id: 'starsea-01', en: "If your feelings are complicated, that's okay. You don't have to explain them yet.", zh: '如果心情有点复杂，也没关系，你不必马上说清楚。' },
    { id: 'starsea-02', en: 'Some answers can wait. For now, let yourself rest.', zh: '有些答案可以晚一点出现，现在先好好休息。' },
    { id: 'starsea-03', en: "You don't have to sort every feeling. Even stars shine in different ways.", zh: '不必把每一种情绪都整理好，星星也有不同的光。' },
    { id: 'starsea-04', en: 'You deserve a little kindness, exactly as you are today.', zh: '今天的你，已经值得被温柔对待。' },
    { id: 'starsea-05', en: "Even if your thoughts feel tangled, you haven't lost your way.", zh: '就算此刻有些混乱，你也没有偏离自己的方向。' },
  ],
} as const satisfies Record<PlanetId, FiveMessages>;

/** Fisher–Yates shuffle; avoid an immediate repeat across cycle boundaries. */
export function shuffleStarMessages(planetId: PlanetId, previousId?: string): StarMessage[] {
  const messages: StarMessage[] = [...STAR_MESSAGES[planetId]];
  for (let i = messages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [messages[i], messages[j]] = [messages[j], messages[i]];
  }
  if (messages[0].id === previousId) {
    const j = 1 + Math.floor(Math.random() * (messages.length - 1));
    [messages[0], messages[j]] = [messages[j], messages[0]];
  }
  return messages;
}
