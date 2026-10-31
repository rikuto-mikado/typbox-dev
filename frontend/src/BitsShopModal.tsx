import React, { useEffect, useRef, useState } from 'react';
import { Home, Loader2, Zap } from 'lucide-react';
import { api, type BitsActiveBuff, type BitsShopState, type RoomState } from './api';
import { BITS_PER_HOUR } from './bits';
import { tf, useI18n } from './i18n';
import { thumbnail, TIER_LABEL } from './roomRender';

// BITS // EXCHANGE, opened from the header balance (or MY ROOM): buffs and
// the weekly furniture lineup. Catalogs, prices, the running buff and the
// lineup come from the server (economy.py / furniture.py); one buff runs at
// a time. BUY takes two taps (arm, then confirm) so a stray tap never spends.

const CONFIRM_WINDOW_MS = 3000;

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
  borderCol: string;
  bgCard: string;
  textMuted: string;
}

const formatLeft = (ms: number): string => {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 48) return `${Math.floor(h / 24)}D ${h % 24}H`;
  return h > 0 ? `${h}H ${String(m).padStart(2, '0')}M` : `${m}M`;
};

const ActiveBuffCard: React.FC<{ buff: BitsActiveBuff; borderCol: string; textMuted: string }> = ({
  buff,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  // Ticks the countdown; read in an effect-driven state, not during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const byMinutes = buff.total_minutes !== null && buff.remaining_minutes !== null;
  const total = byMinutes ? buff.total_minutes! : buff.total_uses ?? 1;
  const left = byMinutes ? buff.remaining_minutes! : buff.remaining_uses ?? 0;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  return (
    <div className={`p-3 border border-amber-500/60 bg-amber-500/10 space-y-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-bold text-amber-400 tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          {buff.name}
        </span>
        <span className={`text-[10px] ${textMuted}`}>
          {tf(t.bitsExpiresIn, { t: formatLeft(new Date(buff.expires_at).getTime() - now) })}
        </span>
      </div>
      <div className={`h-1.5 border ${borderCol} overflow-hidden`}>
        <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className={textMuted}>
          {byMinutes ? tf(t.bitsMinutesLeft, { a: left, b: total }) : tf(t.bitsUsesLeft, { a: left, b: total })}
        </span>
        <span className="text-amber-400 font-bold tabular-nums">
          {tf(t.bitsBonusEarned, { n: buff.bonus_earned.toLocaleString('en-US') })}
        </span>
      </div>
    </div>
  );
};

export const BitsShopModal: React.FC<BitsShopModalProps> = ({
  isOpen,
  onClose,
  balance,
  onPurchased,
  initialTab,
  onOpenRoom,
  borderCol,
  bgCard,
  textMuted,
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
  const [armed, setArmed] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const armTimer = useRef<number | null>(null);

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
    },
    []
  );

  if (!isOpen) return null;

  const busy = Boolean(state?.active_buff);

  const handleBuy = async (itemId: string) => {
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
      const next = await api.bits.buy(itemId);
      setState(next);
      onPurchased(next);
      if (room?.catalog.some((f) => f.id === itemId)) setRoom(await api.room.get());
    } catch (err: unknown) {
      setBuyError((err as Error).message || t.bitsBuyFailed);
    } finally {
      setBuying(null);
    }
  };

  const buyButton = (itemId: string, price: number, blockedLabel: string | null) => {
    const short = balance < price;
    const isArmed = armed === itemId;
    const disabled = Boolean(blockedLabel) || short || buying !== null;
    return (
      <button
        type="button"
        onClick={() => handleBuy(itemId)}
        disabled={disabled}
        className={`mt-auto py-1.5 border text-[10px] font-bold uppercase tracking-wider transition-colors ${
          disabled
            ? `${borderCol} ${textMuted} opacity-50 cursor-not-allowed`
            : isArmed
            ? 'border-amber-400 bg-amber-400 text-zinc-950 cursor-pointer'
            : 'border-amber-500/60 text-amber-400 hover:bg-amber-500/10 cursor-pointer'
        }`}
      >
        {buying === itemId ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
        ) : blockedLabel ? (
          blockedLabel
        ) : short ? (
          tf(t.bitsNeedMore, { n: (price - balance).toLocaleString('en-US') })
        ) : isArmed ? (
          tf(t.bitsConfirm, { n: price.toLocaleString('en-US') })
        ) : (
          t.bitsBuy
        )}
      </button>
    );
  };

  const furnitureById = new Map((room?.catalog ?? []).map((f) => [f.id, f]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.bitsShopTitle}
        className={`w-full max-w-2xl border ${borderCol} ${bgCard} p-3.5 sm:p-6 shadow-2xl h-[88vh] sm:h-175 max-h-[94vh] sm:max-h-[90vh] flex flex-col font-mono text-xs`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b ${borderCol} pb-3.5 shrink-0`}>
          <h3 className="flex items-center gap-2.5 text-xs uppercase tracking-widest font-semibold">
            <span className="w-2 h-2 bg-amber-400 rotate-45" aria-hidden />
            {t.bitsShopTitle}
          </h3>
          <button type="button" onClick={onClose} className="text-xs hover:underline cursor-pointer">
            {t.closeBracket}
          </button>
        </div>

        {/* Fixed height: the balance and tabs stay put and only the tab body
            scrolls, so switching tabs never resizes the dialog. */}
        <div className="shrink-0 mt-3.5 space-y-4">
          {/* Balance */}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.bitsBalance}</div>
              <div className="text-2xl font-bold tabular-nums">
                {balance.toLocaleString('en-US')} <span className="text-sm text-amber-400">BITS</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {room.weekly.items.map((id) => {
                    const spec = furnitureById.get(id);
                    if (!spec) return null;
                    const owned = room.inventory[id] ?? 0;
                    const featured = spec.tier === 4;
                    return (
                      <div
                        key={id}
                        className={`p-2 border flex flex-col gap-1.5 ${featured ? 'border-amber-500/70 bg-amber-500/5' : borderCol}`}
                      >
                        <div className={`h-20 flex items-end justify-center border ${borderCol} bg-black/5 p-1.5`}>
                          <img
                            src={thumbnail(spec)}
                            alt=""
                            className="max-w-full max-h-full"
                            style={{ imageRendering: 'pixelated', height: Math.min(64, Math.max(spec.h, 2) * 16) }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold truncate">{spec.name}</div>
                          <div className={`text-[9px] ${featured ? 'text-amber-400 font-bold' : textMuted}`}>
                            {TIER_LABEL[spec.tier]} · {spec.w}×{spec.h}
                            {owned > 0 && <span className="text-emerald-400"> · {t.bitsOwned}</span>}
                          </div>
                        </div>
                        <div className="font-bold tabular-nums text-[11px]">
                          {spec.price.toLocaleString('en-US')} <span className="text-[9px] text-amber-400">BITS</span>
                        </div>
                        {/* One of each piece: owned ones can't be bought again. */}
                        {buyButton(id, spec.price, owned > 0 ? t.bitsOwned : null)}
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
              <ActiveBuffCard buff={state.active_buff} borderCol={borderCol} textMuted={textMuted} />
            ) : (
              <div className={`p-3 border border-dashed ${borderCol} text-[10px] ${textMuted}`}>{t.bitsNoBuff}</div>
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
                  return (
                    <div key={buff.item_id} className={`p-3 border ${borderCol} flex flex-col gap-2`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold tracking-wider">{buff.name}</div>
                          <div className="text-[10px] text-amber-400">{buff.tagline}</div>
                        </div>
                        <span className="shrink-0 font-bold tabular-nums">
                          {buff.price} <span className="text-[9px] text-amber-400">BITS</span>
                        </span>
                      </div>
                      <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{buff.detail}</p>
                      {buyButton(buff.item_id, buff.price, busy ? t.bitsSlotBusy : null)}
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
      </div>
    </div>
  );
};
