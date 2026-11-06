import React, { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import type { BlessingState } from './api';
import { BitShard, StudyTime } from './BitsBadge';
import { CHARM_ART } from './blessingArt';
import { Pixel } from './ChallengePanel';
import { tf, useI18n } from './i18n';

// BLESSINGS (backend tracker/blessings.py): permanent favours. The hours
// logged break each one's seal; BITS then buy it, once and for good. One is
// worn at a time beside any buff, and a blessing just put on works at part
// strength (ATTUNEMENT) until it has been worn for a few days.

// Still sealed: the charm's shape on its dark plate, and no more.
const SILHOUETTE = 'brightness-0 invert opacity-[0.14]';

const fmt = (n: number) => n.toLocaleString('en-US');

type Item = BlessingState['items'][number];

// Attunement grows 10 points a day worn (blessings.ATTUNE_PER_DAY).
const ATTUNE_PER_DAY = 10;

/** The worn blessing up top: its charm, its effect and how far it has attuned. */
const WornStrip: React.FC<{ blessings: BlessingState; borderCol: string; textMuted: string }> = ({ blessings, borderCol, textMuted }) => {
  const { t } = useI18n();
  const item = blessings.items.find((b) => b.id === blessings.worn);
  const pct = blessings.attunement ?? 100;
  const left = pct < 100 ? Math.ceil((100 - pct) / ATTUNE_PER_DAY) : null;
  return (
    <div className={`relative border p-3 flex items-center gap-3 ${item ? 'border-amber-400/60 bg-amber-400/5' : borderCol}`}>
      {item && <span className="blessing-halo pointer-events-none absolute inset-0" aria-hidden />}
      <span
        className={`shrink-0 w-16 h-16 flex items-center justify-center border ${item ? 'border-amber-400' : `border-dashed ${borderCol}`}`}
        style={item ? { background: 'radial-gradient(circle at 50% 55%, rgba(251,191,36,0.25), #09090b 70%)' } : undefined}
        aria-hidden
      >
        {item && CHARM_ART[item.id] && <Pixel art={CHARM_ART[item.id]} className="w-12 h-12 charm-float" />}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className={`text-[9px] uppercase tracking-[0.14em] ${textMuted}`}>{t.blessingNowWorn}</div>
        <div className={`text-sm font-bold tracking-[0.12em] truncate ${item ? 'text-amber-400' : textMuted}`}>{item?.name ?? t.blessingNone}</div>
        {item ? (
          <>
            <div className="text-[10px] font-bold truncate">{item.effect}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-amber-400/20" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t.blessingAttunement}>
                <div className="h-full bg-amber-400 transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <span className={`shrink-0 text-[9px] uppercase tracking-wider tabular-nums ${textMuted}`}>
                {tf(t.blessingAttuned, { n: pct })}
                {left != null && pct < 100 ? ` · ${tf(t.blessingFullIn, { n: left })}` : ''}
              </span>
            </div>
          </>
        ) : (
          <div className={`text-[10px] font-sans ${textMuted}`}>{t.blessingNoneHint}</div>
        )}
      </div>
      {blessings.earned > 0 && (
        <div className="hidden sm:block shrink-0 text-right">
          <div className={`text-[9px] uppercase tracking-wider ${textMuted}`}>{t.blessingEarned}</div>
          <div className="text-sm font-bold tabular-nums text-amber-400">+{fmt(blessings.earned)}</div>
        </div>
      )}
    </div>
  );
};

export const BlessingsPanel: React.FC<{
  blessings: BlessingState;
  balance: number;
  onWear: (id: string | null) => Promise<void>;
  onBuy: (id: string) => Promise<void>;
  demo: boolean;
  borderCol: string;
  textMuted: string;
}> = ({ blessings, balance, onWear, onBuy, demo, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A purchase asks twice: the first tap arms it.
  const [armed, setArmed] = useState<string | null>(null);
  const { hours, worn, items } = blessings;

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError((err as Error).message || t.blessingFailed);
    } finally {
      setBusy(null);
      setArmed(null);
    }
  };

  const button = (b: Item) => {
    const on = b.id === worn;
    const owned = b.owned ?? true;
    const spinning = busy === b.id;
    const base = 'w-full h-8 border text-[10px] font-bold uppercase tracking-wider transition-colors';
    const off = `${base} ${borderCol} ${textMuted} opacity-60 cursor-not-allowed`;
    if (!b.unlocked) {
      return (
        <button type="button" disabled className={`${off} flex items-center justify-center gap-1.5`}>
          <Lock className="w-3 h-3" />
          {t.blessingSealed}
        </button>
      );
    }
    if (!owned) {
      const short = balance < b.price;
      if (short || demo) {
        return (
          <button type="button" disabled className={off}>
            {short ? tf(t.bitsNeedMore, { n: fmt(b.price - balance) }) : t.blessingBuy}
          </button>
        );
      }
      const isArmed = armed === b.id;
      return (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => (isArmed ? run(b.id, () => onBuy(b.id)) : setArmed(b.id))}
          onBlur={() => setArmed((a) => (a === b.id ? null : a))}
          className={`${base} cursor-pointer ${
            isArmed ? 'border-amber-400 bg-amber-400 text-zinc-950 hover:brightness-110' : 'border-amber-400/70 text-amber-400 hover:bg-amber-400/10'
          }`}
        >
          {spinning ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : isArmed ? tf(t.blessingBuyConfirm, { n: fmt(b.price) }) : t.blessingBuy}
        </button>
      );
    }
    if (on) {
      return (
        <button
          type="button"
          disabled={demo || busy !== null}
          onClick={() => run('off', () => onWear(null))}
          className={`${base} border-amber-400 bg-amber-400 text-zinc-950 cursor-pointer hover:brightness-110 disabled:cursor-not-allowed`}
        >
          {busy === 'off' ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : t.blessingWearing}
        </button>
      );
    }
    return (
      <button
        type="button"
        disabled={demo || busy !== null}
        onClick={() => run(b.id, () => onWear(b.id))}
        className={`${base} ${demo ? off : 'border-amber-400/70 text-amber-400 cursor-pointer hover:bg-amber-400/10'}`}
      >
        {spinning ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : worn ? t.blessingSwitch : t.blessingWear}
      </button>
    );
  };

  return (
    <section className="space-y-2" aria-label={t.blessingsTitle}>
      <WornStrip blessings={blessings} borderCol={borderCol} textMuted={textMuted} />
      <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
        <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.blessingsTitle}</div>
        <div className={`text-[10px] uppercase tracking-wider tabular-nums ${textMuted}`}>{tf(t.blessingHoursLogged, { n: fmt(hours) })}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 gap-2">
        {items.map((b) => {
          const art = CHARM_ART[b.id];
          const on = b.id === worn;
          const owned = b.owned ?? true;
          const progress = Math.min(100, (hours / b.hours) * 100);
          return (
            <article
              key={b.id}
              className={`relative min-w-0 border p-3 flex flex-col gap-2 transition-colors ${
                on ? 'border-amber-400/70 bg-amber-400/5' : owned && b.unlocked ? 'border-amber-400/25' : borderCol
              }`}
            >
              {on && <span className="blessing-halo pointer-events-none absolute inset-0" aria-hidden />}
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`shrink-0 w-14 h-14 flex items-center justify-center border bg-zinc-950 ${on ? 'border-amber-400' : borderCol}`}
                  style={on ? { background: 'radial-gradient(circle at 50% 55%, rgba(251,191,36,0.22), #09090b 70%)' } : undefined}
                  aria-hidden
                >
                  {art && <Pixel art={art} className={`w-10 h-10 ${b.unlocked ? '' : SILHOUETTE} ${on ? 'charm-float' : ''}`} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold tracking-[0.12em] leading-tight break-words">{b.name}</span>
                    {owned ? (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-400">{t.blessingOwned}</span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 tabular-nums">
                        <BitShard className="w-2.5 h-2.5" />
                        <span className="text-[11px] font-bold">{fmt(b.price)}</span>
                        <StudyTime bits={b.price} className={textMuted} />
                      </span>
                    )}
                  </span>
                  <span className={`block mt-1 text-[10px] font-bold leading-snug ${b.unlocked ? 'text-amber-400' : textMuted}`}>{b.effect}</span>
                </span>
              </div>
              {b.detail && <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{b.detail}</p>}
              <div className="mt-auto space-y-1.5">
                {!b.unlocked && (
                  <>
                    <div className="h-1 bg-current/10" aria-hidden>
                      <div className="h-full bg-zinc-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className={`text-[9px] uppercase tracking-wider tabular-nums ${textMuted}`}>
                      {tf(t.blessingNeed, { a: fmt(Math.min(hours, b.hours)), b: fmt(b.hours) })}
                    </div>
                  </>
                )}
                {button(b)}
              </div>
            </article>
          );
        })}
      </div>
      {error && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{error}</div>}
      <p className={`text-[10px] font-sans ${textMuted}`}>{t.blessingHint}</p>
    </section>
  );
};
