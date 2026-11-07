import React, { useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import type { CharmCard, CharmId, Rank, Starlight } from './api';
import { BitShard } from './BitsBadge';
import { Pixel } from './ChallengePanel';
import { tf, useI18n } from './i18n';
import { CHARM_ACCENT, starCharmArt } from './starCharm';
import { RankBadge } from './RankBadge';
import { wishName } from './wishText';

const fmt = (n: number) => n.toLocaleString('en-US');

const left = (ms: number) => {
  const h = Math.max(0, Math.ceil(ms / 3600000));
  return h >= 24 ? `${Math.floor(h / 24)}D ${h % 24}H` : `${h}H`;
};

/** A charm's medallion: its figure grown to `stars`, dimmed when it isn't worn. */
export const CharmIcon: React.FC<{
  charm: CharmId;
  stars: number;
  max: number;
  cost: number;
  guardOn: boolean;
  dim?: boolean;
  className?: string;
}> = ({ charm, stars, max, cost, guardOn, dim = false, className = 'w-8 h-8' }) => {
  const art = useMemo(() => starCharmArt(stars, max, cost, guardOn, charm), [stars, max, cost, guardOn, charm]);
  return <Pixel art={art} className={`${className} ${dim ? 'opacity-40 grayscale-[60%]' : ''}`} />;
};

/** The STARLIGHT slot's icon: the worn charm (or the last one worn, dimmed). */
export const AstraIcon: React.FC<{ starlight: Starlight; className?: string }> = ({ starlight, className = 'w-8 h-8' }) => (
  <CharmIcon
    charm={starlight.charm ?? 'astra'}
    stars={starlight.stars}
    max={starlight.max}
    cost={starlight.cost}
    guardOn={starlight.guard_on}
    dim={starlight.worn === false}
    className={className}
  />
);

/** Where the worn charm's insurance stands: not worn, settling in, or ready. */
const useStatus = (starlight: Starlight, now: number) => {
  const { t } = useI18n();
  const card = starlight.charms?.charms.find((c) => c.id === starlight.charm);
  if (starlight.worn === false) return { text: t.charmNotWorn, tone: 'text-slate-500' };
  if (starlight.attuned === false && card?.attuned_at) {
    return { text: tf(t.charmSettling, { t: left(new Date(card.attuned_at).getTime() - now) }), tone: 'text-sky-300' };
  }
  return { text: t.charmReady, tone: 'text-emerald-300' };
};

/** The worn charm beside the night sky: the medallion, its name, what comes
 *  next, and the button that puts it on or takes it off. */
export const AstraCharm: React.FC<{
  starlight: Starlight;
  now: number;
  demo: boolean;
  onWear: (id: CharmId | null) => Promise<void>;
  borderCol: string;
  textMuted: string;
}> = ({ starlight, now, demo, onWear, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const { stars, max, cost, guard_on: guardOn } = starlight;
  const card = starlight.charms?.charms.find((c) => c.id === starlight.charm);
  const worn = starlight.worn !== false;
  const status = useStatus(starlight, now);
  const next =
    stars >= max ? t.astraFull : stars < cost ? tf(t.astraNextStuds, { n: cost - stars }) : tf(t.astraNextFull, { n: max - stars });
  const toggle = async () => {
    setBusy(true);
    try {
      await onWear(null);
    } finally {
      setBusy(false);
    }
  };
  if (!worn) {
    // Nothing on: the same frame, an empty socket, and where to find one.
    return (
      <div className={`border ${borderCol} bg-[#060816] p-3 flex sm:flex-col items-center gap-3 sm:gap-2 sm:justify-between sm:h-full sm:min-h-0 overflow-hidden text-center`}>
        <span className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center border border-dashed border-slate-500/50 rounded-full" aria-hidden>
          <span className="w-2 h-2 rounded-full bg-slate-500/50" />
        </span>
        <span className="min-w-0 flex-1 sm:flex-none text-left sm:text-center">
          <span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">{t.blessingNowWorn}</span>
          <span className="block text-xs font-bold tracking-[0.3em] text-slate-400">{t.blessingNone}</span>
          <span className={`block mt-1.5 text-[9px] leading-[1.35] uppercase tracking-wider min-h-[2.7em] ${textMuted}`}>{t.charmNoneHint}</span>
        </span>
        <span className={`shrink-0 sm:w-full px-3 py-1.5 border border-dashed ${borderCol} text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>
          {t.charmNotWornShort}
        </span>
      </div>
    );
  }
  return (
    // A fixed frame on sm and up (the row is 264px): every line keeps its
    // room whatever it says, so WEAR / TAKE OFF never changes the height.
    <div className={`border ${borderCol} bg-[#060816] p-3 flex sm:flex-col items-center gap-3 sm:gap-2 sm:justify-between sm:h-full sm:min-h-0 overflow-hidden text-center`}>
      <span className="shrink-0 relative">
        <AstraIcon starlight={starlight} className={`w-20 h-20 sm:w-24 sm:h-24 ${worn ? 'charm-float' : ''}`} />
      </span>
      <span className="min-w-0 flex-1 sm:flex-none text-left sm:text-center">
        <span className="block text-xs font-bold tracking-[0.3em] text-slate-100">{card?.name ?? t.astraName}</span>
        <span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">{card?.title ?? t.astraTitle}</span>
        <span className={`block mt-1.5 text-[10px] uppercase tracking-wider tabular-nums ${guardOn ? 'text-amber-300' : 'text-slate-300'}`}>
          {tf(t.nowStarsLine, { a: stars, b: max })}
        </span>
        <span className={`block text-[9px] uppercase tracking-wider truncate ${textMuted}`}>{next}</span>
        <span className={`block mt-1 text-[9px] leading-[1.35] uppercase tracking-wider min-h-[2.7em] ${status.tone}`}>{status.text}</span>
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={demo || busy}
        className="shrink-0 sm:w-full px-3 py-1.5 border text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-slate-500 text-slate-300 hover:border-slate-300 cursor-pointer"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : t.charmTakeOff}
      </button>
    </div>
  );
};

/** The charms: what each gathers on, what its insurance does, its wishes,
 *  and buying or putting one on. */
export const CharmPicker: React.FC<{
  starlight: Starlight;
  balance: number;
  /** For the cooldowns' countdown. */
  now: number;
  demo: boolean;
  onWear: (id: CharmId | null) => Promise<void>;
  /** Unlocks one for good (its hours in), paying once. */
  onUnlock: (id: CharmId) => Promise<void>;
  borderCol: string;
  textMuted: string;
}> = ({ starlight, balance, now, demo, onWear, onUnlock, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = starlight.charms;
  if (!state) return null;
  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError((err as Error).message || t.charmFailed);
    } finally {
      setBusy(null);
      setArmed(null);
    }
  };
  const button = (c: CharmCard) => {
    const base = 'w-full h-8 border text-[10px] font-bold uppercase tracking-wider transition-colors';
    const off = `${base} ${borderCol} ${textMuted} opacity-60 cursor-not-allowed`;
    if (!(c.open ?? c.unlocked)) {
      return (
        <button type="button" disabled className={`${off} flex items-center justify-center gap-1.5`}>
          <Lock className="w-3 h-3" />
          {tf(t.charmSealed, { n: fmt(c.hours) })}
        </button>
      );
    }
    if (!c.unlocked) {
      // Open but locked: UNLOCK pays once, for good. Asks twice.
      const cost = c.unlock_price ?? 0;
      const key = `unlock:${c.id}`;
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
          onClick={() => (isArmed ? run(key, () => onUnlock(c.id)) : setArmed(key))}
          onBlur={() => setArmed((a) => (a === key ? null : a))}
          className={`${base} flex items-center justify-center gap-1.5 cursor-pointer ${
            isArmed ? 'border-amber-400 bg-amber-400 text-zinc-950' : 'border-amber-400/70 text-amber-400 hover:bg-amber-400/10'
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
    if (c.worn) {
      return (
        <button
          type="button"
          disabled={demo || busy !== null}
          onClick={() => run(c.id, () => onWear(null))}
          className={`${base} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border-slate-500 text-slate-300 hover:border-slate-300`}
        >
          {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : t.charmTakeOff}
        </button>
      );
    }
    const rests = c.cooling_until ? Date.parse(c.cooling_until) - now : 0;
    if (rests > 0) {
      return (
        <button type="button" disabled className={off}>
          {tf(t.bitsCooldownButton, { t: left(rests) })}
        </button>
      );
    }
    const short = balance < c.price;
    if (short || demo) {
      return (
        <button type="button" disabled className={off}>
          {short ? tf(t.bitsNeedMore, { n: fmt(c.price - balance) }) : tf(t.wearFor, { n: fmt(c.price) })}
        </button>
      );
    }
    const isArmed = armed === c.id;
    return (
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => (isArmed ? run(c.id, () => onWear(c.id)) : setArmed(c.id))}
        onBlur={() => setArmed((a) => (a === c.id ? null : a))}
        className={`${base} cursor-pointer ${
          isArmed ? 'border-amber-400 bg-amber-400 text-zinc-950' : 'border-amber-400/70 text-amber-400 hover:bg-amber-400/10'
        }`}
      >
        {busy === c.id ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
        ) : isArmed ? (
          tf(t.charmWearConfirm, { n: fmt(c.price) })
        ) : state.worn ? (
          tf(t.switchFor, { n: fmt(c.price) })
        ) : (
          tf(t.wearFor, { n: fmt(c.price) })
        )}
      </button>
    );
  };
  return (
    <section className="space-y-1.5" aria-label={t.charmsTitle}>
      <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.charmsTitle}</div>
      <p className={`m-0 text-[10px] font-sans ${textMuted}`}>{tf(t.charmsHint, { h: state.attune_hours })}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 @4xl:grid-cols-3 gap-2">
        {state.charms.map((c) => (
          <article
            key={c.id}
            className={`min-w-0 p-3 border flex flex-col gap-2 ${c.worn ? 'border-amber-400/70 bg-amber-400/5' : borderCol}`}
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-14 h-14 flex items-center justify-center bg-[#060816]">
                <CharmIcon
                  charm={c.id}
                  stars={c.stars}
                  max={c.max}
                  cost={c.guard ?? c.max + 1}
                  guardOn={c.guard != null && c.worn && c.attuned && c.stars >= c.guard}
                  dim={!c.worn}
                  className={`w-12 h-12 ${!(c.open ?? c.unlocked) ? 'brightness-0 invert opacity-[0.14]' : ''}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {c.rank && <RankBadge rank={c.rank as Rank} accent={CHARM_ACCENT[c.id]} />}
                    <span className="text-xs font-bold tracking-[0.2em] truncate">{c.name}</span>
                  </span>
                  {c.worn ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">{t.charmWorn}</span>
                  ) : c.unlocked ? (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold tabular-nums" title={t.priceWearTitle}>
                      <span className={`text-[8px] font-normal uppercase tracking-wider ${textMuted}`}>{t.priceWear}</span>
                      <BitShard className="w-2.5 h-2.5" />
                      {fmt(c.price)}
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold tabular-nums" title={t.priceUnlockTitle}>
                      <Lock className={`w-2.5 h-2.5 ${textMuted}`} />
                      <BitShard className="w-2.5 h-2.5" />
                      {fmt(c.unlock_price ?? c.price)}
                    </span>
                  )}
                </span>
                <span className={`block text-[9px] uppercase tracking-[0.14em] ${textMuted}`}>
                  {c.title}
                  {c.role && (
                    <span className="ml-1.5 font-bold" style={{ color: CHARM_ACCENT[c.id] }}>
                      · {c.role}
                    </span>
                  )}
                </span>
                <span className="block mt-0.5 text-[10px] uppercase tracking-wider tabular-nums text-slate-300">
                  {tf(t.charmStars, { a: c.stars, b: c.max })}
                </span>
              </span>
            </div>
            <p className="m-0 text-[10px] font-sans leading-snug">{c.line}</p>
            <ul className={`m-0 p-0 list-none text-[10px] font-sans leading-snug ${textMuted}`}>
              <li>{c.guard != null ? tf(t.charmGuard, { n: c.guard }) : t.charmNoGuard}</li>
              <li>
                {c.shield ? (
                  <>
                    {tf(t.charmShield, { n: c.shield.cost, h: c.shield.hours })}
                    {c.shield.power > 1 ? tf(t.charmShieldPower, { p: c.shield.power }) : ''}
                  </>
                ) : (
                  t.charmNoShield
                )}
              </li>
              {c.cooldown != null && (
                <li>
                  {!c.unlocked && `${tf(t.thenWearFor, { n: fmt(c.price) })} · `}
                  {tf(t.wearCooldownLine, { t: left(c.cooldown * 3_600_000) })}
                </li>
              )}
              {(c.hit ?? 1) > 1 && (
                <li className="font-bold" style={{ color: CHARM_ACCENT[c.id] }}>
                  {tf(t.charmHunt, { n: Math.round(((c.hit ?? 1) - 1) * 100) })}
                </li>
              )}
            </ul>
            {c.wishes && c.wishes.length > 0 && (
              <div className="flex flex-wrap gap-1" aria-label={t.starWishes}>
                {c.wishes.map((w) => (
                  <span key={w.id} className={`px-1 py-0.5 border ${borderCol} text-[8px] uppercase tracking-wider tabular-nums`}>
                    {wishName(t, w.id)} <span className="text-amber-300">{w.cost}★</span>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto">{button(c)}</div>
          </article>
        ))}
      </div>
      {error && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{error}</div>}
    </section>
  );
};
