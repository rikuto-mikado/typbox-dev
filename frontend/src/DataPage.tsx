import React, { useEffect, useMemo, useState } from 'react';
import { Lock, LogIn, RefreshCcw, Swords, Users } from 'lucide-react';
import { api, type CollectionState } from './api';
import { BOSS_ART, RIVAL_ART, challengeAccent } from './challengeArt';
import { Pixel } from './ChallengePanel';
import { tf, useI18n } from './i18n';

// DATA // CHALLENGER RECORD (backend tracker/collection.py): every challenger met
// in the CHALLENGES, one card each, with the fights, the wins, the first win
// and how far its other side has been opened. Cards keep one size whether
// beaten or not, so the grid never shifts as the record fills in.

type Record = CollectionState['records'][number];
type Filter = 'all' | Record['kind'];

const fmt = (n: number) => n.toLocaleString('en-US');
// What hasn't been beaten yet: a shape on the dark stage, and no more.
const SILHOUETTE = 'brightness-0 invert opacity-[0.1]';

const Stat: React.FC<{ label: string; value: string; sub?: string; borderCol: string; textMuted: string }> = ({ label, value, sub, borderCol, textMuted }) => (
  <div className={`min-w-0 min-h-[4.25rem] p-2.5 border-r border-b ${borderCol} flex flex-col justify-between gap-1`}>
    <div className={`text-[9px] uppercase tracking-[0.14em] truncate ${textMuted}`}>{label}</div>
    <div className="text-xl font-bold tabular-nums leading-none truncate">
      {value}
      {sub && <span className={`text-xs font-normal ${textMuted}`}> {sub}</span>}
    </div>
  </div>
);

/** One challenger: both sides on one stage, then its record. */
const RecordCard: React.FC<{ r: Record; invertAt: number; borderCol: string; textMuted: string }> = ({ r, invertAt, borderCol, textMuted }) => {
  const { t, formatDateTime } = useI18n();
  const table = r.kind === 'raid' ? BOSS_ART : RIVAL_ART;
  const accent = challengeAccent(r.key);
  const other = r.inverted;
  const otherBeaten = (other?.wins ?? 0) > 0;
  const otherAccent = other ? challengeAccent(other.key) : accent;
  const beaten = r.wins > 0;
  const fights = r.fights ?? r.wins;
  return (
    <article
      className={`min-w-0 border overflow-hidden flex flex-col ${beaten ? '' : borderCol}`}
      style={otherBeaten ? { borderColor: otherAccent, boxShadow: `0 0 14px ${otherAccent}44` } : beaten ? { borderColor: `${accent}66` } : undefined}
      aria-label={r.name}
    >
      <div className="flex h-24">
        <span
          className="flex-1 flex items-end justify-center"
          style={{ background: `radial-gradient(ellipse 70% 60% at 50% 75%, ${beaten ? `${accent}38` : 'transparent'}, transparent 72%), linear-gradient(#0c0c10, #050507)` }}
        >
          {table[r.key] && <Pixel art={table[r.key]} className={`w-20 h-20 ${beaten ? '' : SILHOUETTE}`} />}
        </span>
        {other && table[other.key] && (
          <span
            className="flex-1 flex items-end justify-center"
            style={{ background: `radial-gradient(ellipse 70% 60% at 50% 75%, ${other.unlocked ? `${otherAccent}38` : 'transparent'}, transparent 72%), linear-gradient(#1a0506, #050102)` }}
          >
            <Pixel art={table[other.key]} className={`w-20 h-20 ${otherBeaten ? '' : other.unlocked ? 'opacity-75' : SILHOUETTE}`} />
          </span>
        )}
      </div>
      <div className="p-2 flex-1 flex flex-col gap-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold tracking-[0.15em] truncate" style={beaten ? { color: accent } : undefined}>
              {r.name}
            </span>
            {r.event && <span className="shrink-0 px-1 text-[8px] font-bold uppercase tracking-wider border border-current opacity-70">{t.colLimited}</span>}
          </div>
          <div className={`text-[9px] uppercase tracking-wider truncate h-3.5 ${textMuted}`}>{r.title ?? ''}</div>
        </div>
        <div className={`grid grid-cols-2 border-l border-t ${borderCol} text-[9px] uppercase tracking-wider`}>
          <div className={`px-1.5 py-1 border-r border-b ${borderCol}`}>
            <div className={textMuted}>{t.colWinsLabel}</div>
            <div className="text-xs font-bold tabular-nums normal-case">
              {fmt(r.wins)}
              <span className={`font-normal ${textMuted}`}> / {fmt(fights)}</span>
            </div>
          </div>
          <div className={`px-1.5 py-1 border-r border-b ${borderCol} min-w-0`}>
            <div className={textMuted}>{t.colFirstWin}</div>
            <div className="text-xs font-bold tabular-nums truncate">{r.first_win ? formatDateTime(r.first_win).slice(0, 10).replace(/-/g, '.') : '—'}</div>
          </div>
        </div>
        <div className={`mt-auto h-4 flex items-center justify-between gap-1 text-[9px] uppercase tracking-wider tabular-nums ${textMuted}`}>
          {other ? (
            other.unlocked ? (
              <span className="flex items-center gap-1 font-bold truncate" style={{ color: otherAccent }}>
                <RefreshCcw className="w-3 h-3 shrink-0" />
                {otherBeaten ? tf(t.colOtherBeaten, { name: other.name, n: other.wins }) : tf(t.colOtherOpen, { name: other.name })}
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1 truncate">
                  <Lock className="w-3 h-3 shrink-0" />
                  {tf(t.colOtherLocked, { n: Math.max(0, invertAt - r.wins) })}
                </span>
                <span className="flex gap-0.5 shrink-0" aria-hidden>
                  {Array.from({ length: invertAt }, (_, i) => (
                    <span key={i} className="w-2.5 h-1.5" style={{ background: i < r.wins ? accent : 'rgba(113,113,122,0.3)' }} />
                  ))}
                </span>
              </>
            )
          ) : (
            <span>{beaten ? '' : t.colNoWins}</span>
          )}
        </div>
      </div>
    </article>
  );
};

