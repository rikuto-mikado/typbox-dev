import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Lock, RefreshCcw, Swords } from 'lucide-react';
import type { ActiveChallenge, ActiveRaid, ActiveRival, BitsShopState, ChallengeResult, Festival, FestivalPass, Inversion, RaidHitKind } from './api';
import { CategoryChips, type ChipCategory } from './CategoryChips';
import { BitShard } from './BitsBadge';
import { BOSS_ART, RIVAL_ART, challengeAccent, challengeRank, type PixelArt } from './challengeArt';
import { getZonedParts, tf, useI18n } from './i18n';

// CHALLENGES (backend tracker/challenges.py): the BOSS RAID and RIVAL cards
// of the BITS // EXCHANGE, the catalog, the result card and the one-line
// ticker under the SYSTEM CHRONOMETER.
// The server keeps the score; a rival's "right now" is read off the
// schedule it sends, against this device's clock.

const fmt = (n: number) => n.toLocaleString('en-US');
const hours = (min: number) => `${(Math.max(0, min) / 60).toFixed(1)}H`;
const left = (ms: number) => {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  if (h >= 48) return `${Math.floor(h / 24)}D ${h % 24}H`;
  return h > 0 ? `${h}H ${String(mins % 60).padStart(2, '0')}M` : `${mins}M`;
};

/** Re-renders every `ms` and returns the current time. */
const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
};

// ------------------------------------------------------------------ pixels
export const Pixel: React.FC<{ art: PixelArt; className?: string; style?: React.CSSProperties }> = ({ art, className, style }) => (
  <svg viewBox={`0 0 ${art.rows[0].length} ${art.rows.length}`} shapeRendering="crispEdges" className={className} style={style} aria-hidden>
    {art.rows.flatMap((row, y) => {
      // Runs of one colour become one rect.
      const rects: React.ReactNode[] = [];
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        let end = x + 1;
        while (end < row.length && row[end] === c) end++;
        if (c !== '.' && art.palette[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height="1" fill={art.palette[c]} />);
        x = end;
      }
      return rects;
    })}
  </svg>
);

/** The C · B · A · S class badge, the same as on the buff cards. */
export const RankBadge: React.FC<{ challengeKey: string; className?: string }> = ({ challengeKey, className = '' }) => {
  const { t } = useI18n();
  const rank = challengeRank(challengeKey);
  return (
    <span
      className={`absolute z-[1] px-1 text-[9px] font-bold leading-4 text-zinc-950 ${className}`}
      style={{ background: challengeAccent(challengeKey) }}
      title={tf(t.bitsClass, { r: rank })}
    >
      {rank}
    </span>
  );
};

/** Segmented HP meter; `ghost` is HP just lost, shown pale for a moment. */
export const HpCells: React.FC<{ hp: number; max: number; accent: string; cells?: number; ghost?: number; height?: string }> = ({
  hp,
  max,
  accent,
  cells = 40,
  ghost,
  height = 'h-2.5',
}) => {
  const lit = Math.ceil((Math.max(0, hp) / max) * cells);
  const pale = Math.ceil((Math.max(hp, ghost ?? hp) / max) * cells);
  return (
    <div className="flex gap-[2px]" aria-hidden>
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className={`flex-1 ${height} transition-colors duration-500`}
          style={{ background: i < lit ? accent : i < pale ? '#fafafa' : 'rgba(113,113,122,0.22)', opacity: i >= lit && i < pale ? 0.75 : 1 }}
        />
      ))}
    </div>
  );
};

const hitColor = (k: RaidHitKind | 'heal' | 'attack' | 'parry') =>
  k === 'crit' ? '#fde047' : k === 'heal' || k === 'parry' ? '#4ade80' : k === 'hit' ? '#fafafa' : k === 'attack' ? '#fb7185' : '#a1a1aa';

/** A two-tap button: arm, then confirm within three seconds. */
const ConfirmButton: React.FC<{ label: string; confirm: string; onConfirm: () => Promise<void> | void; borderCol: string; textMuted: string }> = ({
  label,
  confirm,
  onConfirm,
  borderCol,
  textMuted,
}) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!armed) return setArmed(true);
        setArmed(false);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
      className={`px-2.5 py-1 border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
        armed ? 'border-rose-500 bg-rose-500 text-zinc-950' : `${borderCol} ${textMuted} hover:text-rose-400 hover:border-rose-500/60`
      }`}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : armed ? confirm : label}
    </button>
  );
};

// ----------------------------------------------------------------- invert
/** Plays the turn, swapping sides out of sight. Reduced-motion users just get
 *  the swap. Returns the class for what turns, and the toggle. */
const useTurn = (onSwap: () => void) => {
  const [phase, setPhase] = useState<'out' | 'in' | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);
  const turn = () => {
    if (phase) return;
    setPhase('out');
    timers.current.push(
      window.setTimeout(() => {
        onSwap();
        setPhase('in');
        timers.current.push(window.setTimeout(() => setPhase(null), 430));
      }, 200)
    );
  };
  return { turn, turnClass: phase === 'out' ? 'ch-turn-out' : phase === 'in' ? 'ch-turn-in' : '' };
};

/** The corner of a challenger's stage: how far to its other side, then the switch. */
const InvertControl: React.FC<{ inversion?: Inversion<unknown> | null; inverted: boolean; onTurn: () => void; accent: string }> = ({
  inversion,
  inverted,
  onTurn,
  accent,
}) => {
  const { t } = useI18n();
  if (!inversion) return null;
  if (!inversion.offer) {
    return (
      <span className="absolute top-1.5 right-1.5 z-[2] px-1.5 py-1 border border-zinc-600 bg-zinc-950/85 text-[8px] uppercase tracking-wider tabular-nums text-zinc-400">
        {tf(t.chInvertProgress, { a: inversion.wins, b: inversion.need })}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onTurn}
      aria-pressed={inverted}
      className="absolute top-1.5 right-1.5 z-[2] flex items-center gap-1 px-2 py-1.5 border bg-zinc-950/85 text-[9px] font-bold uppercase tracking-wider cursor-pointer ch-glint"
      style={{ borderColor: accent, color: accent }}
    >
      <RefreshCcw className="w-3 h-3" />
      {inverted ? t.chRevert : t.chInvert}
    </button>
  );
};

/** Stage background: the other side's is darker and bleeds red. */
const stageGlow = (accent: string, inverted: boolean, y = 62) =>
  inverted
    ? `radial-gradient(ellipse 70% 60% at 50% ${y}%, ${accent}38, transparent 72%), linear-gradient(#1a0506, #050102)`
    : `radial-gradient(ellipse 60% 55% at 50% ${y}%, ${accent}30, transparent 70%), linear-gradient(#0c0c10, #050507)`;

// ------------------------------------------------------------------- raid
interface Float {
  id: number;
  text: string;
  kind: RaidHitKind | 'heal' | 'attack';
}

const RAID_SEEN_KEY = 'typbox_raid_hit_seen';
const ATTACK_SEEN_KEY = 'typbox_raid_attack_seen';

/** What the boss is about to do and when (a raid from before the blows came
 *  every few hours also shows how close the study comes to parrying it). */
const AttackPanel: React.FC<{ raid: ActiveRaid; now: number; borderCol: string; textMuted: string }> = ({ raid, now, borderCol, textMuted }) => {
  const { t } = useI18n();
  const attack = raid.attack;
  if (!attack) return null;
  const ready = attack.parry > 0 && attack.dealt >= attack.parry;
  const nextAt = attack.next_at ? new Date(attack.next_at).getTime() : null;
  return (
    <div className={`px-3 py-2 border-t ${borderCol} space-y-1`}>
      <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider">
        <span className="flex items-center gap-1.5 min-w-0">
          <Swords className="w-3 h-3 shrink-0 text-rose-400" />
          <span className="truncate text-rose-400 font-bold tabular-nums">
            {nextAt !== null ? tf(t.chAttackNext, { name: attack.name, t: left(nextAt - now) }) : t.chAttackNone}
          </span>
        </span>
        <span className="shrink-0 text-rose-400 tabular-nums">−{fmt(attack.dmg)} BITS</span>
      </div>
      {attack.counter ? (
        <div className="text-[9px] uppercase tracking-wider tabular-nums text-rose-300/80">{tf(t.chAttackCounter, { n: fmt(attack.counter) })}</div>
      ) : null}
      {nextAt !== null && attack.hp ? (
        // Nothing parries it now: the bar is the clock running down to the blow.
        <span className="block relative h-1.5 bg-zinc-500/20 overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 bg-rose-500/80 transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, 100 - ((nextAt - now) / (attack.every * 3600000)) * 100))}%` }}
          />
        </span>
      ) : nextAt !== null ? (
        <div className="flex items-center gap-2">
          <span className="relative flex-1 h-1.5 bg-zinc-500/20 overflow-hidden">
            <span className="absolute inset-y-0 left-0 transition-[width] duration-500" style={{ width: `${Math.min(100, (attack.dealt / attack.parry) * 100)}%`, background: ready ? '#34d399' : '#fb7185' }} />
          </span>
          <span className={`shrink-0 text-[9px] uppercase tracking-wider tabular-nums ${ready ? 'text-emerald-400 font-bold' : textMuted}`}>
            {ready ? t.chAttackParried : tf(t.chAttackParry, { a: hours(attack.dealt), b: hours(attack.parry) })}
          </span>
        </div>
      ) : null}
      {(raid.struck ?? 0) > 0 && (
        <div className="text-[9px] uppercase tracking-wider tabular-nums text-rose-400 font-bold">{tf(t.chAttackTaken, { n: fmt(raid.struck ?? 0) })}</div>
      )}
    </div>
  );
};

