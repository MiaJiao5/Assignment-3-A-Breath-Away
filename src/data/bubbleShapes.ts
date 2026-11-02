/** Display-independent IDs are also stored on each released message. */
export const BUBBLE_SHAPES = ['cloud', 'circle', 'rounded'] as const;

export type BubbleShape = (typeof BUBBLE_SHAPES)[number];