/** The DATA page: the challenger record, read from the shop state. */
export const DataPage: React.FC<{ signedIn: boolean; onSignIn: () => void; borderCol: string; bgCard: string; textMuted: string }> = ({
  signedIn,
  onSignIn,
  borderCol,
  bgCard,
  textMuted,
}) => {
  const { t } = useI18n();
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    api.bits
      .get()
      .then((s) => {
        if (cancelled) return;
        setCollection(s.collection ?? null);
        setLoadError(null);
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message || t.bitsLoadFailed));
    return () => {
      cancelled = true;
    };
  }, [signedIn, t.bitsLoadFailed]);

  const records = useMemo(() => collection?.records ?? [], [collection]);
  const totals = useMemo(() => {
    const raids = records.filter((r) => r.kind === 'raid');
    const rivals = records.filter((r) => r.kind === 'rival');
    const sides = records.filter((r) => r.inverted);
    return {
      bosses: raids.reduce((n, r) => n + r.wins + (r.inverted?.wins ?? 0), 0),
      rivals: rivals.reduce((n, r) => n + r.wins + (r.inverted?.wins ?? 0), 0),
      cleared: records.filter((r) => r.wins > 0).length,
      met: records.length,
      sidesOpen: sides.filter((r) => r.inverted?.unlocked).length,
      sides: sides.length,
    };
  }, [records]);
  const shown = filter === 'all' ? records : records.filter((r) => r.kind === filter);

  const filters: Array<[Filter, string, React.ReactNode]> = [
    ['all', t.colAll, null],
    ['raid', t.colBossRaids, <Swords key="raid" className="w-3.5 h-3.5" />],
    ['rival', t.colRivals, <Users key="rival" className="w-3.5 h-3.5" />],
  ];

  return (
    <div className={`@container border ${borderCol} ${bgCard} p-3.5 sm:p-6 font-mono text-xs space-y-4`}>
      <div className={`flex flex-wrap items-baseline justify-between gap-2 border-b ${borderCol} pb-3.5`}>
        <h3 className="m-0 text-xs uppercase tracking-widest font-semibold">{t.colTitle}</h3>
        {collection && <span className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{tf(t.colRecordsHint, { n: collection.invert_at })}</span>}
      </div>

      {!signedIn ? (
        <div className={`min-h-[40vh] border border-dashed ${borderCol} flex flex-col items-center justify-center gap-3 p-8 text-center`}>
          <p className={`text-[11px] max-w-sm ${textMuted}`}>{t.colSignedOut}</p>
          <button
            type="button"
            onClick={onSignIn}
            className={`px-3 py-1.5 border ${borderCol} flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:border-emerald-500/60 hover:text-emerald-400`}
          >
            <LogIn className="w-3.5 h-3.5" />
            {t.signIn}
          </button>
        </div>
      ) : loadError ? (
        <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{loadError}</div>
      ) : (
        <>
          <div className={`grid grid-cols-2 @2xl:grid-cols-4 border-l border-t ${borderCol}`}>
            <Stat label={t.colBossesDown} value={collection ? fmt(totals.bosses) : '—'} borderCol={borderCol} textMuted={textMuted} />
            <Stat label={t.colRivalsBeaten} value={collection ? fmt(totals.rivals) : '—'} borderCol={borderCol} textMuted={textMuted} />
            <Stat label={t.colCleared} value={collection ? fmt(totals.cleared) : '—'} sub={collection ? `/ ${fmt(totals.met)}` : undefined} borderCol={borderCol} textMuted={textMuted} />
            <Stat label={t.colSidesOpen} value={collection ? fmt(totals.sidesOpen) : '—'} sub={collection ? `/ ${fmt(totals.sides)}` : undefined} borderCol={borderCol} textMuted={textMuted} />
          </div>

          <div className={`grid grid-cols-3 border-l border-t ${borderCol} text-[10px] uppercase tracking-wider`} role="group" aria-label={t.colTitle}>
            {filters.map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`h-8 border-r border-b ${borderCol} flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  filter === id ? 'font-bold text-amber-400 bg-amber-500/10' : `${textMuted} hover:text-amber-400`
                }`}
              >
                {icon}
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 gap-2">
            {collection
              ? shown.map((r) => <RecordCard key={`${r.kind}-${r.key}`} r={r} invertAt={collection.invert_at} borderCol={borderCol} textMuted={textMuted} />)
              : Array.from({ length: 8 }, (_, i) => <div key={i} className={`h-[14.5rem] border ${borderCol} animate-pulse bg-current/5`} aria-hidden />)}
          </div>
          <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.colHint}</p>
        </>
      )}
    </div>
  );
};
