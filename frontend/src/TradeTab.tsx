import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Loader2, Lock, Moon, TrendingDown, TrendingUp } from 'lucide-react';
import { api, type BitsShopState, type TradeAsset, type TradeOrderFill, type TradeState } from './api';
import { isDemo } from './demo';
import { tf, useI18n } from './i18n';

// TRADE (backend tracker/trade.py): four made-up packages bought and sold with
// BITS. Two views that swap in place, the overview and one package, so opening
// a package never pushes the rest of the tab around. Every slot keeps its size
// whether it is empty, loading or full. The server fills every order; the sums
// here only preview what it will do and mirror fee_for, tax_for and value_of.

type Range = '1D' | '1M' | '3M';
type Dict = ReturnType<typeof useI18n>['t'];
type OrderBody = { asset: string; side: 'buy' | 'sell'; amount?: number; units?: number | 'all' };

const fmt = (n: number) => n.toLocaleString('en-US');
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`;
const pctText = (pct: number) => `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(2)}%`;
const bpText = (bp: number) => `${Number((bp / 100).toFixed(2))}%`;
const toneOf = (n: number, muted: string) => (n > 0 ? 'text-emerald-500' : n < 0 ? 'text-rose-500' : muted);
const DASH = '—';

const formatPrice = (price: number): string =>
  price >= 1
    ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(price.toPrecision(3)).toString();

const formatUnits = (units: number, unit: number): string => {
  const value = Math.abs(units) / unit;
  if (value > 0 && value < 0.0001) return '<0.0001';
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
};

const feeFor = (amount: number, feeBp: number): number =>
  amount > 0 ? Math.min(amount, Math.ceil((amount * feeBp) / 10000)) : 0;
const taxFor = (gain: number, taxPct: number): number => Math.floor((Math.max(0, gain) * taxPct) / 100);
const valueOf = (units: number, price: number, unit: number): number => Math.floor((units * price) / unit);

// Each sector's colour, in the market's order and validated for colour-blind
// separation on both themes (light, dark). It follows the sector everywhere
// (every package in it) and only ever marks shapes, never text.
const SECTOR_ACCENTS: Record<string, [string, string]> = {
  defense: ['#2a78d6', '#3987e5'],
  energy: ['#eb6834', '#d95926'],
  semis: ['#1baf7a', '#199e70'],
  bio: ['#eda100', '#c98500'],
  market: ['#e87ba4', '#d55181'],
};
const SECTOR_SHORT: Record<string, string> = {
  defense: 'DEFENSE',
  energy: 'ENERGY',
  semis: 'CHIPS & AI',
  bio: 'BIO',
  market: 'MARKETS',
};
const accentOf = (sector: string | undefined, isDark: boolean) =>
  (sector && SECTOR_ACCENTS[sector]?.[isDark ? 1 : 0]) || '#71717a';

const LINE = 'fill-none stroke-current';
const EYEBROW = 'text-[9px] uppercase tracking-[0.14em]';

/** The last 24 hours, small: a row's shape at a glance. */
const Sparkline: React.FC<{ prices: number[]; tone: string }> = ({ prices, tone }) => {
  if (prices.length < 2) return <span className="block w-full h-7" aria-hidden />;
  const low = Math.min(...prices);
  const span = Math.max(...prices) - low || 1;
  const points = prices.map((p, i) => `${(i / (prices.length - 1)) * 100},${27 - ((p - low) / span) * 24}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`block w-full h-7 ${tone}`} aria-hidden>
      <polyline points={points} className={LINE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
};

interface ChartPoint {
  label: string;
  price: number;
}

