import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Share2,
  Download,
  Copy,
  Check,
  Award,
  Lock,
  CheckCircle2,
  Radio,
  Search,
  Terminal,
  Zap,
  CornerDownLeft,
  Sun,
  Moon,
  Timer,
  Pause,
  Play,
} from 'lucide-react';
import type { Category, StudyLog } from './App';
import { useI18n, tf } from './i18n';
import { drawStatusCard, STATUS_CARD_LAYOUTS, type StatusCardLayout } from './statusCard';

// ==========================================
// 0. DEVELOPMENT DEMO MODE
// ==========================================
// Flip to `true` only in local development to force-unlock every Surface
// Theme, Noise profile, and Clearance reward regardless of the signed-in
// user's actual level — lets you preview the full catalog without grinding
// real study hours. Must stay `false` for any real build/deploy.
export const IS_DEMO_MODE = false;

// eslint-disable-next-line react-refresh/only-export-components
export function isRewardUnlocked(userClearanceLevel: number, requiredLevel: number): boolean {
  return IS_DEMO_MODE || userClearanceLevel >= requiredLevel;
}

// ==========================================
// 1. TELEMETRY CLEARANCE LEVEL SYSTEM (3,000 RANKS // 0H-1,000H PER CYCLE)
// ==========================================
// Prestige / Ascension model: rather than one 30,000H lifetime climb, the
// full 10-division / 3,000-rank ladder now repeats every CYCLE_HOURS worth
// of lifetime study. Reaching the end of a cycle (LV.3000 / 1,000H) makes
// ASCENSION available — a deliberate, user-triggered reset of the *display*
// back to LV.1 under a new cycle number. Nothing is actually deleted:
// titles, Surface Themes and log history all persist forever; only the
// current-cycle level readout restarts, exactly like a Prestige reset.
export const CYCLE_HOURS = 1000;

export interface ClearanceLevel {
  level: number;
  title: string;
  subtitle: string;
  division: string;
  divisionIndex: number; // 1..10
  requiredHours: number;
  color: string;
  isMajorMilestone?: boolean;
}

export interface ClearanceDivision {
  index: number;
  code: string;
  name: string;
  sectorName: string;
  minLevel: number;
  maxLevel: number;
  minHours: number;
  maxHours: number;
  color: string;
}

// Each division spans 300 ranks (10 divisions × 300 = 3,000 ranks total),
// and its hour range is scaled so the full 10-division ladder exactly fills
// one CYCLE_HOURS (1,000H) cycle. The division/rank *shape* is unchanged
// from the old 30,000H design — every bound below is simply the legacy
// value ÷30 — so all 3,000 hand-authored rank titles stay intact, they just
// now repeat once per cycle instead of spanning a whole lifetime.
const RANKS_PER_DIVISION = 300;

const CLEARANCE_DIVISIONS: ClearanceDivision[] = [
  { index: 1, code: 'DIV-01', name: 'INITIATE', sectorName: 'Initial Observation Sector', minLevel: 1, maxLevel: 300, minHours: 0, maxHours: 50, color: '#a1a1aa' },
  { index: 2, code: 'DIV-02', name: 'CADET', sectorName: 'Orbital Training Sector', minLevel: 301, maxLevel: 600, minHours: 50.7, maxHours: 150, color: '#38bdf8' },
  { index: 3, code: 'DIV-03', name: 'OPERATOR', sectorName: 'Field Communications Sector', minLevel: 601, maxLevel: 900, minHours: 150.7, maxHours: 250, color: '#10b981' },
  { index: 4, code: 'DIV-04', name: 'SPECIALIST', sectorName: 'Deep Analytics Sector', minLevel: 901, maxLevel: 1200, minHours: 250.7, maxHours: 350, color: '#06b6d4' },
  { index: 5, code: 'DIV-05', name: 'VANGUARD', sectorName: 'Frontier Vanguard Sector', minLevel: 1201, maxLevel: 1500, minHours: 350.7, maxHours: 450, color: '#6366f1' },
  { index: 6, code: 'DIV-06', name: 'ARCHITECT', sectorName: 'Structural Systems Sector', minLevel: 1501, maxLevel: 1800, minHours: 450.7, maxHours: 550, color: '#a855f7' },
  { index: 7, code: 'DIV-07', name: 'OVERSEER', sectorName: 'High Command Sector', minLevel: 1801, maxLevel: 2100, minHours: 550.7, maxHours: 650, color: '#ec4899' },
  { index: 8, code: 'DIV-08', name: 'SENTINEL', sectorName: 'Aegis Citadel Sector', minLevel: 2101, maxLevel: 2400, minHours: 650.7, maxHours: 750, color: '#f97316' },
  { index: 9, code: 'DIV-09', name: 'SOVEREIGN', sectorName: 'Imperial Dominion Sector', minLevel: 2401, maxLevel: 2700, minHours: 750.7, maxHours: 875, color: '#eab308' },
  { index: 10, code: 'DIV-10', name: 'MONOLITH', sectorName: 'Transcendent Monolith Sector', minLevel: 2701, maxLevel: 3000, minHours: 876, maxHours: 1000, color: '#f43f5e' },
];

// 15 Archetypes per Division × 20 Grades (I..XX) = 300 Ranks per Division × 10 Divisions = 3,000 Ranks
const DIVISION_ARCHETYPES: Record<number, Array<[string, string]>> = {
  1: [
    ['BOOT NODE', 'Baseline telemetry uplink initialized'],
    ['PULSE LISTENER', 'Detecting early study cadence signals'],
    ['SIGNAL SEEKER', 'Scanning low-band frequency channels'],
    ['TERMINAL NOVICE', 'Operating foundational console protocols'],
    ['LOG APPRENTICE', 'Establishing consistent archival habits'],
    ['SYNTAX RUNNER', 'Executing structured learning sequences'],
    ['HABIT SPARK', 'Igniting daily cognitive momentum'],
    ['ROUTINE LINKER', 'Synchronizing recurring study nodes'],
    ['TRACE TRACKER', 'Monitoring continuous session output'],
    ['BUFFER SCOUT', 'Allocating early memory registers'],
    ['CLOCK WATCHER', 'Aligning daily focus intervals'],
    ['INDEX KEEPER', 'Cataloging initial subject records'],
    ['FRAME BUILDER', 'Constructing daily study scaffolding'],
    ['UPLINK STABILIZER', 'Securing reliable focus bandwidth'],
    ['INITIATE PRIME', 'Mastery of Division 01 baseline operations'],
  ],
  2: [
    ['CADET PROBATION', 'Entered orbital training qualification'],
    ['CIRCUIT BUILDER', 'Constructing resilient focus pathways'],
    ['STATIC BREAKER', 'Overcoming environmental resistance'],
    ['VECTOR PILOT', 'Navigating directional study trajectories'],
    ['GRID NAVIGATOR', 'Mapping multi-category knowledge grids'],
    ['CORE CALIBRATOR', 'Fine-tuning session endurance metrics'],
    ['PHASE SPRINTER', 'Accelerating weekly telemetry velocity'],
    ['RELAY GUARDIAN', 'Maintaining unbroken signal continuity'],
    ['ORBITAL CADET', 'Stabilized high-altitude study orbit'],
    ['BEACON TRACKER', 'Locking onto long-range study targets'],
    ['CONDUIT ENGINEER', 'Channeling sustained daily effort'],
    ['RADAR OBSERVER', 'Sweeping complex domain horizons'],
    ['THRUST REGULATOR', 'Balancing intensity and consistency'],
    ['SECTOR CADET', 'Proven competence across core units'],
    ['CENTURION CADET', 'Supreme commander of Cadet Division'],
  ],
  3: [
    ['FIELD OPERATOR', 'Active-duty telemetry operations'],
    ['DATA RELAYER', 'High-throughput knowledge transmission'],
    ['CHRONO KEEPER', 'Precision time-allocation discipline'],
    ['STREAM ANALYST', 'Evaluating long-range session patterns'],
    ['PROTOCOL GUARD', 'Enforcing strict daily focus standards'],
    ['DUPLEX OPERATOR', 'Dual-channel analytical processing'],
    ['MATRIX WATCHER', 'Sustaining dense cadence matrix coverage'],
    ['PACKET ROUTER', 'Optimizing complex category workloads'],
    ['HIGH-GAIN OPERATOR', 'Amplified cognitive output efficiency'],
    ['BANDWIDTH WARDEN', 'Zero-loss information absorption'],
    ['CONSOLE TACTICIAN', 'Rapid execution of study objectives'],
    ['SYNC DISPATCHER', 'Harmonizing daily and weekly targets'],
    ['CIPHER OPERATOR', 'Decoding advanced subject structures'],
    ['ARRAY CONTROLLER', 'Managing parallel learning streams'],
    ['OPERATOR PRIME', 'Apex operational authority achieved'],
  ],
  4: [
    ['TELEMETRY SPECIALIST', 'Advanced technical domain specialization'],
    ['CYCLE ENGINEER', 'Engineering sustainable deep-work cycles'],
    ['DEEP BUFFER', 'High-capacity mental retention buffer'],
    ['SPECTRUM TUNER', 'Broad-spectrum subject mastery'],
    ['LOGIC SYNTHESIZER', 'Synthesizing cross-disciplinary axioms'],
    ['SIGNAL AUDITOR', 'Zero-drift telemetry verification'],
    ['FREQUENCY MASTER', 'Harmonic alignment of daily focus'],
    ['PRECISION CRAFTER', 'High-craft execution across all units'],
    ['QUANTUM SPECIALIST', 'Non-linear problem solving capability'],
    ['RESONANCE ENGINE', 'Sustaining high-Q intellectual focus'],
    ['KERNEL ANALYST', 'Dissecting core theoretical foundations'],
    ['TENSOR NAVIGATOR', 'Multi-dimensional analytical fluency'],
    ['OPTIC CALIBRATOR', 'Crystal-clear conceptual resolution'],
    ['KILO-HOUR VANGUARD', 'Crossing the 300-hour threshold'],
    ['SPECIALIST PRIME', 'Grand Specialist of Division 04'],
  ],
  5: [
    ['VANGUARD SCOUT', 'Pioneering deep-endurance frontiers'],
    ['HORIZON BREAKER', 'Surpassing conventional study limits'],
    ['FRONTIER RUNNER', 'Long-range autonomous expedition'],
    ['KILO-NODE STRIKER', 'Expanding beyond the first millennium'],
    ['MILLENNIUM VANGUARD', 'Four-digit cumulative hour authority'],
    ['HYPERION PILOT', 'High-luminosity intellectual drive'],
    ['AETHER NAVIGATOR', 'Charting upper-atmosphere mastery'],
    ['STARLIGHT LANCER', 'Piercing through complex domains'],
    ['NOVA COMMANDER', 'Radiating sustained analytical power'],
    ['ZENITH PIONEER', 'Climbing steep intellectual gradients'],
    ['OUTPOST COMMANDER', 'Holding forward knowledge bastions'],
    ['WARP PATHFINDER', 'Compressing learning curves through focus'],
    ['SOLAR VANGUARD', 'Unwavering daily energy output'],
    ['PULSAR STRIKER', 'Rhythmic high-intensity study cadence'],
    ['VANGUARD PRIME', 'Supreme Vanguard of Division 05'],
  ],
  6: [
    ['SYSTEM ARCHITECT', 'Designing foundational knowledge systems'],
    ['FOUNDATION BUILDER', 'Erecting permanent intellectual pillars'],
    ['SCHEMA DIRECTOR', 'Governing high-level structural schemas'],
    ['NEURAL CARTOGRAPHER', 'Mapping deep cognitive architectures'],
    ['MONOLITH DRAFTER', 'Drafting monumental study frameworks'],
    ['SESQUI-KILO ARCHITECT', 'Five-hundred-hour structural veteran'],
    ['CITADEL ENGINEER', 'Fortifying unshakeable domain expertise'],
    ['NEXUS STRUCTURALIST', 'Connecting core theoretical nexuses'],
    ['LATTICE MASTER', 'Crystal-lattice precision & endurance'],
    ['KEYSTONE FORGER', 'Locking complex concepts into place'],
    ['VAULT DESIGNER', 'Constructing permanent memory vaults'],
    ['GRID SOVEREIGN', 'Total command of the cadence matrix'],
    ['BLUEPRINT GRANDMASTER', 'Mastery of macro-scale study plans'],
    ['SPIRE ARCHITECT', 'Building toward the 500-hour sky'],
    ['ARCHITECT PRIME', 'Chief Architect of Division 06'],
  ],
  7: [
    ['SECTOR OVERSEER', 'Overseeing multi-year telemetry archives'],
    ['CHRONO WARDEN', 'Custodian of thousands of focused hours'],
    ['ORBITAL DIRECTOR', 'Directing macro-scale learning campaigns'],
    ['DOMINION WATCHER', 'Commanding vast territories of skill'],
    ['HIGH AUDITOR', 'Uncompromising standard of execution'],
    ['ZENITH CUSTODIAN', 'Operating at peak cognitive altitude'],
    ['OBELISK GUARDIAN', 'Standing sentinel over vast archives'],
    ['DOMINION INSPECTOR', 'Supreme oversight of all study units'],
    ['GRAND ARBITER', 'Unquestioned mastery of self-discipline'],
    ['PANOPTICON DIRECTOR', 'Complete visibility across all metrics'],
    ['CHANCELLOR OF FOCUS', 'Governing long-horizon intellectual output'],
    ['ASTRAL OVERSEER', 'Guiding stellar-scale study operations'],
    ['SANCTUM KEEPER', 'Preserving pure uninterrupted concentration'],
    ['PREFECT OF CADENCE', 'Flawless multi-month rhythm control'],
    ['OVERSEER PRIME', 'High Overseer of Division 07'],
  ],
  8: [
    ['AEGIS SENTINEL', 'Unyielding guardian of deep focus'],
    ['BI-MILLENNIUM BASTION', 'Seven-hundred-hour fortress of habit'],
    ['SOLAR WARDEN', 'Relentless daily illumination & output'],
    ['VOID SENTINEL', 'Unmoved by distraction or entropy'],
    ['ASTRAL PALADIN', 'Champion of long-horizon dedication'],
    ['CHRONO TEMPLAR', 'Sworn keeper of the perpetual clock'],
    ['IRONCLAD TITAN', 'Unbreakable cognitive stamina'],
    ['CELESTIAL KEEPER', 'Sustaining stellar-grade consistency'],
    ['IMMORTAL ENGINE', 'Perpetual-motion intellectual reactor'],
    ['BASTION COMMANDER', 'Defending high-output study streaks'],
    ['VALKYRIE OF FOCUS', 'Soaring above ordinary fatigue'],
    ['DREADNOUGHT CORE', 'Heavy-duty analytical processing power'],
    ['PHALANX GUARDIAN', 'Shielded against all external noise'],
    ['APEX WATCHGUARD', 'Vigilant across thousands of hours'],
    ['SENTINEL PRIME', 'Supreme Sentinel of Division 08'],
  ],
  9: [
    ['HIGH SOVEREIGN', 'Ascended to Sovereign-class telemetry'],
    ['CROWN OF CADENCE', 'Crowned in unbroken daily discipline'],
    ['IMPERIAL REGENT', 'Ruling the highest altitudes of focus'],
    ['EMPYREAN ARCHON', 'Imperial-grade analytical command'],
    ['ASTRAL MONARCH', 'Monarch of the deep-archive realm'],
    ['QUARTER-MYRIAD LORD', '800-hour sovereign milestone achieved'],
    ['DYNASTY FOUNDER', 'Forging an enduring intellectual legacy'],
    ['SOLAR EMPEROR', 'Commanding a vast empire of knowledge'],
    ['THRONE OF AXIOMS', 'Seated atop foundational truths'],
    ['GRAND AUTOCRAT', 'Absolute self-mastery and willpower'],
    ['STARFORGE SOVEREIGN', 'Forging brilliance under intense pressure'],
    ['CELESTIAL REGENT', 'Harmonizing all academic disciplines'],
    ['PLATINUM MONARCH', 'Unblemished record of dedication'],
    ['ECLIPSE SOVEREIGN', 'Overshadowing all prior limitations'],
    ['SOVEREIGN PRIME', 'Paramount Sovereign of Division 09'],
  ],
  10: [
    ['MONOLITH ASCENDANT', 'Transcending mortal study thresholds'],
    ['SINGULARITY CORE', 'Infinite density of focused execution'],
    ['COSMIC ARCHITECT', 'Shaping universal knowledge structures'],
    ['TIMELESS ORACLE', 'Beyond the constraints of ordinary time'],
    ['AKASHIC RECORDER', 'Inscribed in the permanent telemetry ledger'],
    ['DIMENSION WEAVER', 'Weaving mastery across all disciplines'],
    ['EVENT HORIZON', 'Point of no return in pursuit of mastery'],
    ['QUASAR ENGINE', 'Outshining entire galaxies of effort'],
    ['ETERNAL OBELISK', 'Towering monument of 900+ cycle-hours'],
    ['CHRONO DEITY', 'Master of time and cognitive flow'],
    ['ASTRAL PANTHEON', 'Dwelling among the legends of focus'],
    ['TRANSCENDENT CORE', 'Pure synthesis of habit and intellect'],
    ['INFINITY ARCHITECT', 'Boundless horizon of continuous growth'],
    ['APEX OF ETERNITY', 'The final steps before the 1,000h cycle summit'],
    ['OMEGA MONOLITH', 'Ultimate 1,000-hour cycle Monolith perfection'],
  ],
};

// Special exact hour milestones within a single CYCLE_HOURS (1,000H) cycle.
// Every rank's reqHours is now cycle-relative, so these fire once per cycle.
const SPECIAL_HOUR_OVERRIDES: Record<number, { title: string; sub: string }> = {
  0: { title: 'ZERO-HOUR INITIALIZATION', sub: '0H MILESTONE // Telemetry archive initialized' },
  50: { title: 'INITIATE SUMMIT // 50H', sub: '50H MILESTONE // Division 01 complete' },
  100: { title: 'CENTURY LOCK // 100H', sub: '100H MILESTONE // Triple-digit cycle telemetry unlocked' },
  150: { title: 'CADET SUMMIT // 150H', sub: '150H MILESTONE // Division 02 complete' },
  200: { title: 'BI-CENTURY NODE // 200H', sub: '200H MILESTONE // Two hundred hours of verified focus' },
  250: { title: 'OPERATOR SUMMIT // 250H', sub: '250H MILESTONE // Division 03 complete' },
  300: { title: 'TRI-CENTURY CORE // 300H', sub: '300H MILESTONE // Three hundred cycle hours archived' },
  350: { title: 'SPECIALIST SUMMIT // 350H', sub: '350H MILESTONE // Division 04 complete' },
  400: { title: 'QUAD-CENTURY ENGINE // 400H', sub: '400H MILESTONE // Four hundred hours of discipline' },
  450: { title: 'VANGUARD SUMMIT // 450H', sub: '450H MILESTONE // Division 05 complete' },
  500: { title: 'HALF-CYCLE MERIDIAN // 500H', sub: '500H MILESTONE // Exact halfway point of the cycle' },
  550: { title: 'ARCHITECT SUMMIT // 550H', sub: '550H MILESTONE // Division 06 complete' },
  600: { title: 'HEXA-CENTURY GUARD // 600H', sub: '600H MILESTONE // Six hundred cycle hours committed' },
  650: { title: 'OVERSEER SUMMIT // 650H', sub: '650H MILESTONE // Division 07 complete' },
  700: { title: 'SEPTA-CENTURY RELAY // 700H', sub: '700H MILESTONE // Seven hundred hours of focus' },
  750: { title: 'SENTINEL SUMMIT // 750H', sub: '750H MILESTONE // Division 08 complete' },
  800: { title: 'OCTO-CENTURY VAULT // 800H', sub: '800H MILESTONE // Eight hundred cycle hours archived' },
  875: { title: 'SOVEREIGN SUMMIT // 875H', sub: '875H MILESTONE // Division 09 complete' },
  900: { title: 'ASTRAL HORIZON // 900H', sub: '900H MILESTONE // Final 100 hours to cycle completion' },
  950: { title: 'FINAL APPROACH // 950H', sub: '950H MILESTONE // Fifty hours from Ascension' },
  1000: {
    title: 'OMEGA MONOLITH // CYCLE COMPLETE',
    sub: '1,000H MILESTONE // Supreme 3,000th rank — ASCENSION available',
  },
};

function buildClearanceLevels(): ClearanceLevel[] {
  // One cycle (CYCLE_HOURS = 1,000H) spans all 10 divisions; each bound here
  // is the legacy 30,000H-ladder value ÷30, keeping the original pacing
  // shape (division 1 fastest, division 10 the big finale) intact.
  const divisionHourBounds: Array<[number, number]> = [
    [0, 50],       // DIV 1: LV 1..300 (1/6H per rank, ~10 min)
    [50, 150],     // DIV 2: LV 301..600 (1/3H per rank, ~20 min)
    [150, 250],    // DIV 3: LV 601..900 (1/3H per rank)
    [250, 350],    // DIV 4: LV 901..1200 (1/3H per rank)
    [350, 450],    // DIV 5: LV 1201..1500 (1/3H per rank)
    [450, 550],    // DIV 6: LV 1501..1800 (1/3H per rank)
    [550, 650],    // DIV 7: LV 1801..2100 (1/3H per rank)
    [650, 750],    // DIV 8: LV 2101..2400 (1/3H per rank)
    [750, 875],    // DIV 9: LV 2401..2700 (5/12H per rank, 25 min)
    [875, 1000],   // DIV 10: LV 2701..3000 (5/12H per rank)
  ];

  // 20 grades per archetype (doubled from 10) so each of the existing 15
  // archetypes per division now spans twice as many ranks (300 total).
  const romanTiers = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  ];
  const tierLabels = [
    'GRADE I', 'GRADE II', 'GRADE III', 'GRADE IV', 'GRADE V',
    'GRADE VI', 'GRADE VII', 'GRADE VIII', 'GRADE IX', 'GRADE X',
    'GRADE XI', 'GRADE XII', 'GRADE XIII', 'GRADE XIV', 'GRADE XV',
    'GRADE XVI', 'GRADE XVII', 'GRADE XVIII', 'GRADE XIX', 'GRADE XX // PRIME',
  ];
  const gradesPerArchetype = 20;
  const result: ClearanceLevel[] = [];

  for (let divIdx = 1; divIdx <= 10; divIdx++) {
    const div = CLEARANCE_DIVISIONS[divIdx - 1];
    const [startH, endH] = divisionHourBounds[divIdx - 1];
    const archetypes = DIVISION_ARCHETYPES[divIdx];
    const step = (endH - startH) / RANKS_PER_DIVISION;

    for (let offset = 0; offset < RANKS_PER_DIVISION; offset++) {
      const level = (divIdx - 1) * RANKS_PER_DIVISION + offset + 1;
      let reqHours: number;

      if (level === 1) {
        reqHours = 0;
      } else if (divIdx === 1) {
        // Division 01 uses a linear 0-based ramp (no leading-step skip) so
        // early progression starts immediately after the LV.1 override.
        reqHours = offset === RANKS_PER_DIVISION - 1 ? endH : offset * step;
        reqHours = Math.round(reqHours * 10) / 10;
        if (Number.isInteger(reqHours)) reqHours = Math.trunc(reqHours);
      } else {
        reqHours = Math.round((startH + (offset + 1) * step) * 10) / 10;
        if (Number.isInteger(reqHours)) reqHours = Math.trunc(reqHours);
      }

      const archIdx = Math.floor(offset / gradesPerArchetype);
      const gradeIdx = offset % gradesPerArchetype;
      const [archTitle, archDesc] = archetypes[archIdx];
      const roman = romanTiers[gradeIdx];
      const tierStr = tierLabels[gradeIdx];

      const override = SPECIAL_HOUR_OVERRIDES[reqHours];
      const title = override ? override.title : `${archTitle} ${roman}`;
      const subtitle = override
        ? override.sub
        : `${div.sectorName} (${tierStr}) — ${archDesc}`;

      result.push({
        level,
        requiredHours: reqHours,
        title,
        subtitle,
        division: div.name,
        divisionIndex: divIdx,
        color: div.color,
        isMajorMilestone: Boolean(override) || (offset + 1) % 100 === 0,
      });
    }
  }

  return result;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CLEARANCE_LEVELS: ClearanceLevel[] = buildClearanceLevels();

export interface UserClearanceStatus {
  current: ClearanceLevel;
  next: ClearanceLevel | null;
  totalHours: number; // lifetime hours — never resets, even across Ascensions
  hoursIntoLevel: number;
  levelSpanHours: number;
  progressPct: number;
  hoursRemainingToNext: number;
  subPhase: number; // 1..5 pips within current level
  hoursToNextSubPhase: number;
  unlockedCount: number;
  totalRanks: number;
  cycleNumber: number; // the cycle currently on display (claimedCycles + 1)
  cycleHours: number; // hours earned toward the displayed cycle, capped at CYCLE_HOURS
  rawCycleNumber: number; // cycles actually earned from lifetime hours, ignoring claim state
  ascensionAvailable: boolean; // an unclaimed cycle-complete is ready to Ascend
  totalAscensions: number; // = claimedCycles
  rewardUnlockLevel: number; // use this (not `current.level`) to gate Theme/Noise unlocks —
  // stays maxed at 3,000 forever once the first Ascension is claimed, since
  // reaching LV.3000 at least once is required to Ascend in the first place.
}

// eslint-disable-next-line react-refresh/only-export-components
export function getClearanceStatus(
  totalMinutes: number,
  claimedCycles: number = 0
): UserClearanceStatus {
  const totalHoursLifetime = Math.max(0, totalMinutes / 60);
  // `claimedCycles` is a permanent achievement counter (how many times the
  // user has ever Ascended) — it must never regress, so Surface
  // Themes/Noise profiles stay unlocked forever as documented, even if
  // lifetime hours later drop (e.g. "RESET STUDY LOGS" wipes totalMinutes,
  // or an old entry gets deleted/shortened).
  const rawClaimedCycles = Math.max(0, Math.floor(claimedCycles));
  // For CURRENT CYCLE PROGRESS specifically (level/hours/%), clamp to what's
  // actually achievable from current lifetime hours instead. Without this,
  // a reset-to-near-zero totalHours while rawClaimedCycles stays high would
  // leave cycleHours permanently clamped at 0 (stuck showing LV.0001 /
  // ZERO-HOUR INITIALIZATION) no matter how many new hours get logged,
  // since totalHours would need to climb back past rawClaimedCycles *
  // CYCLE_HOURS before the subtraction below turns positive again. This
  // self-heals immediately and re-syncs upward again once hours catch up.
  const maxAchievableCycles = Math.floor(totalHoursLifetime / CYCLE_HOURS);
  const safeClaimedCycles = Math.min(rawClaimedCycles, maxAchievableCycles);
  const cycleNumber = safeClaimedCycles + 1;
  const rawCycleNumber = Math.floor(totalHoursLifetime / CYCLE_HOURS) + 1;
  const cycleStartHours = safeClaimedCycles * CYCLE_HOURS;
  const cycleHours = Math.min(CYCLE_HOURS, Math.max(0, totalHoursLifetime - cycleStartHours));
  const ascensionAvailable = rawCycleNumber > cycleNumber;

  let currentIdx = 0;
  for (let i = CLEARANCE_LEVELS.length - 1; i >= 0; i--) {
    if (cycleHours >= CLEARANCE_LEVELS[i].requiredHours) {
      currentIdx = i;
      break;
    }
  }

  const current = CLEARANCE_LEVELS[currentIdx];
  const next = currentIdx + 1 < CLEARANCE_LEVELS.length ? CLEARANCE_LEVELS[currentIdx + 1] : null;
  const rewardUnlockLevel = rawClaimedCycles >= 1 ? CLEARANCE_LEVELS.length : current.level;

  if (!next) {
    return {
      current,
      next: null,
      totalHours: +totalHoursLifetime.toFixed(1),
      hoursIntoLevel: +(cycleHours - current.requiredHours).toFixed(1),
      levelSpanHours: 0,
      progressPct: 100,
      hoursRemainingToNext: 0,
      subPhase: 5,
      hoursToNextSubPhase: 0,
      unlockedCount: CLEARANCE_LEVELS.length,
      totalRanks: CLEARANCE_LEVELS.length,
      cycleNumber,
      cycleHours: +cycleHours.toFixed(1),
      rawCycleNumber,
      ascensionAvailable,
      totalAscensions: rawClaimedCycles,
      rewardUnlockLevel,
    };
  }

  const span = Math.max(0.1, next.requiredHours - current.requiredHours);
  const into = Math.max(0, cycleHours - current.requiredHours);
  const rawPct = Math.min(100, Math.max(0, (into / span) * 100));
  const progressPct = Math.round(rawPct * 10) / 10;
  const hoursRemainingToNext = Math.max(0, +(next.requiredHours - cycleHours).toFixed(1));

  const subPhase = Math.min(5, Math.floor(rawPct / 20) + 1);
  const nextSubPhaseTargetHours = current.requiredHours + (span * subPhase) / 5;
  const hoursToNextSubPhase = Math.max(0, +(nextSubPhaseTargetHours - cycleHours).toFixed(1));

  return {
    current,
    next,
    totalHours: +totalHoursLifetime.toFixed(1),
    hoursIntoLevel: +into.toFixed(1),
    levelSpanHours: span,
    progressPct,
    hoursRemainingToNext,
    subPhase,
    hoursToNextSubPhase,
    unlockedCount: currentIdx + 1,
    totalRanks: CLEARANCE_LEVELS.length,
    cycleNumber,
    cycleHours: +cycleHours.toFixed(1),
    rawCycleNumber,
    ascensionAvailable,
    totalAscensions: rawClaimedCycles,
    rewardUnlockLevel,
  };
}

export interface PrestigeBadge {
  label: string;
  colorHex: string;
  isPrism: boolean;
}

// Escalating cosmetic tiers for repeat Ascension: gold -> platinum -> an
// animated prismatic treatment (CSS class `.prestige-prism-text`, index.css)
// for players who have cycled three or more times.
// eslint-disable-next-line react-refresh/only-export-components
export function getPrestigeBadge(totalAscensions: number): PrestigeBadge | null {
  if (totalAscensions <= 0) return null;
  // Deliberately does NOT repeat "CYCLE XX" (that's already shown by its own
  // badge wherever this chip appears) — this shows the Ascension *tier*
  // instead, so the two badges carry distinct information side by side.
  const label = `✦×${totalAscensions}`;
  if (totalAscensions === 1) return { label, colorHex: '#eab308', isPrism: false };
  if (totalAscensions === 2) return { label, colorHex: '#e5e7eb', isPrism: false };
  return { label, colorHex: '#ffffff', isPrism: true };
}

// ==========================================
// 2. WEB AUDIO API AMBIENT NOISE SYNTHESIZER
// ==========================================

export type NoiseMode = string;

type NoiseBaseColor = 'white' | 'pink' | 'brown' | 'blue' | 'violet';

interface NoiseDroneTone {
  freq: number;
  type: OscillatorType;
  gain: number;
}

interface NoiseSynthParams {
  baseColor: NoiseBaseColor;
  filterType: BiquadFilterType;
  cutoffHz: number;
  q?: number;
  drone?: NoiseDroneTone[];
  droneFilterHz?: number;
  lfo?: { rate: number; depth: number; target: 'cutoff' | 'gain' };
  trim?: number;
}

export interface NoiseProfile {
  id: NoiseMode;
  code: string;
  name: string;
  desc: string;
  family: string;
  clearanceHintLv: number;
  synth: NoiseSynthParams;
}

type NoisePreset = Omit<NoiseProfile, 'clearanceHintLv'>;

function mkNoise(
  id: string,
  code: string,
  name: string,
  desc: string,
  family: string,
  synth: NoiseSynthParams
): NoisePreset {
  return { id, code, name, desc, family, synth };
}

// eslint-disable-next-line react-refresh/only-export-components
export const NOISE_FAMILIES: Array<{ id: string; label: string; color: string }> = [
  { id: 'BROWN', label: 'Brown / Rumble', color: '#b45309' },
  { id: 'PINK', label: 'Pink / Rain', color: '#ec4899' },
  { id: 'WHITE', label: 'White / Static', color: '#a1a1aa' },
  { id: 'BLUE', label: 'Blue / Shimmer', color: '#38bdf8' },
  { id: 'VIOLET', label: 'Violet / Sizzle', color: '#a855f7' },
  { id: 'NATURE', label: 'Nature / LFO', color: '#22c55e' },
  { id: 'MECHANICAL', label: 'Mechanical', color: '#64748b' },
  { id: 'DRONE', label: 'Drone / Pad', color: '#6366f1' },
];

// Deep rumble & low-frequency sources (lowpass-filtered brown noise).
const BROWN_FAMILY: NoisePreset[] = [
  mkNoise('brown', 'BRN', 'DEEP BROWN NOISE', 'Warm low-frequency rumble (Cabin / Waterfall) for deep concentration', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 950 }),
  mkNoise('submarine-hum', 'SUB', 'SUBMARINE ENGINE HUM', 'Pressurized hull throb beneath the waterline for isolation-grade focus', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 500, q: 1.2 }),
  mkNoise('underground-bunker', 'BNK', 'UNDERGROUND BUNKER DRONE', 'Thick concrete-shielded silence with a deep subterranean hum', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 350 }),
  mkNoise('distant-thunder', 'THU', 'DISTANT THUNDER ROLL', 'Slow rolling thunder swell far beyond the horizon', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 300, lfo: { rate: 0.08, depth: 200, target: 'cutoff' } }),
  mkNoise('boiler-room', 'BLR', 'INDUSTRIAL BOILER ROOM', 'Heavy pressurized boiler plant throb for mechanical focus', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 700, q: 2 }),
  mkNoise('cave-depths', 'CAV', 'DEEP CAVE RESONANCE', 'Resonant limestone cavern air for still, echoing concentration', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 400, q: 1.5 }),
  mkNoise('power-plant-hum', 'PWR', 'POWER PLANT TRANSFORMER HUM', 'Heavy electrical substation hum, steady and grounding', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 550 }),
  mkNoise('earth-core', 'COR', 'EARTH CORE VIBRATION', 'Impossibly deep planetary rumble beneath the crust', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 250 }),
  mkNoise('tunnel-wind', 'TUN', 'TUNNEL WIND RUMBLE', 'Pressurized subway tunnel air pushed ahead of an arriving train', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 600, lfo: { rate: 0.15, depth: 150, target: 'cutoff' } }),
  mkNoise('bass-cocoon', 'COC', 'BASS COCOON WRAP', 'Enveloping low-end wrap for total sensory cocooning', 'BROWN', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 850, trim: 0.9 }),
];

