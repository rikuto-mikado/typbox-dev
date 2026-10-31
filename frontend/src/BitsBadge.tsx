import React, { useState } from 'react';
import { BITS_PER_HOUR } from './bits';
import { tf, useI18n } from './i18n';

// Header BITS balance; opens the exchange (BitsShopModal). A gain (a log was just committed) floats a "+N" up
// out of the badge; drops (an edited or deleted log) just update the number.
// Only a change between two `ready` renders animates, so the initial log
// fetch (loading → loaded in one batched render) never floats a "+N".

// 7×7 pixel "bit" shard; 'h' is the highlight pixel.
const SHARD = ['...#...', '..###..', '.##h##.', '#######', '.#####.', '..###..', '...#...'];

export const BitShard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className={className}>
    {SHARD.flatMap((row, y) =>
      [...row].map((c, x) =>
        c === '.' ? null : (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className={c === 'h' ? 'fill-amber-100' : 'fill-amber-400'} />
        )
      )
    )}
  </svg>
);

interface BitsBadgeProps {
  balance: number;
  ready: boolean;
  borderCol: string;
  onOpen: () => void;
}

export const BitsBadge: React.FC<BitsBadgeProps> = ({ balance, ready, borderCol, onOpen }) => {
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

  const label = tf(t.bitsTitle, { n: balance.toLocaleString('en-US'), rate: BITS_PER_HOUR });

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative h-9 w-9 lg:h-auto lg:w-auto lg:p-2 border ${borderCol} hover:border-amber-500/60 transition-colors flex items-center justify-center font-mono text-[11px] select-none cursor-pointer`}
      title={label}
      aria-label={label}
    >
      {/* The header shows the shard alone at every width (sized like the
          theme toggle beside it); the balance is in the label and in the
          exchange it opens. Sibling keys must differ from the "+N" span's,
          or React keeps stale shards around. */}
      <BitShard key={`shard-${gain?.key ?? 0}`} className={`w-4 h-4 ${gain ? 'bits-shard-pop' : ''}`} />
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
