import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Radar } from 'lucide-react';
import { formatDateTimeInZone, formatTimeInZone, tf, useI18n } from './i18n';
import { api, type PlanetarySignal } from './api';

// "What did the Earth and Sun do while I was away?" — a strip-chart panel
// over the window since the user's last study session: M2.5+ earthquakes
// (USGS), solar flares, coronal mass ejections and geomagnetic storms
// (NASA DONKI). Both feeds come through the backend's /planetary/signal/
// proxy (see tracker/views.py:PlanetarySignalView), which always returns
// the last `windowDays` days; the "since last session" window is cut out
// of that here so the server cache stays shared across users.

const HOUR_MS = 3_600_000;
const BIN_COUNT = 24;
// Signed-out visitors and accounts without logs get a plain last-24h view.
const DEFAULT_WINDOW_MS = 24 * HOUR_MS;
// M2.5+ quakes run ~40/day worldwide and DONKI events are sparser still, so
// a window cut at a session committed minutes ago would almost always read
// empty. It never shrinks below a day; "since last session" kicks in once
// the gap is longer than that.
const MIN_WINDOW_MS = DEFAULT_WINDOW_MS;
const REFRESH_MS = 10 * 60_000;
const CLOCK_TICK_MS = 60_000;
const TICKER_ROTATE_MS = 6_000;
const TICKER_MAX_ITEMS = 12;
// Below this, earthquakes are too routine to headline the ticker (the
// window's strongest quake is always included regardless).
const TICKER_MIN_MAG = 4.5;

// Strip heights: M2.5 (the feed floor) sits near the baseline, M7.5+ fills
// the strip. Flares map on log10 X-ray flux from C1 (1e-6) to X10 (1e-3).
const QUAKE_SCALE: [number, number] = [2.5, 7.5];
const FLARE_SCALE: [number, number] = [-6, -3];
const FLARE_CLASS_EXPONENT: Record<string, number> = { A: -8, B: -7, C: -6, M: -5, X: -4 };
const MIN_BAR_FRACTION = 0.15;

type Tone = 'emerald' | 'amber' | 'sky' | 'violet';

// Spelled out in full so Tailwind's scanner picks every class up.
const TONE_CLASSES: Record<Tone, { dark: { text: string; bg: string }; light: { text: string; bg: string } }> = {
  emerald: { dark: { text: 'text-emerald-400', bg: 'bg-emerald-400' }, light: { text: 'text-emerald-600', bg: 'bg-emerald-600' } },
  amber: { dark: { text: 'text-amber-400', bg: 'bg-amber-400' }, light: { text: 'text-amber-600', bg: 'bg-amber-500' } },
  sky: { dark: { text: 'text-sky-400', bg: 'bg-sky-400' }, light: { text: 'text-sky-600', bg: 'bg-sky-600' } },
  violet: { dark: { text: 'text-violet-400', bg: 'bg-violet-400' }, light: { text: 'text-violet-600', bg: 'bg-violet-600' } },
};

interface Bin {
  count: number;
  max: number;
}