// Balanced 1/f spectrum — rain, flowing water, paper, steady natural sources.
const PINK_FAMILY: NoisePreset[] = [
  mkNoise('pink', 'PNK', 'WARM PINK RAIN', 'Balanced 1/f natural rain spectrum for steady study sessions', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2400 }),
  mkNoise('forest-canopy-rain', 'FOR', 'FOREST CANOPY RAIN', 'Rain filtering gently through a dense summer forest canopy', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2000 }),
  mkNoise('tin-roof-rain', 'TIN', 'TIN ROOF RAINFALL', 'Crisp rainfall drumming on a corrugated tin roof', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2800, q: 1.3 }),
  mkNoise('river-flow', 'RIV', 'STEADY RIVER FLOW', 'Wide steady river current with a slow natural swell', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 1800, lfo: { rate: 0.1, depth: 300, target: 'cutoff' } }),
  mkNoise('waterfall-mist', 'MST', 'WATERFALL MIST VEIL', 'Soft diffuse waterfall mist spray, cool and continuous', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2200 }),
  mkNoise('monsoon-downpour', 'MON', 'MONSOON DOWNPOUR', 'Heavy tropical monsoon downpour at full intensity', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 3000, trim: 1.05 }),
  mkNoise('vinyl-hiss', 'VNY', 'VINTAGE VINYL HISS', 'Warm analog record-player surface hiss between tracks', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2600, q: 0.8 }),
  mkNoise('library-murmur', 'LIB', 'LIBRARY PAPER MURMUR', 'Hushed reading-room air and distant turning pages', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 1600 }),
  mkNoise('autumn-leaves', 'LEA', 'AUTUMN LEAVES RUSTLE', 'Dry autumn leaves rustling in a slow intermittent breeze', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2400, lfo: { rate: 0.2, depth: 0.06, target: 'gain' } }),
  mkNoise('seashell-echo', 'SEA', 'SEASHELL OCEAN ECHO', 'The soft oceanic hush captured inside a held seashell', 'PINK', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 1900 }),
];

// Bright masking static — airflow, electronics, crisp full-spectrum hiss.
const WHITE_FAMILY: NoisePreset[] = [
  mkNoise('white', 'WHT', 'SOFT WHITE STATIC', 'Filtered air-flow static to mask background voices & distractions', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 4200 }),
  mkNoise('air-conditioner', 'AIR', 'AIR CONDITIONER HUM', 'Steady climate-control airflow hum for office-grade masking', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 3800, q: 1.1 }),
  mkNoise('box-fan-breeze', 'FAN', 'BOX FAN BREEZE', 'Oscillating box-fan breeze with a gentle rotating sweep', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 4500, lfo: { rate: 0.25, depth: 0.08, target: 'gain' } }),
  mkNoise('jet-cabin', 'JET', 'JET CABIN CRUISE HUM', 'Cruising-altitude airliner cabin hum, muffled and distant', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 3200 }),
  mkNoise('server-room', 'SRV', 'DATA SERVER ROOM', 'Dense server-rack cooling fans at full industrial load', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 5000, q: 1.4 }),
  mkNoise('wind-tunnel', 'WND', 'WIND TUNNEL TEST', 'High-velocity laminar wind-tunnel airflow, perfectly even', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 4800 }),
  mkNoise('hairdryer-steady', 'HRD', 'STEADY HAIRDRYER FLOW', 'Continuous hairdryer airflow held at a fixed distance', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 5200 }),
  mkNoise('ventilation-duct', 'VNT', 'VENTILATION DUCT FLOW', 'Building ventilation duct airflow echoing down a corridor', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 3600 }),
  mkNoise('aerosol-static', 'AER', 'AEROSOL MIST STATIC', 'Fine atomized mist static, light and airy', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 4000, trim: 0.85 }),
  mkNoise('hospital-monitor', 'HOS', 'HOSPITAL MONITOR HISS', 'Clinical equipment hiss, clean and unobtrusive', 'WHITE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 4400 }),
];

// Bright high-frequency-emphasized textures (differentiated white noise).
const BLUE_FAMILY: NoisePreset[] = [
  mkNoise('digital-shimmer', 'DIG', 'DIGITAL SHIMMER STATIC', 'Crisp high-frequency digital shimmer, cool and precise', 'BLUE', { baseColor: 'blue', filterType: 'highpass', cutoffHz: 1200 }),
  mkNoise('satellite-uplink', 'SAT', 'SATELLITE UPLINK HISS', 'Thin high-band carrier hiss from an orbital relay', 'BLUE', { baseColor: 'blue', filterType: 'highpass', cutoffHz: 1800 }),
  mkNoise('glass-harmonics', 'GLS', 'GLASS HARMONIC RING', 'Resonant glass-rim harmonics sustained into static', 'BLUE', { baseColor: 'blue', filterType: 'highpass', cutoffHz: 2200, q: 2 }),
  mkNoise('crystal-chime-static', 'CRY', 'CRYSTAL CHIME STATIC', 'Delicate crystalline chime texture dissolved into hiss', 'BLUE', { baseColor: 'blue', filterType: 'highpass', cutoffHz: 1500 }),
  mkNoise('cyber-static', 'CYB', 'CYBER NEON STATIC', 'Neon-lit cyberpunk alley static, bright and synthetic', 'BLUE', { baseColor: 'blue', filterType: 'highpass', cutoffHz: 2000 }),
  mkNoise('tinnitus-masker', 'TNM', 'GENTLE MASKING SHIMMER', 'Soft therapeutic shimmer tuned for light ear masking', 'BLUE', { baseColor: 'blue', filterType: 'highpass', cutoffHz: 1000, trim: 0.8 }),
];

// Sharper, sizzling high-frequency-emphasized textures (double-differentiated).
const VIOLET_FAMILY: NoisePreset[] = [
  mkNoise('starlight-sizzle', 'STR', 'STARLIGHT SIZZLE', 'Fine cosmic sizzle like starlight crackling through static', 'VIOLET', { baseColor: 'violet', filterType: 'highpass', cutoffHz: 2500 }),
  mkNoise('plasma-field', 'PLS', 'PLASMA FIELD CRACKLE', 'Charged plasma-field crackle, sharp and electric', 'VIOLET', { baseColor: 'violet', filterType: 'highpass', cutoffHz: 3000, q: 1.5 }),
  mkNoise('quartz-oscillation', 'QTZ', 'QUARTZ OSCILLATION', 'High-precision quartz-crystal oscillator whine', 'VIOLET', { baseColor: 'violet', filterType: 'highpass', cutoffHz: 2800 }),
  mkNoise('ion-storm', 'ION', 'ION STORM STATIC', 'Charged upper-atmosphere ion storm static', 'VIOLET', { baseColor: 'violet', filterType: 'highpass', cutoffHz: 3500 }),
  mkNoise('needle-rain', 'NDL', 'FINE NEEDLE RAIN', 'Fine needle-sharp rain on a metal awning', 'VIOLET', { baseColor: 'violet', filterType: 'highpass', cutoffHz: 2200 }),
  mkNoise('spark-gap', 'SPK', 'SPARK GAP HISS', 'Tesla-coil spark-gap hiss, bright and brittle', 'VIOLET', { baseColor: 'violet', filterType: 'highpass', cutoffHz: 4000, trim: 0.75 }),
];

// Slowly modulated organic textures — waves, wind, weather (LFO-driven).
const NATURE_FAMILY: NoisePreset[] = [
  mkNoise('ocean-waves', 'OCN', 'OCEAN WAVE SWELL', 'Rolling ocean swell rising and receding on an open shore', 'NATURE', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 700, lfo: { rate: 0.06, depth: 350, target: 'cutoff' } }),
  mkNoise('wind-through-trees', 'WTR', 'WIND THROUGH TREES', 'Gusting wind moving through a tall pine forest', 'NATURE', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2200, lfo: { rate: 0.18, depth: 500, target: 'cutoff' } }),
  mkNoise('mountain-breeze', 'MTN', 'MOUNTAIN BREEZE DRIFT', 'Thin crisp high-altitude breeze drifting across a ridge', 'NATURE', { baseColor: 'white', filterType: 'highpass', cutoffHz: 1200, lfo: { rate: 0.12, depth: 0.07, target: 'gain' } }),
  mkNoise('snowfall-hush', 'SNW', 'SNOWFALL HUSH', 'The near-total silence of snow falling on snow', 'NATURE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 2800, trim: 0.7 }),
  mkNoise('babbling-brook', 'BRK', 'BABBLING BROOK FLOW', 'A small rocky brook babbling over smooth stones', 'NATURE', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2000, lfo: { rate: 0.35, depth: 300, target: 'cutoff' } }),
  mkNoise('desert-wind', 'DSW', 'DESERT WIND GUST', 'Dry desert wind gusting across open dunes', 'NATURE', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 3400, lfo: { rate: 0.09, depth: 0.09, target: 'gain' } }),
  mkNoise('rainforest-canopy', 'RFC', 'RAINFOREST CANOPY DRIP', 'Dripping humid canopy long after the rain has passed', 'NATURE', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2600, lfo: { rate: 0.22, depth: 0.05, target: 'gain' } }),
  mkNoise('arctic-wind', 'ARC', 'ARCTIC WIND HOWL', 'Low howling arctic wind across an exposed ice shelf', 'NATURE', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 900, lfo: { rate: 0.07, depth: 300, target: 'cutoff' } }),
];

// Everyday mechanical / ambient environments.
const MECHANICAL_FAMILY: NoisePreset[] = [
  mkNoise('train-carriage', 'TRN', 'TRAIN CARRIAGE RATTLE', 'Rhythmic commuter-train carriage rattle over the rails', 'MECHANICAL', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 650, lfo: { rate: 0.5, depth: 0.04, target: 'gain' } }),
  mkNoise('coffee-shop-murmur', 'CAF', 'COFFEE SHOP MURMUR', 'Indistinct cafe chatter and espresso machine hiss', 'MECHANICAL', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 1800, q: 1.6 }),
  mkNoise('office-hum', 'OFC', 'OPEN OFFICE HUM', 'Open-plan office hum of keyboards, HVAC, and distant talk', 'MECHANICAL', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 2600, q: 1.3 }),
  mkNoise('engine-room', 'ENG', 'SHIP ENGINE ROOM', 'Deep cargo-ship engine room throb below deck', 'MECHANICAL', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 500, q: 1.8 }),
  mkNoise('airplane-cabin', 'PLN', 'AIRPLANE CABIN DRONE', 'Mid-flight cabin drone with a faint engine whine', 'MECHANICAL', { baseColor: 'white', filterType: 'lowpass', cutoffHz: 2000 }),
  mkNoise('city-rain-window', 'CTY', 'CITY RAIN ON WINDOW', 'City rain tapping against a high-rise apartment window', 'MECHANICAL', { baseColor: 'pink', filterType: 'lowpass', cutoffHz: 2400, lfo: { rate: 0.3, depth: 0.05, target: 'gain' } }),
];

// Quiet filtered noise bed + layered oscillator tones for ambient focus pads.
const DRONE_FAMILY: NoisePreset[] = [
  mkNoise('drone', 'DRN', '40Hz FOCUS DRONE', 'Subtle binaural ambient synth pad blended with warm brown noise', 'DRONE', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 950, trim: 0.5, drone: [{ freq: 110, type: 'sine', gain: 0.08 }, { freq: 164.81, type: 'triangle', gain: 0.05 }], droneFilterHz: 320 }),
  mkNoise('theta-wave-pad', 'THT', 'THETA WAVE FOCUS PAD', 'Slow layered theta-range pad for deep flow states', 'DRONE', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 850, trim: 0.5, drone: [{ freq: 136.1, type: 'sine', gain: 0.07 }, { freq: 144.1, type: 'triangle', gain: 0.05 }], droneFilterHz: 300 }),
  mkNoise('tibetan-bowl', 'TIB', 'TIBETAN SINGING BOWL', 'Sustained singing-bowl resonance over a quiet noise bed', 'DRONE', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 900, trim: 0.5, drone: [{ freq: 220, type: 'sine', gain: 0.09 }, { freq: 330, type: 'sine', gain: 0.04 }], droneFilterHz: 500 }),
  mkNoise('cosmic-hum-pad', 'COS', 'COSMIC DEEP HUM PAD', 'Vast sub-bass cosmic hum layered with a soft overtone', 'DRONE', { baseColor: 'brown', filterType: 'lowpass', cutoffHz: 800, trim: 0.5, drone: [{ freq: 55, type: 'sine', gain: 0.1 }, { freq: 82.5, type: 'triangle', gain: 0.06 }], droneFilterHz: 250 }),
];

function interleaveNoiseFamilies(families: NoisePreset[][]): NoisePreset[] {
  const result: NoisePreset[] = [];
  const maxLen = Math.max(...families.map((f) => f.length));
  for (let i = 0; i < maxLen; i++) {
    families.forEach((fam) => {
      if (i < fam.length) result.push(fam[i]);
    });
  }
  return result;
}

const NOISE_ORDER = interleaveNoiseFamilies([
  BROWN_FAMILY,
  PINK_FAMILY,
  WHITE_FAMILY,
  BLUE_FAMILY,
  VIOLET_FAMILY,
  NATURE_FAMILY,
  MECHANICAL_FAMILY,
  DRONE_FAMILY,
]);

// The original 4 presets stay available from LV.0001 (unchanged default
// behavior); the remaining ~56 unlock progressively, evenly spread across
// the full 1..3,000 rank ladder so a new Noise profile lands roughly every
// ~50 ranks — a steady secondary reward track alongside Surface Themes.
const DEFAULT_UNLOCKED_NOISE_IDS = new Set(['brown', 'pink', 'white', 'drone']);

// eslint-disable-next-line react-refresh/only-export-components
export const NOISE_PROFILES: NoiseProfile[] = NOISE_ORDER.map((preset, idx) => ({
  ...preset,
  clearanceHintLv: DEFAULT_UNLOCKED_NOISE_IDS.has(preset.id)
    ? 1
    : Math.max(2, Math.round(((idx + 1) / NOISE_ORDER.length) * 3000)),
}));

function generateColorNoise(output: Float32Array, bufferSize: number, baseColor: NoiseBaseColor) {
  if (baseColor === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.28;
    }
  } else if (baseColor === 'pink') {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
      b6 = white * 0.115926;
    }
  } else if (baseColor === 'brown') {
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.2 * 0.45;
    }
  } else if (baseColor === 'blue') {
    // Differentiated white noise: +3dB/octave high-frequency emphasis.
    let prev = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (white - prev) * 0.5;
      prev = white;
    }
  } else {
    // violet: double-differentiated white noise, steeper +6dB/octave sizzle.
    let p1 = 0,
      p2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (white - 2 * p1 + p2) * 0.25;
      p2 = p1;
      p1 = white;
    }
  }
}

interface AmbientSoundControlProps {
  isDark: boolean;
  borderCol: string;
  bgCard: string;
  textMuted: string;
  userClearanceLevel: number;
  userTotalHours: number;
}

// Soundscape Mixer: up to this many procedural layers can play at once, each
// with its own fader, mixed into one shared master output. Capped to keep
// the UI legible and avoid the mix collapsing into indistinct static.
const MAX_MIX_LAYERS = 5;

interface MixLayer {
  id: string; // NoiseProfile.id
  volume: number; // 0..1, this layer's own fader
}

// Sleep Timer: auto-stops the whole mix after the chosen duration. The last
// SLEEP_FADE_SECONDS are a gentle fade-out scheduled on the AudioContext's
// own clock, so it still lands on time even while the tab is backgrounded
// and JS timers are throttled.
const SLEEP_TIMER_PRESETS_MIN = [15, 30, 45, 60, 90, 120, 180];
const SLEEP_FADE_SECONDS = 20;
const MAX_SLEEP_TIMER_MIN = 12 * 60;

function formatSleepRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatPresetLabel(min: number): string {
  if (min < 60) return `${min}M`;
  return min % 60 === 0 ? `${min / 60}H` : `${(min / 60).toFixed(1)}H`;
}

// Safari 16.4+ exposes navigator.audioSession; 'playback' tells iOS this is
// media (keeps playing with the silent switch on / screen locked).
type NavigatorWithAudioSession = Navigator & { audioSession?: { type: string } };

// Android Chrome treats an <audio> fed by a MediaStream (srcObject) as a live
// WebRTC-style stream: it gets no media notification / foreground service,
// so the renderer is throttled and NOISE dies once the screen turns off.
// There we play the mix straight to ctx.destination and keep the tab
// registered as "playing media" with a looping near-silent file-backed
// <audio> element instead (an audio wake lock), which Chrome does keep alive.
const IS_ANDROID = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

let keepAliveUrl: string | null = null;

// 10s, 8kHz, 16-bit mono WAV with ±1 LSB dither (-90 dBFS: inaudible, but not
// digital silence, which some engines treat as "not playing"). Chrome only
// grants a media notification to media at least 5s long, hence 10s.
function getKeepAliveUrl(): string {
  if (keepAliveUrl) return keepAliveUrl;
  const sampleRate = 8000;
  const numSamples = sampleRate * 10;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, i % 2 === 0 ? 1 : -1, true);
  }
  keepAliveUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  return keepAliveUrl;
}

