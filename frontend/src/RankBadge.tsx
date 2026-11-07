import React from 'react';
import type { Rank } from './api';
import { tf, useI18n } from './i18n';

/** A rank letter (C-S) in the shop's style: how far a charm or blessing goes
 *  and how much it asks, the way the buffs carry theirs. */
export const RankBadge: React.FC<{ rank: Rank; accent: string; className?: string }> = ({ rank, accent, className = '' }) => {
  const { t } = useI18n();
  return (
    <span
      className={`shrink-0 inline-block px-1 text-[9px] font-bold leading-4 text-zinc-950 ${className}`}
      style={{ background: accent }}
      title={tf(t.bitsClass, { r: rank })}
    >
      {rank}
    </span>
  );
};
