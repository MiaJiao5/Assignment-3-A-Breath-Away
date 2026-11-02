import { useId, useRef, type KeyboardEvent } from 'react';
import { BUBBLE_SHAPES, type BubbleShape } from '../data/bubbleShapes';
import { BilingualText } from '../i18n/BilingualText';
import { useLanguage } from '../i18n/LanguageContext';
import { BubbleSilhouette } from './BubbleSilhouette';
import './bubbleShapes.css';

type Props = { value: BubbleShape; onChange: (shape: BubbleShape) => void };

export function BubbleShapeSelector({ value, onChange }: Props) {
  const labelId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const { copy } = useLanguage();

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) return;
    // Arrow keys select shapes here instead of reaching the planet controls.
    event.preventDefault();
    event.stopPropagation();
    const next = (index + direction + BUBBLE_SHAPES.length) % BUBBLE_SHAPES.length;
    onChange(BUBBLE_SHAPES[next]);
    buttons.current[next]?.focus();
  }

  return (
    <div className="bubble-shape-selector" role="group" aria-labelledby={labelId}>
      <p className="bubble-shape-heading" id={labelId}>
        <BilingualText select={text => text.bubbleShapes.label} />
      </p>
      <div className="bubble-shape-options">
        {BUBBLE_SHAPES.map((shape, index) => (
          <button
            key={shape}
            ref={element => { buttons.current[index] = element; }}
            type="button"
            className="bubble-shape-option"
            data-shape={shape}
            aria-label={copy.bubbleShapes[shape]}
            aria-pressed={shape === value}
            onClick={() => onChange(shape)}
            onKeyDown={event => moveSelection(event, index)}
          >
            <BubbleSilhouette shape={shape} className={`bubble-shape-preview bubble-shape-preview--${shape}`} />
            <BilingualText select={text => text.bubbleShapes[shape]} />
          </button>
        ))}
      </div>
    </div>
  );
}