/** One package's price: a line, its reference level, and a readout under the pointer. */
const PriceChart: React.FC<{
  points: ChartPoint[];
  reference: number;
  referenceLabel: string;
  tone: string;
  borderCol: string;
  textMuted: string;
  ariaLabel: string;
}> = ({ points, reference, referenceLabel, tone, borderCol, textMuted, ariaLabel }) => {
  const slots = points.length;
  const [hover, setHover] = useState<number | null>(null);
  const prices = points.map((p) => p.price);
  const low = Math.min(reference, ...prices);
  const high = Math.max(reference, ...prices);
  const pad = (high - low) * 0.12 || high * 0.01 || 1;
  const yOf = (price: number) => 100 - ((price - (low - pad)) / (high - low + 2 * pad)) * 100;
  const xOf = (i: number) => (slots > 1 ? (i / (slots - 1)) * 100 : 50);
  const line = points.map((p, i) => `${xOf(i)},${yOf(p.price)}`).join(' ');
  const shown = hover !== null && hover < points.length ? hover : null;
  const lastX = xOf(points.length - 1);
  const area = `0,100 ${line} ${lastX},100`;

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * (slots - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div
      className={`relative h-40 sm:h-48 border ${borderCol} touch-pan-y select-none overflow-hidden`}
      role="img"
      aria-label={ariaLabel}
      onPointerMove={pick}
      onPointerDown={pick}
      onPointerLeave={() => setHover(null)}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
        <polygon points={area} className={`fill-current ${tone}`} opacity={0.07} />
        <line
          x1={0}
          x2={100}
          y1={yOf(reference)}
          y2={yOf(reference)}
          className={`stroke-current ${textMuted}`}
          strokeWidth={1}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
          opacity={0.6}
        />
        <polyline points={line} className={`${LINE} ${tone}`} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {shown !== null && (
          <line
            x1={xOf(shown)}
            x2={xOf(shown)}
            y1={0}
            y2={100}
            className={`stroke-current ${textMuted}`}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span className={`absolute top-1 right-1.5 text-[9px] tabular-nums ${textMuted}`}>{formatPrice(high)}</span>
      <span className={`absolute bottom-1 right-1.5 text-[9px] tabular-nums ${textMuted}`}>{formatPrice(low)}</span>
      <span className={`absolute bottom-1 left-1.5 text-[9px] tabular-nums ${textMuted}`}>
        {referenceLabel} {formatPrice(reference)}
      </span>
      {shown !== null && (
        <>
          <span
            className={`absolute w-2 h-2 rounded-full bg-current ${tone} -translate-x-1/2 -translate-y-1/2 pointer-events-none`}
            style={{ left: `${xOf(shown)}%`, top: `${yOf(points[shown].price)}%` }}
          />
          <div
            className="absolute top-1 px-1.5 py-1 border border-zinc-700 bg-zinc-950 text-zinc-100 text-[10px] tabular-nums whitespace-nowrap pointer-events-none"
            style={xOf(shown) > 50 ? { right: `${100 - xOf(shown) + 2}%` } : { left: `${xOf(shown) + 2}%` }}
          >
            <span className="text-zinc-400">{points[shown].label}</span> <b>{formatPrice(points[shown].price)}</b>
          </div>
        </>
      )}
    </div>
  );
};

const PreviewRow: React.FC<{ label: string; value: string; strong?: boolean; textMuted: string }> = ({ label, value, strong, textMuted }) => (
  <div className="flex justify-between gap-3 min-w-0">
    <span className={`truncate ${textMuted}`}>{label}</span>
    <span className={`tabular-nums whitespace-nowrap ${strong ? 'font-bold' : ''}`}>{value}</span>
  </div>
);

/** One number in the grid: the same size whether it holds a value or N/A. */
const Stat: React.FC<{ label: string; value: string; tone?: string; textMuted: string; borderCol: string; empty?: boolean }> = ({
  label,
  value,
  tone,
  textMuted,
  borderCol,
  empty,
}) => (
  <div className={`min-w-0 min-h-14 p-2 border-r border-b ${borderCol} flex flex-col justify-between gap-1`}>
    <div className={`${EYEBROW} truncate ${textMuted}`}>{label}</div>
    <div className={`text-sm font-bold tabular-nums truncate ${empty ? `${textMuted} opacity-60` : tone ?? ''}`}>{value}</div>
  </div>
);

interface OrderBoxProps {
  asset: TradeAsset;
  market: TradeState;
  balance: number;
  onOrder: (body: OrderBody) => Promise<TradeOrderFill>;
  borderCol: string;
  textMuted: string;
}

const SELL_SHARES = [25, 50, 100];
const BUY_AMOUNTS = [100, 500, 1000];
const ARM_MS = 4000;

/** BUY or SELL for one package. Both sides fill the same space, so flipping
 *  between them, or typing, moves nothing. */
const OrderBox: React.FC<OrderBoxProps> = ({ asset, market, balance, onOrder, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amountText, setAmountText] = useState('');
  const [share, setShare] = useState(100);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const armTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (armTimer.current !== null) window.clearTimeout(armTimer.current);
    },
    []
  );

  const disarm = () => {
    setArmed(false);
    if (armTimer.current !== null) window.clearTimeout(armTimer.current);
    armTimer.current = null;
  };
  const changed = () => {
    disarm();
    setError(null);
    setNotice(null);
  };

  const { position, price, fee_bp: feeBp, cap, ticker } = asset;
  const room = cap === null ? null : Math.max(0, cap - position.basis);
  const maxBuy = Math.max(0, room === null ? balance : Math.min(balance, room));
  const amount = /^\d+$/.test(amountText) ? Number(amountText) : 0;
  const canBuyAny = market.unlocked && maxBuy >= market.min_order;

  // BUY
  const buyFee = feeFor(amount, feeBp);
  const bought = price > 0 ? Math.floor(((amount - buyFee) * market.unit) / price) : 0;
  let buyProblem: string | null = null;
  if (!market.unlocked) buyProblem = t.tradeBuyLocked;
  else if (amount > 0 && amount < market.min_order) buyProblem = tf(t.tradeMinOrder, { n: market.min_order });
  else if (amount > balance) buyProblem = t.tradeNotEnough;
  else if (room !== null && amount > room) buyProblem = tf(t.tradeCapLeft, { n: fmt(room) });
  const buyOk = amount >= market.min_order && !buyProblem && bought > 0;

  // SELL
  const held = position.units;
  const sold = share === 100 ? held : Math.floor((held * share) / 100);
  const gross = valueOf(sold, price, market.unit);
  const sellFee = feeFor(gross, feeBp);
  const basisOut = sold === held ? position.basis : Math.round((position.basis * sold) / Math.max(1, held));
  const sellTax = taxFor(gross - sellFee - basisOut, market.tax_pct);
  const net = gross - sellFee - sellTax;
  const sellOk = held > 0 && gross > 0;

  const demo = isDemo();
  const ready = !demo && !busy && (side === 'buy' ? buyOk : sellOk);

  const submit = async () => {
    if (!ready) return;
    if (!armed) {
      setArmed(true);
      setError(null);
      setNotice(null);
      if (armTimer.current !== null) window.clearTimeout(armTimer.current);
      armTimer.current = window.setTimeout(() => setArmed(false), ARM_MS);
      return;
    }
    disarm();
    setBusy(true);
    setError(null);
    try {
      const order = await onOrder(
        side === 'buy'
          ? { asset: asset.id, side, amount }
          : { asset: asset.id, side, units: share === 100 ? 'all' : sold }
      );
      setNotice(
        tf(side === 'buy' ? t.tradeBoughtNotice : t.tradeSoldNotice, {
          units: formatUnits(order.units, market.unit),
          ticker,
          bits: fmt(Math.abs(order.bits)),
        })
      );
      setAmountText('');
      setShare(100);
    } catch (err: unknown) {
      setError((err as Error).message || t.tradeOrderFailed);
    } finally {
      setBusy(false);
    }
  };

  const chip = `min-w-0 h-7 px-1 border ${borderCol} text-[10px] tabular-nums truncate transition-colors enabled:cursor-pointer enabled:hover:text-amber-400 enabled:hover:border-amber-500/60 disabled:opacity-35 disabled:cursor-not-allowed`;
  const action = busy
    ? null
    : demo
    ? t.tradeDemo
    : armed
    ? side === 'buy'
      ? tf(t.tradeConfirmBuy, { n: fmt(amount) })
      : tf(t.tradeConfirmSell, { n: fmt(net) })
    : side === 'buy'
    ? t.tradeBuy
    : t.tradeSell;
  const hint = side === 'buy' ? buyProblem : held <= 0 ? t.tradeNothingHeld : null;

  return (
    <div className={`border ${borderCol} p-2.5 flex flex-col gap-2.5 min-w-0`}>
      <div className={`grid grid-cols-2 border-l border-t ${borderCol} text-[10px] uppercase tracking-wider`} role="group" aria-label={t.tradeOrder}>
        {(['buy', 'sell'] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={side === s}
            onClick={() => {
              setSide(s);
              changed();
            }}
            className={`h-7 border-r border-b ${borderCol} cursor-pointer transition-colors ${
              side === s ? 'font-bold text-amber-400 bg-amber-500/10' : `${textMuted} hover:text-amber-400`
            }`}
          >
            {s === 'buy' ? t.tradeBuy : t.tradeSell}
          </button>
        ))}
      </div>

      <div className="h-[5.25rem] flex flex-col justify-between">
        {side === 'buy' ? (
          <>
            <label className="block">
              <span className={`${EYEBROW} ${textMuted}`}>{t.tradeAmount}</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountText}
                placeholder={fmt(market.min_order)}
                disabled={!market.unlocked}
                onChange={(e) => {
                  setAmountText(e.target.value.replace(/[^\d]/g, '').slice(0, 8));
                  changed();
                }}
                className={`mt-1 block w-full h-8 px-2 border ${borderCol} bg-transparent text-sm tabular-nums outline-none focus:border-amber-500/60 disabled:opacity-50`}
              />
            </label>
            <div className="grid grid-cols-4 gap-1">
              {BUY_AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={chip}
                  disabled={!market.unlocked || n > maxBuy}
                  onClick={() => {
                    setAmountText(String(n));
                    changed();
                  }}
                >
                  {fmt(n)}
                </button>
              ))}
              <button
                type="button"
                className={chip}
                disabled={!canBuyAny}
                onClick={() => {
                  setAmountText(String(maxBuy));
                  changed();
                }}
              >
                {t.tradeMax}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className={`${EYEBROW} ${textMuted}`}>{t.tradeHolding}</div>
              <div className="mt-1 h-8 flex items-center text-sm font-bold tabular-nums truncate">
                {held > 0 ? `${formatUnits(sold, market.unit)} / ${formatUnits(held, market.unit)} ${ticker}` : t.tradeNA}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {SELL_SHARES.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={share === n}
                  disabled={held <= 0}
                  onClick={() => {
                    setShare(n);
                    changed();
                  }}
                  className={`${chip} ${share === n && held > 0 ? 'font-bold text-amber-400 border-amber-500/60 bg-amber-500/10' : ''}`}
                >
                  {n === 100 ? t.tradeSellAll : `${n}%`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-0.5 text-[10px]">
        {side === 'buy' ? (
          <>
            <PreviewRow label={t.tradeOrderLine} value={buyOk ? fmt(amount) : DASH} textMuted={textMuted} />
            <PreviewRow label={tf(t.tradeFeeLine, { pct: bpText(feeBp) })} value={buyOk ? `−${fmt(buyFee)}` : DASH} textMuted={textMuted} />
            <PreviewRow label={t.tradeGoesIn} value={buyOk ? fmt(amount - buyFee) : DASH} textMuted={textMuted} />
            <PreviewRow label={t.tradeYouGet} value={buyOk ? `≈ ${formatUnits(bought, market.unit)} ${ticker}` : DASH} strong textMuted={textMuted} />
          </>
        ) : (
          <>
            <PreviewRow label={t.tradeProceeds} value={sellOk ? `≈ ${fmt(gross)}` : DASH} textMuted={textMuted} />
            <PreviewRow label={tf(t.tradeFeeLine, { pct: bpText(feeBp) })} value={sellOk ? `−${fmt(sellFee)}` : DASH} textMuted={textMuted} />
            <PreviewRow label={tf(t.tradeTaxLine, { pct: market.tax_pct })} value={sellOk ? `−${fmt(sellTax)}` : DASH} textMuted={textMuted} />
            <PreviewRow label={t.tradeNet} value={sellOk ? `≈ ${fmt(net)}` : DASH} strong textMuted={textMuted} />
          </>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!ready}
        className={`w-full h-9 border px-1 text-[10px] font-bold uppercase tracking-wider truncate transition-colors ${
          !ready
            ? `${borderCol} ${textMuted} opacity-50 cursor-not-allowed`
            : armed
            ? 'border-amber-400 bg-amber-400 text-zinc-950 cursor-pointer'
            : 'border-amber-400 text-amber-500 cursor-pointer hover:bg-amber-500/10'
        }`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : action}
      </button>

      {/* Always here, so a message never moves what sits under the box. */}
      <p className="min-h-8 text-[10px] leading-4" role="status">
        {error ? (
          <span className="text-rose-500">{error}</span>
        ) : notice ? (
          <span className="text-emerald-500">{notice}</span>
        ) : hint ? (
          <span className={textMuted}>{hint}</span>
        ) : null}
      </p>
    </div>
  );
};

const kindLabel = (kind: string, t: Dict) =>
  kind === 'buy' ? t.tradeKindBuy : t.tradeKindSell;

const AssetDetail: React.FC<{
  asset: TradeAsset;
  market: TradeState;
  balance: number;
  isDark: boolean;
  onBack: () => void;
  onPick: (id: string) => void;
  onOrder: OrderBoxProps['onOrder'];
  borderCol: string;
  textMuted: string;
}> = ({ asset, market, balance, isDark, onBack, onPick, onOrder, borderCol, textMuted }) => {
  const { t, formatTime, formatDateTime } = useI18n();
  // The switcher holds the packages of this one's sector.
  const siblings = market.assets.filter((a) => a.sector === asset.sector);
  const [range, setRange] = useState<Range>('1D');

  const nextTick = useMemo(() => new Date(market.next_tick_at).getTime(), [market.next_tick_at]);
  const chart = useMemo(() => {
    if (range === '1D') {
      const count = asset.ticks.length;
      return {
        points: asset.ticks.map((price, i) => ({
          label: formatTime(nextTick - (count - i) * market.tick_seconds * 1000),
          price,
        })),
        reference: asset.day_ago,
        referenceLabel: t.tradeDayAgo,
      };
    }
    const closes = range === '1M' ? asset.closes.slice(-30) : asset.closes;
    const points = [
      ...closes.map(([day, price]) => ({ label: day.replace(/-/g, '.'), price })),
      { label: t.tradeNow, price: asset.price },
    ];
    return { points, reference: points[0].price, referenceLabel: t.tradeStartOfRange };
  }, [range, asset, market.tick_seconds, nextTick, formatTime, t]);

  const rangePct = chart.reference > 0 ? (asset.price / chart.reference - 1) * 100 : 0;
  const tone = rangePct >= 0 ? 'text-emerald-500' : 'text-rose-500';
  const { position } = asset;
  const holding = position.units > 0;
  const unrealized = position.value - position.basis;
  const heldPct = position.basis > 0 ? (unrealized / position.basis) * 100 : 0;

  const facts: Array<[string, string]> = [
    [t.tradeFactFee, bpText(asset.fee_bp)],
    [t.tradeFactTrust, asset.trust_bp ? tf(t.tradePerYear, { pct: bpText(asset.trust_bp) }) : t.tradeNA],
    [t.tradeFactCap, asset.cap === null ? t.tradeNoCap : `${fmt(position.basis)} / ${fmt(asset.cap)}`],
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onBack}
          className={`shrink-0 h-8 px-2 border ${borderCol} flex items-center gap-1.5 text-[10px] uppercase tracking-wider cursor-pointer transition-colors hover:text-amber-400 hover:border-amber-500/60`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="sr-only sm:not-sr-only">{t.tradeBack}</span>
        </button>
        <div
          className={`flex-1 min-w-0 grid border-l border-t ${borderCol} text-[10px]`}
          style={{ gridTemplateColumns: `repeat(${siblings.length}, minmax(0, 1fr))` }}
          role="group"
          aria-label={t.tradeMarket}
        >
          {siblings.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={a.id === asset.id}
              onClick={() => onPick(a.id)}
              className={`relative min-w-0 h-8 border-r border-b ${borderCol} cursor-pointer transition-colors ${
                a.id === asset.id ? 'font-bold' : `${textMuted} hover:text-amber-400`
              }`}
            >
              {a.id === asset.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: accentOf(a.sector, isDark) }} aria-hidden />
              )}
              {a.ticker}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={`${EYEBROW} truncate ${textMuted}`}>
            {asset.name} · {asset.kind}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold tabular-nums leading-tight">{formatPrice(asset.price)}</span>
            <span className={`text-xs font-bold tabular-nums ${tone}`}>{pctText(rangePct)}</span>
          </div>
        </div>
        <div className={`shrink-0 flex border-l border-t ${borderCol} text-[10px]`} role="group" aria-label={t.tradeRange}>
          {(['1D', '1M', '3M'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`w-9 h-7 border-r border-b ${borderCol} cursor-pointer transition-colors ${
                range === r ? 'font-bold text-amber-400 bg-amber-500/10' : `${textMuted} hover:text-amber-400`
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <PriceChart
        {...chart}
        tone={tone}
        borderCol={borderCol}
        textMuted={textMuted}
        ariaLabel={tf(t.tradeChartLabel, { name: asset.name, range, price: formatPrice(asset.price), pct: pctText(rangePct) })}
      />

      {asset.moon && (
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-500">
          <Moon className="w-3.5 h-3.5" />
          {t.tradeFullMoon}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <OrderBox asset={asset} market={market} balance={balance} onOrder={onOrder} borderCol={borderCol} textMuted={textMuted} />

        <div className="space-y-3 min-w-0">
          <div className={`grid grid-cols-2 border-l border-t ${borderCol}`}>
            <Stat label={t.tradeInvested} value={holding ? fmt(position.basis) : t.tradeNA} empty={!holding} textMuted={textMuted} borderCol={borderCol} />
            <Stat label={t.tradeValue} value={holding ? fmt(position.value) : t.tradeNA} empty={!holding} textMuted={textMuted} borderCol={borderCol} />
            <Stat label={t.tradeHolding} value={holding ? formatUnits(position.units, market.unit) : t.tradeNA} empty={!holding} textMuted={textMuted} borderCol={borderCol} />
            <Stat
              label={t.tradeUnrealized}
              value={holding ? pctText(heldPct) : t.tradeNA}
              tone={toneOf(unrealized, textMuted)}
              empty={!holding}
              textMuted={textMuted}
              borderCol={borderCol}
            />
          </div>
          <div className="space-y-0.5 text-[10px]">
            {facts.map(([label, value]) => (
              <PreviewRow key={label} label={label} value={value} textMuted={textMuted} />
            ))}
          </div>
          <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>{asset.detail}</p>
        </div>
      </div>

      {asset.news.length > 0 && (
        <div className="space-y-1">
          <div className={`${EYEBROW} ${textMuted}`}>{t.tradeNews}</div>
          <ul className={`border ${borderCol} text-[10px]`}>
            {asset.news.slice(0, 5).map((item) => (
              <li key={item.at} className={`px-2 py-1.5 flex items-start gap-1.5 border-b last:border-b-0 ${borderCol}`}>
                {item.up ? (
                  <TrendingUp className="w-3 h-3 shrink-0 text-emerald-500" aria-label={t.tradeNewsUp} />
                ) : (
                  <TrendingDown className="w-3 h-3 shrink-0 text-rose-500" aria-label={t.tradeNewsDown} />
                )}
                <span className="flex-1 min-w-0">{item.headline}</span>
                <span className={`tabular-nums whitespace-nowrap ${textMuted}`}>{formatDateTime(item.at).slice(5, 16)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** Where the account's BITS sit: one segment per package, plus the balance. */
const Allocation: React.FC<{ market: TradeState; balance: number; isDark: boolean; textMuted: string }> = ({
  market,
  balance,
  isDark,
  textMuted,
}) => {
  const { t } = useI18n();
  const cash = Math.max(0, balance);
  // One segment per sector held, in the market's order.
  const bySector = new Map<string, number>();
  for (const a of market.assets) {
    if (a.position.value > 0) bySector.set(a.sector ?? '', (bySector.get(a.sector ?? '') ?? 0) + a.position.value);
  }
  const parts = [...bySector.entries()].map(([sector, value]) => ({
    id: sector || 'other',
    label: SECTOR_SHORT[sector] ?? '—',
    value,
    color: accentOf(sector, isDark),
  }));
  const total = cash + parts.reduce((sum, p) => sum + p.value, 0);
  const cashColor = isDark ? '#52525b' : '#a1a1aa';
  const rows = parts.length ? [...parts, { id: 'cash', label: t.tradeCash, value: cash, color: cashColor }] : [];
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 gap-0.5" role="img" aria-label={t.tradeAllocation}>
        {rows.length ? (
          rows
            .filter((r) => r.value > 0)
            .map((r) => <span key={r.id} className="min-w-0.5" style={{ flexGrow: r.value, flexBasis: 0, background: r.color }} />)
        ) : (
          <span
            className={`flex-1 ${textMuted} opacity-40`}
            style={{ background: 'repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 5px)' }}
          />
        )}
      </div>
      <div className={`h-4 overflow-x-auto [scrollbar-width:none] flex gap-x-3 text-[10px] leading-4 tabular-nums ${textMuted}`}>
        {rows.length ? (
          rows.map((r) => (
            <span key={r.id} className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2 h-2" style={{ background: r.color }} aria-hidden />
              {r.label} {total > 0 ? Math.round((r.value / total) * 100) : 0}%
            </span>
          ))
        ) : (
          <span className="truncate">{t.tradeNoPositions}</span>
        )}
      </div>
    </div>
  );
};

const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_0.875rem] sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_0.875rem] @4xl:grid-cols-[minmax(0,1fr)_11rem_6.5rem_0.875rem] items-center gap-2 sm:gap-3';
const HERO_HEIGHT = 'h-[7.5rem]';

/** The overview's shape while the market loads, so nothing jumps when it lands. */
const OverviewSkeleton: React.FC<{ borderCol: string }> = ({ borderCol }) => {
  const block = 'bg-current opacity-10 animate-pulse';
  return (
    <div className="space-y-4" aria-hidden>
      <div>
        <div className={`border border-b-0 ${borderCol} ${HERO_HEIGHT} p-3 space-y-3`}>
          <div className={`h-3 w-24 ${block}`} />
          <div className={`h-7 w-40 ${block}`} />
          <div className={`h-2 w-full ${block}`} />
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-4 border-l border-t ${borderCol}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`min-h-14 p-2 border-r border-b ${borderCol}`}>
              <div className={`h-2 w-12 ${block}`} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 h-[1.8rem] sm:h-3.5" />
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-15 border ${borderCol} p-2.5`}>
            <div className={`h-3 w-32 ${block}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

interface TradeTabProps {
  balance: number;
  /** Server state after an order, so the balance everywhere follows. */
  onShop: (state: BitsShopState) => void;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
}

const ORDERS_FIRST = 6;

export const TradeTab: React.FC<TradeTabProps> = ({ balance, onShop, isDark, borderCol, textMuted }) => {
  const { t, formatDateTime, formatTime } = useI18n();
  const [market, setMarket] = useState<TradeState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState(false);
  // A poll that started before an order must not put the old position back.
  const orderSeq = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const overviewScroll = useRef(0);

  // Prices only change on a tick, so ask again just after the next one.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = () => {
      const seq = orderSeq.current;
      api.bits
        .trade()
        .then((next) => {
          if (cancelled) return;
          if (seq === orderSeq.current) setMarket(next);
          setLoadError(null);
          const wait = new Date(next.next_tick_at).getTime() - Date.now() + 2000;
          timer = window.setTimeout(load, Math.max(15_000, wait));
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setLoadError(err.message || t.tradeLoadFailed);
          timer = window.setTimeout(load, 60_000);
        });
    };
    load();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [t.tradeLoadFailed]);

  // A package opens at its top; going back returns to where the list was.
  const inDetail = open !== null;
  useLayoutEffect(() => {
    const top = root.current ? root.current.getBoundingClientRect().top + window.scrollY - 80 : 0;
    if (inDetail) window.scrollTo({ top: Math.min(window.scrollY, Math.max(0, top)) });
    else if (overviewScroll.current) window.scrollTo({ top: overviewScroll.current });
  }, [inDetail]);

  const openAsset = (id: string) => {
    overviewScroll.current = window.scrollY;
    setOpen(id);
  };

  const placeOrder: OrderBoxProps['onOrder'] = async (body) => {
    orderSeq.current += 1;
    const { shop, order, ...next } = await api.bits.placeOrder(body);
    setMarket(next);
    onShop(shop);
    return order;
  };

  if (!market) {
    return (
      <div ref={root}>
        {loadError ? (
          <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{loadError}</div>
        ) : (
          <OverviewSkeleton borderCol={borderCol} />
        )}
      </div>
    );
  }

  const asset = market.assets.find((a) => a.id === open);
  if (asset) {
    return (
      <div ref={root}>
        <AssetDetail
          key={asset.id}
          asset={asset}
          market={market}
          balance={balance}
          isDark={isDark}
          onBack={() => setOpen(null)}
          onPick={setOpen}
          onOrder={placeOrder}
          borderCol={borderCol}
          textMuted={textMuted}
        />
      </div>
    );
  }

  const { totals } = market;
  const holding = totals.invested > 0 || totals.value > 0;
  const tickerOf = (id: string) => market.assets.find((a) => a.id === id)?.ticker ?? id;
  const naIfZero = (n: number, text: string) => (n === 0 ? t.tradeNA : text);
  const unlockShare = Math.min(100, (market.studied_minutes / market.unlock_minutes) * 100);
  const orders = allOrders ? market.orders : market.orders.slice(0, ORDERS_FIRST);

  return (
    <div ref={root} className="space-y-4">
      <section aria-label={t.tradePortfolio}>
        <div className={`border border-b-0 ${borderCol} p-3 ${HERO_HEIGHT} flex flex-col justify-between`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`${EYEBROW} ${textMuted}`}>{t.tradeTotal}</div>
              <div className="text-2xl font-bold tabular-nums leading-tight truncate">
                {fmt(balance + totals.value)} <span className="text-[11px] text-amber-400">BITS</span>
              </div>
            </div>
            <div className={`text-right shrink-0 text-[10px] leading-4 tabular-nums ${textMuted}`}>
              {market.unlocked ? (
                <>
                  <div>{tf(t.tradeMarketEnds, { t: formatTime(market.closes_at) })}</div>
                  <div>{tf(t.tradeUpdatesEvery, { min: market.tick_seconds / 60 })}</div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-end gap-1 text-amber-500 font-bold">
                    <Lock className="w-3 h-3" />
                    {tf(t.tradeLockedTitle, { n: market.unlock_minutes / 60 })}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="block w-14 h-1 bg-current/15" aria-hidden>
                      <span className="block h-full bg-amber-500" style={{ width: `${unlockShare}%` }} />
                    </span>
                    {tf(t.tradeLockedProgress, {
                      a: Number((market.studied_minutes / 60).toFixed(1)),
                      b: market.unlock_minutes / 60,
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <Allocation market={market} balance={balance} isDark={isDark} textMuted={textMuted} />
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-4 border-l border-t ${borderCol}`}>
          <Stat label={t.tradeCash} value={fmt(balance)} textMuted={textMuted} borderCol={borderCol} />
          <Stat label={t.tradeInvested} value={holding ? fmt(totals.invested) : t.tradeNA} empty={!holding} textMuted={textMuted} borderCol={borderCol} />
          <Stat label={t.tradeValue} value={holding ? fmt(totals.value) : t.tradeNA} empty={!holding} textMuted={textMuted} borderCol={borderCol} />
          <Stat
            label={t.tradeUnrealized}
            value={holding ? signed(totals.unrealized) : t.tradeNA}
            tone={toneOf(totals.unrealized, textMuted)}
            empty={!holding}
            textMuted={textMuted}
            borderCol={borderCol}
          />
        </div>
        <dl className={`mt-1.5 grid grid-cols-3 gap-x-3 gap-y-0.5 text-[10px] tabular-nums ${textMuted}`}>
          {(
            [
              [t.tradeRealized, naIfZero(totals.realized, signed(totals.realized))],
              [t.tradeFees, naIfZero(totals.fees, fmt(totals.fees))],
              [t.tradeTaxes, naIfZero(totals.taxes, fmt(totals.taxes))],
            ] as Array<[string, string]>
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 min-w-0">
              <dt className="truncate">{label}</dt>
              <dd className="whitespace-nowrap">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label={t.tradeMarket} className="space-y-1.5">
        {(market.sectors ?? [{ id: '', name: '' }]).map((sector) => (
          <div key={sector.id || 'all'} className="space-y-1.5">
            {sector.name && (
              <div className={`pt-2 first:pt-0 flex items-center gap-2 ${EYEBROW} ${textMuted}`}>
                <span className="w-2 h-2 shrink-0" style={{ background: accentOf(sector.id, isDark) }} aria-hidden />
                {sector.name}
              </div>
            )}
        {market.assets.filter((a) => !sector.id || a.sector === sector.id).map((a) => {
          const pct = a.day_ago > 0 ? (a.price / a.day_ago - 1) * 100 : 0;
          const { position } = a;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => openAsset(a.id)}
              aria-label={tf(t.tradeOpenPackage, { name: a.name })}
              className={`relative w-full h-15 pl-3.5 pr-2.5 border ${borderCol} ${ROW_GRID} text-left cursor-pointer transition-colors hover:bg-amber-500/5 hover:border-amber-500/40`}
            >
              <span className="absolute left-0 inset-y-0 w-1" style={{ background: accentOf(a.sector, isDark) }} aria-hidden />
              <span className="min-w-0">
                <span className="flex items-baseline gap-1.5 min-w-0">
                  <span className="font-bold shrink-0">{a.ticker}</span>
                  <span className={`text-[10px] truncate ${textMuted}`}>{a.name}</span>
                </span>
                <span className={`block mt-0.5 text-[10px] tabular-nums truncate ${position.units > 0 ? '' : `font-sans ${textMuted}`}`}>
                  {position.units > 0 ? tf(t.tradeRowHeld, { value: fmt(position.value), basis: fmt(position.basis) }) : a.tagline}
                </span>
              </span>
              <Sparkline prices={a.ticks} tone={pct >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
              <span className="text-right min-w-0">
                <span className="block font-bold tabular-nums truncate">{formatPrice(a.price)}</span>
                <span className={`block text-[10px] tabular-nums ${toneOf(pct, textMuted)}`}>{pctText(pct)}</span>
              </span>
              <ChevronRight className={`w-3.5 h-3.5 ${textMuted}`} aria-hidden />
            </button>
          );
        })}
          </div>
        ))}
      </section>

      <section className="space-y-1">
        <div className={`${EYEBROW} ${textMuted}`}>{t.tradeOrders}</div>
        {market.orders.length === 0 ? (
          <div className={`border border-dashed ${borderCol} px-2 py-3 text-center text-[10px] ${textMuted}`}>{t.tradeNoOrders}</div>
        ) : (
          <>
            <ul className={`border ${borderCol} text-[10px]`}>
              {orders.map((order) => (
                <li key={order.id} className={`px-2 py-1.5 flex items-center gap-2 tabular-nums border-b last:border-b-0 ${borderCol}`}>
                  <span className={`whitespace-nowrap ${textMuted}`}>{formatDateTime(order.at).slice(5, 16)}</span>
                  <span className="w-2 h-2 shrink-0" style={{ background: accentOf(market.assets.find((a) => a.id === order.asset)?.sector, isDark) }} aria-hidden />
                  <span className="font-bold">{tickerOf(order.asset)}</span>
                  <span className={textMuted}>{kindLabel(order.kind, t)}</span>
                  <span className="ml-auto font-bold">{signed(order.bits)}</span>
                </li>
              ))}
            </ul>
            {market.orders.length > ORDERS_FIRST && !allOrders && (
              <button type="button" onClick={() => setAllOrders(true)} className={`text-[10px] underline cursor-pointer ${textMuted}`}>
                {t.tradeShowAll}
              </button>
            )}
          </>
        )}
      </section>

      <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>
        {tf(t.tradeHint, { tax: market.tax_pct, min: market.tick_seconds / 60 })}
      </p>
    </div>
  );
};
