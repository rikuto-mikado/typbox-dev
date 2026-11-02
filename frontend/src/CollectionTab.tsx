import React, { useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import type { BitsShopState, CollectionState } from './api';
import { BOSS_ART, RIVAL_ART, challengeAccent } from './challengeArt';
import { HpCells, Pixel, Strip } from './ChallengePanel';
import { tf, useI18n } from './i18n';
import { GRADES, trophyArt } from './trophyArt';

// COLLECTION (backend tracker/collection.py): the BITS // EXCHANGE's record of
// what study and the challenges have earned. Laid out like the CHALLENGES tab, on
// its stages and strips: one piece on show, then rows that scroll sideways, so
// the whole tab stays about one screen tall.

const fmt = (n: number) => n.toLocaleString('en-US');
const short = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
// What hasn't been beaten yet: a shape on the dark stage, and no more.
const SILHOUETTE = 'brightness-0 invert opacity-[0.1]';

type Trophy = CollectionState['trophies'][number];

const groupUnit = (group: string, t: ReturnType<typeof useI18n>['t']) =>
  ({ hours: t.colUnitHours, logs: t.colUnitLogs, days: t.colUnitDays, streak: t.colUnitStreak, beaten: t.colUnitBeaten, inverted: t.colUnitInverted, festival: t.colUnitFestival })[group] ?? '';

/** The piece being looked at, on a stage like a boss's, with the room's totals. */
const Showcase: React.FC<{ item: Trophy; have: number; byGrade: number[]; earned: number; total: number; borderCol: string; textMuted: string }> = ({
  item,
  have,
  byGrade,
  earned,
  total,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  const metal = GRADES[item.grade - 1];
  const accent = item.earned ? metal.color : '#71717a';
  return (
    <div className={`flex flex-col sm:flex-row border ${borderCol} overflow-hidden`} style={{ borderColor: `${accent}66`, boxShadow: `inset 0 1px 0 ${accent}44` }}>
      <div
        className="relative h-36 sm:h-auto sm:w-44 shrink-0 flex items-end justify-center overflow-hidden"
        style={{ background: `radial-gradient(ellipse 60% 55% at 50% 66%, ${accent}${item.earned ? '38' : '18'}, transparent 70%), linear-gradient(#0c0c10, #050507)` }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ background: 'repeating-linear-gradient(transparent 0 2px, #fff 2px 3px)' }} />
        <span className="absolute top-0 left-0 z-[1] px-1 text-[9px] font-bold leading-4 text-zinc-950" style={{ background: accent }}>
          {metal.name}
        </span>
        <span className="absolute bottom-3 w-24 h-2 rounded-[50%] bg-black ch-shadow" />
        <div className={`relative mb-4 ${item.earned ? 'ch-bob' : ''}`}>
          <Pixel key={item.id} art={trophyArt(item.group, item.grade, item.earned)} className="w-28 h-28 ch-in" style={item.earned ? { filter: `drop-shadow(0 0 14px ${accent}66)` } : undefined} />
        </div>
      </div>
      <div className="flex-1 min-w-0 p-3 flex flex-col gap-2">
        <div>
          <div className={`text-[8px] uppercase tracking-[0.3em] ${textMuted}`}>{groupUnit(item.group, t)}</div>
          <div className="text-base font-bold tracking-[0.15em] leading-tight tabular-nums" style={{ color: item.earned ? accent : undefined }}>
            {fmt(item.need)}
          </div>
          <p className={`m-0 mt-0.5 text-[11px] font-sans italic ${textMuted}`}>{item.earned ? metal.sub : t.colNotYet}</p>
        </div>
        <div className="space-y-1">
          <HpCells hp={Math.min(have, item.need)} max={item.need} accent={item.earned ? accent : metal.color} cells={30} height="h-2" />
          <div className={`text-[9px] uppercase tracking-wider tabular-nums ${textMuted}`}>{item.earned ? t.colEarnedLine : tf(t.colToGo, { a: fmt(have), b: fmt(item.need) })}</div>
        </div>
        <div className={`mt-auto pt-2 border-t ${borderCol} flex items-center gap-3`}>
          <span className="shrink-0 tabular-nums">
            <span className={`block text-[8px] uppercase tracking-[0.2em] ${textMuted}`}>{t.colHoldings}</span>
            <span className="text-[11px] font-bold">
              {earned} <span className={`font-normal ${textMuted}`}>/ {total}</span>
            </span>
          </span>
          <span className="flex-1 grid grid-cols-6 gap-1 min-w-0">
            {GRADES.map((g, i) => (
              <span key={g.name} className="text-center" title={g.name}>
                <span className="block h-2" style={{ background: byGrade[i] ? g.color : 'rgba(113,113,122,0.22)' }} />
                <span className={`block text-[9px] font-bold leading-4 tabular-nums ${byGrade[i] ? '' : textMuted}`}>{byGrade[i]}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
};

/** One challenger: both sides on one stage, sideways in a strip. */
const RecordCard: React.FC<{ r: CollectionState['records'][number]; invertAt: number; borderCol: string; textMuted: string }> = ({ r, invertAt, borderCol, textMuted }) => {
  const { t } = useI18n();
  const table = r.kind === 'raid' ? BOSS_ART : RIVAL_ART;
  const accent = challengeAccent(r.key);
  const other = r.inverted;
  const otherBeaten = (other?.wins ?? 0) > 0;
  const otherAccent = other ? challengeAccent(other.key) : accent;
  return (
    <div
      className={`shrink-0 snap-start w-40 border overflow-hidden ${r.wins ? '' : borderCol}`}
      style={otherBeaten ? { borderColor: otherAccent, boxShadow: `0 0 14px ${otherAccent}44` } : r.wins ? { borderColor: `${accent}66` } : undefined}
    >
      <span className="flex h-[4.5rem]">
        <span className="flex-1 flex items-end justify-center" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 75%, ${r.wins ? `${accent}38` : 'transparent'}, transparent 72%), linear-gradient(#0c0c10, #050507)` }}>
          {table[r.key] && <Pixel art={table[r.key]} className={`w-[3.75rem] h-[3.75rem] ${r.wins ? '' : SILHOUETTE}`} />}
        </span>
        {other && table[other.key] && (
          <span className="flex-1 flex items-end justify-center" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 75%, ${other.unlocked ? `${otherAccent}38` : 'transparent'}, transparent 72%), linear-gradient(#1a0506, #050102)` }}>
            <Pixel art={table[other.key]} className={`w-[3.75rem] h-[3.75rem] ${otherBeaten ? '' : other.unlocked ? 'opacity-75' : SILHOUETTE}`} />
          </span>
        )}
      </span>
      <span className="block px-1.5 py-1">
        <span className="block text-[10px] font-bold tracking-[0.15em] truncate" style={r.wins ? { color: accent } : undefined}>
          {r.name}
        </span>
        <span className={`flex items-center justify-between gap-1 text-[8px] uppercase tracking-wider tabular-nums h-4 ${textMuted}`}>
          <span>{r.wins ? tf(t.colWins, { n: r.wins }) : t.colNoWins}</span>
          {other &&
            (other.unlocked ? (
              <span className="flex items-center gap-0.5 font-bold shrink-0" style={{ color: otherAccent }}>
                <RefreshCcw className="w-2.5 h-2.5" />
                {otherBeaten ? `×${other.wins}` : t.colOpen}
              </span>
            ) : (
              <span className="flex gap-0.5 shrink-0" aria-hidden>
                {Array.from({ length: invertAt }, (_, i) => (
                  <span key={i} className="w-2 h-1" style={{ background: i < r.wins ? accent : 'rgba(113,113,122,0.3)' }} />
                ))}
              </span>
            ))}
        </span>
      </span>
    </div>
  );
};

export const CollectionTab: React.FC<{ state: BitsShopState | null; loadError: string | null; borderCol: string; textMuted: string }> = ({ state, loadError, borderCol, textMuted }) => {
  const { t } = useI18n();
  const collection = state?.collection;
  const [picked, setPicked] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  if (loadError) return <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{loadError}</div>;
  if (!collection) {
    return (
      <div className={`p-6 flex justify-center ${textMuted}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }
  const { trophies, groups } = collection;
  const progressOf = (group: string) => groups.find((g) => g.id === group)?.progress ?? 0;
  const earned = trophies.filter((x) => x.earned);
  const byGrade = GRADES.map((_, i) => earned.filter((x) => x.grade === i + 1).length);
  // Best held first; the piece a group opens on is its best, or else its first.
  const bestOf = (rows: Trophy[]) => [...rows].filter((x) => x.earned).sort((a, b) => b.grade - a.grade || b.need - a.need)[0] ?? rows[0];
  const focus = trophies.find((x) => x.id === picked) ?? bestOf(groupId ? trophies.filter((x) => x.group === groupId) : trophies);
  const activeGroup = groupId ?? focus.group;
  const shelf = trophies.filter((x) => x.group === activeGroup);

  return (
    <div className="space-y-3">
      <Showcase item={focus} have={progressOf(focus.group)} byGrade={byGrade} earned={earned.length} total={trophies.length} borderCol={borderCol} textMuted={textMuted} />

      <section className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold">{t.colTrophies}</div>
        {/* Which kind: a row of its own, so the pieces below are always one row. */}
        <Strip borderCol={borderCol} textMuted={textMuted} label={t.colTrophies}>
          {groups.map((g) => {
            const rows = trophies.filter((x) => x.group === g.id);
            const done = rows.filter((x) => x.earned).length;
            const best = bestOf(rows);
            const on = g.id === activeGroup;
            const ink = best.earned ? GRADES[best.grade - 1].color : '#71717a';
            return (
              <button
                key={g.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  setGroupId(g.id);
                  setPicked(null);
                }}
                className={`shrink-0 snap-start flex items-center gap-1.5 p-1 pr-2 border text-left cursor-pointer transition-all ${on ? '' : `${borderCol} opacity-70 hover:opacity-100`}`}
                style={on ? { borderColor: ink, boxShadow: `0 0 0 1px ${ink}55`, background: `${ink}14` } : undefined}
              >
                <span className="w-8 h-8 shrink-0 flex items-center justify-center bg-zinc-950">
                  <Pixel art={trophyArt(g.id, best.grade, best.earned)} className="w-7 h-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-bold tracking-[0.12em] whitespace-nowrap">{g.name}</span>
                  <span className={`block text-[8px] tracking-wider tabular-nums ${textMuted}`}>
                    {done} / {rows.length}
                  </span>
                </span>
              </button>
            );
          })}
        </Strip>
        <Strip borderCol={borderCol} textMuted={textMuted} label={activeGroup}>
          {shelf.map((x) => {
            const metal = GRADES[x.grade - 1];
            const on = x.id === focus.id;
            const ink = x.earned ? metal.color : '#71717a';
            return (
              <button
                key={x.id}
                type="button"
                role="option"
                aria-selected={on}
                aria-label={`${fmt(x.need)} ${groupUnit(x.group, t)}, ${metal.name}`}
                title={`${fmt(x.need)} ${groupUnit(x.group, t)} · ${metal.name}`}
                onClick={() => setPicked(x.id)}
                className={`shrink-0 snap-start w-[4.5rem] border overflow-hidden cursor-pointer transition-all ${on ? '' : `${borderCol} ${x.earned ? '' : 'opacity-70'} hover:opacity-100`}`}
                style={on ? { borderColor: ink, boxShadow: `0 0 0 1px ${ink}55, 0 0 14px ${ink}33` } : undefined}
              >
                <span className="flex h-14 items-end justify-center" style={{ background: `radial-gradient(ellipse 60% 60% at 50% 72%, ${x.earned ? `${ink}3a` : 'transparent'}, transparent 70%), linear-gradient(#0c0c10, #050507)` }}>
                  <Pixel art={trophyArt(x.group, x.grade, x.earned)} className={`w-12 h-12 mb-0.5 ${on && x.earned ? 'ch-bob' : ''}`} />
                </span>
                <span className="block py-0.5 text-center text-[10px] font-bold tabular-nums" style={x.earned ? { color: ink } : undefined}>
                  {short(x.need)}
                </span>
              </button>
            );
          })}
        </Strip>
      </section>

      <section className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold">{t.colRecords}</span>
          <span className={`text-[9px] uppercase tracking-wider ${textMuted}`}>{tf(t.colRecordsHint, { n: collection.invert_at })}</span>
        </div>
        <Strip borderCol={borderCol} textMuted={textMuted} label={t.colRecords}>
          {collection.records.map((r) => (
            <RecordCard key={`${r.kind}-${r.key}`} r={r} invertAt={collection.invert_at} borderCol={borderCol} textMuted={textMuted} />
          ))}
        </Strip>
      </section>
    </div>
  );
};
