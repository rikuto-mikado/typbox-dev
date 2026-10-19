/*
 * TYPBOX mark — Copyright (c) 2026 Rikuto Mikado / TYPBOX (typbox.me).
 * All rights reserved. The logo artwork is proprietary and is not covered by
 * the repository's software license; reuse of the mark requires permission.
 */
import React from 'react';

export interface TypboxLogoProps {
  className?: string;
  isDark?: boolean;
  isRunning?: boolean;
}

const TYPBOX_MARK_COPYRIGHT = '© 2026 Rikuto Mikado / TYPBOX (typbox.me). All rights reserved.';

const blockEvent = (e: React.SyntheticEvent) => e.preventDefault();

/**
 * TypboxLogo: SVG mark for TYPBOX, kept in sync with public/favicon.svg.
 * - Open square frame ("box") + vertical type caret ("typ") + status LED.
 * - Ink follows the app theme (warm white on dark, near-black on light);
 *   the favicon does the same via prefers-color-scheme.
 * - While a session is active the caret blinks and the LED glows emerald.
 *
 * Casual-copy deterrents (not DRM — anything rendered can be captured):
 * no context menu, no drag, no selection / iOS long-press callout, and the
 * SVG carries copyright <title>/<desc>/<metadata> plus an unpainted
 * watermark <text> that survives copying its markup.
 */
export const TypboxLogo: React.FC<TypboxLogoProps> = ({
  className = 'w-5 h-5',
  isDark = true,
  isRunning = false,
}) => {
  const ink = isDark ? '#F6F4F0' : '#0a0a0a';
  const led = isRunning ? '#10b981' : isDark ? '#34d399' : '#059669';

  return (
    <span
      className={`typbox-mark group inline-flex shrink-0 ${className}`}
      onContextMenu={blockEvent}
      onDragStart={blockEvent}
      draggable={false}
      data-copyright={TYPBOX_MARK_COPYRIGHT}
    >
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full pointer-events-none transition-transform duration-200 group-hover:scale-105"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="TYPBOX"
        focusable="false"
      >
        <title>TYPBOX</title>
        <desc>{`TYPBOX logo mark. ${TYPBOX_MARK_COPYRIGHT} Unauthorized use prohibited.`}</desc>
        <metadata>{TYPBOX_MARK_COPYRIGHT}</metadata>
        {/* Frame */}
        <path fill={ink} fillRule="evenodd" d="M2 2h28v28H2zM5.5 5.5v21h21v-21z" />
        {/* Type caret */}
        <rect
          x="10"
          y="10"
          width="4.5"
          height="12"
          fill={ink}
          className={isRunning ? 'animate-pulse' : undefined}
        />
        {/* Status LED */}
        <rect
          x="17.5"
          y="17.5"
          width="4.5"
          height="4.5"
          fill={led}
          style={isRunning ? { filter: 'drop-shadow(0 0 2px #10b981)' } : undefined}
        />
        {/* Invisible watermark: never painted, but present in the markup. */}
        <text x="0" y="31" fontSize="1" fillOpacity="0" visibility="hidden" aria-hidden="true">
          {`© 2026 TYPBOX // RIKUTO MIKADO // ALL RIGHTS RESERVED // typbox.me`}
        </text>
      </svg>
    </span>
  );
};

export default TypboxLogo;
