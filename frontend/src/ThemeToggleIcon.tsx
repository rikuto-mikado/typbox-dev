import React, { useId } from 'react';

// Sun ⇄ moon icon for the header polarity toggle that morphs instead of
// swapping: the sun's core swells into a disc while a masked "shadow" disc
// slides in from the top-right to carve the crescent, and the rays spin
// and shrink away (reversed for moon → sun). Shows the polarity a click
// switches TO, like the old Sun / Moon pair. Motion lives in index.css
// (.theme-icon-*) and is dropped under prefers-reduced-motion.

// Eight rays around the core, from radius 8 to 10.5.
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => [12 + r * Math.cos(a), 12 + r * Math.sin(a)].map((v) => +v.toFixed(2));
  const [x1, y1] = p(8);
  const [x2, y2] = p(10.5);
  return { x1, y1, x2, y2 };
});

export const ThemeToggleIcon: React.FC<{ showSun: boolean; className?: string }> = ({ showSun, className = '' }) => {
  const maskId = `theme-icon-mask-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`theme-icon ${showSun ? 'is-sun' : 'is-moon'} ${className}`}
    >
      <mask id={maskId}>
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <circle className="theme-icon-shadow" cx="18" cy="7" r="6.5" fill="black" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <circle className="theme-icon-core" cx="12" cy="12" r="8" fill="currentColor" />
      </g>
      <g className="theme-icon-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {RAYS.map((r, i) => (
          <line key={i} {...r} />
        ))}
      </g>
    </svg>
  );
};
