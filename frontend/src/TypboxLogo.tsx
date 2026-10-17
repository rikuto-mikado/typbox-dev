import React from 'react';

export interface TypboxLogoProps {
  className?: string;
  isDark?: boolean;
  isRunning?: boolean;
}

/**
 * TypboxLogo: High-precision SVG vector emblem for TYPBOX
 * Based on concentric square design (Josef Albers / Bauhaus minimalist aesthetic).
 * - Matches icon_white.png in Dark Mode (Black outer, Warm White inner)
 * - Matches icon_black.png in Light Mode (Warm White outer, Black inner)
 * - Transitions inner square to pulsing emerald (#10b981) when a session is active.
 */
export const TypboxLogo: React.FC<TypboxLogoProps> = ({
  className = 'w-5 h-5',
  isRunning = false,
}) => {
  const outerFill = '#F6F4F0';
  const outerStroke = 'rgba(0, 0, 0, 0.14)';
  const innerFill = isRunning ? '#10b981' : '#000000';

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} shrink-0 transition-transform duration-200 hover:scale-105`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TYPBOX Logo"
    >
      {/* Outer Square */}
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        fill={outerFill}
        stroke={outerStroke}
        strokeWidth="2"
      />
      {/* Inner Square (68% size matching icon proportions) */}
      <rect
        x="16"
        y="16"
        width="68"
        height="68"
        fill={innerFill}
        className={isRunning ? 'animate-pulse' : undefined}
      />
    </svg>
  );
};

export default TypboxLogo;