interface TickerItem {
  key: string;
  time: number;
  tone: Tone;
  label: string;
  tag?: string;
  url: string | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const scaleTo = (value: number, [lo, hi]: [number, number]) => clamp01((value - lo) / (hi - lo));

/** log10 of a flare's peak X-ray flux, e.g. "M1.2" → -4.92. NaN if unparseable. */
function flareFluxLog(classType: string): number {
  const exponent = FLARE_CLASS_EXPONENT[classType.charAt(0)];
  const multiplier = parseFloat(classType.slice(1));
  if (exponent === undefined || !(multiplier > 0)) return NaN;
  return exponent + Math.log10(multiplier);
}

/** "45M", "3H 42M", "2D 5H" — compact enough for the header and ticker. */
function formatSpan(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes}M`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 48) return totalMinutes % 60 ? `${totalHours}H ${totalMinutes % 60}M` : `${totalHours}H`;
  return totalHours % 24 ? `${Math.floor(totalHours / 24)}D ${totalHours % 24}H` : `${Math.floor(totalHours / 24)}D`;
}

function binByTime<T extends { time: string }>(items: T[], start: number, end: number, value: (item: T) => number): Bin[] {
  const bins: Bin[] = Array.from({ length: BIN_COUNT }, () => ({ count: 0, max: -Infinity }));
  const width = (end - start) / BIN_COUNT;
  for (const item of items) {
    const index = Math.min(BIN_COUNT - 1, Math.floor((Date.parse(item.time) - start) / width));
    if (index < 0) continue;
    bins[index].count += 1;
    bins[index].max = Math.max(bins[index].max, value(item));
  }
  return bins;
}

interface StripProps {
  bins: Bin[];
  tone: string;
  fraction: (max: number) => number;
  title: (bin: Bin) => string;
}

/** One bar per time bin; empty bins draw a hairline so the strip reads as a continuous trace. */
const BarStrip: React.FC<StripProps> = ({ bins, tone, fraction, title }) => (
  <div className="flex items-end gap-[2px] h-6" aria-hidden="true">
    {bins.map((bin, i) => (
      <div key={i} className="flex-1 h-full flex items-end" title={bin.count > 0 ? title(bin) : undefined}>
        {bin.count > 0 ? (
          <div className={`w-full ${tone}`} style={{ height: `${Math.max(MIN_BAR_FRACTION, fraction(bin.max)) * 100}%` }} />
        ) : (
          <div className="w-full h-px bg-[var(--tb-border)]" />
        )}
      </div>
    ))}
  </div>
);

/** A timeline rule with a dot per bin that saw a CME; Earth-directed ones get a larger ringed marker. */
const DotStrip: React.FC<Omit<StripProps, 'fraction'> & { ringTone: string }> = ({ bins, tone, ringTone, title }) => (
  <div className="relative flex items-center h-6" aria-hidden="true">
    <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--tb-border)]" />
    {bins.map((bin, i) => (
      <div key={i} className="relative flex-1 flex justify-center" title={bin.count > 0 ? title(bin) : undefined}>
        {bin.count > 0 &&
          (bin.max > 1 ? (
            <span className={`w-2.5 h-2.5 rounded-full border-2 ${ringTone} bg-[var(--tb-bg-card)]`} />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${tone}`} />
          ))}
      </div>
    ))}
  </div>
);

const OfflineStrip: React.FC = () => (
  <div className="relative h-6" aria-hidden="true">
    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--tb-border)]" />
  </div>
);

interface PlanetarySignalPanelProps {
  /** ISO timestamp of the user's most recent study log, or null for a default window. */
  since: string | null;
  borderCol: string;
  textMuted: string;
  isDark: boolean;
}

