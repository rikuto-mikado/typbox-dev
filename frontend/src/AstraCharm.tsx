import React, { useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import type { CharmCard, CharmId, Starlight } from './api';
import { BitShard } from './BitsBadge';
import { Pixel } from './ChallengePanel';
import { tf, useI18n } from './i18n';
import { starCharmArt } from './starCharm';

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
      await onWear(worn ? null : starlight.charm ?? 'astra');
    } finally {
      setBusy(false);
    }
  };
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
        className={`shrink-0 sm:w-full px-3 py-1.5 border text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          worn
            ? 'border-slate-500 text-slate-300 hover:border-slate-300 cursor-pointer'
            : 'border-amber-400 bg-amber-400 text-zinc-950 hover:brightness-110 cursor-pointer'
        }`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : worn ? t.charmTakeOff : t.charmWear}
      </button>
    </div>
  );
};

/** The three charms: what each gathers on, what its insurance does, and
 *  buying or putting one on. */
export const CharmPicker: React.FC<{
  starlight: Starlight;
  balance: number;
  demo: boolean;
  onWear: (id: CharmId | null) => Promise<void>;
  onBuy: (id: CharmId) => Promise<void>;
  borderCol: string;
  textMuted: string;
}> = ({ starlight, balance, demo, onWear, onBuy, borderCol, textMuted }) => {
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
    if (!c.unlocked) {
      return (
        <button type="button" disabled className={`${off} flex items-center justify-center gap-1.5`}>
          <Lock className="w-3 h-3" />
          {tf(t.charmSealed, { n: fmt(c.hours) })}
        </button>
      );
    }
    if (!c.owned) {
      const short = balance < c.price;
      if (short || demo) {
        return (
          <button type="button" disabled className={off}>
            {short ? tf(t.bitsNeedMore, { n: fmt(c.price - balance) }) : t.charmBuy}
          </button>
        );
      }
      const isArmed = armed === c.id;
      return (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => (isArmed ? run(c.id, () => onBuy(c.id)) : setArmed(c.id))}
          onBlur={() => setArmed((a) => (a === c.id ? null : a))}
          className={`${base} cursor-pointer ${
            isArmed ? 'border-amber-400 bg-amber-400 text-zinc-950' : 'border-amber-400/70 text-amber-400 hover:bg-amber-400/10'
          }`}
        >
          {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : isArmed ? tf(t.charmBuyConfirm, { n: fmt(c.price) }) : t.charmBuy}
        </button>
      );
    }
    return (
      <button
        type="button"
        disabled={demo || busy !== null}
        onClick={() => run(c.id, () => onWear(c.worn ? null : c.id))}
        className={`${base} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          c.worn ? 'border-slate-500 text-slate-300 hover:border-slate-300' : 'border-amber-400/70 text-amber-400 hover:bg-amber-400/10'
        }`}
      >
        {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : c.worn ? t.charmTakeOff : t.charmWear}
      </button>
    );
  };
  return (
    <section className="space-y-1.5" aria-label={t.charmsTitle}>
      <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.charmsTitle}</div>
      <p className={`m-0 text-[10px] font-sans ${textMuted}`}>{tf(t.charmsHint, { h: state.attune_hours })}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  cost={c.guard}
                  guardOn={c.worn && c.attuned && c.stars >= c.guard}
                  dim={!c.worn}
                  className={`w-12 h-12 ${c.unlocked ? '' : 'brightness-0 invert opacity-[0.14]'}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold tracking-[0.2em]">{c.name}</span>
                  {c.worn ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">{t.charmWorn}</span>
                  ) : !c.owned && c.price > 0 ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold tabular-nums">
                      <BitShard className="w-2.5 h-2.5" />
                      {fmt(c.price)}
                    </span>
                  ) : null}
                </span>
                <span className={`block text-[9px] uppercase tracking-[0.14em] ${textMuted}`}>{c.title}</span>
                <span className="block mt-0.5 text-[10px] uppercase tracking-wider tabular-nums text-slate-300">
                  {tf(t.charmStars, { a: c.stars, b: c.max })}
                </span>
              </span>
            </div>
            <p className="m-0 text-[10px] font-sans leading-snug">{c.line}</p>
            <ul className={`m-0 p-0 list-none text-[10px] font-sans leading-snug ${textMuted}`}>
              <li>{tf(t.charmGuard, { n: c.guard })}</li>
              <li>
                {tf(t.charmShield, { n: c.shield.cost, h: c.shield.hours })}
                {c.shield.power > 1 ? tf(t.charmShieldPower, { p: c.shield.power }) : ''}
              </li>
            </ul>
            <div className="mt-auto">{button(c)}</div>
          </article>
        ))}
      </div>
      {error && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{error}</div>}
    </section>
  );
};