export const AmbientSoundControl: React.FC<AmbientSoundControlProps> = ({
  isDark,
  borderCol,
  bgCard,
  textMuted,
  userClearanceLevel,
  userTotalHours,
}) => {
  const { t, formatTime } = useI18n();
  const [layers, setLayers] = useState<MixLayer[]>([]);
  const [masterVolume, setMasterVolume] = useState<number>(0.35);
  const [showPopover, setShowPopover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('ALL');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const [sleepNow, setSleepNow] = useState<number>(() => Date.now());
  const [customSleepValue, setCustomSleepValue] = useState<string>('');
  const [customSleepUnit, setCustomSleepUnit] = useState<'min' | 'hr'>('min');
  const [sleepNotice, setSleepNotice] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const masterVolumeRef = useRef<number>(masterVolume);
  const sleepEndsAtRef = useRef<number | null>(null);
  // Background playback bridge: the mix is routed into a MediaStream played
  // by a hidden <audio> element. Mobile browsers suspend a bare
  // AudioContext when the screen locks or the tab is backgrounded, but keep
  // a playing media element alive (and expose it to lock-screen controls).
  // On Android, bgAudioElRef instead holds the silent keep-alive element
  // (see IS_ANDROID) and mediaStreamDestRef stays null.
  const mediaStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const bgAudioElRef = useRef<HTMLAudioElement | null>(null);
  // True while the user (not the OS) has paused the mix — the auto-resume
  // paths must never override an explicit pause.
  const userPausedRef = useRef(false);
  // Node-based audio graph, keyed per layer so one layer can be added/removed
  // or have its fader adjusted without touching any other active layer.
  const layerNodesRef = useRef<Map<string, AudioNode[]>>(new Map());
  const layerGainRef = useRef<Map<string, GainNode>>(new Map());

  const ensureAudioCtx = useCallback((): AudioContext => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (!masterGainRef.current) {
      const nav = navigator as NavigatorWithAudioSession;
      if (nav.audioSession) {
        try {
          nav.audioSession.type = 'playback';
        } catch {
          // unsupported value on this engine — keep the default session
        }
      }

      const master = ctx.createGain();
      master.gain.value = masterVolume;
      masterGainRef.current = master;

      if (IS_ANDROID) {
        master.connect(ctx.destination);
        const el = new Audio(getKeepAliveUrl());
        el.loop = true;
        el.preload = 'auto';
        el.setAttribute('playsinline', '');
        bgAudioElRef.current = el;
      } else if (typeof ctx.createMediaStreamDestination === 'function') {
        const dest = ctx.createMediaStreamDestination();
        const el = new Audio();
        el.srcObject = dest.stream;
        el.setAttribute('playsinline', '');
        master.connect(dest);
        mediaStreamDestRef.current = dest;
        bgAudioElRef.current = el;
      } else {
        master.connect(ctx.destination);
      }
    }
    return ctx;
  }, [masterVolume]);

  // Starts (or resumes) the hidden <audio> bridge. Must run inside a user
  // gesture the first time. If the browser refuses media playback, fall
  // back to direct AudioContext output so NOISE still plays in the
  // foreground.
  const startOutput = useCallback(() => {
    userPausedRef.current = false;
    const el = bgAudioElRef.current;
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }
    if (!el || !el.paused) return;
    el.play().catch(() => {
      const master = masterGainRef.current;
      const dest = mediaStreamDestRef.current;
      if (!ctx || !master || !dest) return;
      try {
        master.disconnect(dest);
      } catch {
        // already disconnected
      }
      master.connect(ctx.destination);
      mediaStreamDestRef.current = null;
      bgAudioElRef.current = null;
    });
  }, []);

  // Re-applies the master fader, and — while a Sleep Timer is armed —
  // schedules its fade-out ramp on the audio clock.
  const applyMasterGain = useCallback((vol: number, endsAt: number | null) => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;
    const g = master.gain;
    const t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(vol, t, 0.03);
    if (endsAt !== null) {
      const remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      const fadeStart = Math.max(t + 0.1, t + remaining - SLEEP_FADE_SECONDS);
      const fadeEnd = Math.max(fadeStart + 0.05, t + remaining);
      g.setValueAtTime(vol, fadeStart);
      g.linearRampToValueAtTime(0, fadeEnd);
    }
  }, []);

  const clearSleepTimer = useCallback(() => {
    if (sleepEndsAtRef.current === null) return;
    sleepEndsAtRef.current = null;
    setSleepEndsAt(null);
    applyMasterGain(masterVolumeRef.current, null);
  }, [applyMasterGain]);

  // Called whenever the mix becomes empty: release the media session and
  // the audio bridge (saves battery) and disarm any Sleep Timer.
  const handleMixEmptied = useCallback(() => {
    clearSleepTimer();
    setIsPaused(false);
    bgAudioElRef.current?.pause();
    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
      audioCtxRef.current.suspend().catch(() => {});
    }
  }, [clearSleepTimer]);

  const stopLayerNodes = useCallback((id: string) => {
    const nodes = layerNodesRef.current.get(id);
    if (nodes) {
      nodes.forEach((node) => {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // ignore already-stopped nodes
        }
      });
    }
    layerNodesRef.current.delete(id);
    layerGainRef.current.delete(id);
  }, []);

  const buildLayerGraph = useCallback(
    (profile: NoiseProfile, volume: number) => {
      const ctx = ensureAudioCtx();
      const master = masterGainRef.current;
      if (!master) return;
      const nodes: AudioNode[] = [];

      // Per-layer fader: every profile gets its own gain stage feeding into
      // the shared master output, so each layer can be balanced
      // independently without rebuilding the rest of the mix.
      const layerGain = ctx.createGain();
      const trim = profile.synth.trim ?? 1;
      layerGain.gain.value = volume * trim;
      layerGain.connect(master);

      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        generateColorNoise(buffer.getChannelData(ch), bufferSize, profile.synth.baseColor);
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = profile.synth.filterType;
      filter.frequency.value = profile.synth.cutoffHz;
      if (profile.synth.q) filter.Q.value = profile.synth.q;

      noiseSource.connect(filter);
      filter.connect(layerGain);
      noiseSource.start(0);
      nodes.push(noiseSource, filter);

      if (profile.synth.lfo) {
        const lfoOsc = ctx.createOscillator();
        lfoOsc.type = 'sine';
        lfoOsc.frequency.value = profile.synth.lfo.rate;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = profile.synth.lfo.depth;
        lfoOsc.connect(lfoGain);
        lfoGain.connect(profile.synth.lfo.target === 'cutoff' ? filter.frequency : layerGain.gain);
        lfoOsc.start(0);
        nodes.push(lfoOsc, lfoGain);
      }

      if (profile.synth.drone && profile.synth.drone.length > 0) {
        const droneGain = ctx.createGain();
        const droneFilter = ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = profile.synth.droneFilterHz ?? 320;
        droneFilter.connect(droneGain);
        droneGain.connect(layerGain);
        nodes.push(droneFilter, droneGain);

        profile.synth.drone.forEach((tone) => {
          const osc = ctx.createOscillator();
          osc.type = tone.type;
          osc.frequency.value = tone.freq;
          const toneGain = ctx.createGain();
          toneGain.gain.value = tone.gain;
          osc.connect(toneGain);
          toneGain.connect(droneFilter);
          osc.start(0);
          nodes.push(osc, toneGain);
        });
      }

      layerNodesRef.current.set(profile.id, nodes);
      layerGainRef.current.set(profile.id, layerGain);
    },
    [ensureAudioCtx]
  );

  const isProfileUnlocked = useCallback(
    (profile: NoiseProfile) => isRewardUnlocked(userClearanceLevel, profile.clearanceHintLv),
    [userClearanceLevel]
  );

  const stopAllLayers = useCallback(() => {
    layerNodesRef.current.forEach((_nodes, id) => stopLayerNodes(id));
    setLayers([]);
    handleMixEmptied();
  }, [stopLayerNodes, handleMixEmptied]);

  const pausePlayback = useCallback(() => {
    if (layerNodesRef.current.size === 0) return;
    userPausedRef.current = true;
    setIsPaused(true);
    bgAudioElRef.current?.pause();
    audioCtxRef.current?.suspend().catch(() => {});
  }, []);

  const resumePlayback = useCallback(() => {
    if (layerNodesRef.current.size === 0) return;
    setIsPaused(false);
    startOutput();
    // The audio clock stood still while suspended — re-anchor the fade.
    applyMasterGain(masterVolumeRef.current, sleepEndsAtRef.current);
  }, [startOutput, applyMasterGain]);

  const startSleepTimer = useCallback(
    (minutes: number) => {
      const clamped = Math.max(1, Math.min(MAX_SLEEP_TIMER_MIN, Math.round(minutes)));
      const now = Date.now();
      const endsAt = now + clamped * 60_000;
      sleepEndsAtRef.current = endsAt;
      setSleepEndsAt(endsAt);
      setSleepNow(now);
      setSleepNotice(null);
      applyMasterGain(masterVolumeRef.current, endsAt);
    },
    [applyMasterGain]
  );

  const handleCustomSleepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(customSleepValue);
    if (!Number.isFinite(value) || value <= 0) return;
    startSleepTimer(customSleepUnit === 'hr' ? value * 60 : value);
    setCustomSleepValue('');
  };

  const toggleLayer = (profile: NoiseProfile) => {
    const alreadyActive = layers.some((l) => l.id === profile.id);
    if (alreadyActive) {
      stopLayerNodes(profile.id);
      setLayers((prev) => prev.filter((l) => l.id !== profile.id));
      if (layers.length === 1) handleMixEmptied();
      return;
    }

    if (!isProfileUnlocked(profile)) {
      const reqHours = CLEARANCE_LEVELS[profile.clearanceHintLv - 1]?.requiredHours ?? 0;
      const hoursRemaining = Math.max(0, +(reqHours - userTotalHours).toFixed(1));
      setLockedNotice(
        tf(t.noiseLockedNotice, {
          code: profile.code,
          name: profile.name,
          lv: String(profile.clearanceHintLv).padStart(4, '0'),
          req: reqHours,
          rem: hoursRemaining,
        })
      );
      return;
    }

    if (layers.length >= MAX_MIX_LAYERS) {
      setLockedNotice(tf(t.mixFull, { n: MAX_MIX_LAYERS }));
      return;
    }

    setLockedNotice(null);
    setSleepNotice(null);
    const defaultVolume = 0.5;
    buildLayerGraph(profile, defaultVolume);
    setLayers((prev) => [...prev, { id: profile.id, volume: defaultVolume }]);
    setIsPaused(false);
    startOutput();
  };

  const setLayerVolume = (id: string, vol: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, volume: vol } : l)));
    const gainNode = layerGainRef.current.get(id);
    const profile = NOISE_PROFILES.find((p) => p.id === id);
    if (gainNode && audioCtxRef.current && profile) {
      const trim = profile.synth.trim ?? 1;
      gainNode.gain.setTargetAtTime(vol * trim, audioCtxRef.current.currentTime, 0.03);
    }
  };

  const handleMasterVolumeChange = (newVol: number) => {
    setMasterVolume(newVol);
    masterVolumeRef.current = newVol;
    applyMasterGain(newVol, sleepEndsAtRef.current);
  };

  // Sleep Timer countdown + expiry. The interval may be throttled to ~1/min
  // in a background tab; the audio-clock fade already silences the mix on
  // time, and this just tears it down shortly after.
  useEffect(() => {
    if (sleepEndsAt === null) return;
    const tick = () => {
      const now = Date.now();
      setSleepNow(now);
      if (now >= sleepEndsAt) {
        layerNodesRef.current.forEach((_nodes, id) => stopLayerNodes(id));
        setLayers([]);
        handleMixEmptied();
        setSleepNotice(tf(t.sleepElapsed, { time: formatTime(sleepEndsAt) }));
      }
    };
    const intervalId = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [sleepEndsAt, stopLayerNodes, handleMixEmptied, t, formatTime]);

  // Coming back to the tab (or unlocking the phone): if the OS interrupted
  // the AudioContext (iOS does this for calls/Siri), pick playback back up.
  useEffect(() => {
    if (layers.length === 0 || isPaused) return;
    const handleVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'running') {
        startOutput();
        applyMasterGain(masterVolumeRef.current, sleepEndsAtRef.current);
      } else if (bgAudioElRef.current?.paused) {
        bgAudioElRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, [layers.length, isPaused, startOutput, applyMasterGain]);

  // Background self-heal: if the OS suspends/interrupts the AudioContext
  // while hidden (Android power saving), resume it right away instead of
  // waiting for the tab to become visible again. If the OS pauses the media
  // element itself (audio focus lost to a call / another app), mirror that
  // as a regular pause so the mix doesn't fight it and the notification
  // shows a resume button. Explicit user pauses are left alone.
  useEffect(() => {
    if (layers.length === 0 || isPaused) return;
    const ctx = audioCtxRef.current;
    const el = bgAudioElRef.current;
    const shouldRun = () => layerNodesRef.current.size > 0 && !userPausedRef.current;
    const handleCtxState = () => {
      if (!ctx || !shouldRun()) return;
      const state = ctx.state as string; // includes Safari's 'interrupted'
      if (state === 'suspended' || state === 'interrupted') {
        ctx.resume().catch(() => {});
      }
    };
    const handleElPause = () => {
      if (shouldRun()) pausePlayback();
    };
    ctx?.addEventListener('statechange', handleCtxState);
    // iOS's MediaStream bridge already survives screen lock; only mirror
    // element pauses for the Android keep-alive.
    if (IS_ANDROID) el?.addEventListener('pause', handleElPause);
    return () => {
      ctx?.removeEventListener('statechange', handleCtxState);
      el?.removeEventListener('pause', handleElPause);
    };
  }, [layers.length, isPaused, pausePlayback]);

  // MediaSession: lock-screen / notification / hardware-key controls.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (layers.length === 0) {
      ms.metadata = null;
      ms.playbackState = 'none';
      return;
    }
    const names = layers
      .map((l) => NOISE_PROFILES.find((p) => p.id === l.id))
      .filter((p): p is NoiseProfile => Boolean(p));
    ms.metadata = new MediaMetadata({
      title: names.length === 1 ? names[0].name : `SOUNDSCAPE MIX ×${names.length}`,
      artist: 'TYPBOX // NOISE',
      album: names.map((p) => p.code).join(' + '),
      artwork: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
    });
    ms.playbackState = isPaused ? 'paused' : 'playing';
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => resumePlayback()],
      ['pause', () => pausePlayback()],
      ['stop', () => stopAllLayers()],
    ];
    handlers.forEach(([action, handler]) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // action not supported by this browser
      }
    });
    return () => {
      handlers.forEach(([action]) => {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // action not supported by this browser
        }
      });
    };
  }, [layers, isPaused, resumePlayback, pausePlayback, stopAllLayers]);

  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  // Command-palette quick actions ("Play Brown Noise" etc.) replace the
  // whole mix with just that one profile — a predictable "quick switch"
  // rather than silently layering onto whatever is already playing.
  useEffect(() => {
    const handleExternalSoundCmd = (e: Event) => {
      const custom = e as CustomEvent<{ action: 'play' | 'stop' | 'toggle'; mode?: NoiseMode }>;
      if (!custom.detail) return;
      if (custom.detail.action === 'stop') {
        stopAllLayers();
      } else if (custom.detail.action === 'toggle') {
        if (layers.length > 0) {
          stopAllLayers();
        } else {
          const profile = NOISE_PROFILES[0];
          if (isRewardUnlocked(userClearanceLevel, profile.clearanceHintLv)) {
            buildLayerGraph(profile, 0.5);
            setLayers([{ id: profile.id, volume: 0.5 }]);
            setIsPaused(false);
            startOutput();
          }
        }
      } else if (custom.detail.action === 'play') {
        const targetId = custom.detail.mode || NOISE_PROFILES[0].id;
        const profile = NOISE_PROFILES.find((p) => p.id === targetId) || NOISE_PROFILES[0];
        if (!isRewardUnlocked(userClearanceLevel, profile.clearanceHintLv)) return;
        layerNodesRef.current.forEach((_nodes, id) => stopLayerNodes(id));
        buildLayerGraph(profile, 0.5);
        setLayers([{ id: profile.id, volume: 0.5 }]);
        setIsPaused(false);
        startOutput();
      }
    };
    window.addEventListener('typbox:ambient-sound', handleExternalSoundCmd);
    return () => window.removeEventListener('typbox:ambient-sound', handleExternalSoundCmd);
  }, [buildLayerGraph, layers.length, startOutput, stopAllLayers, stopLayerNodes, userClearanceLevel]);

  useEffect(() => {
    const nodesMap = layerNodesRef.current;
    return () => {
      nodesMap.forEach((_nodes, id) => stopLayerNodes(id));
      if (bgAudioElRef.current) {
        bgAudioElRef.current.pause();
        bgAudioElRef.current.srcObject = null;
        bgAudioElRef.current.removeAttribute('src');
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlockedCount = useMemo(
    () => NOISE_PROFILES.filter((p) => isRewardUnlocked(userClearanceLevel, p.clearanceHintLv)).length,
    [userClearanceLevel]
  );

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return NOISE_PROFILES.filter((p) => {
      if (familyFilter !== 'ALL' && p.family !== familyFilter) return false;
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q) ||
          p.family.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [familyFilter, searchQuery]);

  const isPlaying = layers.length > 0;
  const sleepRemainingMs = sleepEndsAt !== null ? Math.max(0, sleepEndsAt - sleepNow) : 0;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setShowPopover((prev) => !prev)}
        className={`h-9 sm:h-9 lg:h-auto px-2.5 py-1.5 lg:px-2.5 lg:py-2 border transition-colors flex items-center justify-center space-x-1.5 font-mono text-[11px] cursor-pointer ${
          isPlaying
            ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-400'
            : `${borderCol} hover:opacity-80`
        }`}
        aria-label={t.mixerTitle}
        title={t.mixerTitle}
      >
        {isPlaying ? (
          <>
            {isPaused ? (
              <Pause className="w-4 h-4 text-emerald-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            )}
            <span className="hidden md:inline font-semibold tracking-wider">
              {isPaused
                ? t.paused
                : layers.length === 1
                ? NOISE_PROFILES.find((p) => p.id === layers[0].id)?.code
                : `MIX ×${layers.length}`}
            </span>
            {!isPaused && (
              <span className="flex items-end space-x-0.5 h-3 ml-0.5">
                <span className="w-0.5 h-2 bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 h-3 bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 h-1.5 bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
            {sleepEndsAt !== null && (
              <span
                className="flex items-center space-x-0.5 text-[10px] tabular-nums text-sky-400"
                title={t.sleepRemaining}
              >
                <Timer className="w-3 h-3" />
                <span>{formatSleepRemaining(sleepRemainingMs)}</span>
              </span>
            )}
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4 opacity-75" />
            <span className={`hidden md:inline ${textMuted}`}>NOISE</span>
          </>
        )}
      </button>

      {showPopover && (
        <div
          className={`fixed left-3 right-3 top-14 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[420px] sm:max-h-[80vh] border ${borderCol} ${bgCard} shadow-2xl z-50 p-3 sm:p-4 font-mono text-xs space-y-3`}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b pb-2.5 border-zinc-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className={`w-3.5 h-3.5 shrink-0 ${isPlaying ? 'text-emerald-400 animate-pulse' : textMuted}`} />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-widest whitespace-nowrap">
                {t.mixerHeader}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 border ${borderCol} text-emerald-400 whitespace-nowrap shrink-0`}>
                {unlockedCount} / {NOISE_PROFILES.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {isPlaying && (
                <button
                  type="button"
                  onClick={isPaused ? resumePlayback : pausePlayback}
                  className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1`}
                  aria-label={isPaused ? t.resumeMix : t.pauseMix}
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{isPaused ? t.resume : t.pause}</span>
                </button>
              )}
              <button
                type="button"
                onClick={stopAllLayers}
                disabled={!isPlaying}
                className={`px-2 sm:px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  isPlaying
                    ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer'
                    : `border ${borderCol} ${textMuted} cursor-default`
                }`}
              >
                {isPlaying ? tf(t.stopAll, { n: layers.length }) : t.mixEmpty}
              </button>
            </div>
          </div>

          {sleepNotice && (
            <div className="p-2 border border-sky-500/50 bg-sky-500/10 text-sky-300 text-[10px] flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Timer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{sleepNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => setSleepNotice(null)}
                className="text-[9px] underline ml-2 cursor-pointer"
              >
                {t.dismiss}
              </button>
            </div>
          )}

          {lockedNotice && (
            <div className="p-2 border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{lockedNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => setLockedNotice(null)}
                className="text-[9px] underline ml-2 cursor-pointer"
              >
                {t.dismiss}
              </button>
            </div>
          )}

          {layers.length > 0 && (
            <div className="space-y-1.5">
              <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>
                {tf(t.activeMix, { n: layers.length, max: MAX_MIX_LAYERS })}
              </div>
              <div className="space-y-1.5">
                {layers.map((layer) => {
                  const profile = NOISE_PROFILES.find((p) => p.id === layer.id);
                  if (!profile) return null;
                  return (
                    <div
                      key={layer.id}
                      className="p-2 border border-emerald-500/40 bg-emerald-500/5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center space-x-1.5 min-w-0">
                          <span className="text-[9px] px-1 py-0.2 border border-emerald-500 text-emerald-400 font-bold shrink-0">
                            {profile.code}
                          </span>
                          <span className="text-[11px] font-bold truncate">{profile.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleLayer(profile)}
                          className="text-[9px] text-amber-400 hover:text-amber-300 cursor-pointer shrink-0 uppercase font-bold"
                        >
                          {t.remove}
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min={0.02}
                          max={1}
                          step={0.01}
                          value={layer.volume}
                          onChange={(e) => setLayerVolume(layer.id, Number(e.target.value))}
                          className={`flex-1 h-1 appearance-none cursor-pointer accent-emerald-500 ${
                            isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                          }`}
                        />
                        <span className="text-[9px] text-emerald-400 font-bold w-8 text-right">
                          {Math.round(layer.volume * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isPlaying && (
            <div className={`p-2 border ${sleepEndsAt !== null ? 'border-sky-500/50 bg-sky-500/5' : borderCol} space-y-2`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`flex items-center space-x-1.5 text-[10px] uppercase tracking-wider ${sleepEndsAt !== null ? 'text-sky-400 font-bold' : textMuted}`}>
                  <Timer className="w-3.5 h-3.5" />
                  <span>{t.sleepTimer}</span>
                </span>
                {sleepEndsAt !== null ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tabular-nums text-sky-400">
                      {formatSleepRemaining(sleepRemainingMs)}
                    </span>
                    <button
                      type="button"
                      onClick={clearSleepTimer}
                      className="text-[9px] text-amber-400 hover:text-amber-300 cursor-pointer uppercase font-bold"
                    >
                      {t.cancelLower}
                    </button>
                  </span>
                ) : (
                  <span className={`text-[9px] ${textMuted}`}>{t.off}</span>
                )}
              </div>
              {sleepEndsAt !== null && (
                <p className={`text-[9px] font-sans ${textMuted}`}>
                  {tf(t.sleepStopsAt, { time: formatTime(sleepEndsAt), s: SLEEP_FADE_SECONDS })}
                </p>
              )}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                {SLEEP_TIMER_PRESETS_MIN.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => startSleepTimer(min)}
                    className={`min-h-[32px] sm:min-h-0 py-1 text-[10px] border cursor-pointer transition-colors ${borderCol} hover:border-sky-500/70 hover:text-sky-400`}
                  >
                    {formatPresetLabel(min)}
                  </button>
                ))}
              </div>
              <form onSubmit={handleCustomSleepSubmit} className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min={customSleepUnit === 'hr' ? 0.1 : 1}
                  max={customSleepUnit === 'hr' ? MAX_SLEEP_TIMER_MIN / 60 : MAX_SLEEP_TIMER_MIN}
                  step={customSleepUnit === 'hr' ? 0.5 : 1}
                  value={customSleepValue}
                  onChange={(e) => setCustomSleepValue(e.target.value)}
                  placeholder={t.custom}
                  aria-label={t.customSleep}
                  className={`flex-1 min-w-0 min-h-[32px] sm:min-h-0 px-2 py-1 border ${borderCol} bg-transparent text-[11px] outline-none focus:border-sky-500/70`}
                />
                <div className={`flex border ${borderCol} text-[10px]`}>
                  {(['min', 'hr'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setCustomSleepUnit(unit)}
                      className={`min-h-[30px] sm:min-h-0 px-2 py-1 uppercase cursor-pointer ${
                        customSleepUnit === unit ? 'bg-sky-500/20 text-sky-400 font-bold' : textMuted
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!customSleepValue || Number(customSleepValue) <= 0}
                  className="min-h-[32px] sm:min-h-0 px-2.5 py-1 text-[10px] font-bold uppercase border border-sky-500/60 text-sky-400 hover:bg-sky-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  {t.set}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-1.5">
            <div className={`flex items-center border ${borderCol} px-2 py-1`}>
              <Search className={`w-3.5 h-3.5 mr-1.5 ${textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tf(t.searchSpectra, { n: NOISE_PROFILES.length })}
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFamilyFilter('ALL')}
                className={`px-1.5 py-0.5 text-[9px] border cursor-pointer ${
                  familyFilter === 'ALL'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                    : `${borderCol} ${textMuted}`
                }`}
              >
                {t.all}
              </button>
              {NOISE_FAMILIES.map((fam) => (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => setFamilyFilter(familyFilter === fam.id ? 'ALL' : fam.id)}
                  className={`px-1.5 py-0.5 text-[9px] border flex items-center space-x-1 cursor-pointer ${
                    familyFilter === fam.id
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                      : `${borderCol} ${textMuted} hover:opacity-100`
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fam.color }} />
                  <span>{fam.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto grid grid-cols-1 gap-1.5 pr-1">
            {filteredProfiles.map((prof) => {
              const inMix = layers.some((l) => l.id === prof.id);
              const unlocked = isProfileUnlocked(prof);
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => toggleLayer(prof)}
                  className={`p-2.5 border text-left transition-colors cursor-pointer flex items-start justify-between ${
                    inMix
                      ? 'border-emerald-500/70 bg-emerald-500/10'
                      : unlocked
                      ? `${borderCol} hover:border-zinc-500`
                      : `${borderCol} opacity-65 hover:opacity-90`
                  }`}
                >
                  <div className="space-y-0.5 pr-2 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                      <span
                        className={`text-[10px] px-1 py-0.2 border ${
                          inMix
                            ? 'border-emerald-500 text-emerald-400 font-bold'
                            : `${borderCol} ${textMuted}`
                        }`}
                      >
                        {prof.code}
                      </span>
                      <span className={`text-[11px] font-bold ${inMix ? 'text-emerald-400' : ''}`}>
                        {prof.name}
                      </span>
                      {inMix && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-500 text-zinc-950 font-bold uppercase">
                          {t.inMix}
                        </span>
                      )}
                      {!unlocked && (
                        <span
                          className={`text-[9px] px-1 py-0.2 border ${borderCol} text-amber-400 flex items-center space-x-1`}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>LV.{String(prof.clearanceHintLv).padStart(4, '0')}</span>
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] font-sans leading-snug ${textMuted}`}>{prof.desc}</p>
                  </div>
                  {inMix && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mt-1 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className={`uppercase ${textMuted}`}>{t.masterOutput}</span>
              <span className="font-bold text-emerald-400">{Math.round(masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.02}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(e) => handleMasterVolumeChange(Number(e.target.value))}
              className={`w-full h-1.5 appearance-none cursor-pointer accent-emerald-500 ${
                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. CLEARANCE BROWSER PANEL (ALL 3,000 LEVELS // PURE ENGLISH)
// ==========================================

interface ClearanceBrowserProps {
  clearance: UserClearanceStatus;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
  onClaimAscension?: () => void;
}

export const ClearanceBrowserPanel: React.FC<ClearanceBrowserProps> = ({
  clearance,
  isDark,
  borderCol,
  textMuted,
  onClaimAscension,
}) => {
  const { t } = useI18n();
  const [filterMode, setFilterMode] = useState<
    'all' | 'rewards' | 'milestones' | 'unlocked' | 'locked'
  >('all');
  const [selectedDiv, setSelectedDiv] = useState<number | null>(clearance.current.divisionIndex);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLevels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CLEARANCE_LEVELS.filter((lvl) => {
      if (selectedDiv !== null && lvl.divisionIndex !== selectedDiv) return false;
      const isUnlocked = clearance.totalHours >= lvl.requiredHours;
      const rewardTheme = THEME_REWARD_BY_LEVEL[lvl.level];
      if (filterMode === 'unlocked' && !isUnlocked) return false;
      if (filterMode === 'locked' && isUnlocked) return false;
      if (filterMode === 'milestones' && !lvl.isMajorMilestone) return false;
      if (filterMode === 'rewards' && !rewardTheme) return false;
      if (q) {
        const matchLv = `lv.${lvl.level}`.includes(q) || String(lvl.level) === q;
        const matchHours = `${lvl.requiredHours}h`.includes(q);
        const matchTitle =
          lvl.title.toLowerCase().includes(q) || lvl.subtitle.toLowerCase().includes(q);
        const matchReward = rewardTheme
          ? rewardTheme.code.toLowerCase().includes(q) ||
            rewardTheme.name.toLowerCase().includes(q)
          : false;
        return matchLv || matchHours || matchTitle || matchReward;
      }
      return true;
    });
  }, [selectedDiv, filterMode, searchQuery, clearance.totalHours]);

  return (
    <div className="space-y-3.5 font-mono text-xs flex flex-col h-full">
      {/* Current Clearance Summary Card */}
      <div
        className={`p-3.5 border ${borderCol} ${
          isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'
        } space-y-2.5 shrink-0`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <span
              className="px-2 py-1 text-xs font-bold text-zinc-950"
              style={{ backgroundColor: clearance.current.color }}
            >
              LV.{String(clearance.current.level).padStart(4, '0')}
            </span>
            <div>
              <div className="text-sm font-bold tracking-wider flex items-center space-x-2 flex-wrap gap-y-1">
                <span>{clearance.current.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
                  {clearance.current.division}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
                  {tf(t.cycleN, { n: String(clearance.cycleNumber).padStart(2, '0') })}
                </span>
              </div>
              <div className={`text-[10px] ${textMuted}`}>
                {t.lifetimeArchived} <strong className="text-emerald-400">{clearance.totalHours}H</strong> //{' '}
                {t.cycleLabel} <strong className="text-emerald-400">{clearance.cycleHours}H / 1,000H</strong> //{' '}
                {tf(t.ranksUnlocked, { a: clearance.unlockedCount, b: clearance.totalRanks.toLocaleString() })}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end space-x-1">
              {[1, 2, 3, 4, 5].map((pip) => (
                <span
                  key={pip}
                  className={`w-2.5 h-2.5 border ${
                    pip <= clearance.subPhase
                      ? 'bg-emerald-400 border-emerald-400'
                      : `${borderCol} opacity-40`
                  }`}
                  title={tf(t.subPhaseN, { n: pip })}
                />
              ))}
              <span className="ml-1.5 text-[10px] text-emerald-400 font-bold">
                {tf(t.phaseN, { n: clearance.subPhase })}
              </span>
            </div>
            {clearance.next && (
              <div className={`text-[10px] mt-0.5 ${textMuted}`}>
                {t.nextRankIn}{' '}
                <span className="text-emerald-400 font-bold">{clearance.hoursRemainingToNext}H</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span>
              {tf(t.currentLv, { lv: String(clearance.current.level).padStart(4, '0'), h: clearance.current.requiredHours })}
            </span>
            {clearance.ascensionAvailable && onClaimAscension ? (
              <button
                type="button"
                onClick={onClaimAscension}
                className="text-amber-400 font-bold uppercase tracking-wider animate-pulse cursor-pointer hover:text-amber-300"
              >
                {t.ascensionClaim}
              </button>
            ) : clearance.next ? (
              <span>
                {tf(t.nextLvTitle, {
                  lv: String(clearance.next.level).padStart(4, '0'),
                  title: clearance.next.title,
                  h: clearance.next.requiredHours,
                  pct: clearance.progressPct,
                })}
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">{t.cycleComplete}</span>
            )}
          </div>
          <div className={`w-full h-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} overflow-hidden`}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${clearance.progressPct}%`,
                backgroundColor: clearance.current.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Search & Mode Filter */}
      <div className="space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={`flex items-center border ${borderCol} px-2.5 py-1 flex-1 min-w-[170px]`}>
            <Search className={`w-3.5 h-3.5 mr-2 ${textMuted}`} />
            <input
              type="text"
              placeholder={tf(t.searchRanks, { n: CLEARANCE_LEVELS.length.toLocaleString() })}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) setSelectedDiv(null);
              }}
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>

          <div className={`flex flex-wrap border ${borderCol} text-[10px]`}>
            {(
              [
                { id: 'all', label: t.all },
                { id: 'rewards', label: tf(t.filterRewards, { n: SURFACE_THEME_PAIRS.length }) },
                { id: 'milestones', label: t.filterMilestones },
                { id: 'unlocked', label: t.filterUnlocked },
                { id: 'locked', label: t.filterLocked },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setFilterMode(m.id);
                  if (m.id === 'rewards') setSelectedDiv(null);
                }}
                className={`px-2 py-1 uppercase cursor-pointer ${
                  filterMode === m.id
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-bold'
                    : textMuted
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 10 Division Tabs (300 Ranks per Division = 3,000 Total). Horizontally
            scrollable on mobile so the row never eats multiple vertical lines. */}
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 -mx-0.5 px-0.5 sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedDiv(null)}
            className={`shrink-0 px-2 py-0.5 text-[10px] border cursor-pointer ${
              selectedDiv === null
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                : `${borderCol} ${textMuted}`
            }`}
          >
            {t.all} ({CLEARANCE_LEVELS.length.toLocaleString()})
          </button>
          {CLEARANCE_DIVISIONS.map((div) => {
            const isSelected = selectedDiv === div.index;
            return (
              <button
                key={div.code}
                type="button"
                onClick={() => setSelectedDiv(isSelected ? null : div.index)}
                title={`${div.sectorName} (LV.${div.minLevel}–${div.maxLevel} // ${div.minHours}H–${div.maxHours}H)`}
                className={`shrink-0 px-2 py-0.5 text-[10px] border flex items-center space-x-1 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                    : `${borderCol} ${textMuted} hover:opacity-100`
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: div.color }} />
                <span>{div.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable 3,000 Ranks List — generous min-height on mobile so the
          list area doesn't collapse under the summary/filter chrome above it. */}
      <div
        className={`flex-1 min-h-80 sm:min-h-55 overflow-y-auto border ${borderCol} divide-y ${
          isDark ? 'divide-zinc-800/70' : 'divide-zinc-200'
        }`}
      >
        {filteredLevels.map((lvl) => {
          const unlocked = clearance.totalHours >= lvl.requiredHours;
          const isCurrent = clearance.current.level === lvl.level;
          const rewardTheme = THEME_REWARD_BY_LEVEL[lvl.level];
          return (
            <div
              key={lvl.level}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                isCurrent
                  ? 'bg-emerald-500/15'
                  : lvl.isMajorMilestone || rewardTheme
                  ? isDark
                    ? 'bg-zinc-900/60'
                    : 'bg-zinc-100/70'
                  : unlocked
                  ? ''
                  : 'opacity-55'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span
                  className={`w-16 text-center py-1 text-[10px] font-bold shrink-0 border ${
                    unlocked ? 'text-zinc-950 border-transparent' : `${borderCol} ${textMuted}`
                  }`}
                  style={unlocked ? { backgroundColor: lvl.color } : undefined}
                >
                  LV.{String(lvl.level).padStart(4, '0')}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-xs truncate">{lvl.title}</span>
                    {lvl.isMajorMilestone && (
                      <span className="px-1.5 py-0.2 border border-amber-500/50 text-amber-400 text-[9px] font-bold uppercase shrink-0">
                        {t.milestone}
                      </span>
                    )}
                    {rewardTheme && (
                      <span
                        className="px-1.5 py-0.2 border border-cyan-500/50 text-cyan-400 text-[9px] font-bold uppercase shrink-0 flex items-center space-x-1"
                        title={tf(t.unlocksTheme, { code: rewardTheme.code, name: rewardTheme.name })}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: rewardTheme.accentHex }}
                        />
                        <span>
                          {t.rewardLabel} {rewardTheme.code} // {rewardTheme.name}
                        </span>
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 bg-emerald-500 text-zinc-950 text-[9px] font-bold uppercase shrink-0">
                        {t.current}
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] font-sans truncate ${textMuted}`}>
                    [{lvl.division}] {lvl.subtitle}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center space-x-2">
                <div className="text-right">
                  <div className="font-bold text-xs tabular-nums">
                    {lvl.requiredHours.toLocaleString()}{' '}
                    <span className={`text-[10px] ${textMuted}`}>{t.unitHrs}</span>
                  </div>
                  {!unlocked && (
                    <div className={`text-[9px] ${textMuted}`}>
                      {tf(t.hoursReq, { h: Math.max(0.1, Number((lvl.requiredHours - clearance.totalHours).toFixed(1))) })}
                    </div>
                  )}
                </div>
                {unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className={`w-3.5 h-3.5 ${textMuted} shrink-0`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 4. STATUS CARD IMAGE GENERATOR MODAL
// ==========================================

interface StatusCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  avatarColor?: string;
  avatarImage?: string;
  clearance: UserClearanceStatus;
  totalHours: string;
  weeklyHours: string;
  monthlyHours: string;
  currentStreak: number;
  longestStreak: number;
  activeDaysCount: number;
  categories: Category[];
  logs: StudyLog[];
  isDark: boolean;
  borderCol: string;
  bgCard: string;
  textMuted: string;
}

export const StatusCardModal: React.FC<StatusCardModalProps> = ({
  isOpen,
  onClose,
  username,
  avatarColor = '#10b981',
  avatarImage,
  clearance,
  totalHours,
  weeklyHours,
  monthlyHours,
  currentStreak,
  longestStreak,
  activeDaysCount,
  categories,
  logs,
  isDark,
  borderCol,
  bgCard,
  textMuted,
}) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark');
  // Phones default to the 4:5 portrait card; larger screens to the 16:9 one.
  const [cardLayout, setCardLayout] = useState<StatusCardLayout>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches ? 'portrait' : 'wide'
  );
  const [showCategoriesOnCard, setShowCategoriesOnCard] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const renderCardToCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let avatarImg: HTMLImageElement | null = null;
    if (avatarImage) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = avatarImage;
        });
        avatarImg = img;
      } catch {
        avatarImg = null;
      }
    }

    drawStatusCard(canvas, cardLayout, {
      username,
      avatarColor,
      avatarImg,
      clearance,
      totalHours,
      weeklyHours,
      monthlyHours,
      currentStreak,
      longestStreak,
      activeDaysCount,
      categories,
      logs,
      theme: cardTheme,
      showCategories: showCategoriesOnCard,
    });
  }, [
    cardLayout,
    cardTheme,
    showCategoriesOnCard,
    clearance,
    avatarColor,
    avatarImage,
    username,
    totalHours,
    currentStreak,
    longestStreak,
    weeklyHours,
    monthlyHours,
    activeDaysCount,
    logs,
    categories,
  ]);

  useEffect(() => {
    if (isOpen) {
      renderCardToCanvas();
    }
  }, [isOpen, renderCardToCanvas]);

  if (!isOpen) return null;

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `typbox-status-${username || 'operator'}-${cardLayout}-${dateStr}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCopyError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to generate image blob');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(t.clipboardUnsupported);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-3xl border ${borderCol} ${bgCard} p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 font-mono`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
          <div className="flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[11px] sm:text-xs uppercase tracking-widest font-bold">
              <span className="hidden sm:inline">{t.cardGenTitlePrefix}</span>{t.cardGenTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs hover:underline cursor-pointer"
          >
            [ESC]
          </button>
        </div>

        <div className="space-y-1.5">
          <span className={`text-[10px] uppercase ${textMuted}`}>{t.cardShape}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="radiogroup" aria-label={t.cardShapeAria}>
            {STATUS_CARD_LAYOUTS.map((l) => {
              const active = cardLayout === l.id;
              // Mini aspect-ratio glyph, normalized to a 22px-tall box.
              const glyphH = 22;
              const glyphW = Math.max(9, Math.round((l.width / l.height) * glyphH));
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCardLayout(l.id)}
                  className={`min-h-[52px] px-2.5 py-2 border flex items-center gap-2.5 text-left cursor-pointer transition-colors ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : `${borderCol} hover:border-zinc-500`
                  }`}
                >
                  <span className="w-8 flex items-center justify-center shrink-0">
                    <span
                      className={`block border-2 ${active ? 'border-emerald-400' : 'border-zinc-500'}`}
                      style={{ width: glyphW, height: glyphH }}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold leading-tight">
                      {l.label} <span className="font-normal opacity-80">{l.ratio}</span>
                    </span>
                    <span className={`block text-[9px] font-sans leading-tight ${active ? 'text-emerald-400/80' : textMuted}`}>
                      {l.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`text-[10px] uppercase ${textMuted}`}>{t.cardTheme}</span>
            <div className={`flex border ${borderCol} text-[10px]`}>
              <button
                type="button"
                onClick={() => setCardTheme('dark')}
                className={`px-2.5 py-1 cursor-pointer ${
                  cardTheme === 'dark'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-bold'
                    : textMuted
                }`}
              >
                DARK MONOLITH
              </button>
              <button
                type="button"
                onClick={() => setCardTheme('light')}
                className={`px-2.5 py-1 cursor-pointer ${
                  cardTheme === 'light'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-bold'
                    : textMuted
                }`}
              >
                LIGHT ARCHIVE
              </button>
            </div>
          </div>

          <label className="flex items-center space-x-2 text-[11px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCategoriesOnCard}
              onChange={(e) => setShowCategoriesOnCard(e.target.checked)}
              className="accent-emerald-500"
            />
            <span>{t.includeCategories}</span>
          </label>
        </div>

        {/* Fixed-height stage: switching shapes never changes the modal's
            height (no layout shift). The canvas is scaled down to fit inside
            it, contain-style; the exported PNG is always full resolution. */}
        <div
          className={`status-card-stage relative border ${borderCol} ${isDark ? 'bg-black/50' : 'bg-zinc-100'}`}
        >
          <div className="absolute inset-2 flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              className="block w-auto h-auto max-w-full max-h-full min-w-0 min-h-0 border border-zinc-800/50 shadow-lg"
            />
          </div>
        </div>

        {copyError && (
          <div className="p-2.5 border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px]">
            {copyError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className={`text-[11px] font-sans ${textMuted}`}>
            {t.cardTipPre} <strong>{t.copyImage}</strong> {t.cardTipMid} <strong>{t.downloadPng}</strong>{' '}
            ({STATUS_CARD_LAYOUTS.find((l) => l.id === cardLayout)?.width}×
            {STATUS_CARD_LAYOUTS.find((l) => l.id === cardLayout)?.height}px).
          </p>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyImage}
              className={`min-h-[42px] sm:min-h-0 px-4 py-2 border ${borderCol} hover:border-emerald-500/60 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.copyImage}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              className="min-h-[42px] sm:min-h-0 px-4 py-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadPng}</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. COMMAND PALETTE MODAL (CMD + K / CTRL + K)
// ==========================================

export type AnalyticsHorizonMode = 'daily7d' | 'monthlyCal' | 'weekly12w' | 'monthly12m';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  borderCol: string;
  bgCard: string;
  textMuted: string;
  isAuthenticated: boolean;
  categories: Category[];
  selectedCatId: string | number;
  isRunning: boolean;
  onQuickLog: (categoryId: string | number, minutes: number) => Promise<void>;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSetInputMode: (mode: 'manual' | 'timer') => void;
  onSetAnalyticsMode: (mode: AnalyticsHorizonMode) => void;
  onToggleMatrixColorMode: () => void;
  onToggleMatrixSpan: () => void;
  onOpenStatusCard: () => void;
  onOpenClearance: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onToggleTheme: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
}

interface PaletteCommandItem {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  badge: string;
  accentColor?: string;
  keywords: string;
  action: () => void | Promise<void>;
}

/**
 * Parses CLI-style quick log expressions such as:
 * - "log 90m math"
 * - "log 1.5h cs"
 * - "2h30m eng"
 * - "60m"
 * - "log 45"
 */
function parseQuickLogQuery(
  rawQuery: string,
  categories: Category[],
  fallbackCatId: string | number
): { category: Category; minutes: number } | null {
  const q = rawQuery.trim();
  if (!q || categories.length === 0) return null;

  const startsWithLog = /^log\b/i.test(q);
  const body = q.replace(/^log\b/i, '').trim();
  if (!body) return null;

  let totalMinutes = 0;
  let matchedDuration = false;
  let remaining = body;

  // Match hours + minutes e.g. "1h30m", "1h 30m", "1.5h", "90m"
  const hmRegex = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes)?)?/i;
  const mOnlyRegex = /(\d+)\s*(?:m|min|mins|minute|minutes)\b/i;
  const plainNumberRegex = /^(\d{1,4})(?:\s+|$)/;

  const hmMatch = remaining.match(hmRegex);
  if (hmMatch) {
    const hrs = parseFloat(hmMatch[1]);
    const mins = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
    totalMinutes = Math.round(hrs * 60) + mins;
    matchedDuration = true;
    remaining = remaining.replace(hmMatch[0], ' ').trim();
  } else {
    const mMatch = remaining.match(mOnlyRegex);
    if (mMatch) {
      totalMinutes = parseInt(mMatch[1], 10);
      matchedDuration = true;
      remaining = remaining.replace(mMatch[0], ' ').trim();
    } else if (startsWithLog) {
      const numMatch = remaining.match(plainNumberRegex);
      if (numMatch) {
        totalMinutes = parseInt(numMatch[1], 10);
        matchedDuration = true;
        remaining = remaining.replace(numMatch[0], ' ').trim();
      }
    }
  }

  if (!matchedDuration || totalMinutes < 1 || totalMinutes > 1440) {
    return null;
  }

  // Resolve category from remaining tokens
  const catToken = remaining.toLowerCase().trim();
  let matchedCat: Category | undefined;

  if (catToken) {
    matchedCat =
      categories.find((c) => c.code.toLowerCase() === catToken) ||
      categories.find((c) => c.code.toLowerCase().startsWith(catToken)) ||
      categories.find((c) => c.name.toLowerCase().includes(catToken));
  }

  if (!matchedCat) {
    matchedCat =
      categories.find((c) => String(c.id) === String(fallbackCatId)) || categories[0];
  }

  return matchedCat ? { category: matchedCat, minutes: totalMinutes } : null;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  isDark,
  borderCol,
  bgCard,
  textMuted,
  isAuthenticated,
  categories,
  selectedCatId,
  isRunning,
  onQuickLog,
  onToggleTimer,
  onResetTimer,
  onSetInputMode,
  onSetAnalyticsMode,
  onToggleMatrixColorMode,
  onToggleMatrixSpan,
  onOpenStatusCard,
  onOpenClearance,
  onOpenSettings,
  onOpenAuth,
  onToggleTheme,
  onExportJSON,
  onExportCSV,
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    setSelectedIndex(0);
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setQuery('');
      setSelectedIndex(0);
      setStatusBanner(null);
      inputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const dispatchSound = (action: 'play' | 'stop' | 'toggle', mode?: NoiseMode) => {
    window.dispatchEvent(
      new CustomEvent('typbox:ambient-sound', {
        detail: { action, mode },
      })
    );
  };

  const parsedQuickLog = useMemo(() => {
    if (!isAuthenticated) return null;
    return parseQuickLogQuery(query, categories, selectedCatId);
  }, [isAuthenticated, query, categories, selectedCatId]);

  const commands = useMemo<PaletteCommandItem[]>(() => {
    const items: PaletteCommandItem[] = [];

    // 1. Dynamic CLI Quick Log Command (when user types e.g. "log 90m math" or "45m cs")
    if (parsedQuickLog) {
      const { category, minutes } = parsedQuickLog;
      const hrsStr = (minutes / 60).toFixed(1);
      items.push({
        id: `instant-log-${category.id}-${minutes}`,
        group: t.pgInstant,
        title: tf(t.pcCommitTitle, { code: category.code, name: category.name, min: minutes, h: hrsStr }),
        subtitle: tf(t.pcCommitSub, { min: minutes }),
        badge: t.pcEnterToCommit,
        accentColor: category.color,
        keywords: `log commit ${category.code} ${category.name} ${minutes}`,
        action: async () => {
          await onQuickLog(category.id, minutes);
          setStatusBanner(tf(t.pcCommitted, { min: minutes, code: category.code, name: category.name }));
          setTimeout(() => {
            onClose();
          }, 450);
        },
      });
    }

    // 2. Category Quick-Log Presets (active categories only; the free-form
    // "log 90m CODE" command above still reaches inactive ones)
    if (isAuthenticated && categories.length > 0) {
      categories.filter((cat) => cat.isActive).forEach((cat) => {
        [30, 60, 90, 120].forEach((mins) => {
          items.push({
            id: `preset-log-${cat.id}-${mins}`,
            group: t.pgQuickLog,
            title: tf(t.pcPresetTitle, { min: mins, h: (mins / 60).toFixed(1), code: cat.code, name: cat.name }),
            subtitle: tf(t.pcPresetSub, { min: mins, name: cat.name }),
            badge: `log ${mins}m ${cat.code.toLowerCase()}`,
            accentColor: cat.color,
            keywords: `log ${mins}m ${mins / 60}h ${cat.code} ${cat.name} session commit`,
            action: async () => {
              await onQuickLog(cat.id, mins);
              setStatusBanner(tf(t.pcCommitted, { min: mins, code: cat.code, name: cat.name }));
              setTimeout(() => {
                onClose();
              }, 450);
            },
          });
        });
      });
    } else if (!isAuthenticated) {
      items.push({
        id: 'auth-signin',
        group: t.pgAuth,
        title: t.pcAuthTitle,
        subtitle: t.pcAuthSub,
        badge: 'AUTH',
        keywords: 'login signin register account auth',
        action: () => {
          onClose();
          onOpenAuth();
        },
      });
    }

    // 3. Acoustic Focus Engine (Ambient Noise)
    items.push(
      {
        id: 'sound-brown',
        group: t.pgAudio,
        title: t.pcBrown,
        subtitle: t.pcBrownSub,
        badge: 'sound brown',
        keywords: 'audio sound noise brown deep focus play',
        action: () => {
          dispatchSound('play', 'brown');
          onClose();
        },
      },
      {
        id: 'sound-pink',
        group: t.pgAudio,
        title: t.pcPink,
        subtitle: t.pcPinkSub,
        badge: 'sound pink',
        keywords: 'audio sound noise pink rain focus play',
        action: () => {
          dispatchSound('play', 'pink');
          onClose();
        },
      },
      {
        id: 'sound-white',
        group: t.pgAudio,
        title: t.pcWhite,
        subtitle: t.pcWhiteSub,
        badge: 'sound white',
        keywords: 'audio sound noise white static focus play',
        action: () => {
          dispatchSound('play', 'white');
          onClose();
        },
      },
      {
        id: 'sound-drone',
        group: t.pgAudio,
        title: t.pcDrone,
        subtitle: t.pcDroneSub,
        badge: 'sound drone',
        keywords: 'audio sound noise drone 40hz ambient focus play',
        action: () => {
          dispatchSound('play', 'drone');
          onClose();
        },
      },
      {
        id: 'sound-stop',
        group: t.pgAudio,
        title: t.pcStop,
        subtitle: t.pcStopSub,
        badge: 'sound off',
        keywords: 'audio sound noise off mute stop silence',
        action: () => {
          dispatchSound('stop');
          onClose();
        },
      }
    );

    // 4. Analytics Horizon Modes
    items.push(
      {
        id: 'analytics-7d',
        group: t.pgAnalytics,
        title: t.pc7d,
        subtitle: t.pc7dSub,
        badge: t.hzDays,
        keywords: 'analytics chart daily 7d week bars',
        action: () => {
          onSetAnalyticsMode('daily7d');
          onClose();
        },
      },
      {
        id: 'analytics-12w',
        group: t.pgAnalytics,
        title: t.pc12w,
        subtitle: t.pc12wSub,
        badge: t.hzWeeks,
        keywords: 'analytics chart weekly 12w weeks aggregation bucket',
        action: () => {
          onSetAnalyticsMode('weekly12w');
          onClose();
        },
      },
      {
        id: 'analytics-12m',
        group: t.pgAnalytics,
        title: t.pc12m,
        subtitle: t.pc12mSub,
        badge: t.hzMonths,
        keywords: 'analytics chart monthly 12m months year aggregation bucket',
        action: () => {
          onSetAnalyticsMode('monthly12m');
          onClose();
        },
      },
      {
        id: 'analytics-cal',
        group: t.pgAnalytics,
        title: t.pcCal,
        subtitle: t.pcCalSub,
        badge: t.hzCal,
        keywords: 'analytics calendar month grid matrix',
        action: () => {
          onSetAnalyticsMode('monthlyCal');
          onClose();
        },
      }
    );

    // 5. Session Timer & System Controls
    items.push(
      {
        id: 'timer-toggle',
        group: t.pgTimer,
        title: isRunning ? t.pcTimerPause : t.pcTimerStart,
        subtitle: t.pcTimerSub,
        badge: isRunning ? t.pause : t.start,
        keywords: 'timer stopwatch start pause run clock',
        action: () => {
          onSetInputMode('timer');
          onToggleTimer();
          onClose();
        },
      },
      {
        id: 'timer-reset',
        group: t.pgTimer,
        title: t.pcTimerReset,
        subtitle: t.pcTimerResetSub,
        badge: t.reset,
        keywords: 'timer stopwatch reset clear',
        action: () => {
          onResetTimer();
          onClose();
        },
      },
      {
        id: 'system-card',
        group: t.pgSystem,
        title: t.pcCard,
        subtitle: t.pcCardSub,
        badge: t.cardShort,
        keywords: 'share status card image png twitter x snapshot',
        action: () => {
          onClose();
          onOpenStatusCard();
        },
      },
      {
        id: 'system-clearance',
        group: t.pgSystem,
        title: tf(t.pcClearance, { n: CLEARANCE_LEVELS.length.toLocaleString(), h: CYCLE_HOURS.toLocaleString() }),
        subtitle: tf(t.pcClearanceSub, { n: CLEARANCE_LEVELS.length.toLocaleString(), m: SURFACE_THEME_PAIRS.length }),
        badge: tf(t.nRanks, { n: CLEARANCE_LEVELS.length.toLocaleString() }),
        keywords: 'clearance ranks levels titles 3000 progression badge rewards',
        action: () => {
          onClose();
          if (isAuthenticated) {
            onOpenClearance();
          } else {
            onOpenAuth();
          }
        },
      },
      {
        id: 'system-settings',
        group: t.pgSystem,
        title: t.pcSettings,
        subtitle: t.pcSettingsSub,
        badge: t.pcSettingsBadge,
        keywords: 'settings profile avatar password account security',
        action: () => {
          onClose();
          if (isAuthenticated) {
            onOpenSettings();
          } else {
            onOpenAuth();
          }
        },
      },
      {
        id: 'system-theme',
        group: t.pgSystem,
        title: isDark ? t.pcThemeLight : t.pcThemeDark,
        subtitle: t.pcThemeSub,
        badge: isDark ? t.pcLight : t.pcDark,
        keywords: 'theme dark light mode color toggle',
        action: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: 'matrix-shade',
        group: t.pgSystem,
        title: t.pcMatrixShade,
        subtitle: t.pcMatrixShadeSub,
        badge: 'MATRIX',
        keywords: 'matrix cadence shaded binary color mode',
        action: () => {
          onToggleMatrixColorMode();
          onClose();
        },
      },
      {
        id: 'matrix-span',
        group: t.pgSystem,
        title: t.pcMatrixSpan,
        subtitle: t.pcMatrixSpanSub,
        badge: '1X / 2X',
        keywords: 'matrix cadence 1x 2x span horizon weeks',
        action: () => {
          onToggleMatrixSpan();
          onClose();
        },
      },
      {
        id: 'vault-json',
        group: t.pgSystem,
        title: t.pcJson,
        subtitle: t.pcJsonSub,
        badge: 'JSON',
        keywords: 'export download backup json archive vault',
        action: () => {
          onExportJSON();
          onClose();
        },
      },
      {
        id: 'vault-csv',
        group: t.pgSystem,
        title: t.pcCsv,
        subtitle: t.pcCsvSub,
        badge: 'CSV',
        keywords: 'export download csv spreadsheet logs',
        action: () => {
          onExportCSV();
          onClose();
        },
      }
    );

    const q = query.trim().toLowerCase();
    if (!q) {
      // Show top curated commands when query is empty (up to 2 quick-logs per category so list stays crisp)
      return items.filter((item) => {
        if (item.id.startsWith('preset-log-')) {
          return item.id.endsWith('-60') || item.id.endsWith('-120');
        }
        return true;
      });
    }

    const tokens = q.split(/\s+/).filter((t) => t.length > 0 && t !== 'log');
    return items.filter((item) => {
      if (item.id.startsWith('instant-log-')) return true;
      const hay = `${item.title} ${item.subtitle} ${item.badge} ${item.keywords}`.toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [
    parsedQuickLog,
    isAuthenticated,
    categories,
    isRunning,
    isDark,
    query,
    onQuickLog,
    onClose,
    onOpenAuth,
    onSetAnalyticsMode,
    onSetInputMode,
    onToggleTimer,
    onResetTimer,
    onOpenStatusCard,
    onOpenClearance,
    onOpenSettings,
    onToggleTheme,
    onToggleMatrixColorMode,
    onToggleMatrixSpan,
    onExportJSON,
    onExportCSV,
    t,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (commands.length > 0 ? (prev + 1) % commands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        commands.length > 0 ? (prev - 1 + commands.length) % commands.length : 0
      );
    } else if (e.key === 'Enter' && commands[selectedIndex]) {
      e.preventDefault();
      commands[selectedIndex].action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const sampleCatCode = categories[0]?.code.toLowerCase() || 'math';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl border ${borderCol} ${bgCard} shadow-2xl font-mono overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Command Input Bar */}
        <div className={`flex items-center px-4 py-3.5 border-b ${borderCol} gap-3`}>
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={tf(t.pcPlaceholder, { code: sampleCatCode })}
            className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-zinc-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => updateQuery('')}
              className={`text-[10px] px-1.5 py-0.5 border ${borderCol} ${textMuted} hover:opacity-80 cursor-pointer shrink-0`}
            >
              {t.clearShort}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`text-[10px] px-2 py-0.5 border ${borderCol} ${textMuted} hover:opacity-80 cursor-pointer shrink-0`}
          >
            ESC
          </button>
        </div>

        {/* Syntax Helper Strip */}
        <div
          className={`px-4 py-2 border-b ${borderCol} ${
            isDark ? 'bg-zinc-900/50' : 'bg-zinc-100/80'
          } flex flex-wrap items-center justify-between gap-2 text-[10px]`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>{t.pcCliQuickLog}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                updateQuery(`log 60m ${sampleCatCode}`);
                inputRef.current?.focus();
              }}
              className={`px-1.5 py-0.5 border ${borderCol} hover:border-emerald-500/50 cursor-pointer`}
            >
              log 60m {sampleCatCode}
            </button>
            <button
              type="button"
              onClick={() => {
                updateQuery(`log 1.5h ${sampleCatCode}`);
                inputRef.current?.focus();
              }}
              className={`px-1.5 py-0.5 border ${borderCol} hover:border-emerald-500/50 cursor-pointer`}
            >
              log 1.5h {sampleCatCode}
            </button>
            <button
              type="button"
              onClick={() => {
                updateQuery('sound brown');
                inputRef.current?.focus();
              }}
              className={`px-1.5 py-0.5 border ${borderCol} hover:border-emerald-500/50 cursor-pointer`}
            >
              sound brown
            </button>
          </div>
          <span className={`hidden sm:inline ${textMuted}`}>{t.pcNavigate}</span>
        </div>

        {/* Status Confirmation Banner */}
        {statusBanner && (
          <div className="px-4 py-2.5 bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}

        {/* Command Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto divide-y divide-zinc-800/40">
          {commands.length === 0 ? (
            <div className={`py-10 text-center text-xs ${textMuted}`}>
              {t.pcNoMatchPre}{' '}
              <span className="text-emerald-400 font-semibold">log 90m {sampleCatCode}</span> {t.pcOr}{' '}
              <span className="text-emerald-400 font-semibold">sound</span>.
            </div>
          ) : (
            commands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const isInstant = cmd.id.startsWith('instant-log-');
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => cmd.action()}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isInstant
                      ? isSelected
                        ? 'bg-emerald-500/20 border-l-4 border-l-emerald-400'
                        : 'bg-emerald-500/10'
                      : isSelected
                      ? isDark
                        ? 'bg-zinc-800/80 border-l-2 border-l-emerald-400'
                        : 'bg-zinc-100 border-l-2 border-l-emerald-600'
                      : ''
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center space-x-2">
                      {cmd.accentColor ? (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cmd.accentColor }}
                        />
                      ) : (
                        <span className="text-[9px] px-1 py-0.2 border border-zinc-700 text-zinc-400 shrink-0">
                          {cmd.group.split(' ')[0]}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold truncate ${
                          isInstant ? 'text-emerald-400' : ''
                        }`}
                      >
                        {cmd.title}
                      </span>
                    </div>
                    <div className={`text-[10px] truncate ${textMuted}`}>{cmd.subtitle}</div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 border ${
                        isInstant
                          ? 'border-emerald-500/60 bg-emerald-500 text-zinc-950 font-bold'
                          : `${borderCol} ${textMuted}`
                      }`}
                    >
                      {cmd.badge}
                    </span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2 border-t ${borderCol} ${
            isDark ? 'bg-zinc-950' : 'bg-zinc-50'
          } flex items-center justify-between text-[10px] ${textMuted}`}
        >
          <span>{t.pcFooter}</span>
          <span>CMD+K / CTRL+K</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. DUAL-POLARITY SURFACE THEME PAIRS (288 PAIRS = 576 DARK/LIGHT SURFACES)
// ==========================================

export type SurfacePatternType =
  | 'none'
  | 'grid'
  | 'dots'
  | 'blueprint'
  | 'scanline'
  | 'radial'
  | 'diagonal'
  | 'crosshatch'
  | 'isometric'
  | 'horizon'
  | 'circuit'
  | 'vignette'
  // Signature geometric patterns (added alongside the 30,000H expansion)
  | 'hexgrid'
  | 'triangulate'
  | 'constellation'
  | 'topographic'
  | 'chevron'
  | 'honeycomb'
  | 'starburst'
  | 'waveform'
  | 'polygon'
  | 'sigil'
  | 'rings'
  | 'weave'
  // Prestige-exclusive patterns (Ascension-gated themes only)
  | 'aurum'
  | 'argentum'
  | 'prism';

export interface SurfacePolarityPalette {
  label: string;
  bgMain: string;
  bgCard: string;
  bgInput: string;
  border: string;
  textMain: string;
  textMuted: string;
  patternTint: string;
  glowTint: string;
}

export interface SurfaceThemePair {
  id: string;
  code: string;
  name: string;
  pairLabel: string;
  description: string;
  pattern: SurfacePatternType;
  accentHex: string;
  divisionCode: string;
  clearanceHintLv: number;
  dark: SurfacePolarityPalette;
  light: SurfacePolarityPalette;
  // Prestige-exclusive themes ignore clearanceHintLv entirely and gate on
  // Ascension count instead — a reward track that only grows for players
  // who keep cycling past LV.3000, independent of in-cycle rank.
  requiredAscensions?: number;
}

// Centralized unlock check for a Surface Theme: prestige-exclusive themes
// gate on lifetime Ascension count, everything else gates on
// UserClearanceStatus.rewardUnlockLevel (which stays maxed forever once the
// first Ascension is claimed, since completing a cycle requires passing
// every normal reward threshold at least once).
// eslint-disable-next-line react-refresh/only-export-components
export function isThemeUnlocked(
  pair: SurfaceThemePair,
  status: { rewardUnlockLevel: number; totalAscensions: number }
): boolean {
  if (IS_DEMO_MODE) return true;
  if (pair.requiredAscensions && pair.requiredAscensions > 0) {
    return status.totalAscensions >= pair.requiredAscensions;
  }
  return status.rewardUnlockLevel >= pair.clearanceHintLv;
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Linearly interpolates between two #rrggbb hex colors (t=0 -> hexA, t=1 -> hexB).
function mixHex(hexA: string, hexB: string, t: number): string {
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
  };
  const [ar, ag, ab] = parse(hexA);
  const [br, bg, bb] = parse(hexB);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const toHex = (x: number) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0');
  return `#${toHex(lerp(ar, br))}${toHex(lerp(ag, bg))}${toHex(lerp(ab, bb))}`;
}

// Deterministically derives a dark/light surface palette from a single hue so
// the 96 expansion pairs (added for the 30,000H scale-up) keep the same
// near-black / near-white contrast discipline as the 48 hand-authored pairs.
// Design philosophy: "dark mode" means a DARK-BASED palette, not literal
// near-black. Every surface here reads as a genuine deep color — navy,
// forest, plum, wine — at meaningful lightness/saturation, not a tinted
// shade of charcoal. "Light mode" is the bright-based counterpart, not
// necessarily pure white. (See getSurfaceBackgroundStyle's corner-blend
// layer for the accent-driven gradient wash applied on top of this base.)
function buildSignaturePalette(
  hue: number,
  satBoost: number
): { dark: Omit<SurfacePolarityPalette, 'label'>; light: Omit<SurfacePolarityPalette, 'label'> } {
  const s = Math.max(20, 46 + satBoost);
  return {
    dark: {
      bgMain: hslToHex(hue, Math.min(85, s * 0.62 + 7), 13),
      bgCard: hslToHex(hue, Math.min(85, s * 0.58 + 7), 18),
      bgInput: hslToHex(hue, Math.min(85, s * 0.68 + 6), 10),
      border: hslToHex(hue, Math.min(90, s * 0.7 + 5), 29),
      textMain: hslToHex(hue, 16, 95),
      textMuted: hslToHex(hue, 18, 60),
      patternTint: `hsla(${hue}, 75%, 72%, 0.06)`,
      glowTint: `hsla(${hue}, 85%, 58%, 0.11)`,
    },
    light: {
      bgMain: hslToHex(hue, s * 0.5, 97),
      bgCard: '#ffffff',
      bgInput: hslToHex(hue, s * 0.45, 93),
      border: hslToHex(hue, s * 0.5, 82),
      textMain: hslToHex(hue, 24, 11),
      textMuted: hslToHex(hue, 16, 46),
      patternTint: `hsla(${hue}, 55%, 25%, 0.05)`,
      glowTint: `hsla(${hue}, 70%, 50%, 0.06)`,
    },
  };
}

// Rotated across the 96 generated pairs so the 12 new signature geometric
// patterns and the 12 original patterns are each used exactly 4 times.
const SIGNATURE_PATTERN_CYCLE: SurfacePatternType[] = [
  'hexgrid', 'triangulate', 'constellation', 'topographic', 'chevron', 'honeycomb',
  'starburst', 'waveform', 'polygon', 'sigil', 'rings', 'weave',
  'grid', 'dots', 'blueprint', 'scanline', 'radial', 'diagonal',
  'crosshatch', 'isometric', 'horizon', 'circuit', 'vignette', 'none',
];

// [id, code, name, darkLabel, lightLabel, description, divisionCode, clearanceHintLv, hue, satBoost]
type ExtraThemeSpec = [string, string, string, string, string, string, string, number, number, number];

// 96 additional pairs (triples the original 48) distributed across all 10
// divisions and re-leveled against the new 1..3,000 rank ladder.
const EXTRA_THEME_SPECS: ExtraThemeSpec[] = [
  // DIV-01 — 12 extra pairs
  ['cement-chalk-dust', 'THM-49', 'PORTLAND CEMENT & CHALK DUST', 'WET CEMENT', 'CHALK DUST', 'Raw poured-concrete surface finish paired with fine architectural chalk powder.', 'DIV-01', 8, 200, -8],
  ['brutalist-birch', 'THM-50', 'BRUTALIST CONCRETE & BIRCH PLY', 'BOARD-FORMED CONCRETE', 'BIRCH PLYWOOD', 'Board-formed brutalist concrete grain contrasted with pale Scandinavian birch ply.', 'DIV-01', 20, 214, -8],
  ['newsprint-ribbon', 'THM-51', 'NEWSPRINT & TYPEWRITER RIBBON', 'INK RIBBON BLACK', 'NEWSPRINT PULP', 'Vintage typewriter ribbon ink paired with recycled newsprint pulp texture.', 'DIV-01', 44, 228, -8],
  ['pewter-oatmeal', 'THM-52', 'PEWTER FOG & OATMEAL LINEN', 'PEWTER FOG', 'OATMEAL LINEN', 'Soft pewter fog haze balanced against warm oatmeal linen weave.', 'DIV-01', 60, 242, -8],
  ['blackboard-chalk', 'THM-53', 'BLACKBOARD SLATE & SCHOOLHOUSE CHALK', 'BLACKBOARD SLATE', 'SCHOOLHOUSE CHALK', 'Classic schoolroom slate board paired with soft dust-dry chalk white.', 'DIV-01', 90, 256, -8],
  ['vinyl-rice-paper', 'THM-54', 'VINYL RECORD & RICE PAPER', 'VINYL GROOVE BLACK', 'RICE PAPER', 'Deep-groove vinyl record sheen contrasted with translucent handmade rice paper.', 'DIV-01', 120, 270, -8],
  ['anthracite-kraft', 'THM-55', 'ANTHRACITE & KRAFT PAPER', 'ANTHRACITE COAL', 'KRAFT PAPER', 'Dense anthracite coal seam paired with rugged unbleached kraft paper.', 'DIV-01', 140, 284, -8],
  ['obsidian-milk-quartz', 'THM-56', 'OBSIDIAN GLASS & MILK QUARTZ', 'OBSIDIAN GLASS', 'MILK QUARTZ', 'Volcanic obsidian glass sheen paired with opaque milky quartz crystal.', 'DIV-01', 170, 298, -8],
  ['olive-drab-canvas', 'THM-57', 'OLIVE DRAB & FIELD CANVAS', 'OLIVE DRAB NIGHT', 'FIELD CANVAS', 'Tactical olive-drab field gear tone paired with sun-bleached canvas tenting.', 'DIV-01', 190, 312, -8],
  ['lunar-moonstone', 'THM-58', 'LUNAR REGOLITH & MOONSTONE', 'LUNAR REGOLITH', 'MOONSTONE', 'Fine lunar regolith dust paired with pale luminous moonstone gleam.', 'DIV-01', 215, 326, -8],
  ['smoked-oak-veneer', 'THM-59', 'SMOKED OAK & BIRCH VENEER', 'SMOKED OAK', 'BIRCH VENEER', 'Deeply smoked oak timber grain paired with light Scandinavian birch veneer.', 'DIV-01', 240, 340, -8],
  ['wrought-iron-porcelain', 'THM-60', 'WROUGHT IRON & PORCELAIN TILE', 'WROUGHT IRON', 'PORCELAIN TILE', 'Hand-forged wrought iron blacksmith finish paired with glazed porcelain tile.', 'DIV-01', 270, 354, -8],

  // DIV-02 — 10 extra pairs
  ['aurora-snowpack', 'THM-61', 'AURORA BOREALIS & SNOWPACK', 'AURORA NIGHT SKY', 'FRESH SNOWPACK', 'Shimmering aurora borealis night sky paired with untouched alpine snowpack.', 'DIV-02', 315, 190, 0],
  ['deepfreeze-dryice', 'THM-62', 'DEEP FREEZE LAB & DRY ICE', 'DEEP FREEZE CHAMBER', 'DRY ICE MIST', 'Sub-zero cryogenic laboratory chamber paired with billowing dry-ice mist.', 'DIV-02', 330, 198, 0],
  ['basalt-glacial-melt', 'THM-63', 'ICELANDIC BASALT & GLACIAL MELT', 'BASALT SEA CLIFF', 'GLACIAL MELTWATER', 'Jagged Icelandic basalt sea cliffs paired with pale glacial meltwater.', 'DIV-02', 350, 206, 0],
  ['submarine-sonar', 'THM-64', 'ARCTIC SUBMARINE & SONAR PING', 'SUBMARINE SONAR DECK', 'ICE-FLOE DAYLIGHT', 'Arctic submarine sonar control deck paired with bright ice-floe daylight.', 'DIV-02', 390, 214, 0],
  ['cryosleep-stasis', 'THM-65', 'CRYO-SLEEP POD & STASIS FROST', 'CRYO-SLEEP CHAMBER', 'STASIS FROST GLASS', 'Suspended cryo-sleep stasis pod paired with frosted viewport glass.', 'DIV-02', 410, 222, 0],
  ['solstice-frostpine', 'THM-66', 'WINTER SOLSTICE & FROSTED PINE', 'SOLSTICE MIDNIGHT', 'FROSTED PINE NEEDLE', 'Longest winter solstice midnight paired with frost-tipped pine needles.', 'DIV-02', 460, 230, 0],
  ['polarvortex-blizzard', 'THM-67', 'POLAR VORTEX & BLIZZARD WHITE', 'POLAR VORTEX NIGHT', 'BLIZZARD WHITEOUT', 'Howling polar vortex night paired with total blizzard whiteout glare.', 'DIV-02', 480, 238, 0],
  ['antarctic-icecore', 'THM-68', 'ANTARCTIC STATION & ICE CORE', 'RESEARCH STATION NIGHT', 'ICE CORE SAMPLE', 'Antarctic research station polar night paired with ancient ice-core sample.', 'DIV-02', 500, 246, 0],
  ['neptune-methane', 'THM-69', 'NEPTUNE METHANE & PALE CYAN', 'NEPTUNE METHANE DEPTH', 'PALE CYAN HAZE', 'Deep Neptune methane atmosphere paired with pale high-altitude cyan haze.', 'DIV-02', 540, 254, 0],
  ['sapphire-lagoon', 'THM-70', 'SAPPHIRE ICEBERG & CRYSTAL LAGOON', 'SAPPHIRE ICEBERG CORE', 'CRYSTAL LAGOON SHALLOWS', 'Dense sapphire-blue iceberg core paired with crystal-clear lagoon shallows.', 'DIV-02', 570, 262, 0],

  // DIV-03 — 10 extra pairs
  ['rainforest-fern', 'THM-71', 'RAINFOREST CANOPY & FERN LIGHT', 'RAINFOREST CANOPY', 'DAPPLED FERN LIGHT', 'Dense rainforest canopy shadow paired with dappled understory fern light.', 'DIV-03', 610, 90, 0],
  ['absinthe-chartreuse', 'THM-72', 'ABSINTHE LOUNGE & CHARTREUSE MIST', 'ABSINTHE LOUNGE', 'CHARTREUSE MIST', 'Belle-Époque absinthe lounge green paired with pale chartreuse morning mist.', 'DIV-03', 625, 99, 0],
  ['terrarium-moss', 'THM-73', 'TERRARIUM GLASS & MOSS GARDEN', 'TERRARIUM GLASS NIGHT', 'MOSS GARDEN DAYLIGHT', 'Sealed terrarium glass dusk paired with sunlit moss garden daylight.', 'DIV-03', 660, 108, 0],
  ['camo-khaki', 'THM-74', 'HUNTER CAMOUFLAGE & FIELD KHAKI', 'HUNTER CAMOUFLAGE', 'FIELD KHAKI', 'Dense hunter camouflage canopy paired with sun-faded field khaki.', 'DIV-03', 680, 117, 0],
  ['shamrock-clover', 'THM-75', 'SHAMROCK ISLE & CLOVER FIELD', 'SHAMROCK TWILIGHT', 'CLOVER FIELD NOON', 'Emerald shamrock isle twilight paired with bright clover-field noon.', 'DIV-03', 720, 126, 0],
  ['olivegrove-linen', 'THM-76', 'OLIVE GROVE & SUN-BLEACHED LINEN', 'OLIVE GROVE SHADE', 'SUN-BLEACHED LINEN', 'Mediterranean olive grove shade paired with sun-bleached linen cloth.', 'DIV-03', 750, 135, 0],
  ['bamboo-tatami', 'THM-77', 'BAMBOO FOREST & TATAMI STRAW', 'BAMBOO FOREST NIGHT', 'TATAMI STRAW MAT', 'Moonlit bamboo forest grove paired with woven tatami straw matting.', 'DIV-03', 790, 144, 0],
  ['nightvision-phosphor', 'THM-78', 'NIGHT VISION & PHOSPHOR GREEN', 'NIGHT VISION GOGGLE', 'PHOSPHOR READOUT', 'Military night-vision goggle optic paired with bright phosphor readout green.', 'DIV-03', 815, 153, 0],
  ['pistachio-cream', 'THM-79', 'PISTACHIO GELATO & CREAM', 'PISTACHIO GELATO NIGHT', 'SWEET CREAM', 'Rich pistachio gelato tin paired with soft sweet cream daylight.', 'DIV-03', 860, 162, 0],
  ['verdigris-patina', 'THM-80', 'VERDIGRIS COPPER & PATINA JADE', 'VERDIGRIS COPPER', 'PATINA JADE', 'Oxidized verdigris copper roofing paired with pale weathered jade patina.', 'DIV-03', 880, 171, 0],

  // DIV-04 — 10 extra pairs
  ['thermocline-glare', 'THM-81', 'DEEP THERMOCLINE & SURFACE GLARE', 'DEEP THERMOCLINE', 'SURFACE GLARE', 'Cold oceanic thermocline boundary paired with bright surface sun-glare.', 'DIV-04', 915, 185, 0],
  ['periscope-horizon', 'THM-82', 'SUBMARINE PERISCOPE & HORIZON LINE', 'PERISCOPE VIEWFINDER', 'OPEN HORIZON LINE', 'Submarine periscope viewfinder dusk paired with the open daylight horizon.', 'DIV-04', 935, 192, 0],
  ['coral-nightdive', 'THM-83', 'CORAL REEF NIGHT DIVE & LAGOON NOON', 'NIGHT DIVE REEF', 'LAGOON NOON', 'Torch-lit coral reef night dive paired with bright tropical lagoon noon.', 'DIV-04', 975, 199, 0],
  ['hydrothermal-mineral', 'THM-84', 'HYDROTHERMAL VENT & MINERAL SALT', 'HYDROTHERMAL VENT', 'MINERAL SALT FLAT', 'Deep-sea hydrothermal vent plume paired with pale crystallized mineral salt.', 'DIV-04', 1000, 206, 0],
  ['kraken-nautilus', 'THM-85', "KRAKEN'S INK & PEARL NAUTILUS", 'KRAKEN INK CLOUD', 'PEARL NAUTILUS SHELL', 'Spreading kraken ink cloud paired with iridescent pearl nautilus shell.', 'DIV-04', 1040, 213, 0],
  ['monsoon-seafog', 'THM-86', 'MONSOON HARBOR & SEA FOG', 'MONSOON HARBOR NIGHT', 'SEA FOG MORNING', 'Rain-slick monsoon harbor night paired with soft rolling sea-fog morning.', 'DIV-04', 1065, 220, 0],
  ['tidalpool-lowtide', 'THM-87', 'TIDAL POOL SHADOW & LOW-TIDE SAND', 'TIDAL POOL SHADOW', 'LOW-TIDE SAND', 'Shadowed tidal rock-pool paired with pale exposed low-tide sand.', 'DIV-04', 1100, 227, 0],
  ['navalsonar-signalflag', 'THM-88', 'NAVAL SONAR ROOM & SIGNAL FLAG', 'SONAR ROOM CONSOLE', 'SIGNAL FLAG WHITE', 'Darkened naval sonar control room paired with crisp signal-flag white.', 'DIV-04', 1120, 234, 0],
  ['fjordwater-driftwood', 'THM-89', 'GLACIAL FJORD & DRIFTWOOD', 'GLACIAL FJORD WATER', 'BLEACHED DRIFTWOOD', 'Deep glacial fjord water paired with sun-bleached driftwood timber.', 'DIV-04', 1165, 241, 0],
  ['submersible-deck', 'THM-90', 'DEEP SEA SUBMERSIBLE & RESEARCH DECK', 'SUBMERSIBLE CABIN', 'RESEARCH VESSEL DECK', 'Cramped deep-sea submersible cabin paired with an open research-vessel deck.', 'DIV-04', 1185, 248, 0],

  // DIV-05 — 10 extra pairs
  ['wormhole-starlight', 'THM-91', 'INTERSTELLAR WORMHOLE & STARLIGHT DRIFT', 'WORMHOLE EVENT', 'STARLIGHT DRIFT', 'Collapsing interstellar wormhole throat paired with slow starlight drift.', 'DIV-05', 1210, 255, 0],
  ['orbitaldecay-satellite', 'THM-92', 'ORBITAL DECAY & SATELLITE GLINT', 'ORBITAL DECAY NIGHT', 'SATELLITE GLINT', 'Derelict satellite orbital-decay night paired with a distant satellite glint.', 'DIV-05', 1230, 261, 0],
  ['neutronstar-pulsar', 'THM-93', 'NEUTRON STAR & PULSAR FLASH', 'NEUTRON STAR CORE', 'PULSAR FLASH', 'Impossibly dense neutron star core paired with rhythmic pulsar flash light.', 'DIV-05', 1270, 267, 0],
  ['probe-missionpatch', 'THM-94', 'DEEP SPACE PROBE & MISSION PATCH', 'DEEP SPACE PROBE', 'MISSION PATCH WHITE', 'Lone deep-space probe transmission paired with crisp mission-patch white.', 'DIV-05', 1300, 273, 0],
  ['galacticcore-spiralarm', 'THM-95', 'GALACTIC CORE & SPIRAL ARM', 'GALACTIC CORE', 'OUTER SPIRAL ARM', 'Blazing galactic core density paired with the pale outer spiral arm.', 'DIV-05', 1340, 279, 0],
  ['voidwalker-moonlitsilk', 'THM-96', "VOID WALKER'S CLOAK & MOONLIT SILK", 'VOID WALKER CLOAK', 'MOONLIT SILK', "Void walker's star-woven cloak paired with pale moonlit silk drape.", 'DIV-05', 1360, 285, 0],
  ['zerograv-cabin', 'THM-97', 'ZERO GRAVITY CHAMBER & CABIN LIGHT', 'ZERO-G CHAMBER', 'STATION CABIN LIGHT', 'Weightless zero-gravity training chamber paired with warm station cabin light.', 'DIV-05', 1400, 291, 0],
  ['darkmatter-particletrail', 'THM-98', 'DARK MATTER LAB & PARTICLE TRAIL', 'DARK MATTER LAB', 'PARTICLE TRAIL', 'Shielded dark-matter detection lab paired with a glowing particle trail.', 'DIV-05', 1420, 297, 0],
  ['lunareclipse-corona', 'THM-99', 'LUNAR ECLIPSE & CORONA RING', 'LUNAR ECLIPSE', 'CORONA RING LIGHT', 'Totality of a lunar eclipse paired with the pale corona ring light.', 'DIV-05', 1460, 303, 0],
  ['hyperspace-streak', 'THM-100', 'WORMHOLE TRANSIT & HYPERSPACE STREAK', 'WORMHOLE TRANSIT', 'HYPERSPACE STREAK', 'Mid-transit wormhole compression paired with streaking hyperspace light.', 'DIV-05', 1480, 309, 0],

  // DIV-06 — 10 extra pairs
  ['memphis-terrazzo', 'THM-101', 'MEMPHIS DESIGN & PASTEL TERRAZZO', 'MEMPHIS STUDIO NIGHT', 'PASTEL TERRAZZO', 'Postmodern Memphis design studio paired with playful pastel terrazzo flooring.', 'DIV-06', 1510, 300, 0],
  ['artdeco-marble', 'THM-102', 'ART DECO SKYSCRAPER & MARBLE LOBBY', 'ART DECO SKYLINE', 'MARBLE LOBBY', 'Gilded Art Deco skyscraper skyline paired with a polished marble lobby.', 'DIV-06', 1535, 306, 0],
  ['megastructure-concrete', 'THM-103', 'BRUTALIST MEGASTRUCTURE & RAW CONCRETE', 'MEGASTRUCTURE SHADOW', 'RAW POURED CONCRETE', 'Towering brutalist megastructure shadow paired with raw poured concrete.', 'DIV-06', 1580, 312, 0],
  ['deconstructivist-gallery', 'THM-104', 'DECONSTRUCTIVIST BLUEPRINT & GALLERY WHITE', 'DECONSTRUCTIVIST DRAFT', 'GALLERY WHITE WALL', 'Deconstructivist architectural blueprint draft paired with gallery-white walls.', 'DIV-06', 1600, 318, 0],
  ['vaporwave-arcade', 'THM-105', 'VAPORWAVE ARCADE & NEON PASTEL', 'VAPORWAVE ARCADE', 'NEON PASTEL DAY', 'Retro vaporwave arcade cabinet glow paired with soft neon-pastel daylight.', 'DIV-06', 1640, 324, 0],
  ['gothic-stainedglass', 'THM-106', 'GOTHIC CATHEDRAL & STAINED GLASS', 'GOTHIC NAVE SHADOW', 'STAINED GLASS LIGHT', 'Shadowed Gothic cathedral nave paired with luminous stained-glass light.', 'DIV-06', 1670, 330, 0],
  ['minimalist-gesso', 'THM-107', 'MINIMALIST ATELIER & GESSO CANVAS', 'MINIMALIST ATELIER', 'GESSO CANVAS', "Quiet minimalist painter's atelier paired with primed gesso canvas white.", 'DIV-06', 1700, 336, 0],
  ['industrialloft-brick', 'THM-108', 'INDUSTRIAL LOFT & EXPOSED BRICK', 'INDUSTRIAL LOFT NIGHT', 'EXPOSED BRICK DAY', 'Converted industrial loft at night paired with sunlit exposed brick walls.', 'DIV-06', 1740, 342, 0],
  ['parametric-draftingtable', 'THM-109', 'PARAMETRIC FACADE & DRAFTING TABLE', 'PARAMETRIC FACADE NIGHT', 'DRAFTING TABLE LIGHT', 'Computational parametric facade render paired with a bright drafting table.', 'DIV-06', 1765, 348, 0],
  ['hadid-museum', 'THM-110', 'FLUID CURVE & MUSEUM WHITE', 'FLUID ARCHITECTURE NIGHT', 'MUSEUM WHITE GALLERY', 'Fluid parametric architecture at night paired with a museum-white gallery.', 'DIV-06', 1790, 354, 0],

  // DIV-07 — 8 extra pairs
  ['valentine-blush', 'THM-111', 'VALENTINE VELVET & BLUSH SATIN', 'VALENTINE VELVET', 'BLUSH SATIN', 'Deep valentine velvet drape paired with soft blush satin daylight.', 'DIV-07', 1815, 335, 0],
  ['flamingo-coral', 'THM-112', 'FLAMINGO LAGOON & CORAL SAND', 'FLAMINGO LAGOON NIGHT', 'CORAL SAND BEACH', 'Flamingo-lagoon dusk reflection paired with warm coral-sand beach light.', 'DIV-07', 1840, 340, 0],
  ['raspberry-creamsoda', 'THM-113', 'RASPBERRY SORBET & CREAM SODA', 'RASPBERRY SORBET', 'CREAM SODA', 'Tart raspberry sorbet tin paired with fizzy pale cream-soda light.', 'DIV-07', 1890, 345, 0],
  ['geisha-lantern', 'THM-114', 'GEISHA SILK & PAPER LANTERN', 'GEISHA SILK NIGHT', 'PAPER LANTERN GLOW', 'Night-market geisha silk kimono paired with warm paper-lantern glow.', 'DIV-07', 1920, 350, 0],
  ['peony-dew', 'THM-115', 'PEONY GARDEN & MORNING DEW', 'PEONY GARDEN NIGHT', 'MORNING DEW LIGHT', 'Moonlit peony garden shadow paired with fresh morning-dew light.', 'DIV-07', 1975, 355, 0],
  ['strawberrymilk-vanilla', 'THM-116', 'STRAWBERRY MILK & VANILLA CREAM', 'STRAWBERRY MILK NIGHT', 'VANILLA CREAM', 'Chilled strawberry-milk bottle tone paired with soft vanilla-cream daylight.', 'DIV-07', 2010, 0, 0],
  ['garnet-rosewater', 'THM-117', 'GARNET VELVET & ROSEWATER MARBLE', 'GARNET VELVET', 'ROSEWATER MARBLE', 'Rich garnet velvet upholstery paired with pale rosewater marble stone.', 'DIV-07', 2060, 5, 0],
  ['watermelon-seafoam', 'THM-118', 'WATERMELON PUNCH & SEAFOAM RIND', 'WATERMELON PUNCH', 'SEAFOAM RIND', 'Bold watermelon-punch night tone paired with pale seafoam rind daylight.', 'DIV-07', 2090, 10, 0],

  // DIV-08 — 8 extra pairs
  ['forge-slag', 'THM-119', 'FORGE FURNACE & MOLTEN SLAG', 'FORGE FURNACE NIGHT', 'COOLED SLAG DAY', 'Roaring forge-furnace interior paired with cooled daylight molten slag.', 'DIV-08', 2110, 20, 0],
  ['caravan-spicemarket', 'THM-120', 'DESERT CARAVAN & SPICE MARKET', 'CARAVAN NIGHT CAMP', 'SPICE MARKET DAY', 'Desert caravan night-camp fire paired with a bright spice-market stall.', 'DIV-08', 2180, 26, 0],
  ['campfire-canvastent', 'THM-121', 'CAMPFIRE EMBER & CANVAS TENT', 'CAMPFIRE EMBER', 'CANVAS TENT DAY', 'Glowing campfire ember pit paired with sunlit canvas expedition tent.', 'DIV-08', 2210, 32, 0],
  ['jackolantern-harvest', 'THM-122', "JACK-O'-LANTERN & AUTUMN HARVEST", 'JACK-O-LANTERN NIGHT', 'AUTUMN HARVEST DAY', 'Carved jack-o-lantern porch-light night paired with bright autumn harvest day.', 'DIV-08', 2260, 38, 0],
  ['blacksmith-temperedsteel', 'THM-123', 'BLACKSMITH ANVIL & TEMPERED STEEL', 'BLACKSMITH FORGE', 'TEMPERED STEEL', "Blacksmith's glowing anvil forge paired with cool tempered-steel daylight.", 'DIV-08', 2290, 44, 0],
  ['habanero-citrus', 'THM-124', 'HABANERO KITCHEN & CITRUS PEEL', 'HABANERO KITCHEN', 'CITRUS PEEL DAY', 'Spicy habanero-kitchen evening paired with bright citrus-peel daylight.', 'DIV-08', 2340, 50, 0],
  ['sahara-duneridge', 'THM-125', 'SAHARA SUNSET & DUNE RIDGE', 'SAHARA SUNSET', 'DUNE RIDGE DAY', 'Blazing Sahara sunset horizon paired with a pale sunlit dune ridge.', 'DIV-08', 2370, 56, 0],
  ['bonfire-marshmallow', 'THM-126', 'BONFIRE NIGHT & MARSHMALLOW CREAM', 'BONFIRE NIGHT', 'MARSHMALLOW CREAM', 'Crackling bonfire night gathering paired with toasted marshmallow cream.', 'DIV-08', 2395, 62, 0],

  // DIV-09 — 8 extra pairs
  ['pharaoh-papyrus', 'THM-127', "PHARAOH'S TOMB & PAPYRUS SCROLL", 'PHARAOH TOMB NIGHT', 'PAPYRUS SCROLL DAY', "Sealed pharaoh's tomb torchlight paired with an unrolled papyrus scroll.", 'DIV-09', 2410, 45, 0],
  ['byzantine-ivory', 'THM-128', 'BYZANTINE MOSAIC & GILDED IVORY', 'BYZANTINE MOSAIC', 'GILDED IVORY', 'Shimmering Byzantine gold mosaic paired with carved gilded ivory.', 'DIV-09', 2440, 50, 0],
  ['honeycomb-beeswax', 'THM-129', 'HONEYCOMB HIVE & BEESWAX CANDLE', 'HONEYCOMB HIVE NIGHT', 'BEESWAX CANDLE', 'Dense honeycomb hive interior paired with the warm glow of beeswax candles.', 'DIV-09', 2490, 55, 0],
  ['treasury-mintedcoin', 'THM-130', 'TREASURY VAULT & MINTED COIN', 'TREASURY VAULT NIGHT', 'MINTED COIN SHINE', 'Locked treasury vault at night paired with the shine of a freshly minted coin.', 'DIV-09', 2520, 60, 0],
  ['saffron-turmeric', 'THM-131', 'SAFFRON MARKET & TURMERIC CREAM', 'SAFFRON MARKET NIGHT', 'TURMERIC CREAM DAY', 'Fragrant saffron-market evening stall paired with bright turmeric-cream day.', 'DIV-09', 2560, 65, 0],
  ['amber-fossilhoney', 'THM-132', 'AMBER RESIN & FOSSILIZED HONEY', 'AMBER RESIN NIGHT', 'FOSSILIZED HONEY', 'Deep amber tree-resin pool paired with ancient fossilized honey light.', 'DIV-09', 2580, 70, 0],
  ['scepter-crownjewel', 'THM-133', 'ROYAL SCEPTER & CROWN JEWEL', 'ROYAL SCEPTER NIGHT', 'CROWN JEWEL SHINE', 'Ceremonial royal scepter vault paired with the shine of a crown jewel.', 'DIV-09', 2630, 75, 0],
  ['harvestmoon-wheat', 'THM-134', 'HARVEST MOON & WHEAT FIELD', 'HARVEST MOON NIGHT', 'WHEAT FIELD DAY', 'Golden harvest-moon night sky paired with a sunlit ripened wheat field.', 'DIV-09', 2660, 80, 0],

  // DIV-10 — 10 extra pairs
  ['zerogsuit-regolith', 'THM-135', 'ZERO-G VOID SUIT & LUNAR REGOLITH', 'ZERO-G VOID SUIT', 'LUNAR REGOLITH DAY', 'Pressurized zero-gravity void suit visor paired with pale lunar regolith daylight.', 'DIV-10', 2705, 0, -18],
  ['deepfield-nebulaprint', 'THM-136', 'DEEP FIELD TELESCOPE & NEBULA PRINT', 'DEEP FIELD NIGHT', 'NEBULA PRINT PAPER', 'Deep-field space-telescope exposure paired with a printed nebula photograph.', 'DIV-10', 2730, 20, -18],
  ['quantumlab-cryostat', 'THM-137', 'QUANTUM COMPUTER LAB & CRYOSTAT WHITE', 'QUANTUM LAB NIGHT', 'CRYOSTAT WHITE', 'Shielded quantum-computing lab paired with pristine cryostat-white housing.', 'DIV-10', 2750, 40, -18],
  ['darkenergy-dome', 'THM-138', 'DARK ENERGY ARRAY & OBSERVATORY DOME', 'DARK ENERGY NIGHT', 'OBSERVATORY DOME DAY', 'Vast dark-energy detector array night paired with a sunlit observatory dome.', 'DIV-10', 2790, 60, -18],
  ['finalfrontier-missioncontrol', 'THM-139', 'FINAL FRONTIER HULL & MISSION CONTROL', 'FINAL FRONTIER HULL', 'MISSION CONTROL WHITE', 'Deep-space final-frontier hull plating paired with mission-control white.', 'DIV-10', 2805, 80, -18],
  ['blackhole-hawking', 'THM-140', 'BLACK HOLE HORIZON & HAWKING RADIATION', 'EVENT HORIZON NIGHT', 'HAWKING RADIATION', 'The absolute dark of a black-hole event horizon paired with faint Hawking radiation.', 'DIV-10', 2850, 100, -18],
  ['supercollider-cleanroom', 'THM-141', 'SUPERCOLLIDER RING & CLEAN ROOM', 'SUPERCOLLIDER NIGHT', 'CLEAN ROOM WHITE', 'Kilometers of supercollider ring tunnel paired with sterile clean-room white.', 'DIV-10', 2870, 120, -18],
  ['antimatter-ceramic', 'THM-142', 'ANTIMATTER CONTAINMENT & LAB CERAMIC', 'ANTIMATTER CONTAINMENT', 'LAB CERAMIC WHITE', 'Magnetically sealed antimatter containment ring paired with lab-ceramic white.', 'DIV-10', 2900, 140, -18],
  ['terminalvelocity-heatshield', 'THM-143', 'TERMINAL VELOCITY & HEAT SHIELD', 'TERMINAL VELOCITY NIGHT', 'HEAT SHIELD WHITE', 'Re-entry terminal-velocity plasma trail paired with scorched heat-shield white.', 'DIV-10', 2925, 160, -18],
  ['lastlight-aurora', 'THM-144', 'LAST LIGHT BEACON & POLAR AURORA', 'LAST LIGHT BEACON', 'POLAR AURORA DAY', 'The final deep-space beacon signal paired with a pale polar-aurora sky.', 'DIV-10', 2985, 180, -18],

  // ==========================================
  // SECOND EXPANSION WAVE — another 144 pairs (doubles 144 -> 288 total).
  // Levels below are placeholders; buildClearanceLadderForThemes() recomputes
  // every pair's clearanceHintLv with even spacing right after this table.
  // ==========================================

  // DIV-01 — 18 more pairs
  ['galvanized-zinc', 'THM-145', 'GALVANIZED STEEL & FROSTED ZINC', 'GALVANIZED STEEL', 'FROSTED ZINC', 'Raw galvanized steel sheet paired with soft frosted zinc coating.', 'DIV-01', 0, 207, -8],
  ['pewter-bonechina', 'THM-146', 'HAMMERED PEWTER & BONE CHINA', 'HAMMERED PEWTER', 'BONE CHINA', 'Hand-hammered pewter vessel paired with translucent bone china.', 'DIV-01', 0, 221, -8],
  ['rawlinen-oatcanvas', 'THM-147', 'RAW LINEN & OAT CANVAS', 'RAW LINEN NIGHT', 'OAT CANVAS', 'Unbleached raw linen weave paired with warm oat-toned canvas.', 'DIV-01', 0, 235, -8],
  ['waxedcanvas-cork', 'THM-148', 'WAXED CANVAS & NATURAL CORK', 'WAXED CANVAS', 'NATURAL CORK', 'Weatherproof waxed canvas field pack paired with natural cork board.', 'DIV-01', 0, 249, -8],
  ['driftwoodash-seasalt', 'THM-149', 'DRIFTWOOD ASH & SEA SALT', 'DRIFTWOOD ASH', 'SEA SALT CRYSTAL', 'Sun-grayed driftwood ash paired with coarse sea salt crystal.', 'DIV-01', 0, 263, -8],
  ['pumice-quartzsand', 'THM-150', 'VOLCANIC PUMICE & QUARTZ SAND', 'VOLCANIC PUMICE', 'QUARTZ SAND', 'Porous volcanic pumice stone paired with pale quartz sand.', 'DIV-01', 0, 277, -8],
  ['castiron-buttermilk', 'THM-151', 'CAST IRON SKILLET & BUTTERMILK', 'CAST IRON SKILLET', 'BUTTERMILK CREAM', 'Seasoned cast-iron skillet paired with soft buttermilk cream.', 'DIV-01', 0, 291, -8],
  ['nickel-eggshell', 'THM-152', 'BRUSHED NICKEL & EGGSHELL', 'BRUSHED NICKEL', 'EGGSHELL WHITE', 'Satin-brushed nickel fixture paired with warm eggshell white.', 'DIV-01', 0, 305, -8],
  ['flannel-rawcotton', 'THM-153', 'FLANNEL WOOL & RAW COTTON', 'FLANNEL WOOL', 'RAW COTTON BOLL', 'Brushed flannel wool weave paired with raw unspun cotton.', 'DIV-01', 0, 319, -8],
  ['sandblast-limewash', 'THM-154', 'SANDBLASTED CONCRETE & LIMEWASH', 'SANDBLASTED CONCRETE', 'LIMEWASH PLASTER', 'Textured sandblasted concrete paired with soft limewash plaster.', 'DIV-01', 0, 333, -8],
  ['teak-birchbark', 'THM-155', 'WEATHERED TEAK & BIRCH BARK', 'WEATHERED TEAK', 'BIRCH BARK PAPER', 'Silvered weathered teak decking paired with pale birch bark paper.', 'DIV-01', 0, 347, -8],
  ['powdercoat-gesso', 'THM-156', 'POWDER-COATED STEEL & GESSO PANEL', 'POWDER-COATED STEEL', 'GESSO PANEL', 'Matte powder-coated steel frame paired with primed gesso panel.', 'DIV-01', 0, 1, -8],
  ['pencil-vellum', 'THM-157', 'GRAPHITE PENCIL & DRAFTING VELLUM', 'GRAPHITE PENCIL', 'DRAFTING VELLUM', 'Soft graphite pencil shading paired with translucent drafting vellum.', 'DIV-01', 0, 15, -8],
  ['jute-muslin', 'THM-158', 'WOVEN JUTE & UNBLEACHED MUSLIN', 'WOVEN JUTE', 'UNBLEACHED MUSLIN', 'Coarse woven jute fiber paired with soft unbleached muslin cloth.', 'DIV-01', 0, 29, -8],
  ['temperedglass-milkglass', 'THM-159', 'TEMPERED GLASS & MILK GLASS', 'TEMPERED GLASS', 'MILK GLASS', 'Clear tempered safety glass paired with opaque vintage milk glass.', 'DIV-01', 0, 43, -8],
  ['saltflat-desertbone', 'THM-160', 'SALT FLAT CRUST & DESERT BONE', 'SALT FLAT CRUST', 'DESERT BONE WHITE', 'Cracked salt flat crust paired with sun-bleached desert bone white.', 'DIV-01', 0, 57, -8],
  ['riverstone-paleclay', 'THM-161', 'RIVER STONE & PALE CLAY', 'RIVER STONE NIGHT', 'PALE CLAY', 'Smooth river-worn stone paired with pale unfired clay.', 'DIV-01', 0, 71, -8],
  ['charcoalbrick-ashlinen', 'THM-162', 'CHARCOAL BRIQUETTE & ASH LINEN', 'CHARCOAL BRIQUETTE', 'ASH LINEN', 'Compressed charcoal briquette paired with soft ash-gray linen.', 'DIV-01', 0, 85, -8],

  // DIV-02 — 15 more pairs
  ['iceaxe-cornice', 'THM-163', "ICE CLIMBER'S AXE & CORNICE SNOW", 'ICE AXE STEEL', 'CORNICE SNOW', "An ice climber's steel axe edge paired with wind-carved cornice snow.", 'DIV-02', 0, 194, 0],
  ['research-packice', 'THM-164', 'POLAR RESEARCH VESSEL & PACK ICE', 'RESEARCH VESSEL NIGHT', 'PACK ICE FIELD', 'A polar research vessel hull at night paired with a sunlit pack-ice field.', 'DIV-02', 0, 202, 0],
  ['frozenfall-powder', 'THM-165', 'FROZEN WATERFALL & POWDER SNOW', 'FROZEN WATERFALL', 'POWDER SNOW', 'A suspended frozen waterfall paired with fresh untouched powder snow.', 'DIV-02', 0, 210, 0],
  ['nordicski-birchfrost', 'THM-166', 'NORDIC SKI TRAIL & BIRCH FROST', 'NORDIC SKI TRAIL', 'BIRCH FROST', 'A groomed Nordic ski trail at dusk paired with frost-rimed birch trees.', 'DIV-02', 0, 218, 0],
  ['hockeyrink-zamboni', 'THM-167', 'ICE HOCKEY RINK & ZAMBONI SHEEN', 'HOCKEY RINK NIGHT', 'ZAMBONI SHEEN', 'A floodlit ice hockey rink paired with the fresh sheen of a resurfaced floor.', 'DIV-02', 0, 226, 0],
  ['snowglobe-porcelain', 'THM-168', 'SNOW GLOBE INTERIOR & PORCELAIN FLURRY', 'SNOW GLOBE NIGHT', 'PORCELAIN FLURRY', 'The hushed interior of a snow globe paired with porcelain-white flurries.', 'DIV-02', 0, 234, 0],
  ['crevasse-glacialblue', 'THM-169', 'CREVASSE SHADOW & GLACIAL BLUE', 'CREVASSE SHADOW', 'GLACIAL BLUE ICE', 'A deep crevasse shadow paired with luminous glacial-blue ice.', 'DIV-02', 0, 242, 0],
  ['wintergreen-frostpane', 'THM-170', 'WINTER GREENHOUSE & FROSTED PANE', 'WINTER GREENHOUSE', 'FROSTED PANE', 'A warm winter greenhouse glow paired with a frosted glass pane.', 'DIV-02', 0, 250, 0],
  ['icebreaker-floefield', 'THM-171', 'ICEBREAKER HULL & FLOE FIELD', 'ICEBREAKER HULL', 'FLOE FIELD', 'A reinforced icebreaker hull paired with a drifting arctic floe field.', 'DIV-02', 0, 258, 0],
  ['cryovault-dryicefog', 'THM-172', 'CRYOGENIC VAULT & DRY ICE FOG', 'CRYOGENIC VAULT', 'DRY ICE FOG', 'A sealed cryogenic storage vault paired with billowing dry-ice fog.', 'DIV-02', 0, 266, 0],
  ['chairlift-freshpowder', 'THM-173', 'ALPINE CHAIRLIFT & FRESH POWDER', 'ALPINE CHAIRLIFT NIGHT', 'FRESH POWDER DAY', 'A swaying alpine chairlift at dusk paired with bright fresh powder.', 'DIV-02', 0, 274, 0],
  ['frostflower-paledawn', 'THM-174', 'FROST FLOWER WINDOW & PALE DAWN', 'FROST FLOWER WINDOW', 'PALE DAWN LIGHT', 'Intricate frost-flower window patterns paired with pale winter dawn light.', 'DIV-02', 0, 282, 0],
  ['polarbear-snowdrift', 'THM-175', 'POLAR BEAR DEN & SNOWDRIFT', 'POLAR BEAR DEN', 'SNOWDRIFT WHITE', 'A sheltered polar bear den paired with a wind-sculpted snowdrift.', 'DIV-02', 0, 290, 0],
  ['icesculpture-crystal', 'THM-176', 'ICE SCULPTURE GALLERY & FROSTED CRYSTAL', 'ICE SCULPTURE NIGHT', 'FROSTED CRYSTAL', 'A floodlit ice sculpture gallery paired with frosted crystal facets.', 'DIV-02', 0, 298, 0],
  ['snowcat-corduroy', 'THM-177', 'SNOWCAT GROOMER & CORDUROY TRAIL', 'SNOWCAT GROOMER NIGHT', 'CORDUROY TRAIL', 'A pre-dawn snowcat groomer pass paired with a freshly cut corduroy trail.', 'DIV-02', 0, 306, 0],

  // DIV-03 — 15 more pairs
  ['greenhouse-terracotta', 'THM-178', 'BOTANICAL GREENHOUSE & TERRACOTTA POT', 'GREENHOUSE NIGHT', 'TERRACOTTA POT', 'A humid botanical greenhouse at dusk paired with sun-warmed terracotta.', 'DIV-03', 0, 94, 0],
  ['wasabi-ricepaper', 'THM-179', 'WASABI ROOT & RICE PAPER', 'WASABI ROOT', 'RICE PAPER SHEET', 'Freshly grated wasabi root paired with translucent rice paper.', 'DIV-03', 0, 100, 0],
  ['matcha-teaceremony', 'THM-180', 'EMERALD TEA CEREMONY & MATCHA FOAM', 'TEA CEREMONY NIGHT', 'MATCHA FOAM', 'A quiet emerald tea-ceremony room paired with whisked matcha foam.', 'DIV-03', 0, 106, 0],
  ['junglevine-orchid', 'THM-181', 'JUNGLE VINE CANOPY & ORCHID PETAL', 'JUNGLE CANOPY NIGHT', 'ORCHID PETAL', 'A dense jungle vine canopy at night paired with a pale orchid petal.', 'DIV-03', 0, 112, 0],
  ['fairway-chalkline', 'THM-182', 'GOLF COURSE FAIRWAY & CHALK LINE', 'FAIRWAY NIGHT DEW', 'CHALK BOUNDARY LINE', 'Dew-laden fairway turf at dawn paired with a crisp chalk boundary line.', 'DIV-03', 0, 118, 0],
  ['pineneedle-birchgrove', 'THM-183', 'PINE NEEDLE CARPET & BIRCH GROVE', 'PINE NEEDLE CARPET', 'BIRCH GROVE LIGHT', 'A soft fallen pine-needle forest floor paired with sunlit birch grove light.', 'DIV-03', 0, 124, 0],
  ['spinach-farmhouse', 'THM-184', 'SPINACH LEAF & FARMHOUSE LINEN', 'SPINACH LEAF NIGHT', 'FARMHOUSE LINEN', 'Deep spinach-leaf green paired with rustic farmhouse linen.', 'DIV-03', 0, 130, 0],
  ['celadon-jadevase', 'THM-185', 'CELADON POTTERY & JADE VASE', 'CELADON GLAZE NIGHT', 'JADE VASE LIGHT', 'Glossy celadon pottery glaze paired with pale carved-jade vase light.', 'DIV-03', 0, 136, 0],
  ['limezest-coconutcream', 'THM-186', 'LIME ZEST & COCONUT CREAM', 'LIME ZEST NIGHT', 'COCONUT CREAM', 'Bright grated lime zest paired with smooth tropical coconut cream.', 'DIV-03', 0, 142, 0],
  ['mintjulep-silvercup', 'THM-187', 'MINT JULEP & SILVER CUP', 'MINT JULEP NIGHT', 'SILVER CUP FROST', 'A muddled mint julep paired with a frosted silver cup.', 'DIV-03', 0, 148, 0],
  ['ferngrotto-mossstone', 'THM-188', 'FERN GROTTO & MOSSY STONE', 'FERN GROTTO SHADOW', 'MOSSY STONE LIGHT', 'A shaded fern grotto paired with sunlit moss-covered stone.', 'DIV-03', 0, 154, 0],
  ['bowlinggreen-chalk', 'THM-189', 'BOWLING GREEN LAWN & CHALK BOUNDARY', 'BOWLING GREEN NIGHT', 'CHALK BOUNDARY', 'A manicured bowling-green lawn at dusk paired with a crisp chalk boundary.', 'DIV-03', 0, 160, 0],
  ['kelpforest-seaglass', 'THM-190', 'KELP FOREST SHADE & SEA GLASS', 'KELP FOREST SHADE', 'SEA GLASS GREEN', 'Swaying kelp forest shade paired with weathered sea-glass green.', 'DIV-03', 0, 166, 0],
  ['avocado-linen', 'THM-191', 'AVOCADO TOAST & LINEN NAPKIN', 'AVOCADO TOAST NIGHT', 'LINEN NAPKIN', 'Rich mashed avocado tone paired with a crisp folded linen napkin.', 'DIV-03', 0, 172, 0],
  ['clovermeadow-mist', 'THM-192', 'CLOVER MEADOW & MORNING MIST', 'CLOVER MEADOW NIGHT', 'MORNING MIST', 'A dew-dark clover meadow at night paired with pale morning mist.', 'DIV-03', 0, 178, 0],

  // DIV-04 — 15 more pairs
  ['scuba-reefsunbeam', 'THM-193', 'SCUBA DIVE COMPUTER & REEF SUNBEAM', 'DIVE COMPUTER NIGHT', 'REEF SUNBEAM', 'A glowing scuba dive-computer readout paired with a sunbeam through reef water.', 'DIV-04', 0, 188, 0],
  ['ropelocker-canvassail', 'THM-194', "SAILOR'S ROPE LOCKER & CANVAS SAIL", 'ROPE LOCKER SHADOW', 'CANVAS SAIL LIGHT', "A coiled sailor's rope locker paired with a sun-bleached canvas sail.", 'DIV-04', 0, 194, 0],
  ['harborbuoy-saltspray', 'THM-195', "HARBOR BUOY BELL & SALT SPRAY", 'HARBOR BUOY NIGHT', 'SALT SPRAY MIST', 'A clanging harbor buoy bell at night paired with fine salt-spray mist.', 'DIV-04', 0, 200, 0],
  ['tidechart-nauticalchart', 'THM-196', 'TIDE CHART LEDGER & NAUTICAL CHART', 'TIDE CHART LEDGER', 'NAUTICAL CHART PAPER', 'A worn tide-chart ledger paired with a pale nautical chart.', 'DIV-04', 0, 206, 0],
  ['pearldiver-shellmidden', 'THM-197', "PEARL DIVER'S COVE & SHELL MIDDEN", 'PEARL DIVER COVE', 'SHELL MIDDEN WHITE', "A pearl diver's shaded cove paired with a sun-bleached shell midden.", 'DIV-04', 0, 212, 0],
  ['lighthouse-fogbank', 'THM-198', "LIGHTHOUSE KEEPER'S LOG & FOG BANK", 'LIGHTHOUSE LOG NIGHT', 'FOG BANK WHITE', "A lighthouse keeper's logbook at night paired with a rolling fog bank.", 'DIV-04', 0, 218, 0],
  ['marinelab-specimenjar', 'THM-199', 'MARINE BIOLOGY LAB & SPECIMEN JAR', 'MARINE LAB NIGHT', 'SPECIMEN JAR GLASS', 'A quiet marine-biology lab at night paired with a clear specimen jar.', 'DIV-04', 0, 224, 0],
  ['yachtdeck-teakrail', 'THM-200', 'YACHT CLUB DECK & TEAK RAIL', 'YACHT DECK NIGHT', 'TEAK RAIL LIGHT', 'A moonlit yacht-club deck paired with sun-warmed teak railing.', 'DIV-04', 0, 230, 0],
  ['trawlerhold-morningcatch', 'THM-201', 'FISHING TRAWLER HOLD & MORNING CATCH', 'TRAWLER HOLD NIGHT', 'MORNING CATCH', "A dockside fishing trawler's hold paired with the morning's fresh catch.", 'DIV-04', 0, 236, 0],
  ['anchorchain-ropefiber', 'THM-202', 'ANCHOR CHAIN LOCKER & ROPE FIBER', 'ANCHOR CHAIN LOCKER', 'ROPE FIBER LIGHT', 'A rusted anchor-chain locker paired with pale natural rope fiber.', 'DIV-04', 0, 242, 0],
  ['coralnursery-reefglass', 'THM-203', 'CORAL NURSERY TANK & REEF GLASS', 'CORAL NURSERY NIGHT', 'REEF GLASS LIGHT', 'A dim coral nursery tank paired with sunlit reef-glass water.', 'DIV-04', 0, 248, 0],
  ['deepcurrent-buoymarker', 'THM-204', 'DEEP CURRENT RESEARCH & BUOY MARKER', 'DEEP CURRENT NIGHT', 'BUOY MARKER WHITE', 'A deep-current research station paired with a bright buoy marker.', 'DIV-04', 0, 254, 0],
  ['seaplane-harbordawn', 'THM-205', 'SEAPLANE DOCK & HARBOR DAWN', 'SEAPLANE DOCK NIGHT', 'HARBOR DAWN LIGHT', 'A quiet seaplane dock at night paired with a pale harbor dawn.', 'DIV-04', 0, 260, 0],
  ['oysterbed-motherpearl', 'THM-206', 'OYSTER BED & MOTHER OF PEARL', 'OYSTER BED SHADOW', 'MOTHER OF PEARL', 'A shadowed tidal oyster bed paired with iridescent mother-of-pearl.', 'DIV-04', 0, 266, 0],
  ['tidewatermarsh-reedlight', 'THM-207', 'TIDEWATER MARSH & REED LIGHT', 'TIDEWATER MARSH NIGHT', 'REED LIGHT DAY', 'A dark tidewater marsh at dusk paired with sunlit marsh-reed light.', 'DIV-04', 0, 272, 0],

  // DIV-05 — 15 more pairs
  ['exoplanet-aliendawn', 'THM-208', 'EXOPLANET SURVEY & ALIEN DAWN', 'EXOPLANET SURVEY NIGHT', 'ALIEN DAWN LIGHT', 'A distant exoplanet survey feed paired with an alien dawn horizon.', 'DIV-05', 0, 258, 0],
  ['radiotelescope-signalnoise', 'THM-209', 'RADIO TELESCOPE ARRAY & SIGNAL NOISE', 'RADIO ARRAY NIGHT', 'SIGNAL NOISE WHITE', 'A sprawling radio-telescope array at night paired with bright signal noise.', 'DIV-05', 0, 262, 0],
  ['astronauttraining-zerogravity', 'THM-210', 'ASTRONAUT TRAINING POOL & ZERO-G LIGHT', 'TRAINING POOL NIGHT', 'ZERO-G LIGHT', 'A deep astronaut training pool paired with weightless simulation light.', 'DIV-05', 0, 266, 0],
  ['meteorshower-comettail', 'THM-211', 'METEOR SHOWER NIGHT & COMET TAIL', 'METEOR SHOWER NIGHT', 'COMET TAIL GLOW', 'A blazing meteor-shower night paired with a glowing comet tail.', 'DIV-05', 0, 270, 0],
  ['spaceelevator-orbitaldawn', 'THM-212', 'SPACE ELEVATOR CABLE & ORBITAL DAWN', 'SPACE ELEVATOR NIGHT', 'ORBITAL DAWN LIGHT', 'A towering space-elevator cable paired with orbital dawn light.', 'DIV-05', 0, 274, 0],
  ['marscolony-rusthorizon', 'THM-213', 'MARS COLONY DOME & RUST HORIZON', 'MARS COLONY NIGHT', 'RUST HORIZON', 'A sealed Mars colony dome at night paired with a rust-red horizon.', 'DIV-05', 0, 278, 0],
  ['planetarium-starprojector', 'THM-214', 'PLANETARIUM DOME & STAR PROJECTOR', 'PLANETARIUM DOME NIGHT', 'STAR PROJECTOR LIGHT', 'A darkened planetarium dome paired with a bright star-projector beam.', 'DIV-05', 0, 282, 0],
  ['gravitywell-eventglow', 'THM-215', 'GRAVITY WELL SIMULATOR & EVENT GLOW', 'GRAVITY WELL NIGHT', 'EVENT GLOW LIGHT', 'A spinning gravity-well simulator paired with a soft event-horizon glow.', 'DIV-05', 0, 286, 0],
  ['deepfield-galaxycluster', 'THM-216', 'DEEP FIELD SURVEY & GALAXY CLUSTER', 'DEEP FIELD NIGHT', 'GALAXY CLUSTER LIGHT', 'A long-exposure deep-field survey paired with a distant galaxy cluster.', 'DIV-05', 0, 290, 0],
  ['launchpad-ignitionflash', 'THM-217', 'ROCKET LAUNCH PAD & IGNITION FLASH', 'LAUNCH PAD NIGHT', 'IGNITION FLASH', 'A floodlit rocket launch pad paired with a blinding ignition flash.', 'DIV-05', 0, 294, 0],
  ['lunarbase-regolithdust', 'THM-218', 'LUNAR BASE MODULE & REGOLITH DUST', 'LUNAR BASE NIGHT', 'REGOLITH DUST LIGHT', 'A sealed lunar base module paired with pale lunar regolith dust.', 'DIV-05', 0, 298, 0],
  ['interstellar-signalpulse', 'THM-219', 'INTERSTELLAR BEACON & SIGNAL PULSE', 'INTERSTELLAR BEACON', 'SIGNAL PULSE LIGHT', 'A lone interstellar beacon transmission paired with a bright signal pulse.', 'DIV-05', 0, 302, 0],
  ['asteroidmining-oreglint', 'THM-220', 'ASTEROID MINING RIG & ORE GLINT', 'ASTEROID RIG NIGHT', 'ORE GLINT LIGHT', 'A floodlit asteroid mining rig paired with the glint of raw ore.', 'DIV-05', 0, 306, 0],
  ['cryopodbay-hibernationfrost', 'THM-221', 'CRYO-POD BAY & HIBERNATION FROST', 'CRYO-POD BAY NIGHT', 'HIBERNATION FROST', 'A dim cryo-pod hibernation bay paired with pale hibernation frost.', 'DIV-05', 0, 310, 0],
  ['celestialnav-starchart', 'THM-222', 'CELESTIAL NAVIGATION & STAR CHART', 'CELESTIAL NAV NIGHT', 'STAR CHART PAPER', 'A ship\'s celestial navigation station paired with a pale star chart.', 'DIV-05', 0, 314, 0],

  // DIV-06 — 15 more pairs
  ['postmodern-whitecube', 'THM-223', 'POSTMODERN GALLERY & WHITE CUBE', 'POSTMODERN GALLERY NIGHT', 'WHITE CUBE GALLERY', 'A dim postmodern art gallery paired with a pristine white-cube space.', 'DIV-06', 0, 303, 0],
  ['neonsign-glasstube', 'THM-224', 'NEON SIGN WORKSHOP & GLASS TUBE', 'NEON WORKSHOP NIGHT', 'GLASS TUBE DAYLIGHT', 'A buzzing neon-sign workshop at night paired with bright glass tubing by day.', 'DIV-06', 0, 307, 0],
  ['runway-spotlight', 'THM-225', 'FASHION RUNWAY BACKSTAGE & SPOTLIGHT', 'RUNWAY BACKSTAGE', 'SPOTLIGHT WHITE', 'A dim fashion-runway backstage area paired with a blazing spotlight.', 'DIV-06', 0, 311, 0],
  ['architecturalmodel-foamcore', 'THM-226', 'ARCHITECTURAL MODEL STUDIO & FOAM CORE', 'MODEL STUDIO NIGHT', 'FOAM CORE WHITE', 'A late-night architectural model studio paired with clean foam-core board.', 'DIV-06', 0, 315, 0],
  ['printmaking-inkroller', 'THM-227', 'PRINTMAKING PRESS & INK ROLLER', 'PRINTMAKING PRESS', 'INK ROLLER SHEEN', 'A heavy printmaking press paired with the sheen of a fresh ink roller.', 'DIV-06', 0, 319, 0],
  ['modernistfacade-travertine', 'THM-228', 'MODERNIST FACADE & TRAVERTINE SLAB', 'MODERNIST FACADE NIGHT', 'TRAVERTINE SLAB', 'A floodlit modernist building facade paired with a pale travertine slab.', 'DIV-06', 0, 323, 0],
  ['theatrerigging-stagelight', 'THM-229', 'THEATRE RIGGING LOFT & STAGE LIGHT', 'RIGGING LOFT SHADOW', 'STAGE LIGHT WHITE', 'A shadowed theatre rigging loft paired with a blazing stage light.', 'DIV-06', 0, 327, 0],
  ['kiln-glazetest', 'THM-230', 'CERAMIC KILN STUDIO & GLAZE TEST', 'KILN STUDIO NIGHT', 'GLAZE TEST TILE', 'A warm ceramic kiln studio at night paired with a pale glaze test tile.', 'DIV-06', 0, 331, 0],
  ['typefoundry-letterpress', 'THM-231', 'TYPOGRAPHY FOUNDRY & LETTERPRESS TRAY', 'TYPE FOUNDRY NIGHT', 'LETTERPRESS TRAY', 'A dim type-foundry casting floor paired with a pale letterpress type tray.', 'DIV-06', 0, 335, 0],
  ['conceptcar-showroom', 'THM-232', 'CONCEPT CAR SHOWROOM & SHOWROOM WHITE', 'CONCEPT CAR NIGHT', 'SHOWROOM WHITE FLOOR', 'A dim concept-car reveal stage paired with a polished showroom-white floor.', 'DIV-06', 0, 339, 0],
  ['runwaylighting-diffusiongel', 'THM-233', 'RUNWAY LIGHTING RIG & DIFFUSION GEL', 'LIGHTING RIG NIGHT', 'DIFFUSION GEL WHITE', 'A tangled runway lighting rig paired with soft diffusion-gel white.', 'DIV-06', 0, 343, 0],
  ['draftingloft-tracepaper', 'THM-234', "ARCHITECT'S DRAFTING LOFT & TRACE PAPER", 'DRAFTING LOFT NIGHT', 'TRACE PAPER LIGHT', "An architect's late-night drafting loft paired with pale trace paper.", 'DIV-06', 0, 347, 0],
  ['popart-canvasprimer', 'THM-235', 'POP ART STUDIO & CANVAS PRIMER', 'POP ART STUDIO NIGHT', 'CANVAS PRIMER WHITE', 'A bold pop-art studio at night paired with freshly primed canvas white.', 'DIV-06', 0, 351, 0],
  ['jazzclub-brassshine', 'THM-236', 'JAZZ CLUB STAGE & BRASS SHINE', 'JAZZ CLUB STAGE NIGHT', 'BRASS SHINE LIGHT', 'A smoky jazz-club stage at night paired with the shine of polished brass.', 'DIV-06', 0, 355, 0],
  ['filmnoir-keylight', 'THM-237', 'FILM NOIR SET & KEY LIGHT', 'FILM NOIR SET NIGHT', 'KEY LIGHT WHITE', 'A shadow-drenched film-noir set paired with a single bright key light.', 'DIV-06', 0, 359, 0],

  // DIV-07 — 12 more pairs
  ['rosevineyard-chalkterroir', 'THM-238', 'ROSÉ VINEYARD & CHALK TERROIR', 'ROSÉ VINEYARD NIGHT', 'CHALK TERROIR', 'A moonlit rosé vineyard row paired with pale chalk terroir soil.', 'DIV-07', 0, 338, 0],
  ['macaron-almondcream', 'THM-239', 'MACARON PATISSERIE & ALMOND CREAM', 'PATISSERIE NIGHT', 'ALMOND CREAM', 'A dim macaron patisserie counter paired with soft almond cream.', 'DIV-07', 0, 342, 0],
  ['cherryblossom-lantern', 'THM-240', 'CHERRY BLOSSOM FESTIVAL & PAPER LANTERN', 'FESTIVAL NIGHT BLOOM', 'PAPER LANTERN GLOW', 'A night cherry-blossom festival paired with warm paper-lantern glow.', 'DIV-07', 0, 346, 0],
  ['balletstudio-rosindust', 'THM-241', 'BLUSH BALLET STUDIO & ROSIN DUST', 'BALLET STUDIO NIGHT', 'ROSIN DUST LIGHT', 'A dim blush-toned ballet studio paired with a puff of pale rosin dust.', 'DIV-07', 0, 350, 0],
  ['pinksalt-himalayan', 'THM-242', 'PINK SALT CAVE & HIMALAYAN CRYSTAL', 'PINK SALT CAVE', 'HIMALAYAN CRYSTAL', 'A dim pink salt cave wall paired with a glowing Himalayan salt crystal.', 'DIV-07', 0, 354, 0],
  ['lipstick-powderpuff', 'THM-243', 'LIPSTICK VANITY & POWDER PUFF', 'LIPSTICK VANITY NIGHT', 'POWDER PUFF WHITE', 'A dim lipstick vanity mirror paired with a soft powder puff.', 'DIV-07', 0, 358, 0],
  ['rhubarb-vanillacustard', 'THM-244', 'RHUBARB TART & VANILLA CUSTARD', 'RHUBARB TART NIGHT', 'VANILLA CUSTARD', 'A rich rhubarb-tart glaze paired with smooth vanilla custard.', 'DIV-07', 0, 2, 0],
  ['orchidconservatory-morninglight', 'THM-245', 'ORCHID CONSERVATORY & MORNING LIGHT', 'ORCHID CONSERVATORY', 'MORNING LIGHT SOFT', 'A warm orchid conservatory at dusk paired with soft morning light.', 'DIV-07', 0, 6, 0],
  ['pinkchampagne-silkribbon', 'THM-246', 'PINK CHAMPAGNE TOAST & SILK RIBBON', 'CHAMPAGNE TOAST NIGHT', 'SILK RIBBON', 'A pink-champagne toast at dusk paired with a pale silk ribbon.', 'DIV-07', 0, 10, 0],
  ['guavasunset-coconutmilk', 'THM-247', 'GUAVA SUNSET & COCONUT MILK', 'GUAVA SUNSET NIGHT', 'COCONUT MILK', 'A guava-pink tropical sunset paired with smooth coconut milk.', 'DIV-07', 0, 14, 0],
  ['rosequartz-marblebath', 'THM-248', 'ROSE QUARTZ SPA & MARBLE BATH', 'ROSE QUARTZ SPA NIGHT', 'MARBLE BATH WHITE', 'A dim rose-quartz spa chamber paired with a pale marble bath.', 'DIV-07', 0, 18, 0],
  ['candyfloss-sugardust', 'THM-249', 'CANDY FLOSS FAIR & SUGAR DUST', 'CANDY FLOSS NIGHT FAIR', 'SUGAR DUST WHITE', 'A pink candy-floss night fair stall paired with fine sugar dust.', 'DIV-07', 0, 22, 0],

  // DIV-08 — 12 more pairs
  ['potterykiln-terracottadust', 'THM-250', 'POTTERY KILN FIRE & TERRACOTTA DUST', 'POTTERY KILN FIRE', 'TERRACOTTA DUST', 'A glowing pottery kiln fire paired with fine terracotta dust.', 'DIV-08', 0, 23, 0],
  ['pumpkinspice-creamfroth', 'THM-251', 'PUMPKIN SPICE KITCHEN & CREAM FROTH', 'PUMPKIN SPICE NIGHT', 'CREAM FROTH', 'A warm pumpkin-spice kitchen at dusk paired with soft cream froth.', 'DIV-08', 0, 28, 0],
  ['coppersmithy-patina', 'THM-252', 'COPPER SMITHY & PATINA BLOOM', 'COPPER SMITHY FIRE', 'PATINA BLOOM', 'A glowing copper smithy forge paired with soft oxidized patina bloom.', 'DIV-08', 0, 33, 0],
  ['harvestbonfire-haybale', 'THM-253', 'HARVEST FESTIVAL BONFIRE & HAY BALE', 'HARVEST BONFIRE NIGHT', 'HAY BALE DAY', 'A crackling harvest-festival bonfire paired with a sunlit hay bale.', 'DIV-08', 0, 38, 0],
  ['whiskeybarrel-oakchar', 'THM-254', 'AMBER WHISKEY BARREL & OAK CHAR', 'WHISKEY BARREL NIGHT', 'OAK CHAR LIGHT', 'A dim amber-whiskey barrel cellar paired with toasted oak char.', 'DIV-08', 0, 43, 0],
  ['marigoldmarket-linensack', 'THM-255', 'MARIGOLD MARKET STALL & LINEN SACK', 'MARIGOLD STALL NIGHT', 'LINEN SACK LIGHT', 'A lantern-lit marigold market stall paired with a pale linen grain sack.', 'DIV-08', 0, 48, 0],
  ['claybrick-sandstonedust', 'THM-256', 'CLAY BRICK KILN & SANDSTONE DUST', 'BRICK KILN FIRE', 'SANDSTONE DUST', 'A glowing clay-brick kiln fire paired with fine sandstone dust.', 'DIV-08', 0, 53, 0],
  ['maplesyrup-birchsteam', 'THM-257', 'MAPLE SYRUP BOIL & BIRCH STEAM', 'MAPLE SYRUP BOIL NIGHT', 'BIRCH STEAM LIGHT', 'A bubbling maple-syrup boil at night paired with rising birch steam.', 'DIV-08', 0, 58, 0],
  ['terracottaroof-siennawash', 'THM-258', 'TERRACOTTA ROOFTOP & SIENNA WASH', 'TERRACOTTA ROOFTOP NIGHT', 'SIENNA WASH LIGHT', 'A moonlit terracotta rooftop paired with a soft sienna wash of dawn.', 'DIV-08', 0, 63, 0],
  ['chilistring-adobewall', 'THM-259', 'CHILI PEPPER STRING & ADOBE WALL', 'CHILI STRING NIGHT', 'ADOBE WALL LIGHT', 'A dried chili-pepper string in shadow paired with a sunlit adobe wall.', 'DIV-08', 0, 68, 0],
  ['cinnamonrack-creamlinen', 'THM-260', 'CINNAMON SPICE RACK & CREAM LINEN', 'SPICE RACK NIGHT', 'CREAM LINEN LIGHT', 'A warm cinnamon spice-rack shelf paired with soft cream linen.', 'DIV-08', 0, 73, 0],
  ['rustbelt-ironoxide', 'THM-261', 'RUST BELT FOUNDRY & IRON OXIDE', 'RUST BELT FOUNDRY', 'IRON OXIDE LIGHT', 'A glowing rust-belt foundry floor paired with pale iron-oxide dust.', 'DIV-08', 0, 78, 0],

  // DIV-09 — 12 more pairs
  ['gilded-vellumpage', 'THM-262', 'GILDED MANUSCRIPT & VELLUM PAGE', 'GILDED MANUSCRIPT NIGHT', 'VELLUM PAGE LIGHT', 'A candlelit gilded manuscript page paired with pale aged vellum.', 'DIV-09', 0, 48, 0],
  ['wheatharvest-strawbale', 'THM-263', 'WHEAT HARVEST FIELD & STRAW BALE', 'WHEAT HARVEST NIGHT', 'STRAW BALE DAY', 'A golden wheat field at dusk paired with a sunlit straw bale.', 'DIV-09', 0, 52, 0],
  ['honeycombextract-beeswax', 'THM-264', 'HONEY COMB EXTRACTION & BEESWAX BLOCK', 'HONEY EXTRACTION NIGHT', 'BEESWAX BLOCK', 'A dim honeycomb extraction room paired with a warm beeswax block.', 'DIV-09', 0, 56, 0],
  ['brasscompass-chartpaper', 'THM-265', 'ANTIQUE BRASS COMPASS & CHART PAPER', 'BRASS COMPASS NIGHT', 'CHART PAPER LIGHT', 'An antique brass compass under lamplight paired with pale chart paper.', 'DIV-09', 0, 60, 0],
  ['goldenhour-chardonnay', 'THM-266', 'GOLDEN HOUR VINEYARD & CHARDONNAY', 'VINEYARD DUSK NIGHT', 'CHARDONNAY LIGHT', 'A golden-hour vineyard row paired with pale chardonnay light.', 'DIV-09', 0, 64, 0],
  ['throneroom-ivorysilk', 'THM-267', 'IMPERIAL THRONE ROOM & IVORY SILK', 'THRONE ROOM NIGHT', 'IVORY SILK LIGHT', 'A grand imperial throne room in shadow paired with pale ivory silk.', 'DIV-09', 0, 68, 0],
  ['amberjewelry-resinpolish', 'THM-268', 'AMBER JEWELRY WORKSHOP & RESIN POLISH', 'AMBER WORKSHOP NIGHT', 'RESIN POLISH LIGHT', 'A warm amber-jewelry workshop bench paired with polished resin sheen.', 'DIV-09', 0, 72, 0],
  ['astrolabe-starchart', 'THM-269', 'BRASS ASTROLABE & STAR CHART', 'BRASS ASTROLABE NIGHT', 'STAR CHART LIGHT', 'A brass astrolabe under starlight paired with a pale star chart.', 'DIV-09', 0, 76, 0],
  ['retrieverfield-wheatchaff', 'THM-270', 'GOLDEN RETRIEVER FIELDS & WHEAT CHAFF', 'FIELD DUSK NIGHT', 'WHEAT CHAFF LIGHT', 'A golden field at dusk paired with drifting pale wheat chaff.', 'DIV-09', 0, 80, 0],
  ['champagnegold-creamvelvet', 'THM-271', 'CHAMPAGNE GOLD LOUNGE & CREAM VELVET', 'GOLD LOUNGE NIGHT', 'CREAM VELVET LIGHT', 'A dim champagne-gold lounge paired with soft cream velvet upholstery.', 'DIV-09', 0, 84, 0],
  ['marigolddye-rawsilk', 'THM-272', 'MARIGOLD DYE VAT & RAW SILK', 'MARIGOLD DYE NIGHT', 'RAW SILK LIGHT', 'A steaming marigold dye vat paired with pale undyed raw silk.', 'DIV-09', 0, 88, 0],
  ['sunflowerfield-creamlinen', 'THM-273', 'SUNFLOWER FIELD & CREAM LINEN', 'SUNFLOWER FIELD NIGHT', 'CREAM LINEN LIGHT', 'A vast sunflower field at dusk paired with soft cream linen cloth.', 'DIV-09', 0, 92, 0],

  // DIV-10 — 15 more pairs
  ['zeropoint-whitenoise', 'THM-274', 'ZERO POINT ENERGY LAB & WHITE NOISE', 'ZERO POINT LAB NIGHT', 'WHITE NOISE FIELD', 'A sealed zero-point energy lab paired with a field of pure white noise.', 'DIV-10', 0, 10, -18],
  ['stealthhangar-runwayfog', 'THM-275', 'STEALTH FIGHTER HANGAR & RUNWAY FOG', 'STEALTH HANGAR NIGHT', 'RUNWAY FOG WHITE', 'A blacked-out stealth-fighter hangar paired with pale runway fog.', 'DIV-10', 0, 27, -18],
  ['hyperlooptube-vacuumseal', 'THM-276', 'HYPERLOOP TUBE & VACUUM SEAL WHITE', 'HYPERLOOP TUBE NIGHT', 'VACUUM SEAL WHITE', 'A sealed hyperloop transit tube paired with sterile vacuum-seal white.', 'DIV-10', 0, 44, -18],
  ['fusionreactor-containment', 'THM-277', 'FUSION REACTOR CORE & CONTAINMENT WHITE', 'FUSION CORE NIGHT', 'CONTAINMENT WHITE', 'A contained fusion reactor core glow paired with sterile containment white.', 'DIV-10', 0, 61, -18],
  ['particledetector-cleanroom', 'THM-278', 'PARTICLE DETECTOR ARRAY & CLEAN ROOM', 'DETECTOR ARRAY NIGHT', 'CLEAN ROOM WHITE', 'A vast particle-detector array in shadow paired with sterile clean-room white.', 'DIV-10', 0, 78, -18],
  ['orbitalshipyard-hullplating', 'THM-279', 'ORBITAL SHIPYARD & HULL PLATING', 'ORBITAL SHIPYARD NIGHT', 'HULL PLATING WHITE', 'A floodlit orbital shipyard frame paired with polished hull plating.', 'DIV-10', 0, 95, -18],
  ['neuralinterface-ceramic', 'THM-280', 'NEURAL INTERFACE LAB & CERAMIC HOUSING', 'NEURAL LAB NIGHT', 'CERAMIC HOUSING WHITE', 'A quiet neural-interface research lab paired with smooth ceramic housing.', 'DIV-10', 0, 112, -18],
  ['exosuitbay-polishedalloy', 'THM-281', 'EXOSUIT MAINTENANCE BAY & POLISHED ALLOY', 'EXOSUIT BAY NIGHT', 'POLISHED ALLOY WHITE', 'A dim exosuit maintenance bay paired with polished alloy plating.', 'DIV-10', 0, 129, -18],
  ['deepspacerelay-signalwhite', 'THM-282', 'DEEP SPACE RELAY & SIGNAL WHITE', 'DEEP SPACE RELAY NIGHT', 'SIGNAL WHITE LIGHT', 'A solitary deep-space relay station paired with a pulse of signal white.', 'DIV-10', 0, 146, -18],
  ['gravitontest-labwhite', 'THM-283', 'GRAVITON FIELD TEST & LAB WHITE', 'GRAVITON TEST NIGHT', 'LAB WHITE LIGHT', 'A contained graviton field test chamber paired with sterile lab white.', 'DIV-10', 0, 163, -18],
  ['cryostasis-frostglass', 'THM-284', 'CRYO-STASIS ARRAY & FROST GLASS', 'CRYO-STASIS NIGHT', 'FROST GLASS WHITE', 'A row of cryo-stasis pods in shadow paired with pale frosted glass.', 'DIV-10', 0, 180, -18],
  ['singularity-eventglow', 'THM-285', 'SINGULARITY CONTAINMENT & EVENT GLOW', 'SINGULARITY NIGHT', 'EVENT GLOW WHITE', 'A contained singularity chamber paired with a faint event-horizon glow.', 'DIV-10', 0, 197, -18],
  ['terraform-horizonwhite', 'THM-286', 'TERRAFORMING COMMAND & HORIZON WHITE', 'TERRAFORM COMMAND NIGHT', 'HORIZON WHITE LIGHT', 'A dim terraforming command deck paired with a pale new-world horizon.', 'DIV-10', 0, 214, -18],
  ['orbitalring-starlithull', 'THM-287', 'ORBITAL RING STATION & STARLIT HULL', 'ORBITAL RING NIGHT', 'STARLIT HULL WHITE', 'A vast orbital ring station in shadow paired with a starlit hull plate.', 'DIV-10', 0, 231, -18],
  ['omegaarchive-platinumseal', 'THM-288', 'OMEGA ARCHIVE VAULT & PLATINUM SEAL', 'OMEGA ARCHIVE NIGHT', 'PLATINUM SEAL WHITE', 'The final omega archive vault in shadow paired with a platinum seal white.', 'DIV-10', 0, 248, -18],
];

function buildExtraThemePairs(): SurfaceThemePair[] {
  return EXTRA_THEME_SPECS.map((spec, i) => {
    const [id, code, name, darkLabel, lightLabel, description, divisionCode, clearanceHintLv, hue, satBoost] = spec;
    const pal = buildSignaturePalette(hue, satBoost);
    const pattern = SIGNATURE_PATTERN_CYCLE[i % SIGNATURE_PATTERN_CYCLE.length];
    return {
      id,
      code,
      name,
      pairLabel: `${darkLabel} ⇄ ${lightLabel}`,
      description,
      pattern,
      accentHex: hslToHex(hue, 65, 55),
      divisionCode,
      clearanceHintLv,
      dark: { label: darkLabel, ...pal.dark },
      light: { label: lightLabel, ...pal.light },
    };
  });
}

const RAW_SURFACE_THEME_PAIRS: SurfaceThemePair[] = [
  // ==========================================
  // DIV-01 // INITIATE (LV.1–300 // 0H–50H per cycle) — 36 PAIRS
  // ==========================================
  {
    id: 'monolith',
    code: 'THM-01',
    name: 'MONOLITH STANDARD',
    pairLabel: 'CARBON BLACK ⇄ ALABASTER WHITE',
    description: 'Factory baseline architectural monochrome with zero optical distortion.',
    pattern: 'none',
    accentHex: '#10b981',
    divisionCode: 'DIV-01',
    clearanceHintLv: 2,
    dark: {
      label: 'CARBON BLACK',
      bgMain: '#0a0a0a',
      bgCard: '#111111',
      bgInput: '#0a0a0a',
      border: '#27272a',
      textMain: '#f4f4f5',
      textMuted: '#71717a',
      patternTint: 'rgba(255,255,255,0.03)',
      glowTint: 'rgba(16,185,129,0.04)',
    },
    light: {
      label: 'ALABASTER WHITE',
      bgMain: '#fafafa',
      bgCard: '#ffffff',
      bgInput: '#f4f4f5',
      border: '#e4e4e7',
      textMain: '#18181b',
      textMuted: '#71717a',
      patternTint: 'rgba(0,0,0,0.04)',
      glowTint: 'rgba(16,185,129,0.04)',
    },
  },
  {
    id: 'graphite-grid',
    code: 'THM-02',
    name: 'GRAPHITE MICRO-GRID',
    pairLabel: 'ANODIZED SLATE ⇄ DRAFTING VELLUM',
    description: 'Precision CAD micro-grid calibrated for technical telemetry alignment.',
    pattern: 'grid',
    accentHex: '#a1a1aa',
    divisionCode: 'DIV-01',
    clearanceHintLv: 4,
    dark: {
      label: 'ANODIZED SLATE',
      bgMain: '#1d232e',
      bgCard: '#252d3c',
      bgInput: '#191f29',
      border: '#364051',
      textMain: '#f1f5f9',
      textMuted: '#7e8896',
      patternTint: 'rgba(148,163,184,0.055)',
      glowTint: 'rgba(148,163,184,0.05)',
    },
    light: {
      label: 'DRAFTING VELLUM',
      bgMain: '#f3f5f8',
      bgCard: '#ffffff',
      bgInput: '#eaeef4',
      border: '#d5dce6',
      textMain: '#0f172a',
      textMuted: '#64748b',
      patternTint: 'rgba(15,23,42,0.05)',
      glowTint: 'rgba(100,116,139,0.05)',
    },
  },
  {
    id: 'e-ink-paperwhite',
    code: 'THM-03',
    name: 'E-INK PAPERWHITE',
    pairLabel: 'E-READER ONYX ⇄ MATTE E-PAPER',
    description: 'Ultra-low glare electrophoretic ink contrast designed for zero eye fatigue.',
    pattern: 'horizon',
    accentHex: '#d4d4d8',
    divisionCode: 'DIV-01',
    clearanceHintLv: 12,
    dark: {
      label: 'E-READER ONYX',
      bgMain: '#24292e',
      bgCard: '#2d323a',
      bgInput: '#1e2226',
      border: '#3f444f',
      textMain: '#e4e4e7',
      textMuted: '#82868f',
      patternTint: 'rgba(228,228,231,0.045)',
      glowTint: 'rgba(212,212,216,0.04)',
    },
    light: {
      label: 'MATTE E-PAPER',
      bgMain: '#f4f2ec',
      bgCard: '#faf9f5',
      bgInput: '#eae7df',
      border: '#d8d4c8',
      textMain: '#1c1b18',
      textMuted: '#6e6b63',
      patternTint: 'rgba(28,27,24,0.045)',
      glowTint: 'rgba(113,113,122,0.04)',
    },
  },
  {
    id: 'sumi-washi',
    code: 'THM-04',
    name: 'SUMI INK & WASHI',
    pairLabel: 'SUMI CHARCOAL ⇄ WARM WASHI PAPER',
    description: 'Organic warm charcoal paired with unbleached Japanese parchment.',
    pattern: 'dots',
    accentHex: '#d97706',
    divisionCode: 'DIV-01',
    clearanceHintLv: 32,
    dark: {
      label: 'SUMI CHARCOAL',
      bgMain: '#2b271f',
      bgCard: '#362f25',
      bgInput: '#242119',
      border: '#4b4235',
      textMain: '#f5f2eb',
      textMuted: '#8c8478',
      patternTint: 'rgba(245,242,235,0.06)',
      glowTint: 'rgba(217,119,6,0.05)',
    },
    light: {
      label: 'WARM WASHI',
      bgMain: '#f6f2e9',
      bgCard: '#fcfaf5',
      bgInput: '#efe9dc',
      border: '#dfd6c3',
      textMain: '#1f1c18',
      textMuted: '#787062',
      patternTint: 'rgba(31,28,24,0.065)',
      glowTint: 'rgba(217,119,6,0.05)',
    },
  },
  {
    id: 'espresso-crema',
    code: 'THM-05',
    name: 'ESPRESSO ROAST & CREMA',
    pairLabel: 'DARK ROAST BEAN ⇄ OAT MILK LATTE',
    description: 'Rich café-roast umber paired with velvety warm crema daylight.',
    pattern: 'diagonal',
    accentHex: '#b45309',
    divisionCode: 'DIV-01',
    clearanceHintLv: 72,
    dark: {
      label: 'DARK ROAST',
      bgMain: '#332114',
      bgCard: '#3f2b1b',
      bgInput: '#2b1a10',
      border: '#583b27',
      textMain: '#f7ede2',
      textMuted: '#947e6b',
      patternTint: 'rgba(217,119,6,0.055)',
      glowTint: 'rgba(180,83,9,0.07)',
    },
    light: {
      label: 'OAT MILK LATTE',
      bgMain: '#f8f3ec',
      bgCard: '#fffdfa',
      bgInput: '#efe7dc',
      border: '#ded1c1',
      textMain: '#261a11',
      textMuted: '#7a6552',
      patternTint: 'rgba(120,53,15,0.05)',
      glowTint: 'rgba(180,83,9,0.05)',
    },
  },
  {
    id: 'porsche-chalk',
    code: 'THM-06',
    name: 'TARMAC & CRAYON CHALK',
    pairLabel: 'RACING ASPHALT ⇄ CRAYON CHALK',
    description: 'Motorsport carbon-weave tarmac paired with precision German chalk grey.',
    pattern: 'crosshatch',
    accentHex: '#e11d48',
    divisionCode: 'DIV-01',
    clearanceHintLv: 152,
    dark: {
      label: 'RACING ASPHALT',
      bgMain: '#222530',
      bgCard: '#2a2f3e',
      bgInput: '#1b1f26',
      border: '#3d4555',
      textMain: '#f4f4f6',
      textMuted: '#858a96',
      patternTint: 'rgba(255,255,255,0.045)',
      glowTint: 'rgba(225,29,72,0.06)',
    },
    light: {
      label: 'CRAYON CHALK',
      bgMain: '#eceef2',
      bgCard: '#f8f9fb',
      bgInput: '#e1e4ea',
      border: '#cdd2dc',
      textMain: '#141619',
      textMuted: '#5f6573',
      patternTint: 'rgba(20,22,25,0.045)',
      glowTint: 'rgba(225,29,72,0.05)',
    },
  },

  // ==========================================
  // DIV-02 // CADET (LV.301–600 // 50H–150H per cycle) — 30 PAIRS
  // ==========================================
  {
    id: 'obsidian-blueprint',
    code: 'THM-07',
    name: 'ARCHITECTURAL BLUEPRINT',
    pairLabel: 'MIDNIGHT NAVY ⇄ CYANOTYPE PAPER',
    description: 'Dual-scale engineering crosshatch grid inspired by structural blueprints.',
    pattern: 'blueprint',
    accentHex: '#38bdf8',
    divisionCode: 'DIV-02',
    clearanceHintLv: 302,
    dark: {
      label: 'MIDNIGHT NAVY',
      bgMain: '#0c1d3c',
      bgCard: '#14284e',
      bgInput: '#0b1732',
      border: '#243f6f',
      textMain: '#e8f1ff',
      textMuted: '#6883ab',
      patternTint: 'rgba(56,189,248,0.065)',
      glowTint: 'rgba(56,189,248,0.08)',
    },
    light: {
      label: 'CYANOTYPE PAPER',
      bgMain: '#eef5fc',
      bgCard: '#ffffff',
      bgInput: '#e3eef9',
      border: '#c5d9f0',
      textMain: '#0c1e36',
      textMuted: '#526f94',
      patternTint: 'rgba(14,116,144,0.065)',
      glowTint: 'rgba(56,189,248,0.06)',
    },
  },
  {
    id: 'nordic-fjord',
    code: 'THM-08',
    name: 'NORDIC POLAR SLATE',
    pairLabel: 'POLAR NIGHT ⇄ GLACIER SNOWDRIFT',
    description: 'Low-glare Scandinavian slate engineered for marathon late-night sessions.',
    pattern: 'radial',
    accentHex: '#7dd3fc',
    divisionCode: 'DIV-02',
    clearanceHintLv: 370,
    dark: {
      label: 'POLAR NIGHT',
      bgMain: '#212f43',
      bgCard: '#2b3b54',
      bgInput: '#1c2739',
      border: '#3b4e6a',
      textMain: '#eceff4',
      textMuted: '#7b88a1',
      patternTint: 'rgba(136,192,208,0.05)',
      glowTint: 'rgba(125,211,252,0.08)',
    },
    light: {
      label: 'GLACIER SNOW',
      bgMain: '#ecf1f7',
      bgCard: '#f8fafc',
      bgInput: '#e2e9f2',
      border: '#cbd6e4',
      textMain: '#1e2633',
      textMuted: '#62728a',
      patternTint: 'rgba(30,38,51,0.045)',
      glowTint: 'rgba(56,189,248,0.07)',
    },
  },
  {
    id: 'cryo-arctic',
    code: 'THM-09',
    name: 'CRYOGENIC CYAN',
    pairLabel: 'CRYO CHAMBER ⇄ ICE CRYSTAL',
    description: 'Sub-zero superconducting cyan chamber with razor-sharp grid contrast.',
    pattern: 'grid',
    accentHex: '#06b6d4',
    divisionCode: 'DIV-02',
    clearanceHintLv: 440,
    dark: {
      label: 'CRYO CHAMBER',
      bgMain: '#082e3d',
      bgCard: '#0e3c4c',
      bgInput: '#072733',
      border: '#1a5369',
      textMain: '#ecfeff',
      textMuted: '#5b8c9c',
      patternTint: 'rgba(6,182,212,0.06)',
      glowTint: 'rgba(6,182,212,0.09)',
    },
    light: {
      label: 'ICE CRYSTAL',
      bgMain: '#edfafc',
      bgCard: '#ffffff',
      bgInput: '#dff5f8',
      border: '#bce4ec',
      textMain: '#08262e',
      textMuted: '#4d7c8a',
      patternTint: 'rgba(8,145,178,0.06)',
      glowTint: 'rgba(6,182,212,0.06)',
    },
  },
  {
    id: 'subzero-permafrost',
    code: 'THM-10',
    name: 'SUBZERO PERMAFROST',
    pairLabel: 'DEEP PERMAFROST ⇄ ARCTIC HOARFROST',
    description: 'Crystalline isometric ice lattice inspired by polar research stations.',
    pattern: 'isometric',
    accentHex: '#0284c7',
    divisionCode: 'DIV-02',
    clearanceHintLv: 520,
    dark: {
      label: 'DEEP PERMAFROST',
      bgMain: '#0a263e',
      bgCard: '#12324f',
      bgInput: '#071f35',
      border: '#1e4a71',
      textMain: '#e0f2fe',
      textMuted: '#6084a3',
      patternTint: 'rgba(2,132,199,0.065)',
      glowTint: 'rgba(56,189,248,0.08)',
    },
    light: {
      label: 'ARCTIC HOARFROST',
      bgMain: '#f0f8ff',
      bgCard: '#ffffff',
      bgInput: '#e1f0fc',
      border: '#bfdcf5',
      textMain: '#0a2238',
      textMuted: '#4f7394',
      patternTint: 'rgba(3,105,161,0.055)',
      glowTint: 'rgba(2,132,199,0.06)',
    },
  },
  {
    id: 'glacier-mint',
    code: 'THM-11',
    name: 'GLACIER MINT & FROST',
    pairLabel: 'GLACIAL CREVASSE ⇄ PEPPERMINT FROST',
    description: 'Cool aquamarine crevasse shadow paired with crisp peppermint frost.',
    pattern: 'vignette',
    accentHex: '#2dd4bf',
    divisionCode: 'DIV-02',
    clearanceHintLv: 600,
    dark: {
      label: 'GLACIAL CREVASSE',
      bgMain: '#093936',
      bgCard: '#104a45',
      bgInput: '#082f2c',
      border: '#1c635c',
      textMain: '#ccfbf1',
      textMuted: '#5c948e',
      patternTint: 'rgba(45,212,191,0.06)',
      glowTint: 'rgba(45,212,191,0.09)',
    },
    light: {
      label: 'PEPPERMINT FROST',
      bgMain: '#edfcf9',
      bgCard: '#ffffff',
      bgInput: '#def7f2',
      border: '#b8e8df',
      textMain: '#062925',
      textMuted: '#4a7d77',
      patternTint: 'rgba(13,148,136,0.055)',
      glowTint: 'rgba(45,212,191,0.06)',
    },
  },

  // ==========================================
  // DIV-03 // OPERATOR (LV.601–900 // 150H–250H per cycle) — 30 PAIRS
  // ==========================================
  {
    id: 'phosphor-terminal',
    code: 'THM-12',
    name: 'PHOSPHOR CRT MATRIX',
    pairLabel: 'P31 PHOSPHOR BLACK ⇄ MINT LEDGER',
    description: 'Classic green-phosphor mainframe terminal with subtle CRT scanline texture.',
    pattern: 'scanline',
    accentHex: '#22c55e',
    divisionCode: 'DIV-03',
    clearanceHintLv: 640,
    dark: {
      label: 'P31 PHOSPHOR',
      bgMain: '#0c3018',
      bgCard: '#143d22',
      bgInput: '#0a2913',
      border: '#1d5a33',
      textMain: '#dcfce7',
      textMuted: '#568f6a',
      patternTint: 'rgba(34,197,94,0.055)',
      glowTint: 'rgba(34,197,94,0.08)',
    },
    light: {
      label: 'MINT LEDGER',
      bgMain: '#eefaf2',
      bgCard: '#ffffff',
      bgInput: '#e1f4e8',
      border: '#bfe3cc',
      textMain: '#072412',
      textMuted: '#4b7a5c',
      patternTint: 'rgba(21,128,61,0.045)',
      glowTint: 'rgba(34,197,94,0.06)',
    },
  },
  {
    id: 'kyoto-matcha',
    code: 'THM-13',
    name: 'BOTANICAL MATCHA',
    pairLabel: 'DEEP MOSS PAVILION ⇄ MATCHA LINEN',
    description: 'Serene forest moss and organic green-tea linen for calm cognitive endurance.',
    pattern: 'dots',
    accentHex: '#84cc16',
    divisionCode: 'DIV-03',
    clearanceHintLv: 700,
    dark: {
      label: 'DEEP MOSS',
      bgMain: '#15311b',
      bgCard: '#1e3f26',
      bgInput: '#122915',
      border: '#2d5936',
      textMain: '#ecfccb',
      textMuted: '#6d8c73',
      patternTint: 'rgba(132,204,22,0.065)',
      glowTint: 'rgba(132,204,22,0.07)',
    },
    light: {
      label: 'MATCHA LINEN',
      bgMain: '#f2f7ef',
      bgCard: '#fcfefb',
      bgInput: '#e7f0e2',
      border: '#cadbc2',
      textMain: '#142416',
      textMuted: '#5b735e',
      patternTint: 'rgba(63,98,18,0.06)',
      glowTint: 'rgba(132,204,22,0.05)',
    },
  },
  {
    id: 'nordic-pine',
    code: 'THM-14',
    name: 'BOREAL PINE & BIRCH',
    pairLabel: 'CONIFER CANOPY ⇄ SILVER BIRCH BARK',
    description: 'Deep evergreen taiga timber paired with pale Scandinavian birch wood.',
    pattern: 'horizon',
    accentHex: '#16a34a',
    divisionCode: 'DIV-03',
    clearanceHintLv: 770,
    dark: {
      label: 'CONIFER CANOPY',
      bgMain: '#0f3320',
      bgCard: '#17412c',
      bgInput: '#0c2a1b',
      border: '#24583c',
      textMain: '#e6f7ed',
      textMuted: '#5e8770',
      patternTint: 'rgba(22,163,74,0.055)',
      glowTint: 'rgba(22,163,74,0.07)',
    },
    light: {
      label: 'SILVER BIRCH',
      bgMain: '#f3f6f2',
      bgCard: '#ffffff',
      bgInput: '#e7ede5',
      border: '#ccd8c9',
      textMain: '#112116',
      textMuted: '#576e5e',
      patternTint: 'rgba(21,128,61,0.05)',
      glowTint: 'rgba(22,163,74,0.05)',
    },
  },
  {
    id: 'cyber-lime-circuit',
    code: 'THM-15',
    name: 'BIO-REACTOR LIME CIRCUIT',
    pairLabel: 'ACID LOGIC BOARD ⇄ CLEANROOM CITRON',
    description: 'High-contrast vertical data-bus lines in bio-luminescent chartreuse.',
    pattern: 'circuit',
    accentHex: '#a3e635',
    divisionCode: 'DIV-03',
    clearanceHintLv: 840,
    dark: {
      label: 'ACID LOGIC BOARD',
      bgMain: '#1e360a',
      bgCard: '#29460f',
      bgInput: '#1a2e06',
      border: '#3d611a',
      textMain: '#f7fee7',
      textMuted: '#78915c',
      patternTint: 'rgba(163,230,53,0.06)',
      glowTint: 'rgba(163,230,53,0.08)',
    },
    light: {
      label: 'CLEANROOM CITRON',
      bgMain: '#f7fce8',
      bgCard: '#ffffff',
      bgInput: '#eef7d4',
      border: '#d5e6ad',
      textMain: '#1a2905',
      textMuted: '#637843',
      patternTint: 'rgba(101,163,13,0.055)',
      glowTint: 'rgba(163,230,53,0.06)',
    },
  },
  {
    id: 'emerald-vault',
    code: 'THM-16',
    name: 'JADE TELEMETRY VAULT',
    pairLabel: 'OBSIDIAN JADE ⇄ CELADON SILK',
    description: 'High-security emerald bullion vault with precision crosshatch telemetry lines.',
    pattern: 'blueprint',
    accentHex: '#10b981',
    divisionCode: 'DIV-03',
    clearanceHintLv: 900,
    dark: {
      label: 'OBSIDIAN JADE',
      bgMain: '#07392c',
      bgCard: '#0d4a3a',
      bgInput: '#063024',
      border: '#18624e',
      textMain: '#e6fffa',
      textMuted: '#568f80',
      patternTint: 'rgba(16,185,129,0.06)',
      glowTint: 'rgba(16,185,129,0.09)',
    },
    light: {
      label: 'CELADON SILK',
      bgMain: '#edf9f5',
      bgCard: '#ffffff',
      bgInput: '#dff2ec',
      border: '#bce0d5',
      textMain: '#06261e',
      textMuted: '#4c7d70',
      patternTint: 'rgba(5,150,105,0.055)',
      glowTint: 'rgba(16,185,129,0.06)',
    },
  },

  // ==========================================
  // DIV-04 // SPECIALIST (LV.901–1,200 // 250H–350H per cycle) — 30 PAIRS
  // ==========================================
  {
    id: 'abyssal-trench',
    code: 'THM-17',
    name: 'ABYSSAL OCEAN TRENCH',
    pairLabel: 'MARIANA ABYSS ⇄ COASTAL FOAM',
    description: 'Bathyscaphe deep-sea pressure hull paired with sunlit pelagic waters.',
    pattern: 'radial',
    accentHex: '#0ea5e9',
    divisionCode: 'DIV-04',
    clearanceHintLv: 960,
    dark: {
      label: 'MARIANA ABYSS',
      bgMain: '#061c3c',
      bgCard: '#0c2850',
      bgInput: '#051632',
      border: '#193c6f',
      textMain: '#e0f2fe',
      textMuted: '#5c7ba6',
      patternTint: 'rgba(14,165,233,0.05)',
      glowTint: 'rgba(14,165,233,0.09)',
    },
    light: {
      label: 'COASTAL FOAM',
      bgMain: '#f0f7ff',
      bgCard: '#ffffff',
      bgInput: '#e4f0fc',
      border: '#c4dbf5',
      textMain: '#081d36',
      textMuted: '#547399',
      patternTint: 'rgba(2,132,199,0.05)',
      glowTint: 'rgba(14,165,233,0.06)',
    },
  },
  {
    id: 'bioluminescent-reef',
    code: 'THM-18',
    name: 'BIOLUMINESCENT LAGOON',
    pairLabel: 'PELAGIC BIOLUME ⇄ ATOLL SHALLOWS',
    description: 'Glowing nocturnal plankton lagoon paired with tropical coral sand.',
    pattern: 'dots',
    accentHex: '#00d2d3',
    divisionCode: 'DIV-04',
    clearanceHintLv: 1020,
    dark: {
      label: 'PELAGIC BIOLUME',
      bgMain: '#033440',
      bgCard: '#0a4351',
      bgInput: '#022b35',
      border: '#145b6b',
      textMain: '#e0fafe',
      textMuted: '#568d99',
      patternTint: 'rgba(0,210,211,0.065)',
      glowTint: 'rgba(0,210,211,0.09)',
    },
    light: {
      label: 'ATOLL SHALLOWS',
      bgMain: '#ebfcff',
      bgCard: '#ffffff',
      bgInput: '#dcf6fa',
      border: '#b5e5ed',
      textMain: '#05272e',
      textMuted: '#497a85',
      patternTint: 'rgba(14,116,144,0.06)',
      glowTint: 'rgba(0,210,211,0.06)',
    },
  },
  {
    id: 'solarized-archive',
    code: 'THM-19',
    name: 'SOLARIZED LAB ARCHIVE',
    pairLabel: 'SOLARIZED TEAL ⇄ SOLARIZED CREAM',
    description: 'Scientifically balanced CIELAB contrast pair modeled on classic research consoles.',
    pattern: 'grid',
    accentHex: '#2aa198',
    divisionCode: 'DIV-04',
    clearanceHintLv: 1080,
    dark: {
      label: 'SOLARIZED TEAL',
      bgMain: '#033c4a',
      bgCard: '#064b5e',
      bgInput: '#03303e',
      border: '#135e74',
      textMain: '#e2f1f0',
      textMuted: '#658b8e',
      patternTint: 'rgba(42,161,152,0.065)',
      glowTint: 'rgba(42,161,152,0.08)',
    },
    light: {
      label: 'SOLARIZED CREAM',
      bgMain: '#fdf6e3',
      bgCard: '#fffbf0',
      bgInput: '#f5ecd4',
      border: '#e0d6be',
      textMain: '#073642',
      textMuted: '#657b83',
      patternTint: 'rgba(7,54,66,0.05)',
      glowTint: 'rgba(42,161,152,0.06)',
    },
  },
  {
    id: 'cerenkov-reactor',
    code: 'THM-20',
    name: 'CHERENKOV REACTOR CORE',
    pairLabel: 'CHERENKOV RADIATION ⇄ HEAVY WATER',
    description: '300-hour cycle milestone core glowing with ionized Cherenkov blue lattice.',
    pattern: 'isometric',
    accentHex: '#3b82f6',
    divisionCode: 'DIV-04',
    clearanceHintLv: 1150,
    dark: {
      label: 'CHERENKOV CORE',
      bgMain: '#041c4c',
      bgCard: '#0a2864',
      bgInput: '#03163c',
      border: '#1a3f8d',
      textMain: '#dbeafe',
      textMuted: '#6082bf',
      patternTint: 'rgba(59,130,246,0.07)',
      glowTint: 'rgba(59,130,246,0.11)',
    },
    light: {
      label: 'HEAVY WATER',
      bgMain: '#edf5ff',
      bgCard: '#ffffff',
      bgInput: '#e0edff',
      border: '#bfd7fa',
      textMain: '#0a1f44',
      textMuted: '#4f6d9e',
      patternTint: 'rgba(37,99,235,0.055)',
      glowTint: 'rgba(59,130,246,0.07)',
    },
  },
  {
    id: 'emerald-library',
    code: 'THM-21',
    name: 'OXFORD LIBRARY & BANKER LAMP',
    pairLabel: 'BRITISH RACING GREEN ⇄ OXFORD VELLUM',
    description: 'Classic scholar reading room green leather paired with warm archival vellum.',
    pattern: 'crosshatch',
    accentHex: '#059669',
    divisionCode: 'DIV-04',
    clearanceHintLv: 1200,
    dark: {
      label: 'BANKER LAMP GREEN',
      bgMain: '#0c3825',
      bgCard: '#154632',
      bgInput: '#092e1f',
      border: '#215f45',
      textMain: '#ecfdf5',
      textMuted: '#638f7c',
      patternTint: 'rgba(5,150,105,0.06)',
      glowTint: 'rgba(16,185,129,0.07)',
    },
    light: {
      label: 'OXFORD VELLUM',
      bgMain: '#f7f5ed',
      bgCard: '#fffefb',
      bgInput: '#eeeadd',
      border: '#dad3be',
      textMain: '#0d261b',
      textMuted: '#5b7367',
      patternTint: 'rgba(6,78,59,0.05)',
      glowTint: 'rgba(5,150,105,0.05)',
    },
  },

  // ==========================================
  // DIV-05 // VANGUARD (LV.1,201–1,500 // 350H–450H per cycle) — 30 PAIRS
  // ==========================================
  {
    id: 'cobalt-observatory',
    code: 'THM-22',
    name: 'COBALT OBSERVATORY',
    pairLabel: 'ASTROMETRY BLUE ⇄ ZENITH SKY',
    description: 'High-altitude telescope dome aesthetics with celestial coordinate lines.',
    pattern: 'blueprint',
    accentHex: '#6366f1',
    divisionCode: 'DIV-05',
    clearanceHintLv: 1260,
    dark: {
      label: 'ASTROMETRY BLUE',
      bgMain: '#0a1745',
      bgCard: '#13225a',
      bgInput: '#08123a',
      border: '#253983',
      textMain: '#e0e7ff',
      textMuted: '#6c7cb8',
      patternTint: 'rgba(99,102,241,0.065)',
      glowTint: 'rgba(99,102,241,0.09)',
    },
    light: {
      label: 'ZENITH SKY',
      bgMain: '#eff2ff',
      bgCard: '#ffffff',
      bgInput: '#e4e9fc',
      border: '#c7d1f5',
      textMain: '#111936',
      textMuted: '#5b6794',
      patternTint: 'rgba(79,70,229,0.055)',
      glowTint: 'rgba(99,102,241,0.06)',
    },
  },
  {
    id: 'tokyo-midnight',
    code: 'THM-23',
    name: 'TOKYO MIDNIGHT & MIST',
    pairLabel: 'SHIBUYA NEON RAIN ⇄ SHINJUKU DAWN',
    description: 'Metropolitan expressway midnight indigo paired with crisp urban morning mist.',
    pattern: 'circuit',
    accentHex: '#818cf8',
    divisionCode: 'DIV-05',
    clearanceHintLv: 1320,
    dark: {
      label: 'SHIBUYA RAIN',
      bgMain: '#131937',
      bgCard: '#1c254b',
      bgInput: '#0f152e',
      border: '#2e396d',
      textMain: '#e8edff',
      textMuted: '#737da8',
      patternTint: 'rgba(129,140,248,0.06)',
      glowTint: 'rgba(129,140,248,0.08)',
    },
    light: {
      label: 'SHINJUKU DAWN',
      bgMain: '#f1f3fa',
      bgCard: '#ffffff',
      bgInput: '#e6e9f5',
      border: '#ccd2e8',
      textMain: '#141829',
      textMuted: '#5e6685',
      patternTint: 'rgba(67,56,202,0.05)',
      glowTint: 'rgba(129,140,248,0.06)',
    },
  },
  {
    id: 'terminal-dracula',
    code: 'THM-24',
    name: 'NOCTURNE VAMPIRE IDE',
    pairLabel: 'TRANSYLVANIA SLATE ⇄ ALUCARD DAYLIGHT',
    description: 'Beloved dark-hackerspace purple-slate paired with crisp Alucard ivory.',
    pattern: 'scanline',
    accentHex: '#bd93f9',
    divisionCode: 'DIV-05',
    clearanceHintLv: 1380,
    dark: {
      label: 'NOCTURNE SLATE',
      bgMain: '#22243d',
      bgCard: '#2d3150',
      bgInput: '#1b1e32',
      border: '#42476d',
      textMain: '#f8f8f2',
      textMuted: '#7e84a3',
      patternTint: 'rgba(189,147,249,0.055)',
      glowTint: 'rgba(189,147,249,0.08)',
    },
    light: {
      label: 'ALUCARD IVORY',
      bgMain: '#f7f5fc',
      bgCard: '#ffffff',
      bgInput: '#ede8f7',
      border: '#d6cdeb',
      textMain: '#1f1c29',
      textMuted: '#6c6482',
      patternTint: 'rgba(109,40,217,0.045)',
      glowTint: 'rgba(189,147,249,0.06)',
    },
  },
  {
    id: 'ultraviolet-nebula',
    code: 'THM-25',
    name: 'ULTRAVIOLET NEBULA',
    pairLabel: 'COSMIC INDIGO ⇄ LAVENDER QUARTZ',
    description: 'Deep-space ultraviolet radiation shield paired with crystalline lavender.',
    pattern: 'radial',
    accentHex: '#8b5cf6',
    divisionCode: 'DIV-05',
    clearanceHintLv: 1440,
    dark: {
      label: 'COSMIC INDIGO',
      bgMain: '#180c3c',
      bgCard: '#21164e',
      bgInput: '#130a32',
      border: '#372772',
      textMain: '#f3e8ff',
      textMuted: '#7e6fa6',
      patternTint: 'rgba(139,92,246,0.06)',
      glowTint: 'rgba(139,92,246,0.1)',
    },
    light: {
      label: 'LAVENDER QUARTZ',
      bgMain: '#f5f2ff',
      bgCard: '#ffffff',
      bgInput: '#ebe5fc',
      border: '#d4c8f5',
      textMain: '#1c1236',
      textMuted: '#6d5e94',
      patternTint: 'rgba(124,58,237,0.05)',
      glowTint: 'rgba(139,92,246,0.06)',
    },
  },
  {
    id: 'quantum-violet',
    code: 'THM-26',
    name: 'QUANTUM VIOLET PRISM',
    pairLabel: 'PLANCK HORIZON ⇄ SPECTRAL PRISM',
    description: 'High-energy particle collider violet with isometric quantum lattice.',
    pattern: 'isometric',
    accentHex: '#7c3aed',
    divisionCode: 'DIV-05',
    clearanceHintLv: 1500,
    dark: {
      label: 'PLANCK HORIZON',
      bgMain: '#1b0943',
      bgCard: '#251159',
      bgInput: '#150636',
      border: '#3f2081',
      textMain: '#f5f0ff',
      textMuted: '#8571b5',
      patternTint: 'rgba(124,58,237,0.065)',
      glowTint: 'rgba(124,58,237,0.09)',
    },
    light: {
      label: 'SPECTRAL PRISM',
      bgMain: '#f4f0ff',
      bgCard: '#ffffff',
      bgInput: '#e9e0fc',
      border: '#d0c2f2',
      textMain: '#1a0d38',
      textMuted: '#695796',
      patternTint: 'rgba(109,40,217,0.055)',
      glowTint: 'rgba(124,58,237,0.06)',
    },
  },

  // ==========================================
  // DIV-06 // ARCHITECT (LV.1,501–1,800 // 450H–550H per cycle) — 30 PAIRS
  // ==========================================
  {
    id: 'cyberpunk-neon',
    code: 'THM-27',
    name: 'SYNTHWAVE NIGHT CITY',
    pairLabel: 'NEON VOID ⇄ HOLOGRAM PEARL',
    description: 'High-voltage magenta-violet cybernetic deck with fine horizontal scanlines.',
    pattern: 'scanline',
    accentHex: '#d946ef',
    divisionCode: 'DIV-06',
    clearanceHintLv: 1560,
    dark: {
      label: 'NEON VOID',
      bgMain: '#260941',
      bgCard: '#331053',
      bgInput: '#1f0735',
      border: '#501d7c',
      textMain: '#fae8ff',
      textMuted: '#966eb3',
      patternTint: 'rgba(217,70,239,0.06)',
      glowTint: 'rgba(217,70,239,0.1)',
    },
    light: {
      label: 'HOLOGRAM PEARL',
      bgMain: '#fbf2ff',
      bgCard: '#ffffff',
      bgInput: '#f5e4fc',
      border: '#e5c7f2',
      textMain: '#280d38',
      textMuted: '#7e5794',
      patternTint: 'rgba(192,38,211,0.045)',
      glowTint: 'rgba(217,70,239,0.06)',
    },
  },
  {
    id: 'bauhaus-archive',
    code: 'THM-28',
    name: 'BAUHAUS DESSAU STUDIO',
    pairLabel: 'WEIMAR IRONWORK ⇄ DESSAU PLASTER',
    description: 'Modernist architectural studio grid balancing warm plaster and structural iron.',
    pattern: 'grid',
    accentHex: '#e11d48',
    divisionCode: 'DIV-06',
    clearanceHintLv: 1620,
    dark: {
      label: 'WEIMAR IRONWORK',
      bgMain: '#23232f',
      bgCard: '#2c2c3d',
      bgInput: '#1c1c27',
      border: '#414157',
      textMain: '#f5f3ef',
      textMuted: '#8a8884',
      patternTint: 'rgba(245,243,239,0.055)',
      glowTint: 'rgba(225,29,72,0.06)',
    },
    light: {
      label: 'DESSAU PLASTER',
      bgMain: '#f6f4ee',
      bgCard: '#ffffff',
      bgInput: '#ece9e0',
      border: '#d6d2c4',
      textMain: '#17171a',
      textMuted: '#6b6963',
      patternTint: 'rgba(23,23,26,0.055)',
      glowTint: 'rgba(225,29,72,0.05)',
    },
  },
  {
    id: 'amethyst-citadel',
    code: 'THM-29',
    name: 'AMETHYST CITADEL',
    pairLabel: 'ROYAL PLUM DARK ⇄ ORCHID SILK',
    description: '500-hour cycle milestone crystalline amethyst fortress with crosshatch geometry.',
    pattern: 'crosshatch',
    accentHex: '#a855f7',
    divisionCode: 'DIV-06',
    clearanceHintLv: 1650,
    dark: {
      label: 'ROYAL PLUM',
      bgMain: '#28103b',
      bgCard: '#34194c',
      bgInput: '#200b32',
      border: '#4b276b',
      textMain: '#f5ecff',
      textMuted: '#8a70a1',
      patternTint: 'rgba(168,85,247,0.06)',
      glowTint: 'rgba(168,85,247,0.08)',
    },
    light: {
      label: 'ORCHID SILK',
      bgMain: '#f9f4ff',
      bgCard: '#ffffff',
      bgInput: '#f1e6fc',
      border: '#dcc9f0',
      textMain: '#231033',
      textMuted: '#74598c',
      patternTint: 'rgba(147,51,234,0.05)',
      glowTint: 'rgba(168,85,247,0.06)',
    },
  },
  {
    id: 'supernova-magenta',
    code: 'THM-30',
    name: 'SUPERNOVA PULSAR CORE',
    pairLabel: 'DEEP PULSAR ⇄ STARDUST ROSE',
    description: 'Deep-space magenta pulsar vignette paired with luminous stardust rose.',
    pattern: 'vignette',
    accentHex: '#c026d3',
    divisionCode: 'DIV-06',
    clearanceHintLv: 1720,
    dark: {
      label: 'DEEP PULSAR',
      bgMain: '#3c0b3c',
      bgCard: '#4d114d',
      bgInput: '#320732',
      border: '#681d68',
      textMain: '#fdf4ff',
      textMuted: '#9e6d9e',
      patternTint: 'rgba(192,38,211,0.06)',
      glowTint: 'rgba(192,38,211,0.09)',
    },
    light: {
      label: 'STARDUST ROSE',
      bgMain: '#fdf2fc',
      bgCard: '#ffffff',
      bgInput: '#f7e4f6',
      border: '#e8c5e6',
      textMain: '#2e0b2d',
      textMuted: '#825580',
      patternTint: 'rgba(162,28,175,0.05)',
      glowTint: 'rgba(192,38,211,0.06)',
    },
  },
  {
    id: 'monastic-limestone',
    code: 'THM-31',
    name: 'CLOISTER SLATE & LIMESTONE',
    pairLabel: 'MONASTIC SLATE ⇄ ABBEY LIMESTONE',
    description: 'Quiet architectural stone strata designed for Distraction-Zero contemplation.',
    pattern: 'horizon',
    accentHex: '#78716c',
    divisionCode: 'DIV-06',
    clearanceHintLv: 1800,
    dark: {
      label: 'MONASTIC SLATE',
      bgMain: '#282d23',
      bgCard: '#30382b',
      bgInput: '#20251c',
      border: '#424b3c',
      textMain: '#f2f2ee',
      textMuted: '#848780',
      patternTint: 'rgba(242,242,238,0.05)',
      glowTint: 'rgba(168,162,158,0.05)',
    },
    light: {
      label: 'ABBEY LIMESTONE',
      bgMain: '#f3f2ed',
      bgCard: '#fbfaf7',
      bgInput: '#e8e6de',
      border: '#d4d1c5',
      textMain: '#1c1d1a',
      textMuted: '#6c6e68',
      patternTint: 'rgba(28,29,26,0.05)',
      glowTint: 'rgba(120,113,108,0.05)',
    },
  },

  // ==========================================
  // DIV-07 // OVERSEER (LV.1,801–2,100 // 550H–650H per cycle) — 24 PAIRS
  // ==========================================
  {
    id: 'sakura-quartz',
    code: 'THM-32',
    name: 'SAKURA ROSE QUARTZ',
    pairLabel: 'NIGHT BLOSSOM ⇄ SAKURA PETAL',
    description: 'Midnight cherry-bark espresso contrasted against delicate rose-quartz daylight.',
    pattern: 'dots',
    accentHex: '#ec4899',
    divisionCode: 'DIV-07',
    clearanceHintLv: 1870,
    dark: {
      label: 'NIGHT BLOSSOM',
      bgMain: '#371126',
      bgCard: '#471732',
      bgInput: '#2d0d1d',
      border: '#612344',
      textMain: '#fce7f3',
      textMuted: '#9c6b84',
      patternTint: 'rgba(236,72,153,0.065)',
      glowTint: 'rgba(236,72,153,0.08)',
    },
    light: {
      label: 'SAKURA PETAL',
      bgMain: '#fff2f7',
      bgCard: '#ffffff',
      bgInput: '#fce4ee',
      border: '#f0c7d8',
      textMain: '#300d1e',
      textMuted: '#8c5670',
      patternTint: 'rgba(219,39,119,0.055)',
      glowTint: 'rgba(236,72,153,0.06)',
    },
  },
  {
    id: 'obsidian-rose-gold',
    code: 'THM-33',
    name: 'ANODIZED ROSE GOLD',
    pairLabel: 'OBSIDIAN BLUSH ⇄ ROSE CHAMPAGNE',
    description: 'Brushed luxury rose-gold alloy with fine 45-degree diagonal machining lines.',
    pattern: 'diagonal',
    accentHex: '#fb7185',
    divisionCode: 'DIV-07',
    clearanceHintLv: 1950,
    dark: {
      label: 'OBSIDIAN BLUSH',
      bgMain: '#361722',
      bgCard: '#451f2d',
      bgInput: '#2c111a',
      border: '#5e2f3f',
      textMain: '#ffe4e6',
      textMuted: '#9e717f',
      patternTint: 'rgba(251,113,133,0.06)',
      glowTint: 'rgba(251,113,133,0.08)',
    },
    light: {
      label: 'ROSE CHAMPAGNE',
      bgMain: '#fdf4f5',
      bgCard: '#ffffff',
      bgInput: '#f7e6e8',
      border: '#e8cbd0',
      textMain: '#2e1017',
      textMuted: '#855b64',
      patternTint: 'rgba(225,29,72,0.05)',
      glowTint: 'rgba(251,113,133,0.06)',
    },
  },
  {
    id: 'bordeaux-velvet',
    code: 'THM-34',
    name: 'BORDEAUX GRAND CRU',
    pairLabel: 'VINTAGE CELLAR ⇄ BLANC DE BLANCS',
    description: 'Deep burgundy wine cellar vignette paired with crisp champagne chalk.',
    pattern: 'vignette',
    accentHex: '#e11d48',
    divisionCode: 'DIV-07',
    clearanceHintLv: 2030,
    dark: {
      label: 'VINTAGE CELLAR',
      bgMain: '#3d0a18',
      bgCard: '#4e0f22',
      bgInput: '#330714',
      border: '#691b33',
      textMain: '#ffe4e8',
      textMuted: '#9e6776',
      patternTint: 'rgba(225,29,72,0.06)',
      glowTint: 'rgba(225,29,72,0.09)',
    },
    light: {
      label: 'BLANC DE BLANCS',
      bgMain: '#fcf3f5',
      bgCard: '#ffffff',
      bgInput: '#f5e4e8',
      border: '#e6c8cf',
      textMain: '#2e0b14',
      textMuted: '#825661',
      patternTint: 'rgba(190,18,60,0.05)',
      glowTint: 'rgba(225,29,72,0.06)',
    },
  },
  {
    id: 'crimson-command',
    code: 'THM-35',
    name: 'TACTICAL CRIMSON OPS',
    pairLabel: 'BORDEAUX STEALTH ⇄ CARMINE IVORY',
    description: 'Submarine red-light night-vision deck paired with high-contrast ivory command.',
    pattern: 'scanline',
    accentHex: '#f43f5e',
    divisionCode: 'DIV-07',
    clearanceHintLv: 2100,
    dark: {
      label: 'BORDEAUX STEALTH',
      bgMain: '#3b0d15',
      bgCard: '#4b1220',
      bgInput: '#300a10',
      border: '#681e2f',
      textMain: '#ffe4e6',
      textMuted: '#a16873',
      patternTint: 'rgba(244,63,94,0.055)',
      glowTint: 'rgba(244,63,94,0.09)',
    },
    light: {
      label: 'CARMINE IVORY',
      bgMain: '#fff1f3',
      bgCard: '#ffffff',
      bgInput: '#fde2e6',
      border: '#f2c4cb',
      textMain: '#330a12',
      textMuted: '#8f5560',
      patternTint: 'rgba(225,29,72,0.045)',
      glowTint: 'rgba(244,63,94,0.06)',
    },
  },

  // ==========================================
  // DIV-08 // SENTINEL (LV.2,101–2,400 // 650H–750H per cycle) — 24 PAIRS
  // ==========================================
  {
    id: 'volcanic-basalt',
    code: 'THM-36',
    name: 'VOLCANIC MAGMA BASALT',
    pairLabel: 'MAGMA BASALT ⇄ PUMICE TRAVERTINE',
    description: '700-hour cycle milestone tectonic basalt infused with ember warmth and travertine.',
    pattern: 'grid',
    accentHex: '#f97316',
    divisionCode: 'DIV-08',
    clearanceHintLv: 2150,
    dark: {
      label: 'MAGMA BASALT',
      bgMain: '#38170e',
      bgCard: '#471e14',
      bgInput: '#2d120b',
      border: '#622e20',
      textMain: '#ffedd5',
      textMuted: '#9c7365',
      patternTint: 'rgba(249,115,22,0.06)',
      glowTint: 'rgba(249,115,22,0.08)',
    },
    light: {
      label: 'PUMICE STONE',
      bgMain: '#fcf4f0',
      bgCard: '#ffffff',
      bgInput: '#f7e8e1',
      border: '#ebd1c5',
      textMain: '#2e1309',
      textMuted: '#876052',
      patternTint: 'rgba(234,88,12,0.05)',
      glowTint: 'rgba(249,115,22,0.06)',
    },
  },
  {
    id: 'terracotta-adobe',
    code: 'THM-37',
    name: 'TERRACOTTA & CANYON ADOBE',
    pairLabel: 'KILN EARTHENWARE ⇄ SONORAN ADOBE',
    description: 'Sun-fired desert canyon terracotta with diagonal architectural shading.',
    pattern: 'diagonal',
    accentHex: '#ea580c',
    divisionCode: 'DIV-08',
    clearanceHintLv: 2230,
    dark: {
      label: 'KILN EARTHENWARE',
      bgMain: '#391a0f',
      bgCard: '#492315',
      bgInput: '#30140a',
      border: '#653221',
      textMain: '#ffedd5',
      textMuted: '#9e7668',
      patternTint: 'rgba(234,88,12,0.06)',
      glowTint: 'rgba(234,88,12,0.08)',
    },
    light: {
      label: 'SONORAN ADOBE',
      bgMain: '#fbf3ed',
      bgCard: '#ffffff',
      bgInput: '#f5e6dc',
      border: '#e6cec0',
      textMain: '#2b140a',
      textMuted: '#826052',
      patternTint: 'rgba(194,65,12,0.05)',
      glowTint: 'rgba(234,88,12,0.06)',
    },
  },
  {
    id: 'amber-cathode',
    code: 'THM-38',
    name: 'AMBER OSCILLOSCOPE',
    pairLabel: 'CATHODE UMBER ⇄ AMBER PARCHMENT',
    description: '1980s plasma amber CRT telemetry monitor with zero blue-light eye strain.',
    pattern: 'scanline',
    accentHex: '#f59e0b',
    divisionCode: 'DIV-08',
    clearanceHintLv: 2320,
    dark: {
      label: 'CATHODE UMBER',
      bgMain: '#392309',
      bgCard: '#472e0f',
      bgInput: '#301d06',
      border: '#624117',
      textMain: '#fef3c7',
      textMuted: '#9c8159',
      patternTint: 'rgba(245,158,11,0.055)',
      glowTint: 'rgba(245,158,11,0.09)',
    },
    light: {
      label: 'AMBER PARCHMENT',
      bgMain: '#fdf7ec',
      bgCard: '#ffffff',
      bgInput: '#f7ecda',
      border: '#e8d5b7',
      textMain: '#2b1c06',
      textMuted: '#826c4b',
      patternTint: 'rgba(217,119,6,0.045)',
      glowTint: 'rgba(245,158,11,0.06)',
    },
  },
  {
    id: 'copper-foundry',
    code: 'THM-39',
    name: 'ANODIZED COPPER FOUNDRY',
    pairLabel: 'SMELTED BRONZE ⇄ BRUSHED COPPER',
    description: 'Industrial metallurgical bronze chassis with precision blueprint hairlines.',
    pattern: 'blueprint',
    accentHex: '#ea580c',
    divisionCode: 'DIV-08',
    clearanceHintLv: 2400,
    dark: {
      label: 'SMELTED BRONZE',
      bgMain: '#351d10',
      bgCard: '#422516',
      bgInput: '#2c160b',
      border: '#5c3521',
      textMain: '#fae8dc',
      textMuted: '#947463',
      patternTint: 'rgba(234,88,12,0.06)',
      glowTint: 'rgba(234,88,12,0.08)',
    },
    light: {
      label: 'BRUSHED COPPER',
      bgMain: '#fbf5f0',
      bgCard: '#ffffff',
      bgInput: '#f4e9e1',
      border: '#e3d0c3',
      textMain: '#29160c',
      textMuted: '#7d6254',
      patternTint: 'rgba(194,65,12,0.05)',
      glowTint: 'rgba(234,88,12,0.06)',
    },
  },

  // ==========================================
  // DIV-09 // SOVEREIGN (LV.2,401–2,700 // 750H–875H per cycle) — 24 PAIRS
  // ==========================================
  {
    id: 'tungsten-filament',
    code: 'THM-40',
    name: 'TUNGSTEN VACUUM BULB',
    pairLabel: 'EDISON FILAMENT ⇄ WARM INCANDESCENT',
    description: '2700K warm vacuum-tube glow engineered for late-evening study serenity.',
    pattern: 'radial',
    accentHex: '#fbbf24',
    divisionCode: 'DIV-09',
    clearanceHintLv: 2470,
    dark: {
      label: 'EDISON FILAMENT',
      bgMain: '#372b10',
      bgCard: '#453615',
      bgInput: '#2d230b',
      border: '#604c1f',
      textMain: '#fef9c3',
      textMuted: '#998a63',
      patternTint: 'rgba(251,191,36,0.06)',
      glowTint: 'rgba(251,191,36,0.09)',
    },
    light: {
      label: 'INCANDESCENT',
      bgMain: '#fdf9ef',
      bgCard: '#ffffff',
      bgInput: '#f7efdc',
      border: '#e6d8b8',
      textMain: '#261e08',
      textMuted: '#7d704e',
      patternTint: 'rgba(217,119,6,0.05)',
      glowTint: 'rgba(251,191,36,0.07)',
    },
  },
  {
    id: 'vintage-sepia',
    code: 'THM-41',
    name: 'SILVER GELATIN & SEPIA',
    pairLabel: 'DARKROOM BROMIDE ⇄ ARCHIVAL ALBUMEN',
    description: '19th-century photographic darkroom sepia toned with horizontal strata.',
    pattern: 'horizon',
    accentHex: '#ca8a04',
    divisionCode: 'DIV-09',
    clearanceHintLv: 2540,
    dark: {
      label: 'DARKROOM BROMIDE',
      bgMain: '#31281b',
      bgCard: '#3e3323',
      bgInput: '#272016',
      border: '#554633',
      textMain: '#f5efe6',
      textMuted: '#8f8474',
      patternTint: 'rgba(202,138,4,0.055)',
      glowTint: 'rgba(202,138,4,0.07)',
    },
    light: {
      label: 'ARCHIVAL ALBUMEN',
      bgMain: '#f6f2e8',
      bgCard: '#fcfaf5',
      bgInput: '#ede6d8',
      border: '#dbd1be',
      textMain: '#211c15',
      textMuted: '#756c5e',
      patternTint: 'rgba(133,77,14,0.05)',
      glowTint: 'rgba(202,138,4,0.05)',
    },
  },
  {
    id: 'sandstone-dune',
    code: 'THM-42',
    name: 'SAHARA DUNE LIMESTONE',
    pairLabel: 'DESERT NIGHT ⇄ SAHARA LIMESTONE',
    description: '800-hour cycle Quarter-Lakh desert twilight paired with sun-baked limestone.',
    pattern: 'dots',
    accentHex: '#eab308',
    divisionCode: 'DIV-09',
    clearanceHintLv: 2600,
    dark: {
      label: 'DESERT NIGHT',
      bgMain: '#322916',
      bgCard: '#3f321d',
      bgInput: '#282113',
      border: '#56462c',
      textMain: '#fef9eb',
      textMuted: '#91846c',
      patternTint: 'rgba(234,179,8,0.065)',
      glowTint: 'rgba(234,179,8,0.07)',
    },
    light: {
      label: 'SAHARA LIMESTONE',
      bgMain: '#f9f5eb',
      bgCard: '#fffdf9',
      bgInput: '#f1ead9',
      border: '#dfd5be',
      textMain: '#241d10',
      textMuted: '#786d58',
      patternTint: 'rgba(161,98,7,0.055)',
      glowTint: 'rgba(234,179,8,0.05)',
    },
  },
  {
    id: 'royal-aurum',
    code: 'THM-43',
    name: 'IMPERIAL AURUM GOLD',
    pairLabel: 'ONYX BULLION ⇄ CHAMPAGNE SILK',
    description: 'Sovereign-grade black onyx and 24-karat champagne gold isometric lattice.',
    pattern: 'isometric',
    accentHex: '#facc15',
    divisionCode: 'DIV-09',
    clearanceHintLv: 2700,
    dark: {
      label: 'ONYX BULLION',
      bgMain: '#352b0d',
      bgCard: '#413313',
      bgInput: '#2b220a',
      border: '#5d4d1d',
      textMain: '#fefce8',
      textMuted: '#998b60',
      patternTint: 'rgba(250,204,21,0.06)',
      glowTint: 'rgba(250,204,21,0.09)',
    },
    light: {
      label: 'CHAMPAGNE SILK',
      bgMain: '#fefcf2',
      bgCard: '#ffffff',
      bgInput: '#f8f3de',
      border: '#e8dec0',
      textMain: '#261f07',
      textMuted: '#7d724d',
      patternTint: 'rgba(202,138,4,0.05)',
      glowTint: 'rgba(250,204,21,0.07)',
    },
  },

  // ==========================================
  // DIV-10 // MONOLITH (LV.2,701–3,000 // 875H–1,000H per cycle) — 30 PAIRS
  // ==========================================
  {
    id: 'stealth-kevlar',
    code: 'THM-44',
    name: 'STEALTH KEVLAR & CERAMIC',
    pairLabel: 'BALLISTIC WEAVE ⇄ SINTERED CERAMIC',
    description: 'Aerospace carbon-kevlar diamond crosshatch paired with white armor ceramic.',
    pattern: 'crosshatch',
    accentHex: '#cbd5e1',
    divisionCode: 'DIV-10',
    clearanceHintLv: 2760,
    dark: {
      label: 'BALLISTIC WEAVE',
      bgMain: '#1d212a',
      bgCard: '#262c39',
      bgInput: '#161b23',
      border: '#374050',
      textMain: '#f8fafc',
      textMuted: '#7e8694',
      patternTint: 'rgba(203,213,225,0.055)',
      glowTint: 'rgba(148,163,184,0.06)',
    },
    light: {
      label: 'SINTERED CERAMIC',
      bgMain: '#f4f5f7',
      bgCard: '#ffffff',
      bgInput: '#eaecf0',
      border: '#d2d6de',
      textMain: '#0f1217',
      textMuted: '#5f6775',
      patternTint: 'rgba(15,18,23,0.05)',
      glowTint: 'rgba(100,116,139,0.05)',
    },
  },
  {
    id: 'nasa-apollo',
    code: 'THM-45',
    name: 'ORBITAL MISSION CONTROL',
    pairLabel: 'HOUSTON CONSOLE ⇄ SATURN V WHITE',
    description: 'Deep-space telemetry flight deck with vertical bus lines and lunar module white.',
    pattern: 'circuit',
    accentHex: '#38bdf8',
    divisionCode: 'DIV-10',
    clearanceHintLv: 2820,
    dark: {
      label: 'HOUSTON CONSOLE',
      bgMain: '#112238',
      bgCard: '#1b2f4c',
      bgInput: '#0d1a2d',
      border: '#29466e',
      textMain: '#f0f7ff',
      textMuted: '#6f87a6',
      patternTint: 'rgba(56,189,248,0.06)',
      glowTint: 'rgba(56,189,248,0.08)',
    },
    light: {
      label: 'SATURN V WHITE',
      bgMain: '#f2f6fa',
      bgCard: '#ffffff',
      bgInput: '#e6edf5',
      border: '#c8d6e6',
      textMain: '#0c1624',
      textMuted: '#566b85',
      patternTint: 'rgba(14,116,144,0.05)',
      glowTint: 'rgba(56,189,248,0.06)',
    },
  },
  {
    id: 'titanium-aerospace',
    code: 'THM-46',
    name: 'TITANIUM ORBITAL HULL',
    pairLabel: 'GUNMETAL ALLOY ⇄ AEROSPACE SILVER',
    description: 'Orbital station Grade-5 titanium cladding with laser-etched telemetry grid.',
    pattern: 'blueprint',
    accentHex: '#94a3b8',
    divisionCode: 'DIV-10',
    clearanceHintLv: 2880,
    dark: {
      label: 'GUNMETAL ALLOY',
      bgMain: '#1c2533',
      bgCard: '#253243',
      bgInput: '#151c29',
      border: '#374760',
      textMain: '#f1f5f9',
      textMuted: '#7c8aa1',
      patternTint: 'rgba(148,163,184,0.06)',
      glowTint: 'rgba(148,163,184,0.08)',
    },
    light: {
      label: 'AEROSPACE SILVER',
      bgMain: '#eff2f6',
      bgCard: '#ffffff',
      bgInput: '#e4e9f0',
      border: '#cbd3df',
      textMain: '#11161f',
      textMuted: '#5e6b7d',
      patternTint: 'rgba(51,65,85,0.055)',
      glowTint: 'rgba(148,163,184,0.06)',
    },
  },
  {
    id: 'astral-platinum',
    code: 'THM-47',
    name: 'ASTRAL IRIDIUM & PLATINUM',
    pairLabel: 'IRIDIUM VOID ⇄ PLATINUM MIRROR',
    description: 'Penultimate Monolith iridium hull with high-precision isometric starlight lattice.',
    pattern: 'isometric',
    accentHex: '#e2e8f0',
    divisionCode: 'DIV-10',
    clearanceHintLv: 2940,
    dark: {
      label: 'IRIDIUM VOID',
      bgMain: '#131b2d',
      bgCard: '#1d2742',
      bgInput: '#101425',
      border: '#313e63',
      textMain: '#f8fafc',
      textMuted: '#7c89a6',
      patternTint: 'rgba(226,232,240,0.06)',
      glowTint: 'rgba(226,232,240,0.08)',
    },
    light: {
      label: 'PLATINUM MIRROR',
      bgMain: '#f7f9fc',
      bgCard: '#ffffff',
      bgInput: '#edf1f7',
      border: '#d5dde8',
      textMain: '#0b0f19',
      textMuted: '#5a6578',
      patternTint: 'rgba(30,41,59,0.05)',
      glowTint: 'rgba(148,163,184,0.06)',
    },
  },
  {
    id: 'omega-monolith',
    code: 'THM-48',
    name: 'OMEGA SINGULARITY // 1,000H',
    pairLabel: 'EVENT HORIZON ⇄ ASTRAL DIAMOND',
    description: 'Apex 1,000-hour (LV.3000) cycle-complete singularity surface combining cosmic void and diamond daylight.',
    pattern: 'blueprint',
    accentHex: '#f43f5e',
    divisionCode: 'DIV-10',
    clearanceHintLv: 3000,
    dark: {
      label: 'EVENT HORIZON',
      bgMain: '#160e2d',
      bgCard: '#21163c',
      bgInput: '#130828',
      border: '#3c2765',
      textMain: '#faf5ff',
      textMuted: '#8776a8',
      patternTint: 'rgba(244,63,94,0.065)',
      glowTint: 'rgba(244,63,94,0.1)',
    },
    light: {
      label: 'ASTRAL DIAMOND',
      bgMain: '#f8f6ff',
      bgCard: '#ffffff',
      bgInput: '#f0ecfc',
      border: '#d9d0f2',
      textMain: '#160d29',
      textMuted: '#685987',
      patternTint: 'rgba(225,29,72,0.05)',
      glowTint: 'rgba(244,63,94,0.06)',
    },
  },

  // ==========================================
  // 240 GENERATED EXPANSION PAIRS (see EXTRA_THEME_SPECS above)
  // ==========================================
  ...buildExtraThemePairs(),
];

// Rebalances every pair's clearanceHintLv with even spacing across its own
// division's level range (CLEARANCE_DIVISIONS[].minLevel..maxLevel), rather
// than the ad-hoc numbers assigned while authoring each batch. With 288
// pairs spread over 3,000 ranks a new Surface Theme now unlocks roughly
// every ~10 ranks (and interleaved with the 60 Noise profiles below, a
// visual or audio reward lands every few dozen ranks instead of droughts
// stretching across whole divisions). 'monolith' stays pinned to LV.1 since
// it's the universal unlock-gate fallback theme used for locked selections.
function rebalanceThemeClearanceLevels(pairs: SurfaceThemePair[]): SurfaceThemePair[] {
  const groups = new Map<string, SurfaceThemePair[]>();
  pairs.forEach((pair) => {
    const list = groups.get(pair.divisionCode) ?? [];
    list.push(pair);
    groups.set(pair.divisionCode, list);
  });

  const result: SurfaceThemePair[] = [];
  CLEARANCE_DIVISIONS.forEach((div) => {
    const list = groups.get(div.code) ?? [];
    const span = div.maxLevel - div.minLevel;
    list.forEach((pair, i) => {
      const level =
        pair.id === 'monolith'
          ? 1
          : div.minLevel + Math.round(((i + 1) / (list.length + 1)) * span);
      result.push({ ...pair, clearanceHintLv: level });
    });
  });
  return result;
}

// ==========================================
// PRESTIGE-EXCLUSIVE THEMES — gated by Ascension count, not clearanceHintLv.
// Not part of the normal 288 (no divisionCode in CLEARANCE_DIVISIONS, so
// they're excluded from rebalanceThemeClearanceLevels() and appended below).
// ==========================================
const PRESTIGE_THEME_PAIRS: SurfaceThemePair[] = (() => {
  const aurumPal = buildSignaturePalette(45, 25);
  const argentumPal = buildSignaturePalette(210, -20);

  return [
    {
      id: 'prestige-aurum',
      code: 'PRS-01',
      name: 'AURUM PRESTIGE // CYCLE I',
      pairLabel: 'GILDED VAULT NIGHT ⇄ CHAMPAGNE AURUM',
      description: 'Radiant sunburst gold reserved for players who have completed at least one full Ascension cycle.',
      pattern: 'aurum',
      accentHex: hslToHex(45, 85, 55),
      divisionCode: 'PRESTIGE',
      clearanceHintLv: 3000,
      requiredAscensions: 1,
      dark: { label: 'GILDED VAULT NIGHT', ...aurumPal.dark },
      light: { label: 'CHAMPAGNE AURUM', ...aurumPal.light },
    },
    {
      id: 'prestige-argentum',
      code: 'PRS-02',
      name: 'ARGENTUM PRESTIGE // CYCLE II',
      pairLabel: 'ENGRAVED PLATINUM NIGHT ⇄ BRUSHED ARGENTUM',
      description: 'An engraved platinum diamond-lattice finish unlocked after two full Ascension cycles.',
      pattern: 'argentum',
      accentHex: hslToHex(210, 15, 70),
      divisionCode: 'PRESTIGE',
      clearanceHintLv: 3000,
      requiredAscensions: 2,
      dark: { label: 'ENGRAVED PLATINUM', ...argentumPal.dark },
      light: { label: 'BRUSHED ARGENTUM', ...argentumPal.light },
    },
    {
      id: 'prestige-prism',
      code: 'PRS-03',
      name: 'CHROMATIC PRESTIGE // CYCLE III',
      pairLabel: 'HOLOGRAPHIC VOID ⇄ IRIDESCENT WHITE',
      description: 'A holographic rainbow sweep — the only surface in the archive not built from a single accent hue. Three cycles earned.',
      pattern: 'prism',
      accentHex: '#f4f4f5',
      divisionCode: 'PRESTIGE',
      clearanceHintLv: 3000,
      requiredAscensions: 3,
      dark: {
        label: 'HOLOGRAPHIC VOID',
        bgMain: '#060608',
        bgCard: '#0d0d10',
        bgInput: '#040405',
        border: '#2a2a32',
        textMain: '#fafafa',
        textMuted: '#9a9aa5',
        patternTint: 'rgba(255,255,255,0.05)',
        glowTint: 'rgba(255,255,255,0.08)',
      },
      light: {
        label: 'IRIDESCENT WHITE',
        bgMain: '#fcfcfd',
        bgCard: '#ffffff',
        bgInput: '#f1f1f4',
        border: '#e2e2ea',
        textMain: '#0a0a0c',
        textMuted: '#6b6b76',
        patternTint: 'rgba(10,10,12,0.04)',
        glowTint: 'rgba(0,0,0,0.04)',
      },
    },
    {
      id: 'prestige-omega',
      code: 'PRS-04',
      name: 'OMEGA PRESTIGE // INFINITE CYCLE',
      pairLabel: 'ABSOLUTE ZERO ⇄ ABSOLUTE WHITE',
      description: 'Pure maximal-contrast black and white, reserved for players who have Ascended five or more times.',
      pattern: 'starburst',
      accentHex: '#ffffff',
      divisionCode: 'PRESTIGE',
      clearanceHintLv: 3000,
      requiredAscensions: 5,
      dark: {
        label: 'ABSOLUTE ZERO',
        bgMain: '#000000',
        bgCard: '#0a0a0a',
        bgInput: '#000000',
        border: '#3f3f3f',
        textMain: '#ffffff',
        textMuted: '#8a8a8a',
        patternTint: 'rgba(255,255,255,0.08)',
        glowTint: 'rgba(255,255,255,0.1)',
      },
      light: {
        label: 'ABSOLUTE WHITE',
        bgMain: '#ffffff',
        bgCard: '#ffffff',
        bgInput: '#f4f4f4',
        border: '#1a1a1a',
        textMain: '#000000',
        textMuted: '#5a5a5a',
        patternTint: 'rgba(0,0,0,0.07)',
        glowTint: 'rgba(0,0,0,0.05)',
      },
    },
  ];
})();

// eslint-disable-next-line react-refresh/only-export-components
export const SURFACE_THEME_PAIRS: SurfaceThemePair[] = [
  ...rebalanceThemeClearanceLevels(RAW_SURFACE_THEME_PAIRS),
  ...PRESTIGE_THEME_PAIRS,
];

// Fast lookup of theme reward by Clearance Level
const THEME_REWARD_BY_LEVEL: Record<number, SurfaceThemePair> = {};
SURFACE_THEME_PAIRS.forEach((pair) => {
  THEME_REWARD_BY_LEVEL[pair.clearanceHintLv] = pair;
});

// eslint-disable-next-line react-refresh/only-export-components
export function getSurfaceThemeById(id: string): SurfaceThemePair {
  return SURFACE_THEME_PAIRS.find((t) => t.id === id) || SURFACE_THEME_PAIRS[0];
}

// eslint-disable-next-line react-refresh/only-export-components
export function getSurfaceBackgroundStyle(
  pair: SurfaceThemePair,
  isDark: boolean
): React.CSSProperties {
  const pal = isDark ? pair.dark : pair.light;
  const glow = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%)`;
  const images: string[] = [];
  const sizes: string[] = [];
  const push = (image: string, size = '100% 100%') => {
    images.push(image);
    sizes.push(size);
  };

  if (isDark) {
    // Rich dark-mode identity layer: a genuine dual-tone accent gradient
    // wash, not a flat near-black fill — "dark mode" means a deep-colored
    // base (navy/plum/forest/etc.), not literal black, so every surface
    // should visibly read as a gradient rather than a tinted charcoal flat.
    // Both anchors stay at the TOP of the box: this style is applied to the
    // page's root wrapper, whose box height grows with scrollable content,
    // so a bottom-anchored gradient would sit far off-screen.
    const richCornerStrong = mixHex(pal.bgMain, pair.accentHex, 0.34);
    const richCornerSoft = mixHex(pal.bgMain, pair.accentHex, 0.14);
    push(`radial-gradient(circle at 100% 0%, ${richCornerStrong}, transparent 68%)`);
    push(`radial-gradient(circle at 0% 0%, ${richCornerSoft}, transparent 72%)`);
  }

  switch (pair.pattern) {
    case 'grid':
      push(glow);
      push(`linear-gradient(to right, ${pal.patternTint} 1px, transparent 1px)`, '28px 28px');
      push(`linear-gradient(to bottom, ${pal.patternTint} 1px, transparent 1px)`, '28px 28px');
      break;
    case 'dots':
      push(glow);
      push(`radial-gradient(${pal.patternTint} 1.25px, transparent 1.25px)`, '20px 20px');
      break;
    case 'blueprint':
      push(glow);
      push(`linear-gradient(to right, ${pal.patternTint} 1px, transparent 1px)`, '48px 48px');
      push(`linear-gradient(to bottom, ${pal.patternTint} 1px, transparent 1px)`, '48px 48px');
      break;
    case 'scanline':
      push(glow);
      push(
        `repeating-linear-gradient(to bottom, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 4px)`,
        'auto'
      );
      break;
    case 'radial':
      push(`radial-gradient(circle at 18% 12%, ${pal.glowTint}, transparent 55%)`);
      push(`radial-gradient(circle at 82% 85%, ${pal.glowTint}, transparent 55%)`);
      break;
    case 'diagonal':
      push(glow);
      push(
        `repeating-linear-gradient(135deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 14px)`,
        'auto'
      );
      break;
    case 'crosshatch':
      push(glow);
      push(`repeating-linear-gradient(45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 22px)`, 'auto');
      push(`repeating-linear-gradient(-45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 22px)`, 'auto');
      break;
    case 'isometric':
      push(glow);
      push(`repeating-linear-gradient(60deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 26px)`, 'auto');
      push(`repeating-linear-gradient(-60deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 26px)`, 'auto');
      break;
    case 'horizon':
      push(glow);
      push(`linear-gradient(to bottom, ${pal.patternTint} 1px, transparent 1px)`, '100% 24px');
      break;
    case 'circuit':
      push(glow);
      push(`linear-gradient(to right, ${pal.patternTint} 1px, transparent 1px)`, '32px 100%');
      break;
    case 'vignette':
      push(`radial-gradient(circle at 50% 15%, ${pal.glowTint}, transparent 65%)`);
      push(`radial-gradient(${pal.patternTint} 1px, transparent 1px)`, '30px 30px');
      break;
    case 'hexgrid':
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 72%)`);
      push(`repeating-linear-gradient(0deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 32px)`, 'auto');
      push(`repeating-linear-gradient(60deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 32px)`, 'auto');
      push(`repeating-linear-gradient(120deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 32px)`, 'auto');
      break;
    case 'triangulate':
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 72%)`);
      push(`repeating-linear-gradient(30deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 40px)`, 'auto');
      push(`repeating-linear-gradient(150deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 40px)`, 'auto');
      push(`repeating-linear-gradient(90deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 40px)`, 'auto');
      break;
    case 'polygon':
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 72%)`);
      push(`repeating-linear-gradient(0deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 46px)`, 'auto');
      push(`repeating-linear-gradient(72deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 46px)`, 'auto');
      push(`repeating-linear-gradient(144deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 46px)`, 'auto');
      break;
    case 'chevron':
      push(glow);
      push(`repeating-linear-gradient(45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 13px)`, 'auto');
      push(`repeating-linear-gradient(-45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 13px)`, 'auto');
      break;
    case 'weave':
      push(glow);
      push(`repeating-linear-gradient(0deg, ${pal.patternTint} 0px, ${pal.patternTint} 5px, transparent 5px, transparent 13px)`, 'auto');
      push(`repeating-linear-gradient(90deg, ${pal.patternTint} 0px, ${pal.patternTint} 5px, transparent 5px, transparent 13px)`, 'auto');
      break;
    case 'rings':
      push(`repeating-radial-gradient(circle at 50% 35%, transparent 0px, transparent 17px, ${pal.patternTint} 17px, ${pal.patternTint} 18px)`, 'auto');
      push(`radial-gradient(circle at 50% 35%, ${pal.glowTint}, transparent 60%)`);
      break;
    case 'topographic':
      push(`repeating-radial-gradient(circle at 28% 22%, transparent 0px, transparent 20px, ${pal.patternTint} 20px, ${pal.patternTint} 21px)`, 'auto');
      push(`repeating-radial-gradient(circle at 76% 82%, transparent 0px, transparent 26px, ${pal.patternTint} 26px, ${pal.patternTint} 27px)`, 'auto');
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 72%)`);
      break;
    case 'starburst':
      push(`repeating-conic-gradient(from 0deg at 50% 0%, ${pal.patternTint} 0deg 1deg, transparent 1deg 15deg)`, 'auto');
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 75%)`);
      break;
    case 'constellation':
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 72%)`);
      [
        [15, 20],
        [68, 14],
        [38, 52],
        [84, 68],
        [24, 86],
        [58, 92],
      ].forEach(([x, y]) => push(`radial-gradient(circle at ${x}% ${y}%, ${pal.patternTint} 1.4px, transparent 2px)`, '150px 150px'));
      break;
    case 'waveform':
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 72%)`);
      [
        [8, 50],
        [28, 15],
        [50, 85],
        [72, 15],
        [92, 85],
      ].forEach(([x, y]) => push(`radial-gradient(circle at ${x}% ${y}%, ${pal.patternTint} 2px, transparent 3px)`, '110px 54px'));
      break;
    case 'sigil':
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 75%)`);
      push(
        `radial-gradient(circle at 50% 50%, transparent 0px, transparent 21px, ${pal.patternTint} 21px, ${pal.patternTint} 22px, transparent 22px)`,
        '96px 96px'
      );
      push(`linear-gradient(0deg, transparent 48%, ${pal.patternTint} 48%, ${pal.patternTint} 52%, transparent 52%)`, '96px 96px');
      push(`linear-gradient(90deg, transparent 48%, ${pal.patternTint} 48%, ${pal.patternTint} 52%, transparent 52%)`, '96px 96px');
      break;
    case 'honeycomb':
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 72%)`);
      push(`radial-gradient(${pal.patternTint} 1.6px, transparent 1.6px)`, '26px 26px');
      push(`radial-gradient(${pal.patternTint} 1.1px, transparent 1.1px)`, '38px 38px');
      break;
    case 'aurum':
      // Prestige Cycle I: a radiant gold sunburst — dramatically brighter
      // than any normal-rank theme, reserved for repeat-Ascension players.
      push(`repeating-conic-gradient(from 0deg at 50% 50%, ${pal.patternTint} 0deg 2deg, transparent 2deg 18deg)`, 'auto');
      push(`radial-gradient(circle at 50% 50%, ${pal.glowTint}, transparent 72%)`);
      break;
    case 'argentum':
      // Prestige Cycle II: an engraved platinum diamond-lattice finish.
      push(glow);
      push(`repeating-linear-gradient(45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 10px)`, 'auto');
      push(`repeating-linear-gradient(-45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 10px)`, 'auto');
      break;
    case 'prism':
      // Prestige Cycle III+: a static holographic rainbow sweep — the only
      // theme in the catalog that isn't built from a single accent hue.
      push(
        'conic-gradient(from 0deg at 50% 50%, rgba(244,63,94,0.12), rgba(249,115,22,0.12), rgba(234,179,8,0.12), rgba(34,197,94,0.12), rgba(6,182,212,0.12), rgba(99,102,241,0.12), rgba(168,85,247,0.12), rgba(244,63,94,0.12))'
      );
      push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%)`);
      break;
    case 'none':
    default:
      push(glow);
      break;
  }

  // Signature dark-mode geometric watermark: a faint white isometric mesh
  // layered on top of every dark surface, so black mode always has its own
  // identity regardless of which per-theme `pattern` is assigned above.
  if (isDark) {
    push(
      'repeating-linear-gradient(55deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 64px)',
      'auto'
    );
    push(
      'repeating-linear-gradient(-55deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 64px)',
      'auto'
    );
  }

  return {
    backgroundColor: pal.bgMain,
    color: pal.textMain,
    backgroundImage: images.join(', '),
    backgroundSize: sizes.join(', '),
  };
}

interface SurfaceThemeSelectorPanelProps {
  activeThemeId: string;
  onSelectThemeId: (id: string) => void;
  isDark: boolean;
  onTogglePolarity: () => void;
  userClearanceLevel: number;
  userTotalAscensions: number;
  userTotalHours: number;
  borderCol: string;
  textMuted: string;
}

export const SurfaceThemeSelectorPanel: React.FC<SurfaceThemeSelectorPanelProps> = ({
  activeThemeId,
  onSelectThemeId,
  isDark,
  onTogglePolarity,
  userClearanceLevel,
  userTotalAscensions,
  userTotalHours,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  const [unlockFilter, setUnlockFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedDiv, setSelectedDiv] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const activePair = useMemo(() => getSurfaceThemeById(activeThemeId), [activeThemeId]);

  const checkUnlocked = useCallback(
    (item: SurfaceThemePair) =>
      isThemeUnlocked(item, { rewardUnlockLevel: userClearanceLevel, totalAscensions: userTotalAscensions }),
    [userClearanceLevel, userTotalAscensions]
  );

  const unlockedCount = useMemo(
    () => SURFACE_THEME_PAIRS.filter((pair) => checkUnlocked(pair)).length,
    [checkUnlocked]
  );

  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SURFACE_THEME_PAIRS.filter((item) => {
      const isUnlocked = checkUnlocked(item);
      if (unlockFilter === 'unlocked' && !isUnlocked) return false;
      if (unlockFilter === 'locked' && isUnlocked) return false;
      if (selectedDiv !== 'ALL' && item.divisionCode !== selectedDiv) return false;
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.pairLabel.toLowerCase().includes(q) ||
          item.pattern.toLowerCase().includes(q) ||
          item.divisionCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unlockFilter, selectedDiv, searchQuery, checkUnlocked]);

  const getReqHoursForLevel = (lv: number): number => {
    const found = CLEARANCE_LEVELS[lv - 1];
    return found ? found.requiredHours : 0;
  };

  return (
    <div className="space-y-3.5 font-mono text-xs flex flex-col h-full">
      {/* Active Theme Pair Dual-Polarity Preview Card */}
      <div className={`p-3.5 border ${borderCol} space-y-2.5 shrink-0`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-950"
                style={{ backgroundColor: activePair.accentHex }}
              >
                {activePair.code}
              </span>
              <span className="font-bold text-xs tracking-wider">{activePair.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 border ${borderCol} text-emerald-400`}>
                {tf(t.pairsUnlocked, { a: unlockedCount, b: SURFACE_THEME_PAIRS.length })}
              </span>
            </div>
            <div className={`text-[10px] mt-0.5 ${textMuted}`}>{activePair.pairLabel}</div>
          </div>

          {/* Instant Polarity Switcher to preview both sides of the active pair */}
          <button
            type="button"
            onClick={onTogglePolarity}
            className={`px-3 py-1.5 border ${borderCol} hover:border-emerald-500/60 flex items-center space-x-1.5 text-[10px] font-bold cursor-pointer transition-colors`}
          >
            {isDark ? (
              <>
                <Moon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.activeDarkSwitch}</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.activeLightSwitch}</span>
              </>
            )}
          </button>
        </div>

        {/* Side-by-Side Dual-Polarity Live Specimen */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* Dark Side Specimen */}
          <div
            className="p-2 border transition-all"
            style={{
              ...getSurfaceBackgroundStyle(activePair, true),
              borderColor: isDark ? activePair.accentHex : activePair.dark.border,
            }}
          >
            <div className="flex items-center justify-between text-[9px] mb-1">
              <span className="font-bold tracking-wider" style={{ color: activePair.dark.textMain }}>
                ● DARK // {activePair.dark.label}
              </span>
              {isDark && (
                <span
                  className="px-1 py-0.2 text-[8px] font-bold text-zinc-950"
                  style={{ backgroundColor: activePair.accentHex }}
                >
                  LIVE
                </span>
              )}
            </div>
            <div
              className="p-1.5 border text-[9px] flex items-center justify-between"
              style={{
                backgroundColor: activePair.dark.bgCard,
                borderColor: activePair.dark.border,
                color: activePair.dark.textMain,
              }}
            >
              <span>{t.moduleCard}</span>
              <span style={{ color: activePair.dark.textMuted }}>{activePair.dark.bgMain}</span>
            </div>
          </div>

          {/* Light Side Specimen */}
          <div
            className="p-2 border transition-all"
            style={{
              ...getSurfaceBackgroundStyle(activePair, false),
              borderColor: !isDark ? activePair.accentHex : activePair.light.border,
            }}
          >
            <div className="flex items-center justify-between text-[9px] mb-1">
              <span className="font-bold tracking-wider" style={{ color: activePair.light.textMain }}>
                ○ LIGHT // {activePair.light.label}
              </span>
              {!isDark && (
                <span
                  className="px-1 py-0.2 text-[8px] font-bold text-zinc-950"
                  style={{ backgroundColor: activePair.accentHex }}
                >
                  LIVE
                </span>
              )}
            </div>
            <div
              className="p-1.5 border text-[9px] flex items-center justify-between"
              style={{
                backgroundColor: activePair.light.bgCard,
                borderColor: activePair.light.border,
                color: activePair.light.textMain,
              }}
            >
              <span>{t.moduleCard}</span>
              <span style={{ color: activePair.light.textMuted }}>{activePair.light.bgMain}</span>
            </div>
          </div>
        </div>

        {lockedNotice && (
          <div className="p-2 border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{lockedNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setLockedNotice(null)}
              className="text-[9px] underline ml-2 cursor-pointer"
            >
              {t.dismiss}
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-2 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className={`flex items-center flex-1 border ${borderCol} px-2.5 py-1`}>
            <Search className={`w-3.5 h-3.5 mr-2 ${textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tf(t.searchThemes, { n: SURFACE_THEME_PAIRS.length })}
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
          <div className={`flex border ${borderCol} text-[10px]`}>
            {(
              [
                ['all', `${t.all} (${SURFACE_THEME_PAIRS.length})`],
                ['unlocked', `${t.filterUnlocked} (${unlockedCount})`],
                ['locked', `${t.filterLocked} (${SURFACE_THEME_PAIRS.length - unlockedCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setUnlockFilter(key)}
                className={`px-2.5 py-1 uppercase cursor-pointer transition-colors ${
                  unlockFilter === key
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : `${textMuted} hover:opacity-100`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Division Filter Strip — horizontally scrollable on mobile so 11
            buttons never spend multiple lines of the limited viewport height. */}
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 -mx-0.5 px-0.5 sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:pb-0">
          {['ALL', 'DIV-01', 'DIV-02', 'DIV-03', 'DIV-04', 'DIV-05', 'DIV-06', 'DIV-07', 'DIV-08', 'DIV-09', 'DIV-10'].map(
            (divCode) => (
              <button
                key={divCode}
                type="button"
                onClick={() => setSelectedDiv(divCode)}
                className={`shrink-0 px-2 py-0.5 text-[9px] border cursor-pointer ${
                  selectedDiv === divCode
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                    : `${borderCol} ${textMuted}`
                }`}
              >
                {divCode === 'ALL' ? t.all : divCode}
              </button>
            )
          )}
        </div>
      </div>

      {/* Scrollable Theme Pairs Grid — generous min-height on mobile */}
      <div className="flex-1 min-h-80 sm:min-h-55 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-start">
        {filteredThemes.map((item) => {
          const isSelected = item.id === activeThemeId;
          const isUnlocked = checkUnlocked(item);
          const isPrestigeExclusive = Boolean(item.requiredAscensions && item.requiredAscensions > 0);
          const reqHours = getReqHoursForLevel(item.clearanceHintLv);
          const hoursRemaining = Math.max(0, +(reqHours - userTotalHours).toFixed(1));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (isUnlocked) {
                  setLockedNotice(null);
                  onSelectThemeId(item.id);
                } else if (isPrestigeExclusive) {
                  setLockedNotice(
                    tf(t.themePrestigeNotice, {
                      code: item.code,
                      name: item.name,
                      n: item.requiredAscensions ?? 0,
                      have: userTotalAscensions,
                    })
                  );
                } else {
                  setLockedNotice(
                    tf(t.noiseLockedNotice, {
                      code: item.code,
                      name: item.name,
                      lv: String(item.clearanceHintLv).padStart(4, '0'),
                      req: reqHours,
                      rem: hoursRemaining,
                    })
                  );
                }
              }}
              className={`p-3 border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-500/5'
                  : isUnlocked
                  ? `${borderCol} hover:border-zinc-500`
                  : `${borderCol} opacity-65 hover:opacity-90`
              }`}
            >
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span
                      className="px-1.5 py-0.2 text-[9px] font-bold text-zinc-950 shrink-0"
                      style={{ backgroundColor: item.accentHex }}
                    >
                      {item.code}
                    </span>
                    <span className="font-bold text-[11px] truncate">{item.name}</span>
                  </div>
                  {isSelected ? (
                    <span className="px-1.5 py-0.2 bg-emerald-500 text-zinc-950 text-[9px] font-bold uppercase shrink-0">
                      {t.equipped}
                    </span>
                  ) : isUnlocked ? (
                    <span className="px-1.5 py-0.2 border border-emerald-500/40 text-emerald-400 text-[9px] font-bold uppercase shrink-0">
                      {t.filterUnlocked}
                    </span>
                  ) : isPrestigeExclusive ? (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 border border-amber-400/60 text-amber-300 flex items-center space-x-1 shrink-0`}
                      title={tf(t.prestigeRequires, { n: item.requiredAscensions ?? 0 })}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>✦ ×{item.requiredAscensions}</span>
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 border ${borderCol} text-amber-400 flex items-center space-x-1 shrink-0`}
                      title={tf(t.requiresClearance, { lv: item.clearanceHintLv, h: reqHours })}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>
                        LV.{String(item.clearanceHintLv).padStart(4, '0')} ({reqHours}H)
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[9px]">
                  <span className={`truncate ${textMuted}`}>{item.pairLabel}</span>
                  <span className={`uppercase px-1 border ${borderCol} ${textMuted} shrink-0 ml-1`}>
                    {item.pattern}
                  </span>
                </div>
                <p className={`text-[10px] font-sans leading-snug line-clamp-2 ${textMuted}`}>
                  {item.description}
                </p>
              </div>

              {/* Dual Swatch Strip (Left = Dark Mode Surface, Right = Light Mode Surface) */}
              <div className="w-full grid grid-cols-2 border border-zinc-700/50 overflow-hidden h-7 shrink-0">
                <div
                  className="px-2 flex items-center justify-between text-[9px] font-bold"
                  style={{
                    backgroundColor: item.dark.bgMain,
                    color: item.dark.textMain,
                  }}
                >
                  <span className="truncate">DARK</span>
                  <span
                    className="w-3 h-3 rounded-sm border"
                    style={{
                      backgroundColor: item.dark.bgCard,
                      borderColor: item.dark.border,
                    }}
                  />
                </div>
                <div
                  className="px-2 flex items-center justify-between text-[9px] font-bold border-l border-zinc-700/40"
                  style={{
                    backgroundColor: item.light.bgMain,
                    color: item.light.textMain,
                  }}
                >
                  <span className="truncate">LIGHT</span>
                  <span
                    className="w-3 h-3 rounded-sm border"
                    style={{
                      backgroundColor: item.light.bgCard,
                      borderColor: item.light.border,
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { Award };



