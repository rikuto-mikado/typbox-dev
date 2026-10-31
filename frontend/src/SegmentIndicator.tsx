import React, { useLayoutEffect, useRef, useState } from 'react';

// Sliding selection block for a segmented control (MANUAL / STOPWATCH,
// the analytics horizon selector, the cadence matrix toggles). The
// container is `relative`, the indicator is its first child (it measures
// through its own parentElement: a parent ref is still unset when a child's
// layout effect runs on mount), and the active button carries
// `data-seg-active="true"`: the block is measured onto that button
// (offsetLeft/Top, so a 2×2 mobile grid works too) and glides there when
// the selection changes. Buttons sit above it, so their borders and text
// paint over the block exactly as they did over their own background.
// The glide is enabled only after the first change, so page load and
// layout shifts before any click never animate. Motion is dropped under
// prefers-reduced-motion (see .seg-* in index.css).

interface SegmentIndicatorProps {
  activeKey: string;
  /** Background utility classes of the block (the old active-button background). */
  colorClass: string;
}

export const SegmentIndicator: React.FC<SegmentIndicatorProps> = ({ activeKey, colorClass }) => {
  const ref = useRef<HTMLSpanElement>(null);
  // Counts selection changes (state derived during render, not in an effect).
  const [prevKey, setPrevKey] = useState(activeKey);
  const [changes, setChanges] = useState(0);
  if (prevKey !== activeKey) {
    setPrevKey(activeKey);
    setChanges((n) => n + 1);
  }

  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!container || !el) return;
    const place = () => {
      const btn = container.querySelector<HTMLElement>('[data-seg-active="true"]');
      if (!btn) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = '1';
      el.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
      el.style.width = `${btn.offsetWidth}px`;
      el.style.height = `${btn.offsetHeight}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(container);
    return () => ro.disconnect();
  }, [activeKey]);

  return (
    <span
      ref={ref}
      aria-hidden
      className={`seg-indicator ${changes > 0 ? 'seg-indicator-glide' : ''} ${colorClass}`}
    />
  );
};
