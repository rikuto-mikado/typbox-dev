import React, { useState } from 'react';
import type { BitsActiveBuff } from './api';
import { BITS_PER_HOUR } from './bits';
import { lookOf } from './buffArt';
import { BuffIcon } from './BuffIcon';
import { tf, useI18n } from './i18n';

// Header BITS button (the BITS diamond); opens the exchange (BitsShopModal). A gain (a log was just committed) floats a "+N" up
// out of the badge; drops (an edited or deleted log) just update the number.
// Only a change between two `ready` renders animates, so the initial log
// fetch (loading → loaded in one batched render) never floats a "+N".

// The BITS mark: a plain amber diamond, the same one beside the
// BITS // EXCHANGE title, used for the header button, balances and prices.
// Sized by className (it fills its box corner to corner).
export const BitShard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 10 10" aria-hidden className={`text-amber-400 ${className}`}>
    <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
  </svg>
);

interface BitsBadgeProps {
  balance: number;
  ready: boolean;
  borderCol: string;
  onOpen: () => void;
  /** The running buff, shown as a corner badge with a glow in its colour. */
  activeBuff?: Pick<BitsActiveBuff, 'item_id' | 'name' | 'expires_at'> | null;
}

export const BitsBadge: React.FC<BitsBadgeProps> = ({ balance, ready, borderCol, onOpen, activeBuff }) => {
  const { t } = useI18n();
  // Gain detection is derived during render (no effect), keyed so each
  // gain restarts the float animation.
  const [prev, setPrev] = useState({ balance, ready });
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  if (prev.balance !== balance || prev.ready !== ready) {
    setPrev({ balance, ready });
    if (ready && prev.ready && balance > prev.balance) {
      setGain({ n: balance - prev.balance, key: (gain?.key ?? 0) + 1 });
    }
  }

  const look = activeBuff ? lookOf(activeBuff.item_id) : null;
  const label =
    tf(t.bitsTitle, { n: balance.toLocaleString('en-US'), rate: BITS_PER_HOUR }) +
    (activeBuff ? ` · ${tf(t.bitsBadgeBuff, { name: activeBuff.name })}` : '');

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative h-9 w-9 lg:h-auto lg:w-auto lg:p-2 border ${
        look ? 'bits-badge-buff' : `${borderCol} hover:border-amber-500/60`
      } transition-colors flex items-center justify-center font-mono text-[11px] select-none cursor-pointer`}
      style={look ? { borderColor: look.accent, ['--buff-accent' as string]: look.accent } : undefined}
      title={label}
      aria-label={label}
    >
      {/* Icon only (a balance number would make the header jump around): the
          BITS diamond, sized to sit with the header's 16px line icons.
          Keyed so each gain restarts the pop. */}
      <span className="w-4 h-4 flex items-center justify-center">
        <BitShard key={`mark-${gain?.key ?? 0}`} className={`w-3 h-3 ${gain ? 'bits-shard-pop' : ''}`} />
      </span>
      {activeBuff && (
        <span
          className="absolute -right-1.5 -bottom-1.5 w-[18px] h-[18px] flex items-center justify-center bg-zinc-950 border pointer-events-none"
          style={{ borderColor: look?.accent }}
          aria-hidden
        >
          <BuffIcon itemId={activeBuff.item_id} className="w-4 h-4" />
        </span>
      )}
      {gain && (
        <span
          key={`gain-${gain.key}`}
          aria-hidden
          className="bits-gain absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none text-amber-400 font-bold text-[11px] tabular-nums whitespace-nowrap"
          onAnimationEnd={() => setGain(null)}
        >
          +{gain.n.toLocaleString('en-US')}
        </span>
      )}
    </button>
  );
};
