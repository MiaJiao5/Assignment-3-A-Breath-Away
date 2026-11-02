import React, { useCallback, useLayoutEffect, useRef } from 'react';
import type { BubbleShape } from '../data/bubbleShapes';
import { BubbleSilhouette } from './BubbleSilhouette';
import { balloonKeyframes } from '../animation/balloonMotion';
import './releasedMessageBubble.css';

export const BUBBLE_RELEASE_DURATION_MS = 9000;

interface Props {
  text: string;
  shape: BubbleShape;
  anchorRef: React.Ref<HTMLDivElement>;
}

/** The scene projects the outer anchor once. Only the inner body travels, so
 * camera breathing and language changes cannot move or restart a released thought. */
export function ReleasedMessageBubble({ text, shape, anchorRef }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const anchorLocalRef = useRef<HTMLDivElement>(null);
  const textBoxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const windPhase = useRef(.15 + Math.random() * .45);
  const windDirection = useRef(Math.random() < .5 ? -1 : 1);
  const setAnchor = useCallback((node: HTMLDivElement | null) => {
    anchorLocalRef.current = node;
    if (typeof anchorRef === 'function') anchorRef(node);
    else if (anchorRef) anchorRef.current = node;
  }, [anchorRef]);

  useLayoutEffect(() => {
    let disposed = false;
    const measure = document.createElement('canvas').getContext('2d')!;
    const sizeBubble = () => {
      if (disposed || !textRef.current || !anchorLocalRef.current) return;
      measure.font = `600 16px ${getComputedStyle(textRef.current).fontFamily}`;
      const inkWidth = measure.measureText(text).width;
      let width: number, height: number;
      if (shape === 'circle') {
        width = Math.max(84, Math.min(178, Math.sqrt(inkWidth * 22 / .49) + 24));
        height = width;
      } else if (shape === 'cloud') {
        width = Math.max(116, Math.min(238, Math.sqrt(inkWidth * 22 * 1.7 / .378)));
        height = width / 1.7;
      } else {
        const contentWidth = Math.max(60, Math.min(206, Math.sqrt(inkWidth * 22 * 2.8)));
        // Measure wrapping, including long words, instead of sizing by character
        // count alone (a narrow English phrase and Chinese have different widths).
        let lines = 1, lineWidth = 0;
        for (const glyph of [...text]) {
          const advance = measure.measureText(glyph).width;
          if (lineWidth + advance > contentWidth) { lines++; lineWidth = 0; }
          lineWidth += advance;
        }
        width = Math.max(100, Math.min(246, Math.min(inkWidth, contentWidth) + 40));
        height = Math.max(50, lines * 22 + 24);
      }
      anchorLocalRef.current.style.setProperty('--bubble-width', `${Math.round(width)}px`);
      anchorLocalRef.current.style.setProperty('--bubble-aspect', `${width / height}`);
    };
    const fitText = () => {
      const box = textBoxRef.current;
      const paragraph = textRef.current;
      if (disposed || !box || !paragraph) return;
      // Fit actual glyphs (including wide Latin letters and Chinese) inside
      // the silhouette's safe area, without changing or truncating the text.
      let size = 16;
      paragraph.style.fontSize = `${size}px`;
      while (size > 8 && (paragraph.scrollHeight > box.clientHeight || paragraph.scrollWidth > box.clientWidth)) {
        size -= .5;
        paragraph.style.fontSize = `${size}px`;
      }
    };
    const observer = new ResizeObserver(fitText);
    if (bodyRef.current) observer.observe(bodyRef.current);
    sizeBubble();
    fitText();
    void document.fonts.ready.then(() => { sizeBubble(); fitText(); });
    return () => { disposed = true; observer.disconnect(); };
  }, [text, shape]);

  useLayoutEffect(() => {
    const anchor = anchorLocalRef.current;
    const body = bodyRef.current;
    if (!anchor || !body) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation: Animation | null = null;
    let frame = 0;
    let previousBounds = '';
    const updateFlight = () => {
      frame = 0;
      if (anchor.dataset.anchored !== 'true') return;
      const style = getComputedStyle(anchor);
      const rise = Number.parseFloat(style.getPropertyValue('--flight-rise')) || 40;
      const drift = Number.parseFloat(style.getPropertyValue('--flight-drift')) || 18;
      const bounds = `${rise}:${drift}:${reduced.matches}`;
      if (animation && bounds === previousBounds) return;
      previousBounds = bounds;
      const frames = balloonKeyframes(BUBBLE_RELEASE_DURATION_MS, rise, drift * windDirection.current, windPhase.current, reduced.matches);
      if (animation) (animation.effect as KeyframeEffect).setKeyframes(frames);
      else animation = body.animate(frames, { duration: BUBBLE_RELEASE_DURATION_MS, easing: 'linear', fill: 'both' });
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(updateFlight); };
    const observer = new MutationObserver(queue);
    observer.observe(anchor, { attributes: true, attributeFilter: ['data-anchored', 'style'] });
    reduced.addEventListener('change', queue);
    queue();
    return () => {
      observer.disconnect(); reduced.removeEventListener('change', queue);
      cancelAnimationFrame(frame); animation?.cancel();
    };
  }, []);

  return (
    <div
      ref={setAnchor}
      className="spirit-overhead-bubble released-message-bubble absolute top-0 left-0 z-30 pointer-events-none"
      data-release="true"
      data-shape={shape}
      role="status"
      style={{ visibility: 'hidden', '--bubble-width': '116px', '--bubble-aspect': shape === 'circle' ? '1' : '1.7' } as React.CSSProperties}
    >
      <div ref={bodyRef} className="released-bubble-body">
        <BubbleSilhouette shape={shape} className="released-bubble-silhouette" />
        <div ref={textBoxRef} className="released-bubble-text-box">
          <p ref={textRef} className="released-bubble-text">{text}</p>
        </div>
      </div>
    </div>
  );
}