export const PlanetarySignalPanel: React.FC<PlanetarySignalPanelProps> = ({ since, borderCol, textMuted, isDark }) => {
  const { t, timeZone } = useI18n();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<PlanetarySignal | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerPaused, setTickerPaused] = useState(false);

  const tones = (tone: Tone) => TONE_CLASSES[tone][isDark ? 'dark' : 'light'];

  // Background refreshes keep showing the current data on failure; only the
  // initial load (or a manual retry) surfaces the error state.
  useEffect(() => {
    let cancelled = false;
    const load = async (silent: boolean) => {
      if (!silent) setStatus('loading');
      try {
        const next = await api.planetary.signal();
        if (cancelled) return;
        setData(next);
        setStatus('ready');
      } catch {
        if (!cancelled && !silent) setStatus('error');
      }
    };
    load(false);
    const id = window.setInterval(() => load(true), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [reloadNonce]);

  // Slides the window's right edge forward so "NOW" and the relative times stay honest.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const range = useMemo(() => {
    const maxWindowMs = (data?.windowDays ?? 7) * 24 * HOUR_MS;
    const sinceMs = since ? Date.parse(since) : NaN;
    if (Number.isNaN(sinceMs)) return { start: now - DEFAULT_WINDOW_MS, end: now, fromSession: false };
    const start = Math.min(Math.max(sinceMs, now - maxWindowMs), now - MIN_WINDOW_MS);
    return { start, end: now, fromSession: start === sinceMs };
  }, [since, now, data?.windowDays]);

  const view = useMemo(() => {
    if (!data) return null;
    const { start, end } = range;
    const inRange = <T extends { time: string }>(items: T[]) =>
      items.filter((item) => {
        const at = Date.parse(item.time);
        return at >= start && at <= end;
      });

    const quakes = inRange(data.seismic.events);
    const flares = inRange(data.solar.flares).filter((f) => !Number.isNaN(flareFluxLog(f.classType)));
    const cmes = inRange(data.solar.cmes);
    const storms = inRange(data.solar.storms);

    const maxQuake = quakes.reduce<(typeof quakes)[number] | null>((best, q) => (!best || q.mag > best.mag ? q : best), null);
    const peakFlare = flares.reduce<(typeof flares)[number] | null>(
      (best, f) => (!best || flareFluxLog(f.classType) > flareFluxLog(best.classType) ? f : best),
      null,
    );
    const maxKp = storms.reduce((best, s) => Math.max(best, s.maxKp), 0);

    // A CME launched before the window can still be inbound, so ETAs look
    // at everything the backend returned rather than just `cmes`.
    const arrivals = data.solar.cmes
      .map((c) => (c.earthArrival ? Date.parse(c.earthArrival) : NaN))
      .filter((at) => !Number.isNaN(at));
    const nextArrival = arrivals.filter((at) => at > end).sort((a, b) => a - b)[0];
    const lastImpact = arrivals.filter((at) => at >= start && at <= end).sort((a, b) => b - a)[0];

    const ticker: TickerItem[] = [
      ...quakes
        .filter((q) => q.mag >= TICKER_MIN_MAG || q === maxQuake)
        .map((q) => ({
          key: `q-${q.id}`,
          time: Date.parse(q.time),
          tone: 'emerald' as Tone,
          label: tf(t.planetaryTickerQuake, { mag: q.mag.toFixed(1), place: q.place }),
          tag: q.tsunami ? t.planetaryTickerTsunami : undefined,
          url: q.url,
        })),
      ...flares.map((f) => ({
        key: `f-${f.id}`,
        time: Date.parse(f.time),
        tone: 'amber' as Tone,
        label: tf(t.planetaryTickerFlare, { cls: f.classType }),
        tag: f.region ? tf(t.planetaryRegion, { n: f.region }) : undefined,
        url: f.url,
      })),
      ...cmes.map((c) => ({
        key: `c-${c.id}`,
        time: Date.parse(c.time),
        tone: 'sky' as Tone,
        label: tf(t.planetaryTickerCme, { speed: c.speed ?? '—' }),
        tag: c.earthArrival ? t.planetaryTickerCmeEarth : undefined,
        url: c.url,
      })),
      ...storms.map((s) => ({
        key: `s-${s.id}`,
        time: Date.parse(s.time),
        tone: 'violet' as Tone,
        label: tf(t.planetaryTickerStorm, { kp: s.maxKp.toFixed(2) }),
        url: s.url,
      })),
    ]
      .sort((a, b) => b.time - a.time)
      .slice(0, TICKER_MAX_ITEMS);

    return {
      quakes,
      flares,
      cmes,
      maxQuake,
      peakFlare,
      maxKp,
      nextArrival,
      lastImpact,
      ticker,
      quakeBins: binByTime(quakes, start, end, (q) => q.mag),
      flareBins: binByTime(flares, start, end, (f) => flareFluxLog(f.classType)),
      cmeBins: binByTime(cmes, start, end, (c) => (c.earthArrival ? 2 : 1)),
    };
  }, [data, range, t]);

  const tickerLength = view?.ticker.length ?? 0;
  useEffect(() => {
    if (tickerLength <= 1 || tickerPaused) return;
    const id = window.setInterval(() => setTickerIndex((i) => i + 1), TICKER_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [tickerLength, tickerPaused]);

  const tickerItem = view && tickerLength > 0 ? view.ticker[tickerIndex % tickerLength] : null;
  const solarOffline = data?.solar.status === 'unavailable';
  const anyStale = data?.seismic.status === 'stale' || data?.solar.status === 'stale';
  const span = formatSpan(range.end - range.start);
  const shortStamp = (at: number) => formatDateTimeInZone(at, timeZone).slice(5);
  const stormLevel = Math.min(5, Math.floor(view?.maxKp ?? 0) - 4);

  const rowGrid = 'grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_minmax(0,1fr)_12.5rem] gap-x-3 items-center';
  const statsCell = 'col-start-2 sm:col-start-auto min-w-0 mt-1 sm:mt-0 font-mono leading-tight';
  const labelCell = `font-mono text-[10px] uppercase tracking-widest ${textMuted}`;
  const detailText = `block text-[10px] uppercase tracking-wider truncate ${textMuted}`;

  return (
    <>
      <div className={`flex items-center justify-between gap-3 pb-3 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
        <div className="flex items-center space-x-2">
          <Radar className={`w-4 h-4 ${tones('emerald').text}`} />
          <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">{t.planetaryTitle}</h2>
        </div>
        <span className={`flex items-center gap-1.5 font-mono text-[10px] text-right ${tones('emerald').text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tones('emerald').bg} motion-safe:animate-pulse`} />
          {range.fromSession ? tf(t.planetarySinceSession, { span }) : tf(t.planetaryLastSpan, { span })}
        </span>
      </div>

      <div className="pt-4">
        {status === 'loading' && !data && (
          <div className={`py-8 flex items-center justify-center gap-2 font-mono text-xs ${textMuted}`}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t.planetaryLoading}</span>
          </div>
        )}

        {status === 'error' && (
          <div className={`py-6 text-center space-y-2 font-mono text-xs ${textMuted}`}>
            <p>{t.planetaryError}</p>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className={`px-2.5 py-1 border ${borderCol} uppercase text-[10px] hover:text-emerald-400 transition-colors cursor-pointer`}
            >
              {t.planetaryRetry}
            </button>
          </div>
        )}

        {status === 'ready' && data && view && (
          <div className="space-y-3">
            {/* SEISMIC: bar height = strongest quake in each bin */}
            <div className={rowGrid}>
              <span className={labelCell}>{t.planetarySeismic}</span>
              {data.seismic.status === 'unavailable' ? (
                <OfflineStrip />
              ) : (
                <BarStrip
                  bins={view.quakeBins}
                  tone={tones('emerald').bg}
                  fraction={(mag) => scaleTo(mag, QUAKE_SCALE)}
                  title={(bin) => `${tf(t.planetaryEvents, { n: bin.count })} · M${bin.max.toFixed(1)}`}
                />
              )}
              <div className={statsCell}>
                {data.seismic.status === 'unavailable' ? (
                  <span className={detailText}>{t.planetaryOffline}</span>
                ) : (
                  <>
                    <span className={`block text-[11px] font-semibold ${tones('emerald').text}`}>
                      {tf(t.planetaryEvents, { n: view.quakes.length })}
                    </span>
                    {view.maxQuake && (
                      <span className={detailText} title={view.maxQuake.place}>
                        {tf(t.planetaryMaxQuake, { mag: view.maxQuake.mag.toFixed(1), place: view.maxQuake.place })}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* SOLAR: bar height = brightest flare (log X-ray flux) in each bin */}
            <div className={rowGrid}>
              <span className={labelCell}>{t.planetarySolar}</span>
              {solarOffline ? (
                <OfflineStrip />
              ) : (
                <BarStrip
                  bins={view.flareBins}
                  tone={tones('amber').bg}
                  fraction={(flux) => scaleTo(flux, FLARE_SCALE)}
                  title={(bin) => tf(t.planetaryFlares, { n: bin.count })}
                />
              )}
              <div className={statsCell}>
                {solarOffline ? (
                  <span className={detailText}>{t.planetaryOffline}</span>
                ) : (
                  <>
                    <span className={`block text-[11px] font-semibold ${tones('amber').text}`}>
                      {tf(t.planetaryFlares, { n: view.flares.length })}
                    </span>
                    {view.peakFlare && (
                      <span className={detailText}>
                        {tf(t.planetaryPeakFlare, { cls: view.peakFlare.classType })}
                        {view.peakFlare.region ? ` · ${tf(t.planetaryRegion, { n: view.peakFlare.region })}` : ''}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* CME: one dot per bin with a launch, ringed when modelled to reach Earth */}
            <div className={rowGrid}>
              <span className={labelCell}>{t.planetaryCme}</span>
              {solarOffline ? (
                <OfflineStrip />
              ) : (
                <DotStrip
                  bins={view.cmeBins}
                  tone={tones('sky').bg}
                  ringTone={isDark ? 'border-sky-400' : 'border-sky-600'}
                  title={(bin) => tf(t.planetaryCmes, { n: bin.count })}
                />
              )}
              <div className={statsCell}>
                {solarOffline ? (
                  <span className={detailText}>{t.planetaryOffline}</span>
                ) : (
                  <>
                    <span className={`block text-[11px] font-semibold ${tones('sky').text}`}>
                      {tf(t.planetaryCmes, { n: view.cmes.length })}
                    </span>
                    <span className={detailText}>
                      {view.nextArrival
                        ? tf(t.planetaryEta, { at: shortStamp(view.nextArrival) })
                        : view.lastImpact
                          ? tf(t.planetaryImpact, { at: shortStamp(view.lastImpact) })
                          : t.planetaryNoneEarthbound}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* GEOMAG: 9-cell Kp meter; DONKI only reports storms (Kp ≥ 5), so quiet means empty */}
            <div className={rowGrid}>
              <span className={labelCell}>{t.planetaryGeomag}</span>
              {solarOffline ? (
                <OfflineStrip />
              ) : (
                <div className="flex items-center gap-[2px] h-6" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2.5 ${
                        i < Math.floor(view.maxKp) ? tones('violet').bg : 'bg-[var(--tb-border)] opacity-60'
                      }`}
                    />
                  ))}
                </div>
              )}
              <div className={statsCell}>
                {solarOffline ? (
                  <span className={detailText}>{t.planetaryOffline}</span>
                ) : (
                  <>
                    <span className={`block text-[11px] font-semibold ${tones('violet').text}`}>
                      {view.maxKp >= 5 ? tf(t.planetaryStorm, { g: stormLevel }) : t.planetaryQuiet}
                    </span>
                    <span className={detailText}>
                      {view.maxKp >= 5 ? tf(t.planetaryStormDetail, { kp: view.maxKp.toFixed(2) }) : t.planetaryQuietDetail}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Shared time axis for the three strips above */}
            <div className={rowGrid} aria-hidden="true">
              <span />
              <div className={`flex justify-between font-mono text-[9px] uppercase tracking-wider ${textMuted}`}>
                <span>{shortStamp(range.start)}</span>
                <span>{t.planetaryNow}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {status === 'ready' && view && (
        <div
          className={`mt-4 pt-3 border-t min-h-[2.25rem] flex items-center ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}
          onMouseEnter={() => setTickerPaused(true)}
          onMouseLeave={() => setTickerPaused(false)}
        >
          {tickerItem ? (
            <div key={tickerItem.key} className="planetary-ticker-in w-full flex items-center gap-2 font-mono text-[11px] min-w-0">
              <span className={tones(tickerItem.tone).text}>▸</span>
              {tickerItem.url ? (
                <a
                  href={tickerItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`truncate hover:underline ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}
                >
                  {tickerItem.label}
                </a>
              ) : (
                <span className={`truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{tickerItem.label}</span>
              )}
              {tickerItem.tag && (
                <span className={`shrink-0 px-1 border text-[9px] uppercase tracking-wider ${tones(tickerItem.tone).text} border-current`}>
                  {tickerItem.tag}
                </span>
              )}
              {tickerItem.url && <ExternalLink className={`w-2.5 h-2.5 shrink-0 ${textMuted}`} />}
              <span className={`ml-auto shrink-0 text-[10px] uppercase tracking-wider ${textMuted}`}>
                {tf(t.planetaryAgo, { span: formatSpan(now - tickerItem.time) })}
              </span>
            </div>
          ) : (
            <span className={`font-mono text-[11px] ${textMuted}`}>{t.planetaryNoActivity}</span>
          )}
        </div>
      )}

      <div
        className={`flex items-center justify-between gap-2 pt-3 mt-3 border-t font-mono text-[10px] uppercase tracking-wider ${textMuted} ${
          isDark ? 'border-zinc-800/50' : 'border-zinc-200'
        }`}
      >
        <span>{t.planetarySource}</span>
        <span className="flex items-center gap-2">
          {anyStale && <span className={`px-1 border ${borderCol}`}>{t.planetaryCached}</span>}
          {data && <span>{formatTimeInZone(data.generatedAt, timeZone)}</span>}
        </span>
      </div>
    </>
  );
};
