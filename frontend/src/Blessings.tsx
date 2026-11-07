import React, { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import type { BlessingState } from './api';
import { BitShard, StudyTime } from './BitsBadge';
import { CHARM_ART } from './blessingArt';
import { Pixel } from './ChallengePanel';
import { tf, useI18n } from './i18n';
import type { Dict } from './i18n.strings';
import { RankBadge } from './RankBadge';

// BLESSINGS (backend tracker/blessings.py): permanent favours. The hours
// logged break each one's seal; BITS then buy it, once and for good. One is
// worn at a time beside any buff, and a blessing just put on works at part
// strength (ATTUNEMENT) until it has been worn for a few days.

// Still sealed: the charm's shape on its dark plate, and no more.
const SILHOUETTE = 'brightness-0 invert opacity-[0.14]';

const fmt = (n: number) => n.toLocaleString('en-US');

// Each rank's colour, as on the buffs' cards.
const RANK_ACCENT = { C: '#a1a1aa', B: '#38bdf8', A: '#f59e0b', S: '#e879f9' } as const;

// How a blessing sits beside a buff or a charm (blessings.py AFFINITY).
const AFFINITY: Record<string, { label: keyof Dict; tone: string }> = {
  BUFFED: { label: 'blessingAffinityBuffed', tone: 'text-violet-300 border-violet-400/50' },
  UNBUFFED: { label: 'blessingAffinityUnbuffed', tone: 'text-sky-300 border-sky-400/50' },
  STARS: { label: 'blessingAffinityStars', tone: 'text-amber-200 border-amber-300/50' },
};

type Item = BlessingState['items'][number];

/** "3D 4H" / "5H": how long something still rests. */
const restLeft = (ms: number) => {
  const h = Math.max(0, Math.ceil(ms / 3_600_000));
  return h >= 24 ? `${Math.floor(h / 24)}D${h % 24 ? ` ${h % 24}H` : ''}` : `${h}H`;
};

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
  /** For the cooldowns' countdown. */
  now: number;
  onWear: (id: string | null) => Promise<void>;
  /** Unlocks one for good (its seal broken), paying once. */
  onUnlock: (id: string) => Promise<void>;
  demo: boolean;
  borderCol: string;
  textMuted: string;
}> = ({ blessings, balance, now, onWear, onUnlock, demo, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // WEAR pays, so it asks twice: the first tap arms it.
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
    const spinning = busy === b.id;
    const base = 'w-full h-8 border text-[10px] font-bold uppercase tracking-wider transition-colors';
    const off = `${base} ${borderCol} ${textMuted} opacity-60 cursor-not-allowed`;
    if (!(b.open ?? b.unlocked)) {
      return (
        <button type="button" disabled className={`${off} flex items-center justify-center gap-1.5`}>
          <Lock className="w-3 h-3" />
          {t.blessingSealed}
        </button>
      );
    }
    if (!b.unlocked) {
      // Open but locked: UNLOCK pays once, for good. Asks twice.
      const cost = b.unlock_price ?? 0;
      const key = `unlock:${b.id}`;
      if (balance < cost || demo) {
        return (
          <button type="button" disabled className={`${off} flex items-center justify-center gap-1.5`}>
            <Lock className="w-3 h-3" />
            {balance < cost ? tf(t.bitsNeedMore, { n: fmt(cost - balance) }) : tf(t.unlockFor, { n: fmt(cost) })}
          </button>
        );
      }
      const isArmed = armed === key;
      return (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => (isArmed ? run(key, () => onUnlock(b.id)) : setArmed(key))}
          onBlur={() => setArmed((a) => (a === key ? null : a))}
          className={`${base} flex items-center justify-center gap-1.5 cursor-pointer ${
            isArmed ? 'border-amber-400 bg-amber-400 text-zinc-950 hover:brightness-110' : 'border-amber-400/70 text-amber-400 hover:bg-amber-400/10'
          }`}
        >
          {busy === key ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Lock className="w-3 h-3" />
              {isArmed ? tf(t.unlockConfirm, { n: fmt(cost) }) : tf(t.unlockFor, { n: fmt(cost) })}
            </>
          )}
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
    const rests = b.cooling_until ? Date.parse(b.cooling_until) - now : 0;
    if (rests > 0) {
      return (
        <button type="button" disabled className={off}>
          {tf(t.bitsCooldownButton, { t: restLeft(rests) })}
        </button>
      );
    }
    const short = balance < b.price;
    if (short || demo) {
      return (
        <button type="button" disabled className={off}>
          {short ? tf(t.bitsNeedMore, { n: fmt(b.price - balance) }) : tf(t.wearFor, { n: fmt(b.price) })}
        </button>
      );
    }
    const isArmed = armed === b.id;
    return (
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => (isArmed ? run(b.id, () => onWear(b.id)) : setArmed(b.id))}
        onBlur={() => setArmed((a) => (a === b.id ? null : a))}
        className={`${base} cursor-pointer ${
          isArmed ? 'border-amber-400 bg-amber-400 text-zinc-950 hover:brightness-110' : 'border-amber-400/70 text-amber-400 hover:bg-amber-400/10'
        }`}
      >
        {spinning ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
        ) : isArmed ? (
          tf(t.blessingWearConfirm, { n: fmt(b.price) })
        ) : worn ? (
          tf(t.switchFor, { n: fmt(b.price) })
        ) : (
          tf(t.wearFor, { n: fmt(b.price) })
        )}
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
          const progress = Math.min(100, (hours / b.hours) * 100);
          const open = b.open ?? b.unlocked;
          return (
            <article
              key={b.id}
              className={`relative min-w-0 border p-3 flex flex-col gap-2 transition-colors ${
                on ? 'border-amber-400/70 bg-amber-400/5' : b.unlocked ? 'border-amber-400/25' : borderCol
              }`}
            >
              {on && <span className="blessing-halo pointer-events-none absolute inset-0" aria-hidden />}
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`shrink-0 w-14 h-14 flex items-center justify-center border bg-zinc-950 ${on ? 'border-amber-400' : borderCol}`}
                  style={on ? { background: 'radial-gradient(circle at 50% 55%, rgba(251,191,36,0.22), #09090b 70%)' } : undefined}
                  aria-hidden
                >
                  {art && (
                    <Pixel
                      art={art}
                      className={`w-10 h-10 ${!open ? SILHOUETTE : b.unlocked ? '' : 'opacity-45 grayscale'} ${on ? 'charm-float' : ''}`}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {b.rank && <RankBadge rank={b.rank} accent={RANK_ACCENT[b.rank]} />}
                      <span className="text-xs font-bold tracking-[0.12em] leading-tight break-words">{b.name}</span>
                    </span>
                    {b.unlocked ? (
                      <span className="shrink-0 flex items-center gap-1 tabular-nums" title={t.priceWearTitle}>
                        <span className={`text-[8px] uppercase tracking-wider ${textMuted}`}>{t.priceWear}</span>
                        <BitShard className="w-2.5 h-2.5" />
                        <span className="text-[11px] font-bold">{fmt(b.price)}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 tabular-nums" title={t.priceUnlockTitle}>
                        <Lock className={`w-2.5 h-2.5 ${textMuted}`} />
                        <BitShard className="w-2.5 h-2.5" />
                        <span className="text-[11px] font-bold">{fmt(b.unlock_price ?? b.price)}</span>
                        <StudyTime bits={b.unlock_price ?? b.price} className={textMuted} />
                      </span>
                    )}
                  </span>
                  <span className={`block mt-1 text-[10px] font-bold leading-snug ${b.unlocked ? 'text-amber-400' : textMuted}`}>{b.effect}</span>
                  {b.affinity && AFFINITY[b.affinity] && (
                    <span className={`inline-block mt-1 px-1 border text-[8px] font-bold uppercase tracking-wider ${AFFINITY[b.affinity].tone}`}>
                      {t[AFFINITY[b.affinity].label]}
                    </span>
                  )}
                </span>
              </div>
              {b.detail && <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{b.detail}</p>}
              {b.cooldown != null && (
                <p className={`m-0 text-[9px] uppercase tracking-wider ${textMuted}`}>
                  {!b.unlocked && `${tf(t.thenWearFor, { n: fmt(b.price) })} · `}
                  {tf(t.wearCooldownLine, { t: restLeft(b.cooldown * 3_600_000) })}
                </p>
              )}
              <div className="mt-auto space-y-1.5">
                {!open && (
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
