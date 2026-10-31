import React, { useEffect, useRef, useState } from 'react';
import { Check, Home, Loader2, Zap } from 'lucide-react';
import { api, type BitsActiveBuff, type BitsBuff, type BitsShopState, type RoomState } from './api';
import { BITS_PER_HOUR } from './bits';
import { BitShard, StudyTime } from './BitsBadge';
import { lookOf } from './buffArt';
import { BuffIcon } from './BuffIcon';
import { tf, useI18n } from './i18n';
import { thumbnail, TIER_LABEL, type FurnitureSpec } from './roomRender';

// BITS // EXCHANGE, opened from the header balance (or MY ROOM): buffs and
// the weekly furniture lineup. Catalogs, prices, the running buff and the
// lineup come from the server (economy.py / furniture.py); one buff runs at
// a time. BUY takes two taps (arm, then confirm) so a stray tap never spends.
// Each buff has a pixel icon and an accent colour (buffArt.ts).

const CONFIRM_WINDOW_MS = 3000;
const SPLASH_MS = 1700;
/** How long a MYSTERY CRATE rattles before it shows what it held. */
const CRATE_SHAKE_MS = 1000;
const BAR_CELLS = 20;

export type ShopTab = 'buffs' | 'furniture';

interface BitsShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Live balance (follows the logs instantly, like the header badge). */
  balance: number;
  /** Server state after a purchase, so the caller can sync `spent`. */
  onPurchased: (state: BitsShopState) => void;
  initialTab: ShopTab;
  onOpenRoom: () => void;
  isDark: boolean;
  borderCol: string;
  bgCard: string;
  textMuted: string;
  /** In-progress categories, for CATEGORY LOCK. */
  categories: Array<{ id: string | number; code: string; name: string; color: string }>;
}

type Splash =
  | { kind: 'buff'; itemId: string; name: string; crate?: boolean }
  | { kind: 'piece'; spec: FurnitureSpec };

const formatLeft = (ms: number): string => {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 48) return `${Math.floor(h / 24)}D ${h % 24}H`;
  return h > 0 ? `${h}H ${String(m).padStart(2, '0')}M` : `${m}M`;
};

const fmt = (n: number) => n.toLocaleString('en-US');

/** Retro segmented meter: BAR_CELLS blocks, the filled ones in the accent. */
const CellBar: React.FC<{ pct: number; accent: string; borderCol: string }> = ({ pct, accent, borderCol }) => {
  const lit = Math.ceil((Math.max(0, Math.min(100, pct)) / 100) * BAR_CELLS);
  return (
    <div className={`flex gap-0.5 p-0.5 border ${borderCol}`} aria-hidden>
      {Array.from({ length: BAR_CELLS }, (_, i) => (
        <span
          key={i}
          className="h-2 flex-1 transition-colors duration-500"
          style={{ background: i < lit ? accent : 'rgba(127, 127, 127, 0.15)' }}
        />
      ))}
    </div>
  );
};