export const RaidCard: React.FC<{ raid: ActiveRaid; borderCol: string; textMuted: string; onForfeit: () => Promise<void> }> = ({
  raid,
  borderCol,
  textMuted,
  onForfeit,
}) => {
  const { t } = useI18n();
  const now = useNow(30_000);
  const accent = challengeAccent(raid.key);
  const art = BOSS_ART[raid.key];
  const [floats, setFloats] = useState<Float[]>([]);
  const [flash, setFlash] = useState(0);
  const [ghost, setGhost] = useState<number | undefined>(undefined);
  const [struck, setStruck] = useState(0);
  const timers = useRef<number[]>([]);
  const inverted = Boolean(raid.inverted_of);

  // An attack that landed since this card was last open shakes the stage once.
  const lastAttack = raid.attack?.log[raid.attack.log.length - 1];
  useEffect(() => {
    if (!lastAttack || lastAttack.parried) return;
    const key = `${raid.id}-${lastAttack.at}`;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(ATTACK_SEEN_KEY);
    } catch {
      // storage unavailable: just play it
    }
    if (seen === key) return;
    try {
      localStorage.setItem(ATTACK_SEEN_KEY, key);
    } catch {
      // storage unavailable: it may play again
    }
    const id = window.setTimeout(() => {
      setStruck((n) => n + 1);
      setFloats((f) => [...f, { id: Date.now(), text: `−${lastAttack.dmg} BITS`, kind: 'attack' }]);
      window.setTimeout(() => setFloats([]), 1400);
    }, 500);
    return () => window.clearTimeout(id);
  }, [raid.id, lastAttack]);

  // Opening the card right after a commit replays that hit once, so the
  // blow lands where it can be seen.
  const latest = raid.events[0];
  useEffect(() => {
    if (!latest) return;
    const key = `${raid.id}-${latest.at}`;
    let seen: string | null = null;
    try {
      seen = sessionStorage.getItem(RAID_SEEN_KEY);
    } catch {
      // storage unavailable: just replay
    }
    if (seen === key || Date.now() - new Date(latest.at).getTime() > 15 * 60_000) return;
    const list = timers.current;
    list.push(
      window.setTimeout(() => {
        try {
          sessionStorage.setItem(RAID_SEEN_KEY, key);
        } catch {
          // storage unavailable: it may replay once more
        }
        const text =
          latest.hit === 'crit'
            ? `CRIT −${latest.damage}`
            : latest.hit === 'hit'
            ? `−${latest.damage}`
            : latest.hit === 'block'
            ? 'BLOCKED'
            : latest.hit === 'miss'
            ? 'MISS'
            : 'NO HEAD';
        if (latest.damage) {
          setFlash((f) => f + 1);
          setGhost(raid.hp + latest.damage);
          list.push(window.setTimeout(() => setGhost(undefined), 700));
        }
        setFloats((f) => [...f, { id: Date.now(), text, kind: latest.hit }]);
        list.push(window.setTimeout(() => setFloats([]), 1200));
      }, 350)
    );
    return () => {
      list.forEach((id) => window.clearTimeout(id));
    };
  }, [raid.id, raid.hp, latest]);

  const startMs = new Date(raid.started_at).getTime();
  const day = Math.min(raid.days, Math.floor((now - startMs) / 86_400_000) + 1);

  return (
    <div className={`border ${borderCol} overflow-hidden`} style={{ boxShadow: `inset 0 1px 0 ${accent}44` }}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${borderCol} text-[10px] uppercase tracking-wider`}>
        <span className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[9px] font-bold text-zinc-950" style={{ background: accent }}>
            RAID · {challengeRank(raid.key)}
          </span>
          <span className={textMuted}>{tf(t.chDayOf, { a: day, b: raid.days })}</span>
          <span className={textMuted}>· {tf(t.chLeft, { t: left(new Date(raid.expires_at).getTime() - now) })}</span>
        </span>
        <span className={`${textMuted} tabular-nums`}>
          {t.chLoot} <span className="text-amber-400 font-bold">+{fmt(raid.loot)}</span>
          {raid.full_loot != null && raid.full_loot > raid.loot && (
            <span className="ml-1 line-through opacity-60">{fmt(raid.full_loot)}</span>
          )}
        </span>
      </div>

      {/* Stage: always a dark screen, whatever the theme. */}
      <div
        key={struck}
        className={`relative h-52 sm:h-60 flex items-end justify-center overflow-hidden ${struck ? 'ch-struck' : ''}`}
        style={{ background: stageGlow(accent, inverted) }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-16 opacity-40"
          style={{
            background: `repeating-linear-gradient(90deg, ${accent}22 0 1px, transparent 1px 32px), linear-gradient(transparent, ${accent}10)`,
            maskImage: 'linear-gradient(transparent, black)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ background: 'repeating-linear-gradient(transparent 0 2px, #fff 2px 3px)' }} />
        <span className="absolute bottom-7 w-36 h-3 rounded-[50%] bg-black ch-shadow" />
        <div className="relative mb-8">
          <div key={flash} className={flash ? 'ch-hit' : ''}>
            <div className={`ch-bob ${raid.trait === 'dodge' || raid.trait === 'afterimage' ? 'ch-flicker' : ''}`}>
              {art && <Pixel art={art} className="w-36 h-36 sm:w-44 sm:h-44" style={{ filter: `drop-shadow(0 0 18px ${accent}55)` }} />}
            </div>
          </div>
          {floats.map((f) => (
            <span
              key={f.id}
              className="absolute left-1/2 top-6 ch-float font-mono font-bold tabular-nums whitespace-nowrap pointer-events-none"
              style={{ color: hitColor(f.kind), fontSize: f.kind === 'crit' ? 22 : 16, textShadow: '0 2px 0 #000' }}
            >
              {f.text}
            </span>
          ))}
        </div>
      </div>

      <div className={`px-3 pt-3 pb-2 space-y-2 border-t ${borderCol}`}>
        <div className="flex items-end justify-between gap-2">
          <span className="min-w-0">
            <span className={`block text-[9px] tracking-[0.3em] ${textMuted}`}>{raid.title}</span>
            <span className="block text-lg font-bold tracking-[0.15em] leading-tight" style={{ color: accent }}>
              {raid.name}
            </span>
          </span>
          <span className="text-right tabular-nums shrink-0">
            <span className={`block text-[9px] tracking-wider ${textMuted}`}>{t.chHp}</span>
            <span className="text-sm font-bold">
              {hours(raid.hp)} <span className={`font-normal ${textMuted}`}>/ {hours(raid.max_hp)}</span>
            </span>
          </span>
        </div>
        {raid.heads ? (
          <div className="space-y-1.5">
            {raid.heads.map((h) => (
              <div key={h.code} className="flex items-center gap-2">
                <span className="w-12 text-[9px] font-bold tracking-wider truncate" style={{ color: h.color }}>
                  [{h.code}]
                </span>
                <span className="flex-1">
                  <HpCells hp={h.hp} max={h.max} accent={h.hp ? h.color : '#3f3f46'} cells={20} />
                </span>
                <span className={`w-9 text-right text-[9px] tabular-nums ${textMuted}`}>{h.hp ? hours(h.hp) : '✕'}</span>
              </div>
            ))}
          </div>
        ) : (
          <HpCells hp={raid.hp} max={raid.max_hp} accent={accent} ghost={ghost} />
        )}
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider">
          <span className="px-1.5 py-0.5 border shrink-0" style={{ borderColor: `${accent}66`, color: accent }}>
            {t.chTrait}
          </span>
          <span className={textMuted}>{raid.trait_line}</span>
        </div>
      </div>

      <AttackPanel raid={raid} now={now} borderCol={borderCol} textMuted={textMuted} />

      <div className={`px-3 py-2 border-t ${borderCol} min-h-[4.5rem]`}>
        <div className={`text-[9px] tracking-[0.3em] mb-1 ${textMuted}`}>{t.chCombatLog}</div>
        <CombatLog raid={raid} textMuted={textMuted} />
      </div>

      <div className={`px-3 py-2 border-t ${borderCol} flex flex-wrap items-center justify-between gap-2`}>
        <span className={`text-[9px] font-sans ${textMuted}`}>{t.chForfeitHint}</span>
        <ConfirmButton label={t.chForfeit} confirm={t.chForfeitConfirm} onConfirm={onForfeit} borderCol={borderCol} textMuted={textMuted} />
      </div>
    </div>
  );
};

const CombatLog: React.FC<{ raid: ActiveRaid; textMuted: string }> = ({ raid, textMuted }) => {
  const { t, formatTime } = useI18n();
  const rows = [
    ...raid.events.map((e) => ({
      at: e.at,
      label: `${e.head ? `[${e.head}] ` : ''}${e.minutes}M`,
      value:
        e.hit === 'crit'
          ? `CRIT −${e.damage}`
          : e.hit === 'hit'
          ? `−${e.damage}`
          : e.hit === 'block'
          ? t.chToastBlock
          : e.hit === 'miss'
          ? t.chToastMiss
          : 'NO HEAD',
      kind: e.hit as RaidHitKind | 'heal' | 'attack' | 'parry',
    })),
    ...raid.heals.map((h) => ({ at: h.at, label: '', value: tf(t.chHealed, { h: hours(h.minutes) }), kind: 'heal' as const })),
    ...(raid.attack?.log ?? []).map((a) => ({
      at: a.at,
      label: raid.attack?.name ?? '',
      value: a.parried ? t.chAttackBlocked : tf(t.chAttackLanded, { n: fmt(a.dmg) }),
      kind: a.parried ? ('parry' as const) : ('attack' as const),
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);
  if (!rows.length) return <div className={`text-[10px] ${textMuted}`}>{t.chNoHits}</div>;
  return (
    <ul className="space-y-0.5">
      {rows.map((r, i) => (
        <li key={`${r.at}-${i}`} className={`flex justify-between gap-2 text-[10px] tabular-nums ${i ? textMuted : ''}`}>
          <span>
            <span className={textMuted}>{formatTime(r.at)}</span> {r.label}
          </span>
          <span className="font-bold" style={{ color: i === 0 || r.kind === 'heal' || r.kind === 'attack' || r.kind === 'parry' ? hitColor(r.kind) : undefined }}>
            {r.value}
          </span>
        </li>
      ))}
    </ul>
  );
};

// ------------------------------------------------------------------ rival
const RIVAL_LINES: Record<string, { ahead: string; behind: string; studying: string }> = {
  orion: { ahead: 'Consistency beats talent.', behind: 'Impressive. I will be up at six.', studying: 'Heads down.' },
  nova: { ahead: 'You sleep, I study.', behind: 'Enjoy the lead while the sun is up.', studying: 'Do not disturb.' },
  rush: { ahead: 'Told you. Burst mode.', behind: 'Watch the weekend.', studying: 'NO TIME. TALK LATER.' },
  kai: { ahead: 'Twenty-five minutes at a time. It adds up.', behind: 'Break is over. Back to it.', studying: 'Timer is running. Talk in 25.' },
  mika: { ahead: 'Small steps, every day.', behind: 'Wait, you study THAT much?', studying: 'Studying between stations.' },
  ace: { ahead: 'As expected.', behind: 'Interesting. I will adjust.', studying: 'Focus. Please.' },
  santa: { ahead: 'Ho ho. You are on the list.', behind: 'I said I start on the 24th.', studying: 'Which way is Finland?' },
  rudolph: { ahead: 'I can see further than you.', behind: 'Save it for the storm.', studying: 'Recalculating the route.' },
  miko: { ahead: 'The year starts as it means to go on.', behind: 'The omens did say this might happen.', studying: 'Silence, please. This is a shrine.' },
  sakura: { ahead: 'I will be gone soon. Catch up while you can.', behind: 'Not bad, for someone who stays.', studying: 'Reading under the trees.' },
  orihime: { ahead: 'One thread at a time.', behind: 'I do have a lot on my loom.', studying: 'The cloth will not weave itself.' },
  copycat: { ahead: 'How am I winning? Did you copy me?', behind: 'Great. Now can I see your notes?', studying: 'Almost done copying.' },
  ghost: { ahead: 'I have had a long time to revise.', behind: 'Time is not a problem for me.', studying: 'Question four. Still.' },
  choco: { ahead: 'I have a very good reason.', behind: 'This changes nothing. I will temper harder.', studying: 'Do not talk to me about ratios.' },
  usagi: { ahead: 'It looks small from up here.', behind: 'Gravity is on your side.', studying: 'Orbits are just falling, slowly.' },
  iincho: { ahead: 'As scheduled.', behind: 'That is not on the schedule.', studying: 'Please hold your questions.' },
  orion_inverted: { ahead: 'Where were you this morning?', behind: 'Then I will start earlier.', studying: 'The sun is not up. I am.' },
  nova_inverted: { ahead: 'You are too bright to see in here.', behind: 'So you have found the dark.', studying: 'Quiet. It is finally night.' },
  rush_inverted: { ahead: 'Tick. Tick. Tick.', behind: 'THAT was your last day? Fine.', studying: 'NO. TIME.' },
  kai_inverted: { ahead: 'Your sessions run too long.', behind: 'Sharp. Keep it under thirty.', studying: 'The timer is the only thing that talks.' },
  mika_inverted: { ahead: 'One lost day is all it takes.', behind: 'Every day? Really? Then tomorrow too.', studying: 'This train does not stop.' },
  ace_inverted: { ahead: 'You were never in this race.', behind: 'I have forgotten how this feels.', studying: '...' },
};

type RivalStatus =
  | { kind: 'life'; what: string; nextAt: number | null }
  | { kind: 'study'; topic: string; elapsed: number; len: number }
  | { kind: 'break'; topic: string; inMin: number }
  | { kind: 'sleep'; wakes: number }
  | { kind: 'idle'; nextAt: number | null };

interface Span {
  start: number;
  end: number;
  topic?: string;
}

const rivalStatus = (plan: Span[], sleep: Span[], now: number, life?: Span[]): RivalStatus => {
  const s = plan.find((p) => now >= p.start && now < p.end);
  if (s) return { kind: 'study', topic: s.topic ?? '', elapsed: Math.floor((now - s.start) / 60000), len: Math.round((s.end - s.start) / 60000) };
  const z = sleep.find((p) => now >= p.start && now < p.end);
  if (z) {
    // Wrapped nights come as two spans; wake at the end of the run.
    const next = sleep.find((p) => p.start === z.end);
    return { kind: 'sleep', wakes: next ? next.end : z.end };
  }
  const next = plan.find((p) => p.start > now);
  const doing = life?.find((p) => now >= p.start && now < p.end);
  if (doing) return { kind: 'life', what: doing.topic ?? '', nextAt: next ? next.start : null };
  if (next && next.start - now <= 120 * 60000) return { kind: 'break', topic: next.topic ?? '', inMin: Math.ceil((next.start - now) / 60000) };
  return { kind: 'idle', nextAt: next ? next.start : null };
};

const StatusDot: React.FC<{ status: RivalStatus; accent: string }> = ({ status, accent }) =>
  status.kind === 'study' ? (
    <span className="inline-block w-2 h-2 rounded-full ch-pulse shrink-0" style={{ background: accent, color: accent }} />
  ) : status.kind === 'break' ? (
    <span className="inline-block w-2 h-2 rounded-full border shrink-0" style={{ borderColor: accent }} />
  ) : (
    <span className="inline-block w-2 h-2 rounded-full bg-zinc-500/50 shrink-0" />
  );

const useRivalSpans = (rival: ActiveRival) =>
  useMemo(
    () => ({
      plan: rival.plan.map((p) => ({ start: new Date(p.start).getTime(), end: new Date(p.end).getTime(), topic: p.topic })),
      sleep: rival.sleep.map((p) => ({ start: new Date(p.start).getTime(), end: new Date(p.end).getTime() })),
      life: (rival.life ?? []).map((p) => ({ start: new Date(p.start).getTime(), end: new Date(p.end).getTime(), topic: p.label })),
    }),
    [rival.plan, rival.sleep, rival.life]
  );

const useStatusText = () => {
  const { t, formatTime } = useI18n();
  return (s: RivalStatus) =>
    s.kind === 'study'
      ? tf(t.chStudying, { topic: s.topic, t: `${Math.floor(s.elapsed / 60)}:${String(s.elapsed % 60).padStart(2, '0')}` })
      : s.kind === 'break'
      ? tf(t.chBreak, { topic: s.topic, m: s.inMin })
      : s.kind === 'sleep'
      ? tf(t.chAsleep, { time: formatTime(s.wakes) })
      : s.kind === 'life'
      ? s.nextAt !== null
        ? tf(t.chLife, { what: s.what, time: formatTime(s.nextAt) })
        : tf(t.chLifeDone, { what: s.what })
      : s.nextAt !== null
      ? tf(t.chOffDesk, { time: formatTime(s.nextAt) })
      : t.chDoneToday;
};

const HOUR_PX = 28;

/** The rival's day as a scrolling column (scrolled to now on open). The
 *  hours to come sit under fog: their sessions show only as shapes, no
 *  times or topics, so the day keeps some surprise. */
const DayTimeline: React.FC<{ accent: string; plan: Span[]; sleep: Span[]; life?: Span[]; now: number; midnight: number; textMuted: string }> = ({
  accent,
  plan,
  sleep,
  life,
  now,
  midnight,
  textMuted,
}) => {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const dayEnd = midnight + 86_400_000;
  const y = (ms: number) => ((Math.max(midnight, Math.min(dayEnd, ms)) - midnight) / 3_600_000) * HOUR_PX;
  const nowY = y(now);
  const placed = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || placed.current) return;
    el.scrollTop = Math.max(0, nowY - el.clientHeight * 0.45);
    placed.current = true;
  }, [nowY]);
  const inDay = (s: Span) => s.end > midnight && s.start < dayEnd;
  return (
    <div ref={ref} className="relative h-44 @xl:h-60 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
      <div className="relative ml-9 mr-1 border-l border-zinc-500/30" style={{ height: 24 * HOUR_PX }}>
        {Array.from({ length: 25 }, (_, h) => (
          <span key={h} className="absolute left-0 right-0" style={{ top: h * HOUR_PX }}>
            <span className={`absolute -left-1 w-1 h-px ${h % 3 ? 'bg-zinc-500/30' : 'bg-zinc-500/60'}`} />
            {h % 3 === 0 && (
              <span className={`absolute -left-9 -translate-y-1/2 text-[8px] tabular-nums ${textMuted}`}>{String(h).padStart(2, '0')}:00</span>
            )}
          </span>
        ))}
        {sleep.filter(inDay).map((s) => (
          <span
            key={`z-${s.start}`}
            className="absolute left-0 right-0"
            style={{
              top: y(s.start),
              height: y(s.end) - y(s.start),
              background: 'repeating-linear-gradient(135deg, rgba(113,113,122,0.14) 0 4px, transparent 4px 8px)',
            }}
          />
        ))}
        {/* Their day away from the desk: only what has already happened shows. */}
        {life?.filter((s) => inDay(s) && s.start <= now).map((s) => (
          <span
            key={`l-${s.start}`}
            className={`absolute left-1 right-1 px-1 text-[8px] leading-3 tracking-wider ${textMuted}`}
            style={{
              top: y(s.start),
              height: Math.max(3, y(s.end) - y(s.start)),
              background: 'rgba(113,113,122,0.1)',
              borderLeft: '2px solid rgba(113,113,122,0.45)',
            }}
          >
            {/* Kept in view while a long stretch scrolls past. */}
            <span className="sticky top-0 block truncate">{s.topic}</span>
          </span>
        ))}
        {plan.filter(inDay).map((s) => {
          const seen = s.start <= now;
          return (
            <span
              key={s.start}
              className="absolute left-1 right-1 px-1 text-[8px] leading-3 overflow-hidden"
              style={{
                top: y(s.start),
                height: Math.max(3, y(s.end) - y(s.start)),
                background: seen ? `${accent}55` : 'transparent',
                border: seen ? undefined : `1px dashed ${accent}55`,
                borderLeft: `2px solid ${accent}${seen ? '' : '66'}`,
              }}
            >
              {seen ? s.topic : ''}
            </span>
          );
        })}
        {/* Fog over the hours still to come. */}
        <div
          className="absolute -left-px right-0 bottom-0 backdrop-blur-[2px]"
          style={{
            top: nowY,
            background: 'linear-gradient(rgba(113,113,122,0.08), rgba(113,113,122,0.22)), repeating-linear-gradient(0deg, rgba(113,113,122,0.06) 0 1px, transparent 1px 4px)',
          }}
        >
          <span className={`sticky top-1 block pt-1.5 text-center text-[8px] uppercase tracking-[0.4em] ${textMuted}`}>{t.chFogLabel}</span>
        </div>
        <span className="absolute -left-1 right-0 h-px bg-rose-500" style={{ top: nowY }}>
          <span className="absolute -left-0.5 -top-[3px] w-[7px] h-[7px] rounded-full bg-rose-500" />
        </span>
      </div>
    </div>
  );
};

export const RivalCard: React.FC<{ rival: ActiveRival; borderCol: string; textMuted: string; onForfeit: () => Promise<void> }> = ({
  rival,
  borderCol,
  textMuted,
  onForfeit,
}) => {
  const { t, timeZone, formatTime } = useI18n();
  const now = useNow(20_000);
  const accent = challengeAccent(rival.key);
  const { plan, sleep, life } = useRivalSpans(rival);
  const status = rivalStatus(plan, sleep, now, life);
  const statusText = useStatusText();
  // A duel runs the 72 hours from the moment it was bought.
  const starts = new Date(rival.starts_at).getTime();
  const ends = new Date(rival.ends_at ?? rival.expires_at).getTime();
  const started = now >= starts;
  const dayIndex = Math.max(0, rival.days.findIndex((d) => d.state === 'live'));

  // The server's score is as of the last fetch; the rival's side keeps
  // moving with the clock between fetches (mine only moves on a commit).
  // A session already under way when the duel began counts from its start.
  const theirsLive = useMemo(
    () =>
      plan.reduce((sum, p) => {
        const lo = Math.max(p.start, starts);
        const hi = Math.min(p.end, ends, now);
        return hi > lo ? sum + (hi - lo) / 60000 : sum;
      }, 0),
    [plan, now, starts, ends]
  );
  const theirs = Math.max(rival.theirs, Math.floor(theirsLive));
  const mine = rival.mine;
  const today = rival.days[dayIndex];
  const theirsToday = today ? Math.max(today.theirs, theirs - rival.days.slice(0, dayIndex).reduce((s, d) => s + d.theirs, 0)) : 0;
  const mineToday = today?.mine ?? 0;
  const lines = RIVAL_LINES[rival.key] ?? RIVAL_LINES.orion;
  const say = !started ? rival.motto : status.kind === 'study' ? lines.studying : mine > theirs ? lines.behind : lines.ahead;
  const max = Math.max(mine, theirs, 60) * 1.08;

  // The local day on the timeline.
  const p = getZonedParts(new Date(now), timeZone);
  const midnight = now - ((p.hour * 60 + p.minute) * 60 + p.second) * 1000;
  const dayEnd = midnight + 86_400_000;
  const todays = plan.filter((s) => s.end > midnight && s.start < dayEnd);
  const feed = todays
    .filter((s) => s.start <= now)
    .flatMap((s) => {
      const out = [{ at: s.start, text: tf(t.chFeedStarted, { topic: s.topic ?? '' }) }];
      if (s.end <= now) out.push({ at: s.end, text: tf(t.chFeedFinished, { topic: s.topic ?? '', h: hours((s.end - s.start) / 60000) }) });
      return out;
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, 4);

  return (
    <div className={`@container border ${borderCol} overflow-hidden`} style={{ boxShadow: `inset 0 1px 0 ${accent}44` }}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${borderCol} text-[10px] uppercase tracking-wider`}>
        <span className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[9px] font-bold text-zinc-950" style={{ background: accent }}>
            {t.chDuel} · {challengeRank(rival.key)}
          </span>
          <span className={textMuted}>
            {started ? tf(t.chDayOf, { a: dayIndex + 1, b: rival.days.length }) : tf(t.chStartsIn, { t: left(starts - now) })}
          </span>
          <span className={textMuted}>· {tf(t.chLeft, { t: left(ends - now) })}
          </span>
        </span>
        <span className={`${textMuted} tabular-nums`}>
          {t.chPrize} <span className="text-amber-400 font-bold">+{fmt(rival.prize)}</span>
        </span>
      </div>

      <div className="grid @xl:grid-cols-[1fr_12rem]">
        <div className="min-w-0">
          <div className="p-3 flex gap-3 items-start">
            <div className="relative shrink-0">
              <div
                className="w-16 h-16 border flex items-end justify-center overflow-hidden bg-zinc-950"
                style={{ borderColor: `${accent}88`, backgroundImage: `linear-gradient(${accent}26, transparent)` }}
              >
                {RIVAL_ART[rival.key] && (
                  <Pixel art={RIVAL_ART[rival.key]} className={`w-14 h-14 transition-all ${status.kind === 'sleep' ? 'opacity-40 grayscale' : ''}`} />
                )}
              </div>
              {status.kind === 'sleep' && <span className={`absolute -top-2 -right-1 text-[10px] ch-flicker ${textMuted}`}>z z</span>}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-bold tracking-[0.15em]" style={{ color: accent }}>
                  {rival.name}
                </span>
                <span className={`text-[9px] tracking-wider ${textMuted}`}>{rival.tag}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider tabular-nums min-w-0">
                <StatusDot status={status} accent={accent} />
                <span className={`truncate ${status.kind === 'study' ? '' : textMuted}`}>{statusText(status)}</span>
              </div>
              {status.kind === 'study' && (
                <div className="h-1 bg-zinc-500/20">
                  <div className="h-full transition-[width] duration-500" style={{ width: `${Math.min(100, (status.elapsed / status.len) * 100)}%`, background: accent }} />
                </div>
              )}
              <p className={`m-0 pt-1 text-[11px] font-sans italic ${textMuted}`}>“{say}”</p>
            </div>
          </div>

          {rival.rule_line && (
            <div className="px-3 pb-2 flex items-start gap-2 text-[10px]">
              <span className="px-1 py-0.5 border text-[8px] uppercase tracking-wider shrink-0" style={{ borderColor: `${accent}66`, color: accent }}>
                {t.chRule}
              </span>
              <span className="font-sans leading-snug">{rival.rule_line}</span>
            </div>
          )}

          <div className="px-3 pb-3 space-y-1.5">
            <div className={`flex justify-between gap-2 text-[9px] uppercase tracking-[0.2em] ${textMuted}`}>
              <span>{t.chTotal}</span>
              <span className="font-bold" style={{ color: mine > theirs ? '#34d399' : mine < theirs ? accent : undefined }}>
                {mine > theirs
                  ? tf(t.chYouLead, { h: hours(mine - theirs) })
                  : mine < theirs
                  ? tf(t.chTheyLead, { name: rival.name, h: hours(theirs - mine) })
                  : t.chEven}
              </span>
            </div>
            {[
              { who: t.chYou, v: mine, today: started ? mineToday : 0, color: '#34d399' },
              { who: rival.name, v: theirs, today: started ? Math.min(theirs, theirsToday) : 0, color: accent },
            ].map((row) => (
              <div key={row.who} className="flex items-center gap-2 text-[10px] tabular-nums">
                <span className="w-12 tracking-wider font-bold truncate" style={{ color: row.color }}>
                  {row.who}
                </span>
                <span className="relative flex-1 h-3 bg-zinc-500/15 overflow-hidden">
                  <span className="absolute inset-y-0 left-0 transition-[width] duration-700" style={{ width: `${(row.v / max) * 100}%`, background: `${row.color}55` }} />
                  <span
                    className="absolute inset-y-0 transition-[width,left] duration-700"
                    style={{ left: `${((row.v - row.today) / max) * 100}%`, width: `${(row.today / max) * 100}%`, background: row.color }}
                  />
                </span>
                <span className="w-11 text-right">{hours(row.v)}</span>
              </div>
            ))}
            <div className="flex gap-1 pt-0.5">
              {rival.days.map((d, i) => (
                <span key={d.start} className={`flex-1 px-1.5 py-1 border text-[8px] uppercase tracking-wider tabular-nums ${borderCol}`} style={d.state === 'live' ? { borderColor: `${accent}88` } : undefined}>
                  <span className={`block ${textMuted}`}>DAY {i + 1}</span>
                  {d.state === 'pending' ? (
                    <span className={textMuted}>—</span>
                  ) : (
                    <span className="font-bold" style={{ color: d.mine > d.theirs ? '#34d399' : d.mine < d.theirs ? accent : undefined }}>
                      {hours(d.mine)} · {hours(d.state === 'live' ? Math.min(theirs, theirsToday) : d.theirs)}
                    </span>
                  )}
                </span>
              ))}
            </div>
            <div className={`text-[8px] uppercase tracking-wider ${textMuted}`}>{tf(t.chBarsHint, { n: fmt(rival.prize) })}</div>
          </div>

          <div className={`px-3 py-2 border-t ${borderCol} min-h-[4.5rem]`}>
            <div className={`text-[9px] tracking-[0.3em] mb-1 ${textMuted}`}>{t.chToday}</div>
            {feed.length === 0 ? (
              <div className={`text-[10px] ${textMuted}`}>{tf(t.chNotStarted, { name: rival.name })}</div>
            ) : (
              <ul className="space-y-0.5">
                {feed.map((f, i) => (
                  <li key={`${f.at}-${f.text}`} className={`text-[10px] tabular-nums ${i ? textMuted : ''}`}>
                    <span className={textMuted}>{formatTime(f.at)}</span> {rival.name} {f.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* The rival's day: what has happened so far, the rest under fog. */}
        <div className={`p-3 border-t @xl:border-t-0 @xl:border-l ${borderCol} space-y-2 min-w-0`}>
          <div className={`text-[9px] uppercase tracking-[0.3em] ${textMuted}`}>{tf(t.chDayPlan, { name: rival.name })}</div>
          <DayTimeline accent={accent} life={life} plan={plan} sleep={sleep} now={now} midnight={midnight} textMuted={textMuted} />
        </div>
      </div>

      <div className={`px-3 py-2 border-t ${borderCol} flex flex-wrap items-center justify-between gap-2`}>
        <span className={`text-[9px] font-sans ${textMuted}`}>{t.chForfeitHint}</span>
        <ConfirmButton label={t.chForfeit} confirm={t.chForfeitConfirm} onConfirm={onForfeit} borderCol={borderCol} textMuted={textMuted} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- result
const RESULT_SEEN_KEY = 'typbox_challenge_result_seen';

const readSeen = () => {
  try {
    return Number(localStorage.getItem(RESULT_SEEN_KEY) ?? 0);
  } catch {
    return 0;
  }
};

export const ChallengeResultCard: React.FC<{ result: ChallengeResult; borderCol: string; textMuted: string }> = ({ result, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [seen, setSeen] = useState(readSeen);
  if (seen >= result.id) return null;
  const accent = challengeAccent(result.key);
  const art = result.kind === 'raid' ? BOSS_ART[result.key] : RIVAL_ART[result.key];
  const title = {
    down: t.chResultDown,
    escaped: t.chResultEscaped,
    won: t.chResultWon,
    lost: t.chResultLost,
    tie: t.chResultTie,
    forfeit: t.chResultForfeit,
  }[result.outcome];
  const good = result.outcome === 'down' || result.outcome === 'won';
  return (
    <div className={`ch-in flex items-center gap-3 p-3 border ${good ? '' : borderCol}`} style={good ? { borderColor: accent, background: `${accent}12` } : undefined}>
      <span className="w-12 h-12 shrink-0 flex items-end justify-center bg-zinc-950 border" style={{ borderColor: `${accent}66` }}>
        {art && <Pixel art={art} className={`w-11 h-11 ${good || result.outcome === 'tie' ? '' : 'opacity-50 grayscale'}`} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] uppercase tracking-[0.3em]" style={{ color: accent }}>
          {result.name}
        </span>
        <span className="block text-sm font-bold tracking-[0.15em]">{title}</span>
        <span className={`flex items-center gap-1 text-[10px] font-bold tabular-nums ${result.payout ? 'text-amber-400' : textMuted}`}>
          {result.payout ? (
            <>
              <BitShard className="w-2.5 h-2.5" />
              {tf(t.chResultPaid, { n: fmt(result.payout) })}
            </>
          ) : (
            t.chResultNothing
          )}
          {result.first_clear && <span className="ml-1" style={{ color: accent }}>· {t.chResultFirst}</span>}
        </span>
        {(result.struck ?? 0) > 0 && (
          <span className="block text-[9px] uppercase tracking-wider tabular-nums text-rose-400">{tf(t.chResultStruck, { n: fmt(result.struck ?? 0) })}</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(RESULT_SEEN_KEY, String(result.id));
          } catch {
            // storage unavailable: hidden for this view only
          }
          setSeen(result.id);
        }}
        className={`px-2.5 py-1 border ${borderCol} text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:text-emerald-400`}
      >
        {t.chDismiss}
      </button>
    </div>
  );
};

// ------------------------------------------------------------------- tab
/** A horizontal, snap-scrolling strip with arrow buttons on wider screens. */
export const Strip: React.FC<{ children: React.ReactNode; borderCol: string; textMuted: string; label: string }> = ({ children, borderCol, textMuted, label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => ref.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
  const arrow = `hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-6 h-10 items-center justify-center border ${borderCol} bg-zinc-950/85 ${textMuted} hover:text-zinc-100 cursor-pointer`;
  return (
    <div className="relative">
      <button type="button" aria-label={`${label} ←`} onClick={() => nudge(-1)} className={`${arrow} -left-1`}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <div
        ref={ref}
        className="flex gap-2 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth pb-1.5 sm:px-6 sm:scroll-px-6 [scrollbar-width:thin]"
        role="listbox"
        aria-label={label}
      >
        {children}
      </div>
      <button type="button" aria-label={`${label} →`} onClick={() => nudge(1)} className={`${arrow} -right-1`}>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; textMuted: string; className?: string }> = ({ label, value, textMuted, className = '' }) => (
  <span className="min-w-0">
    <span className={`block text-[8px] uppercase tracking-[0.2em] ${textMuted}`}>{label}</span>
    <span className={`block text-[11px] font-bold tabular-nums truncate ${className}`}>{value}</span>
  </span>
);

export interface ChallengesTabProps {
  state: BitsShopState | null;
  loadError: string | null;
  /** In-progress categories, for HYDRA's heads. */
  categories: ChipCategory[];
  /** HYDRA's picked heads (category ids); null = the server's suggestion. */
  hydraPick: string[] | null;
  onHydraPick: (ids: string[]) => void;
  buyButton: (itemId: string, price: number, blockedLabel: string | null, accent?: string) => React.ReactNode;
  onForfeit: () => Promise<void>;
  borderCol: string;
  textMuted: string;
}

export const ChallengesTab: React.FC<ChallengesTabProps> = ({
  state,
  loadError,
  categories,
  hydraPick,
  onHydraPick,
  buyButton,
  onForfeit,
  borderCol,
  textMuted,
}) => {
  const { t, formatDateTime } = useI18n();
  const active = state?.active_challenge ?? null;
  const offers = state?.challenges;
  const blocked = active ? t.chRunning : null;
  const [raidKey, setRaidKey] = useState('golem');
  const [rivalKey, setRivalKey] = useState('orion');
  // Which side of the chosen challenger is showing.
  const [raidTurned, setRaidTurned] = useState(false);
  const [rivalTurned, setRivalTurned] = useState(false);
  const raidTurn = useTurn(() => setRaidTurned((v) => !v));
  const rivalTurn = useTurn(() => setRivalTurned((v) => !v));
  const pickedRaid = offers?.raids.find((r) => r.key === raidKey) ?? offers?.raids[0];
  const pickedRival = offers?.rivals.find((r) => r.key === rivalKey) ?? offers?.rivals[0];
  const raidOther = pickedRaid?.inversion?.offer ?? null;
  const rivalOther = pickedRival?.inversion?.offer ?? null;
  const raidInverted = raidTurned && Boolean(raidOther);
  const rivalInverted = rivalTurned && Boolean(rivalOther);
  const raid = raidInverted && raidOther ? raidOther : pickedRaid;
  const rival = rivalInverted && rivalOther ? rivalOther : pickedRival;

  // HYDRA: the picked heads, falling back to the suggestion; ids that are
  // no longer in progress drop out.
  const live = new Set(categories.map((c) => String(c.id)));
  const [minHeads, maxHeads] = raid?.heads ?? [2, 3];
  const picked = (hydraPick ?? (raid?.suggested ?? []).map(String)).filter((id) => live.has(id));
  const togglePick = (id: string) => {
    if (picked.includes(id)) onHydraPick(picked.filter((x) => x !== id));
    else onHydraPick(picked.length >= maxHeads ? [...picked.slice(1), id] : [...picked, id]);
  };

  // The festival's own challengers, for the banner and the strips' marks.
  const festival = state?.festival?.active ?? null;
  const eventAccent = festival?.accent ?? '#fbbf24';
  const eventChallengers: EventChallenger[] = festival
    ? [
        ...(offers?.raids ?? []).filter((r) => r.event === festival.id).map((r) => ({ kind: 'raid' as const, key: r.key, name: r.name, line: r.title, wins: r.wins ?? 0 })),
        ...(offers?.rivals ?? []).filter((r) => r.event === festival.id).map((r) => ({ kind: 'rival' as const, key: r.key, name: r.name, line: r.tag, wins: r.wins ?? 0 })),
      ]
    : [];
  const raidSection = useRef<HTMLElement>(null);
  const rivalSection = useRef<HTMLElement>(null);
  const openFromBanner = (c: EventChallenger) => {
    if (c.kind === 'raid') {
      setRaidKey(c.key);
      setRaidTurned(false);
    } else {
      setRivalKey(c.key);
      setRivalTurned(false);
    }
    (c.kind === 'raid' ? raidSection : rivalSection).current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const limitedCount = (rows: Array<{ event?: string | null }>) => rows.filter((r) => r.event).length;

  return (
    <div className="space-y-4">
      {/* A running fight always comes first. */}
      {active && (
        <div className="space-y-1.5">
          <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.chActive}</div>
          {active.kind === 'raid' ? (
            <RaidCard raid={active} borderCol={borderCol} textMuted={textMuted} onForfeit={onForfeit} />
          ) : (
            <RivalCard rival={active} borderCol={borderCol} textMuted={textMuted} onForfeit={onForfeit} />
          )}
        </div>
      )}

      {state?.last_challenge && <ChallengeResultCard result={state.last_challenge} borderCol={borderCol} textMuted={textMuted} />}

      {festival && <FestivalBanner festival={festival} pass={state?.festival?.pass} challengers={eventChallengers} onPick={openFromBanner} />}

      {state && !active && <div className={`p-3 border border-dashed ${borderCol} text-[10px] ${textMuted}`}>{t.chNone}</div>}

      {loadError && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{loadError}</div>}
      {!state && !loadError && (
        <div className={`p-6 flex justify-center ${textMuted}`}>
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}

      {offers && raid && (
        <section ref={raidSection} className="space-y-2 scroll-mt-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold">{t.chRaids}</span>
            <span className={`text-[9px] uppercase tracking-wider ${textMuted}`}>
              {tf(t.chCount, { n: offers.raids.length })}
              {limitedCount(offers.raids) > 0 && (
                <span className="font-bold" style={{ color: eventAccent }}>
                  {' '}· {tf(t.chEventCount, { n: limitedCount(offers.raids) })}
                </span>
              )}
            </span>
          </div>
          <p className={`m-0 text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.chRaidsHint}</p>
          <Strip borderCol={borderCol} textMuted={textMuted} label={t.chRaids}>
            {limitedFirst(offers.raids).map((r) => {
              const accent = challengeAccent(r.key);
              const on = r.key === pickedRaid?.key;
              return (
                <button
                  key={r.item_id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    setRaidKey(r.key);
                    setRaidTurned(false);
                  }}
                  className={`relative shrink-0 snap-start w-28 border text-left overflow-hidden cursor-pointer transition-all ${on ? '' : r.event ? '' : `${borderCol} opacity-70 hover:opacity-100`}`}
                  style={on ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}55, 0 0 18px ${accent}33` } : r.event ? { borderColor: eventAccent } : undefined}
                >
                  <span
                    className="relative h-20 flex items-end justify-center"
                    style={{ background: `radial-gradient(ellipse 60% 60% at 50% 72%, ${accent}${on ? '40' : '22'}, transparent 70%), linear-gradient(#0c0c10, #050507)` }}
                  >
                    <RankBadge challengeKey={r.key} className="top-0 left-0" />
                    {BOSS_ART[r.key] && <Pixel art={BOSS_ART[r.key]} className={`w-16 h-16 mb-1 ${on ? 'ch-bob' : ''} ${r.available ? '' : 'grayscale opacity-50'}`} />}
                    {!r.available && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-zinc-400" />}
                    {r.inversion?.offer && <RefreshCcw className="absolute top-1.5 right-1.5 w-3 h-3" style={{ color: accent }} />}
                    {r.event && <LimitedRibbon accent={eventAccent} className="absolute top-0 right-0" />}
                  </span>
                  <span className="block px-1.5 py-1">
                    <span className="block text-[10px] font-bold tracking-[0.15em] truncate" style={{ color: accent }}>
                      {r.name}
                    </span>
                    <span className={`block text-[8px] uppercase tracking-wider tabular-nums ${textMuted}`}>
                      {hours(r.hp)} · {tf(t.chDays, { n: r.days })}
                    </span>
                  </span>
                </button>
              );
            })}
          </Strip>
          <OfferDetail accent={challengeAccent(raid.key)} borderCol={borderCol} minHeight="min-h-[31rem] sm:min-h-[19.5rem]">
            <div
              className="relative flex-1 min-h-[8.5rem] sm:flex-none sm:w-44 shrink-0 flex items-end justify-center overflow-hidden transition-[background] duration-300"
              style={{ background: stageGlow(challengeAccent(raid.key), raidInverted, 66) }}
            >
              <RankBadge challengeKey={raid.key} className="top-0 left-0" />
              {raid.event && <LimitedRibbon accent={eventAccent} className="absolute top-0 right-0 z-[1]" />}
              <InvertControl inversion={pickedRaid?.inversion} inverted={raidInverted} onTurn={raidTurn.turn} accent={challengeAccent(raid.key)} />
              <span className="absolute bottom-3 w-24 h-2 rounded-[50%] bg-black ch-shadow" />
              {BOSS_ART[raid.key] && (
                <span className={`inline-block ${raidTurn.turnClass}`}>
                  <Pixel
                    key={raid.key}
                    art={BOSS_ART[raid.key]}
                    className={`relative mb-4 ${raid.heads ? 'w-28 h-28' : 'w-44 h-44 sm:w-28 sm:h-28'} ${raidTurn.turnClass ? '' : 'ch-in'} ${raid.available ? '' : 'grayscale opacity-60'}`}
                    style={{ filter: `drop-shadow(0 0 14px ${challengeAccent(raid.key)}55)` }}
                  />
                </span>
              )}
            </div>
            <div className="sm:flex-1 min-w-0 p-3 flex flex-col gap-2">
              <div>
                <div className={`text-[8px] uppercase tracking-[0.3em] ${textMuted}`}>{raid.title}</div>
                <div className="text-base font-bold tracking-[0.15em] leading-tight" style={{ color: challengeAccent(raid.key) }}>
                  {raid.name}
                </div>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <span className="px-1 py-0.5 border text-[8px] uppercase tracking-wider shrink-0" style={{ borderColor: `${challengeAccent(raid.key)}66`, color: challengeAccent(raid.key) }}>
                  {t.chTrait}
                </span>
                <span className="font-sans leading-snug">{raid.trait_line}</span>
              </div>
              {raid.attack && (
                <div className="flex items-start gap-2 text-[10px]">
                  <span className="px-1 py-0.5 border border-rose-500/50 text-rose-400 text-[8px] uppercase tracking-wider shrink-0">{t.chAttackLabel}</span>
                  <span className="font-sans leading-snug">
                    {tf(t.chAttackOffer, { name: raid.attack.name, n: fmt(raid.attack.dmg), h: raid.attack.every, p: hours(raid.attack.parry) })}
                    {raid.attack.counter ? tf(t.chAttackOfferCounter, { n: fmt(raid.attack.counter) }) : ''}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                <Stat label={t.chHp} value={hours(raid.hp)} textMuted={textMuted} />
                <Stat label={t.chTime} value={tf(t.chDays, { n: raid.days })} textMuted={textMuted} />
                <Stat label={t.chLoot} value={`+${fmt(raid.loot)}`} className="text-amber-400" textMuted={textMuted} />
                <Stat label={t.chEntry} value={fmt(raid.price)} textMuted={textMuted} />
              </div>
              {(raid.first_bonus ?? 0) > 0 && (
                <div className="text-[9px] uppercase tracking-wider font-bold text-amber-400 tabular-nums">{tf(t.chFirstClear, { n: fmt(raid.first_bonus ?? 0) })}</div>
              )}
              {raidInverted && <p className={`m-0 text-[9px] font-sans ${textMuted}`}>{t.chInvertedHint}</p>}
              {raid.heads && (
                <div className={`p-2 border ${borderCol} space-y-1`}>
                  <div className={`flex justify-between gap-2 text-[8px] uppercase tracking-[0.2em] ${textMuted}`}>
                    <span>{tf(t.chPickHeads, { a: minHeads, b: maxHeads })}</span>
                    <span className="tabular-nums" style={{ color: picked.length >= minHeads ? challengeAccent(raid.key) : undefined }}>
                      {tf(t.chPicked, { n: picked.length })}
                    </span>
                  </div>
                  {categories.length >= minHeads ? (
                    // However many categories there are, the list scrolls rather than
                    // growing the card.
                    <div className="max-h-[5.25rem] overflow-y-auto overscroll-contain">
                      <CategoryChips
                        categories={categories}
                        selected={picked}
                        onToggle={togglePick}
                        disabled={Boolean(active)}
                        borderCol={borderCol}
                        textMuted={textMuted}
                        caption={
                          picked.length
                            ? picked
                                .map((id) => categories.find((c) => String(c.id) === id))
                                .filter(Boolean)
                                .map((c) => c!.code)
                                .join(' · ') + ` → ${tf(t.chHeadHp, { h: hours(Math.floor(raid.hp / Math.max(1, picked.length))) })}`
                            : null
                        }
                      />
                    </div>
                  ) : (
                    <div className="text-[10px] font-sans text-rose-400">{tf(t.chNeedCategories, { n: minHeads, have: categories.length })}</div>
                  )}
                </div>
              )}
              <div className="mt-auto flex flex-col">
                {buyButton(
                  raid.item_id,
                  raid.price,
                  blocked ??
                    (!raid.available || (raid.heads && categories.length < minHeads)
                      ? t.chHydraLocked
                      : raid.heads && picked.length < minHeads
                      ? tf(t.chPickMore, { n: minHeads - picked.length })
                      : null),
                  challengeAccent(raid.key)
                )}
              </div>
            </div>
          </OfferDetail>
        </section>
      )}

      {offers && rival && (
        <section ref={rivalSection} className="space-y-2 scroll-mt-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold">{t.chRivals}</span>
            <span className={`text-[9px] uppercase tracking-wider ${textMuted}`}>
              {tf(t.chCount, { n: offers.rivals.length })}
              {limitedCount(offers.rivals) > 0 && (
                <span className="font-bold" style={{ color: eventAccent }}>
                  {' '}· {tf(t.chEventCount, { n: limitedCount(offers.rivals) })}
                </span>
              )}
            </span>
          </div>
          <p className={`m-0 text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.chRivalsHint}</p>
          <Strip borderCol={borderCol} textMuted={textMuted} label={t.chRivals}>
            {limitedFirst(offers.rivals).map((r) => {
              const accent = challengeAccent(r.key);
              const on = r.key === pickedRival?.key;
              return (
                <button
                  key={r.item_id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    setRivalKey(r.key);
                    setRivalTurned(false);
                  }}
                  className={`relative shrink-0 snap-start w-36 sm:w-auto sm:flex-1 sm:min-w-36 flex items-center gap-2 p-1.5 pl-2.5 mt-2 ml-1 border text-left cursor-pointer transition-all ${on ? '' : r.event ? '' : `${borderCol} opacity-70 hover:opacity-100`}`}
                  style={on ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}55, 0 0 18px ${accent}33`, background: `${accent}10` } : r.event ? { borderColor: eventAccent } : undefined}
                >
                  <span className="relative w-10 h-10 shrink-0 flex items-end justify-center border bg-zinc-950" style={{ borderColor: `${accent}66`, backgroundImage: `linear-gradient(${accent}26, transparent)` }}>
                    <RankBadge challengeKey={r.key} className="-top-2 -left-2" />
                    {RIVAL_ART[r.key] && <Pixel art={RIVAL_ART[r.key]} className="w-9 h-9" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold tracking-[0.15em]" style={{ color: accent }}>
                      {r.name}
                    </span>
                    <span className={`block text-[8px] uppercase tracking-wider truncate ${textMuted}`}>{r.tag}</span>
                  </span>
                  {r.event && <LimitedRibbon accent={eventAccent} className="absolute top-0 right-0" />}
                </button>
              );
            })}
          </Strip>
          <OfferDetail accent={challengeAccent(rival.key)} borderCol={borderCol} minHeight="min-h-[25.5rem] sm:min-h-[13.25rem]">
            <div
              className="relative flex-1 min-h-32 sm:flex-none sm:w-44 shrink-0 flex items-end justify-center overflow-hidden bg-zinc-950 transition-[background] duration-300"
              style={{ background: stageGlow(challengeAccent(rival.key), rivalInverted, 80) }}
            >
              <RankBadge challengeKey={rival.key} className="top-0 left-0" />
              {rival.event && <LimitedRibbon accent={eventAccent} className="absolute top-0 right-0 z-[1]" />}
              <InvertControl inversion={pickedRival?.inversion} inverted={rivalInverted} onTurn={rivalTurn.turn} accent={challengeAccent(rival.key)} />
              {RIVAL_ART[rival.key] && (
                <span className={`inline-block ${rivalTurn.turnClass}`}>
                  <Pixel key={rival.key} art={RIVAL_ART[rival.key]} className={`w-40 h-40 sm:w-24 sm:h-24 ${rivalTurn.turnClass ? '' : 'ch-in'}`} />
                </span>
              )}
            </div>
            <div className="sm:flex-1 min-w-0 p-3 flex flex-col gap-2">
              <div>
                <div className={`text-[8px] uppercase tracking-[0.3em] ${textMuted}`}>{rival.tag}</div>
                <div className="text-base font-bold tracking-[0.15em] leading-tight" style={{ color: challengeAccent(rival.key) }}>
                  {rival.name}
                </div>
                <p className={`m-0 mt-1 text-[11px] font-sans italic ${textMuted}`}>“{rival.motto}”</p>
              </div>
              {rival.rule_line && (
                <div className="flex items-start gap-2 text-[10px]">
                  <span className="px-1 py-0.5 border text-[8px] uppercase tracking-wider shrink-0" style={{ borderColor: `${challengeAccent(rival.key)}66`, color: challengeAccent(rival.key) }}>
                    {t.chRule}
                  </span>
                  <span className="font-sans leading-snug">{rival.rule_line}</span>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                <Stat label={t.chTheyStudy} value={`~${(rival.projected / 60).toFixed(1)}H`} textMuted={textMuted} />
                <Stat label={t.chTime} value={t.chDuelLength} textMuted={textMuted} />
                <Stat label={t.chPrize} value={`+${fmt(rival.prize)}`} className="text-amber-400" textMuted={textMuted} />
                <Stat label={t.chEntry} value={fmt(rival.price)} textMuted={textMuted} />
              </div>
              {(rival.first_bonus ?? 0) > 0 && (
                <div className="text-[9px] uppercase tracking-wider font-bold text-amber-400 tabular-nums">{tf(t.chFirstClear, { n: fmt(rival.first_bonus ?? 0) })}</div>
              )}
              <p className={`m-0 text-[9px] font-sans ${textMuted}`}>{tf(t.chDuelWhen, { time: formatDateTime(rival.ends_at) })}</p>
              <div className="mt-auto flex flex-col">{buyButton(rival.item_id, rival.price, blocked, challengeAccent(rival.key))}</div>
            </div>
          </OfferDetail>
        </section>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ event
/** Whole days left of a festival, counting today, by the user's calendar. */
const festivalDaysLeft = (festival: Festival, timeZone: string) => {
  const p = getZonedParts(new Date(), timeZone);
  const [endMonth, endDay] = festival.end.split('-').map(Number);
  // NEW YEAR runs across December 31: an end earlier in the year is next year's.
  const startMonth = Number(festival.start.split('-')[0]);
  const year = endMonth < startMonth && p.month >= startMonth ? p.year + 1 : p.year;
  return Math.round((Date.UTC(year, endMonth - 1, endDay) - Date.UTC(p.year, p.month - 1, p.day)) / 86_400_000) + 1;
};

interface EventChallenger {
  kind: 'raid' | 'rival';
  key: string;
  name: string;
  line: string;
  wins: number;
}

/** The bar: what you have logged since the festival began, and what is on it. */
const PassBar: React.FC<{ pass: FestivalPass; accent: string }> = ({ pass, accent }) => {
  const { t } = useI18n();
  const share = Math.min(100, (pass.minutes / pass.goal) * 100);
  const done = pass.minutes >= pass.goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[9px] uppercase tracking-[0.25em]">
        <span className="font-bold text-zinc-300">{t.chPassTitle}</span>
        <span className="font-bold tabular-nums tracking-wider" style={{ color: accent }}>
          {done ? t.chPassDone : tf(t.chPassHours, { a: (pass.minutes / 60).toFixed(1), b: pass.goal / 60 })}
        </span>
      </div>
      <div className="relative h-3 bg-zinc-800/90 border border-zinc-700">
        <div className="absolute inset-y-0 left-0 transition-[width] duration-700" style={{ width: `${share}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})`, boxShadow: `0 0 12px ${accent}88` }} />
        {pass.steps.slice(0, -1).map((step) => (
          <span key={step.at} className="absolute inset-y-0 w-px bg-zinc-950/80" style={{ left: `${(step.at / pass.goal) * 100}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {pass.steps.map((step) => (
          <div
            key={step.at}
            className={`flex flex-col items-center justify-end gap-0.5 p-1 border text-center ${step.reached ? '' : 'border-zinc-800 bg-zinc-950/50'}`}
            style={step.reached ? { borderColor: accent, background: `${accent}1f` } : undefined}
          >
            {step.kind === 'bits' && <BitShard className={`${step === pass.steps[pass.steps.length - 1] ? 'w-7 h-7' : 'w-5 h-5'} ${step.reached ? '' : 'grayscale opacity-50'}`} />}
            {step.kind === 'cursor' && (
              <img src={`/cursors/pixel-${step.cursor}.svg`} alt="" className={`h-6 ${step.reached ? '' : 'grayscale opacity-50'}`} style={{ imageRendering: 'pixelated' }} />
            )}
            <span className={`text-[8px] font-bold uppercase tracking-wider tabular-nums leading-3 ${step.reached ? 'text-zinc-100' : 'text-zinc-500'}`}>
              {step.kind === 'bits' ? tf(t.chPassBits, { n: fmt(step.bits ?? 0) }) : t.chPassCursor}
            </span>
            <span className="text-[8px] tabular-nums leading-3 text-zinc-500">{Math.round(step.at / 60)}H</span>
          </div>
        ))}
      </div>
      <p className="m-0 text-[10px] font-sans leading-snug text-zinc-400">{t.chPassHint}</p>
    </div>
  );
};

/** One line on the dashboard while a festival runs: its bar, and the way in. */
export const FestivalStrip: React.FC<{ festival: Festival; pass: FestivalPass; onOpen: () => void }> = ({ festival, pass, onOpen }) => {
  const { t, timeZone } = useI18n();
  const accent = festival.accent;
  const days = festivalDaysLeft(festival, timeZone);
  const reached = pass.steps.filter((s) => s.reached).length;
  // Left open past its last midnight, before the next answer from the server.
  if (days < 1) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t.chStripTitle}
      className="w-full grid grid-cols-[1fr_auto] sm:flex sm:items-center gap-x-3 sm:gap-x-4 gap-y-1.5 px-3 py-2 border text-left text-zinc-100 cursor-pointer font-mono group"
      style={{ borderColor: accent, background: `radial-gradient(ellipse 45% 180% at 0% 50%, ${accent}3d, transparent 72%), linear-gradient(90deg, #0c0c10, #050507)` }}
    >
      <span className="min-w-0 sm:shrink-0">
        <span className="block text-[8px] uppercase tracking-[0.25em] font-bold leading-3" style={{ color: accent }}>
          {t.chEventLabel}
        </span>
        <span className="block text-[11px] sm:text-xs font-bold tracking-[0.12em] leading-4 truncate sm:whitespace-nowrap">{festival.name}</span>
      </span>
      {/* A row of its own on a phone: the bar is the point, so it gets the width. */}
      <span className="col-span-2 order-last sm:order-none relative sm:flex-1 h-2 bg-zinc-800 border border-zinc-700">
        <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, (pass.minutes / pass.goal) * 100)}%`, background: accent, boxShadow: `0 0 10px ${accent}` }} />
      </span>
      <span className="shrink-0 flex items-center gap-2 sm:gap-3">
        <span className="text-right text-[9px] uppercase tracking-wider tabular-nums leading-3">
          <span className="block font-bold whitespace-nowrap">{pass.minutes >= pass.goal ? t.chPassDone : tf(t.chPassHours, { a: (pass.minutes / 60).toFixed(1), b: pass.goal / 60 })}</span>
          <span className="block text-zinc-400 mt-0.5 whitespace-nowrap">
            {reached}/{pass.steps.length} · {days <= 1 ? t.chEventLastDay : tf(t.chEventDays, { n: days })}
          </span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-200" />
      </span>
    </button>
  );
};

/** What only this festival brings, at the top of the tab. Each challenger
 *  opens its card further down. */
const FestivalBanner: React.FC<{ festival: Festival; pass?: FestivalPass | null; challengers: EventChallenger[]; onPick: (c: EventChallenger) => void }> = ({ festival, pass, challengers, onPick }) => {
  const { t, timeZone } = useI18n();
  const accent = festival.accent;
  const days = festivalDaysLeft(festival, timeZone);
  return (
    <section
      className="relative overflow-hidden border text-zinc-100"
      style={{ borderColor: accent, background: `radial-gradient(ellipse 70% 120% at 12% 0%, ${accent}38, transparent 70%), linear-gradient(120deg, #0c0c10, #050507)` }}
      aria-label={festival.name}
    >
      <div className="relative p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: accent }}>
              {t.chEventLabel}
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-[0.12em] leading-tight">{festival.name}</div>
            <p className="m-0 mt-0.5 text-[11px] font-sans italic text-zinc-400">{festival.tagline}</p>
          </div>
          <span className="shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wider tabular-nums text-zinc-950" style={{ background: accent }}>
            {days <= 1 ? t.chEventLastDay : tf(t.chEventDays, { n: days })}
          </span>
        </div>
        {pass && <PassBar pass={pass} accent={accent} />}
        {challengers.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {challengers.map((c) => {
              const art = c.kind === 'raid' ? BOSS_ART[c.key] : RIVAL_ART[c.key];
              const ink = challengeAccent(c.key);
              return (
                <button
                  key={`${c.kind}-${c.key}`}
                  type="button"
                  onClick={() => onPick(c)}
                  className="flex items-center gap-2.5 p-1.5 text-left border bg-zinc-950/70 cursor-pointer transition-colors hover:bg-zinc-900 min-w-0"
                  style={{ borderColor: `${ink}88` }}
                >
                  <span className="relative w-14 h-14 shrink-0 flex items-end justify-center bg-zinc-950" style={{ backgroundImage: `radial-gradient(ellipse 70% 60% at 50% 70%, ${ink}40, transparent 72%)` }}>
                    {art && <Pixel art={art} className="w-[3.25rem] h-[3.25rem]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[8px] uppercase tracking-[0.2em] text-zinc-400">{c.kind === 'raid' ? t.chEventBoss : t.chEventRival}</span>
                    <span className="block text-[12px] font-bold tracking-[0.12em] truncate" style={{ color: ink }}>
                      {c.name}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider truncate text-zinc-400">{c.wins ? tf(t.chEventBeaten, { n: c.wins }) : c.line}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-zinc-500" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/** The strip's mark for a challenger only here for the festival. */
const LimitedRibbon: React.FC<{ accent: string; className?: string }> = ({ accent, className = '' }) => {
  const { t } = useI18n();
  return (
    <span className={`px-1 text-[8px] font-bold uppercase leading-[14px] tracking-wider text-zinc-950 ${className}`} style={{ background: accent }}>
      {t.chEventTag}
    </span>
  );
};

/** Limited ones first; otherwise the catalog's order. */
const limitedFirst = <T extends { event?: string | null }>(rows: T[]) => [...rows].sort((a, b) => Number(Boolean(b.event)) - Number(Boolean(a.event)));

/** The chosen challenger. Its height is set by the tallest one (`minHeight`), so
 *  switching never moves what is below: the spare height goes to the stage on
 *  phones, and above the button on wider screens. */
const OfferDetail: React.FC<{ accent: string; borderCol: string; minHeight: string; children: React.ReactNode }> = ({ accent, borderCol, minHeight, children }) => (
  <div data-offer-detail className={`flex flex-col sm:flex-row border ${borderCol} ${minHeight} overflow-hidden`} style={{ borderColor: `${accent}66`, boxShadow: `inset 0 1px 0 ${accent}44` }}>
    {children}
  </div>
);

// ----------------------------------------------------------------- ticker
/** One line under the SYSTEM CHRONOMETER's date while a challenge runs: a
 *  rival with a green dot while they are at their desk, or the boss with its
 *  HP. Opens the CHALLENGES tab. A fixed 14px line, placed by the caller
 *  (`className`), which also aligns it: a row of its own on phones, laid over
 *  the panel's padding on desktop so the columns keep their height. */
export const ChallengeTicker: React.FC<{ challenge: ActiveChallenge; textMuted: string; onOpen: () => void; className?: string }> = ({
  challenge,
  textMuted,
  onOpen,
  className = '',
}) => {
  const { t } = useI18n();
  const now = useNow(20_000);
  const accent = challengeAccent(challenge.key);
  const spans = useMemo(
    () =>
      challenge.kind === 'rival'
        ? {
            plan: challenge.plan.map((p) => ({ start: new Date(p.start).getTime(), end: new Date(p.end).getTime(), topic: p.topic })),
            sleep: challenge.sleep.map((p) => ({ start: new Date(p.start).getTime(), end: new Date(p.end).getTime() })),
            life: (challenge.life ?? []).map((p) => ({ start: new Date(p.start).getTime(), end: new Date(p.end).getTime(), topic: p.label })),
          }
        : null,
    [challenge]
  );
  const statusText = useStatusText();
  const status = spans ? rivalStatus(spans.plan, spans.sleep, now, spans.life) : null;
  const art = challenge.kind === 'raid' ? BOSS_ART[challenge.key] : RIVAL_ART[challenge.key];
  const online = status?.kind === 'study';
  const detail = challenge.kind === 'raid' ? tf(t.chTickerHp, { h: hours(challenge.hp) }) : status ? statusText(status) : '';
  return (
    <button
      type="button"
      onClick={onOpen}
      title={tf(t.chTickerTitle, { name: challenge.name })}
      className={`h-3.5 min-w-0 flex items-center gap-1.5 font-mono text-[9px] leading-none uppercase tracking-wider cursor-pointer group ${className}`}
    >
      <span className="relative shrink-0 w-3.5 h-3.5 flex items-end justify-center bg-zinc-950">
        {art && <Pixel art={art} className={`w-3.5 h-3.5 ${status?.kind === 'sleep' ? 'opacity-40 grayscale' : ''}`} />}
        {status && (
          <span
            className={`absolute -top-[3px] -right-[3px] w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 ch-pulse text-emerald-400' : status.kind === 'break' ? 'bg-amber-400' : 'bg-zinc-500'}`}
          />
        )}
      </span>
      <span className="font-bold shrink-0" style={{ color: accent }}>
        {challenge.name.replace(' // INVERTED', '')}
      </span>
      {challenge.kind === 'raid' && (
        <span className="w-12 shrink-0">
          <HpCells hp={challenge.hp} max={challenge.max_hp} accent={accent} cells={10} height="h-1" />
        </span>
      )}
      <span className={`ml-auto lg:ml-0 truncate tabular-nums group-hover:underline ${online ? '' : textMuted}`}>{detail}</span>
    </button>
  );
};
