import type { BubbleShape } from '../data/bubbleShapes';

type Props = { shape: BubbleShape; className?: string };

/** The selector and released message share the same real silhouette. */
export function BubbleSilhouette({ shape, className = '' }: Props) {
  if (shape === 'circle') {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="49" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 300 180"
      preserveAspectRatio="none"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {shape === 'cloud' ? (
        <path d="M42 164C21 164 9 151 16 132C2 118 4 87 27 78C22 47 46 26 73 32C85 34 94 41 100 50C110 23 134 11 158 18C181 23 194 38 198 55C217 35 248 39 262 57C273 70 276 85 272 99C296 110 302 136 287 153C279 162 266 165 249 164H42Z" />
      ) : (
        <rect x="3" y="13" width="294" height="154" rx="65" />
      )}
    </svg>
  );
}