const ActiveBuffCard: React.FC<{
  buff: BitsActiveBuff;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
  /** Cancels the buff (two taps: arm, then confirm, like BUY). */
  onCancel: () => Promise<void>;
}> = ({ buff, isDark, borderCol, textMuted, onCancel }) => {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => window.clearTimeout(id);
  }, [armed]);
  const refund = buff.refund ?? 0;
  const handleCancel = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setCancelling(true);
    try {
      await onCancel();
    } finally {
      setCancelling(false);
    }
  };
  // Ticks the countdown; read in an effect-driven state, not during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const look = lookOf(buff.item_id);
  const ink = isDark ? look.accent : look.ink;
  const byMinutes = buff.total_minutes !== null && buff.remaining_minutes !== null;
  const total = byMinutes ? buff.total_minutes! : buff.total_uses ?? 1;
  const left = byMinutes ? buff.remaining_minutes! : buff.remaining_uses ?? 0;
  const pct = (left / total) * 100;
  return (
    <div
      className="p-3 border flex flex-col gap-2.5"
      style={{ borderColor: look.accent, background: look.tint, ['--buff-accent' as string]: look.accent }}
    >
      <div className="flex gap-3 items-center">
      <div className="buff-live-ring shrink-0 w-14 h-14 flex items-center justify-center" style={{ background: look.tint }}>
        <BuffIcon itemId={buff.item_id} className="w-10 h-10" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <span className="flex items-center gap-1.5 font-bold tracking-wider" style={{ color: ink }}>
            <Zap className="w-3.5 h-3.5" />
            {buff.name}
          </span>
          <span className={`text-[10px] tabular-nums ${textMuted}`}>
            {tf(t.bitsExpiresIn, { t: formatLeft(new Date(buff.expires_at).getTime() - now) })}
          </span>
        </div>
        <CellBar pct={pct} accent={look.accent} borderCol={borderCol} />
        {(buff.category || buff.via) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-wider">
            {buff.category && (
              <span className={`flex items-center gap-1 px-1.5 py-0.5 border ${borderCol}`}>
                <span className={textMuted}>{t.bitsLockedTo}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: buff.category.color }} />
                <span className="font-bold">[{buff.category.code}]</span>
              </span>
            )}
            {buff.via && (
              <span className={`flex items-center gap-1 px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
                <BuffIcon itemId={buff.via} className="w-3 h-3" />
                {t.bitsFromCrate}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <span className={`tabular-nums ${textMuted}`}>
            {byMinutes ? tf(t.bitsMinutesLeft, { a: left, b: total }) : tf(t.bitsUsesLeft, { a: left, b: total })}
          </span>
          <span className="font-bold tabular-nums" style={{ color: ink }}>
            {tf(t.bitsBonusEarned, { n: fmt(buff.bonus_earned) })}
          </span>
        </div>
      </div>
      </div>
      {buff.refund !== undefined && (
        <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t ${borderCol}`}>
          <span className={`text-[9px] font-sans leading-relaxed max-w-[44ch] ${textMuted}`}>
            {tf(t.bitsCancelHint, { n: fmt(refund) })}
          </span>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className={`shrink-0 px-2.5 py-1 border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 ${
              armed ? 'border-rose-500 bg-rose-500 text-zinc-950' : 'border-rose-500/50 text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            {cancelling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
            ) : armed ? (
              tf(t.bitsCancelConfirm, { n: fmt(refund) })
            ) : (
              t.bitsCancelBuff
            )}
          </button>
        </div>
      )}
    </div>
  );
};

/** LASTS / COVERS / BEST CASE chips; empty against an older server. */
const buffStats = (buff: BitsBuff, t: ReturnType<typeof useI18n>['t']): Array<[string, string]> => {
  if (buff.expires === undefined || buff.odds) return [];
  const lasts = buff.expires === 'weekend' ? t.bitsStatWeekend : tf(t.bitsStatHours, { n: buff.hours ?? 0 });
  const covers = buff.minutes
    ? tf(t.bitsStatHours, { n: Math.round(buff.minutes / 60) })
    : tf(t.bitsStatLogs, { n: buff.uses ?? 0 });
  const best = buff.max_bonus ? `+${fmt(buff.max_bonus)}` : t.bitsStatLuck;
  return [
    [t.bitsStatLasts, lasts],
    [t.bitsStatCovers, covers],
    [t.bitsStatBest, best],
  ];
};

export const BitsShopModal: React.FC<BitsShopModalProps> = ({
  isOpen,
  onClose,
  balance,
  onPurchased,
  initialTab,
  onOpenRoom,
  isDark,
  borderCol,
  bgCard,
  textMuted,
  categories,
}) => {
  const { t } = useI18n();
  const [tab, setTab] = useState<ShopTab>(initialTab);
  const [state, setState] = useState<BitsShopState | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Each opening starts on the tab the caller asked for (derived during
  // render rather than in an effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) setTab(initialTab);
  }
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [splash, setSplash] = useState<Splash | null>(null);
  const [crateOpen, setCrateOpen] = useState(false);
  const [lockCategory, setLockCategory] = useState<string>('');
  const armTimer = useRef<number | null>(null);
  const splashTimers = useRef<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.room
      .get()
      .then((r) => {
        if (cancelled) return;
        setRoom(r);
        setNow(Date.now());
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message || t.bitsLoadFailed));
    api.bits
      .get()
      .then((s) => {
        if (!cancelled) {
          setState(s);
          setLoadError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || t.bitsLoadFailed);
      });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose, t.bitsLoadFailed]);

  useEffect(
    () => () => {
      if (armTimer.current !== null) window.clearTimeout(armTimer.current);
      splashTimers.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  if (!isOpen) return null;

  const busy = Boolean(state?.active_buff);
  const furnitureById = new Map((room?.catalog ?? []).map((f) => [f.id, f]));

  // The chosen CATEGORY LOCK target, falling back to the first category
  // (derived, so a deleted pick never lingers).
  const lockTarget = categories.find((c) => String(c.id) === lockCategory) ?? categories[0];

  const showSplash = (next: Splash, sticky: boolean) => {
    splashTimers.current.forEach((id) => window.clearTimeout(id));
    splashTimers.current = [];
    setSplash(next);
    const crate = next.kind === 'buff' && next.crate;
    setCrateOpen(!crate);
    if (crate) splashTimers.current.push(window.setTimeout(() => setCrateOpen(true), CRATE_SHAKE_MS));
    // A new piece waits for PLACE IT / a tap; a buff splash fades by itself.
    if (!sticky) {
      splashTimers.current.push(
        window.setTimeout(() => setSplash(null), SPLASH_MS + (crate ? CRATE_SHAKE_MS : 0))
      );
    }
  };
  const closeSplash = () => {
    splashTimers.current.forEach((id) => window.clearTimeout(id));
    splashTimers.current = [];
    setSplash(null);
  };

  const handleCancelBuff = async () => {
    setBuyError(null);
    try {
      const next = await api.bits.cancel();
      setState(next);
      onPurchased(next);
      setCancelNotice(tf(t.bitsCancelled, { n: fmt(next.refunded) }));
    } catch (err: unknown) {
      setBuyError((err as Error).message || t.bitsCancelFailed);
    }
  };

  const handleBuy = async (itemId: string) => {
    setCancelNotice(null);
    if (armed !== itemId) {
      setArmed(itemId);
      setBuyError(null);
      if (armTimer.current !== null) window.clearTimeout(armTimer.current);
      armTimer.current = window.setTimeout(() => setArmed(null), CONFIRM_WINDOW_MS);
      return;
    }
    setArmed(null);
    setBuying(itemId);
    try {
      const offer = state?.buffs.find((b) => b.item_id === itemId);
      const next = await api.bits.buy(itemId, offer?.needs_category ? lockTarget?.id : undefined);
      setState(next);
      onPurchased(next);
      const piece = furnitureById.get(itemId);
      if (piece) {
        setRoom(await api.room.get());
        showSplash({ kind: 'piece', spec: piece }, true);
      } else {
        // A crate starts the buff it rolled: show that one.
        const running = next.active_buff;
        showSplash(
          {
            kind: 'buff',
            itemId: running?.item_id ?? itemId,
            name: running?.name ?? offer?.name ?? itemId,
            crate: Boolean(offer?.odds),
          },
          false
        );
      }
    } catch (err: unknown) {
      setBuyError((err as Error).message || t.bitsBuyFailed);
    } finally {
      setBuying(null);
    }
  };

  const buyButton = (itemId: string, price: number, blockedLabel: string | null, accent = '#fbbf24') => {
    const short = balance < price;
    const isArmed = armed === itemId;
    const disabled = Boolean(blockedLabel) || short || buying !== null;
    return (
      <button
        type="button"
        onClick={() => handleBuy(itemId)}
        disabled={disabled}
        className={`mt-auto py-1.5 border text-[10px] font-bold uppercase tracking-wider transition-colors ${
          disabled ? `${borderCol} ${textMuted} opacity-50 cursor-not-allowed` : 'cursor-pointer hover:brightness-110'
        }`}
        style={
          disabled
            ? undefined
            : isArmed
            ? { borderColor: accent, background: accent, color: '#09090b' }
            : { borderColor: accent, color: isDark ? accent : undefined }
        }
      >
        {buying === itemId ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
        ) : blockedLabel ? (
          blockedLabel
        ) : short ? (
          tf(t.bitsNeedMore, { n: fmt(price - balance) })
        ) : isArmed ? (
          tf(t.bitsConfirm, { n: fmt(price) })
        ) : (
          t.bitsBuy
        )}
      </button>
    );
  };

  const splashAccent = splash?.kind === 'buff' ? lookOf(splash.itemId).accent : '#10b981';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.bitsShopTitle}
        className={`relative overflow-hidden w-full max-w-2xl border ${borderCol} ${bgCard} p-3.5 sm:p-6 shadow-2xl h-[88vh] sm:h-175 max-h-[94vh] sm:max-h-[90vh] flex flex-col font-mono text-xs`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b ${borderCol} pb-3.5 shrink-0`}>
          <h3 className="flex items-center gap-2.5 text-xs uppercase tracking-widest font-semibold">
            <BitShard className="w-3 h-3" />
            {t.bitsShopTitle}
          </h3>
          <button type="button" onClick={onClose} className="text-xs hover:underline cursor-pointer whitespace-nowrap shrink-0">
            {t.closeBracket}
          </button>
        </div>

        {/* Fixed height: the balance and tabs stay put and only the tab body
            scrolls, so switching tabs never resizes the dialog. */}
        <div className="shrink-0 mt-3.5 space-y-4">
          {/* Balance */}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-center gap-3">
              <BitShard className="w-6 h-6" />
              <div>
                <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.bitsBalance}</div>
                <div className="text-2xl font-bold tabular-nums leading-tight">
                  {fmt(balance)} <span className="text-sm text-amber-400">BITS</span>
                </div>
              </div>
            </div>
            <div className={`text-[10px] ${textMuted}`}>{tf(t.bitsRate, { n: BITS_PER_HOUR })}</div>
          </div>

          <div className={`grid grid-cols-2 border-l border-t ${borderCol} text-[10px] uppercase tracking-wider`} role="tablist">
            {(
              [
                ['buffs', t.bitsTabBuffs],
                ['furniture', t.bitsTabFurniture],
              ] as Array<[ShopTab, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-2.5 py-1.5 border-r border-b ${borderCol} cursor-pointer transition-colors ${
                  tab === id ? 'bg-amber-500/10 text-amber-400 font-bold' : `${textMuted} hover:text-amber-400`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto mt-4 space-y-4 pr-1">
          {tab === 'furniture' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-amber-400">
                  {room ? tf(t.bitsWeeklyResets, { t: formatLeft(new Date(room.weekly.resets_at).getTime() - now) }) : ''}
                </span>
                <button
                  type="button"
                  onClick={onOpenRoom}
                  className={`px-2.5 py-1 border ${borderCol} text-[10px] uppercase tracking-wider flex items-center gap-1.5 hover:text-emerald-400 hover:border-emerald-500/60 cursor-pointer`}
                >
                  <Home className="w-3.5 h-3.5" />
                  {t.bitsOpenRoom}
                </button>
              </div>
              {!room && !loadError && (
                <div className={`p-6 flex justify-center ${textMuted}`}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
              {room && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {room.weekly.items.map((id) => {
                    const spec = furnitureById.get(id);
                    if (!spec) return null;
                    const owned = room.inventory[id] ?? 0;
                    const featured = spec.tier === 4;
                    // Integer zoom keeps the sprite's pixels square.
                    const zoom = Math.max(1, Math.min(4, Math.floor(72 / (Math.max(spec.w, spec.h) * 8))));
                    return (
                      <div
                        key={id}
                        className={`relative p-2 border flex flex-col gap-1.5 ${
                          featured ? 'border-amber-500/70 shop-featured' : borderCol
                        }`}
                      >
                        {/* A little stage: back wall, floor line, the piece standing on it. */}
                        <div
                          className={`relative h-24 flex items-end justify-center border ${borderCol} overflow-hidden`}
                          style={{
                            background: isDark
                              ? 'linear-gradient(#232327 0 72%, #1a1a1d 72%)'
                              : 'linear-gradient(#f4f4f5 0 72%, #e4e4e7 72%)',
                          }}
                        >
                          <img
                            src={thumbnail(spec)}
                            alt=""
                            className={`relative mb-[7%] ${owned > 0 ? 'opacity-45' : ''}`}
                            style={{ imageRendering: 'pixelated', width: spec.w * 8 * zoom, height: spec.h * 8 * zoom }}
                          />
                          {owned > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-bold -rotate-6">
                              <Check className="w-3 h-3" />
                              {t.bitsOwned}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold truncate">{spec.name}</div>
                          <div className={`text-[9px] ${featured ? 'text-amber-400 font-bold' : textMuted}`}>
                            {TIER_LABEL[spec.tier]} · {spec.w}×{spec.h}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-1 tabular-nums text-[11px]">
                          <span className="flex items-center gap-1 font-bold self-center">
                            <BitShard className="w-2.5 h-2.5" />
                            {fmt(spec.price)}
                          </span>
                          <StudyTime bits={spec.price} className={textMuted} />
                        </div>
                        {/* One of each piece: owned ones can't be bought again. */}
                        {buyButton(id, spec.price, owned > 0 ? t.bitsSoldOut : null)}
                      </div>
                    );
                  })}
                </div>
              )}
              {buyError && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{buyError}</div>}
              <p className={`text-[10px] font-sans ${textMuted}`}>{t.bitsWeeklyHint}</p>
            </div>
          )}

          {tab === 'buffs' && (
            <>
              {/* Running buff */}
              <div className="space-y-1.5">
                <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.bitsActiveBuff}</div>
                {state?.active_buff ? (
                  <ActiveBuffCard
                    buff={state.active_buff}
                    isDark={isDark}
                    borderCol={borderCol}
                    textMuted={textMuted}
                    onCancel={handleCancelBuff}
                  />
                ) : (
                  <div className={`p-3 border border-dashed ${borderCol} text-[10px] ${textMuted}`}>{t.bitsNoBuff}</div>
                )}
                {cancelNotice && !state?.active_buff && (
                  <div className="p-2 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold tracking-wider">{cancelNotice}</div>
                )}
              </div>

              {/* Catalog */}
              <div className="space-y-1.5">
                <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.bitsBuffs}</div>
                {loadError && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{loadError}</div>}
                {!state && !loadError && (
                  <div className={`p-6 flex justify-center ${textMuted}`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {state && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {state.buffs.map((buff) => {
                      const look = lookOf(buff.item_id);
                      const ink = isDark ? look.accent : look.ink;
                      const running = state.active_buff?.item_id === buff.item_id;
                      const stats = buffStats(buff, t);
                      const windowLabel =
                        buff.window === 'night' ? t.bitsStatNight : buff.window === 'weekend' ? t.bitsStatWeekendOnly : null;
                      return (
                        <div
                          key={buff.item_id}
                          className={`buff-card p-3 border flex flex-col gap-2.5 transition-colors ${running ? '' : borderCol}`}
                          style={running ? { borderColor: look.accent, background: look.tint } : undefined}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="relative shrink-0 w-14 h-14 flex items-center justify-center border"
                              style={{ background: look.tint, borderColor: `${look.accent}66` }}
                            >
                              <BuffIcon itemId={buff.item_id} className="buff-icon w-10 h-10" />
                              <span
                                className="absolute -top-2 -left-2 px-1 text-[9px] font-bold leading-4 text-zinc-950"
                                style={{ background: look.accent }}
                                title={tf(t.bitsClass, { r: look.rank })}
                              >
                                {look.rank}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-bold tracking-wider truncate">{buff.name}</div>
                                <span className="shrink-0 flex items-center gap-1 tabular-nums">
                                  <BitShard className="w-2.5 h-2.5" />
                                  <span className="font-bold">{fmt(buff.price)}</span>
                                  <StudyTime bits={buff.price} className={textMuted} />
                                </span>
                              </div>
                              <div className="text-[10px] font-bold mt-0.5" style={{ color: ink }}>
                                {buff.tagline}
                              </div>
                              {windowLabel && <div className={`text-[9px] mt-0.5 ${textMuted}`}>{windowLabel}</div>}
                            </div>
                          </div>
                          <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{buff.detail}</p>
                          {stats.length > 0 && (
                            <div className={`grid grid-cols-3 border-l border-t ${borderCol}`}>
                              {stats.map(([label, value]) => (
                                <div key={label} className={`px-1.5 py-1 border-r border-b ${borderCol} min-w-0`}>
                                  <div className={`text-[8px] uppercase tracking-wider ${textMuted}`}>{label}</div>
                                  <div className="text-[10px] font-bold tabular-nums truncate">{value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {buff.max_bonus ? (
                            <div className={`text-[9px] ${textMuted}`}>
                              {tf(t.bitsPayback, { x: (buff.max_bonus / buff.price).toFixed(2) })}
                            </div>
                          ) : null}
                          {buff.odds && (
                            <div className="space-y-1">
                              <div className={`text-[8px] uppercase tracking-wider ${textMuted}`}>{t.bitsCrateOdds}</div>
                              <div className="grid grid-cols-3 gap-1">
                                {buff.odds.map((o) => (
                                  <span
                                    key={o.item_id}
                                    title={o.name}
                                    className={`flex items-center gap-1 px-1 py-0.5 border ${borderCol} text-[9px] tabular-nums`}
                                  >
                                    <BuffIcon itemId={o.item_id} className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{Math.round(o.chance * 100)}%</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {buff.needs_category && (
                            <label className="flex items-center gap-2 text-[10px]">
                              <span className={`shrink-0 uppercase tracking-wider text-[8px] ${textMuted}`}>{t.bitsLockedTo}</span>
                              {categories.length > 0 ? (
                                <select
                                  value={lockTarget ? String(lockTarget.id) : ''}
                                  onChange={(e) => setLockCategory(e.target.value)}
                                  disabled={busy}
                                  className={`min-w-0 flex-1 px-1.5 py-1 border ${borderCol} bg-transparent font-mono text-[10px] cursor-pointer disabled:opacity-50`}
                                >
                                  {categories.map((c) => (
                                    <option key={c.id} value={String(c.id)} className="bg-zinc-900 text-zinc-100">
                                      [{c.code}] {c.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={textMuted}>{t.bitsCategoryNone}</span>
                              )}
                            </label>
                          )}
                          {buyButton(
                            buff.item_id,
                            buff.price,
                            busy ? t.bitsSlotBusy : buff.needs_category && !lockTarget ? t.bitsPickCategory : null,
                            look.accent
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {buyError && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{buyError}</div>}
                <p className={`text-[10px] font-sans ${textMuted}`}>{t.bitsOneAtATime}</p>
              </div>
            </>
          )}
        </div>

        {/* Purchase splash: the buff "comes online" / the new piece is shown
            off. A crate rattles shut first, then bursts open on what it held. */}
        {splash && (() => {
          const shaking = splash.kind === 'buff' && splash.crate && !crateOpen;
          const label =
            splash.kind === 'piece'
              ? t.bitsSplashPiece
              : shaking
              ? t.bitsCrateOpening
              : splash.crate
              ? t.bitsCrateRolled
              : t.bitsSplashBuff;
          return (
          <div
            key={shaking ? 'crate-shut' : 'open'}
            role="status"
            onClick={closeSplash}
            className={`${splash.kind === 'buff' && !shaking ? 'buff-splash' : ''} absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 cursor-pointer ${
              isDark ? 'bg-zinc-950/92' : 'bg-white/94'
            }`}
            style={{ ['--buff-accent' as string]: shaking ? lookOf('mystery_crate').accent : splashAccent }}
          >
            <div className="relative w-44 h-44 flex items-center justify-center">
              {!shaking && <span className="buff-splash-rays absolute inset-0 rounded-full" aria-hidden />}
              {shaking ? (
                <BuffIcon itemId="mystery_crate" className="crate-shake relative w-24 h-24" />
              ) : splash.kind === 'buff' ? (
                <BuffIcon itemId={splash.itemId} className="buff-splash-icon relative w-24 h-24" />
              ) : (
                <img
                  src={thumbnail(splash.spec)}
                  alt=""
                  className="buff-splash-icon relative"
                  style={{
                    imageRendering: 'pixelated',
                    width: splash.spec.w * 8 * Math.max(1, Math.floor(96 / (Math.max(splash.spec.w, splash.spec.h) * 8))),
                  }}
                />
              )}
            </div>
            <div className="text-center space-y-1 px-6 min-h-16">
              <div
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: shaking ? lookOf('mystery_crate').accent : splashAccent }}
              >
                {label}
              </div>
              {!shaking && (
                <>
                  <div className="text-lg font-bold tracking-wider">
                    {splash.kind === 'buff' ? splash.name : splash.spec.name}
                  </div>
                  <div className={`text-[10px] font-sans ${textMuted}`}>
                    {splash.kind === 'buff' ? t.bitsSplashBuffHint : t.bitsSplashPieceHint}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {splash.kind === 'piece' && (
                <button
                  type="button"
                  autoFocus
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSplash();
                    onOpenRoom();
                  }}
                  className="px-3 py-1.5 bg-emerald-500 text-zinc-950 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  {t.bitsSplashPlace}
                </button>
              )}
              <button
                type="button"
                autoFocus={splash.kind === 'buff'}
                onClick={(e) => {
                  e.stopPropagation();
                  closeSplash();
                }}
                className={`px-3 py-1.5 border ${borderCol} text-[10px] uppercase tracking-wider cursor-pointer ${textMuted}`}
              >
                {t.bitsSplashDismiss}
              </button>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
};
