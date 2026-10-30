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
  Sparkles,
} from 'lucide-react';
import type { Category, StudyLog } from './App';
import { useI18n, tf } from './i18n';
import { drawStatusCard, loadSurfaceArt, STATUS_CARD_SIZE } from './statusCard';
import { CHROMA_THEME_PAIRS, CLASSIC_THEME_PAIRS, COMPLEMENT_THEME_PAIRS, resolveSurfaceThemeId } from './surfaceThemes';
import { PRESTIGE_THEME_PAIRS } from './surfacePrestige';
import { buildHintRows, buildNamespaceRows, type PaletteCommandItem, type TerminalContext, type TerminalIO } from './terminalCommands';

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
  isNamedMilestone?: boolean; // one of the exact-hour SPECIAL_HOUR_OVERRIDES titles
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
        isNamedMilestone: Boolean(override),
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
export const MAX_SLEEP_TIMER_MIN = 12 * 60;

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
  // "noise vol 40" / "noise sleep 30m" drive the master fader and the
  // sleep timer the same way the popover's own controls do.
  useEffect(() => {
    const handleExternalSoundCmd = (e: Event) => {
      const custom = e as CustomEvent<{
        action: 'play' | 'stop' | 'toggle' | 'volume' | 'sleep';
        mode?: NoiseMode;
        value?: number;
      }>;
      if (!custom.detail) return;
      if (custom.detail.action === 'volume' && typeof custom.detail.value === 'number') {
        const vol = Math.max(0, Math.min(1, custom.detail.value));
        setMasterVolume(vol);
        masterVolumeRef.current = vol;
        applyMasterGain(vol, sleepEndsAtRef.current);
      } else if (custom.detail.action === 'sleep' && typeof custom.detail.value === 'number') {
        startSleepTimer(custom.detail.value);
      } else if (custom.detail.action === 'stop') {
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
  }, [
    applyMasterGain,
    buildLayerGraph,
    layers.length,
    startOutput,
    startSleepTimer,
    stopAllLayers,
    stopLayerNodes,
    userClearanceLevel,
  ]);

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
  categories: Category[];
  logs: StudyLog[];
  /** The user's active Surface Theme; the card is painted over it. */
  surfacePair: SurfaceThemePair;
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
  categories,
  logs,
  surfacePair,
  isDark,
  borderCol,
  bgCard,
  textMuted,
}) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const surfaceArt = await loadSurfaceArt(surfacePair, isDark);
    // Web fonts used by the card may still be loading on first open.
    await document.fonts?.ready;

    const draw = (art: HTMLImageElement | null) => drawStatusCard(canvas, {
      username,
      avatarColor,
      avatarImg,
      clearance,
      totalHours,
      weeklyHours,
      monthlyHours,
      currentStreak,
      longestStreak,
      categories,
      logs,
      surface: surfacePair,
      isDark,
      surfaceArt: art,
      showCategories: showCategoriesOnCard,
    });
    draw(surfaceArt);
    // Some browsers (older Safari) taint a canvas once an SVG is drawn on
    // it, which would break Download / Copy. Fall back to the palette-only
    // backdrop rather than export nothing.
    if (surfaceArt) {
      try {
        canvas.toDataURL('image/png');
      } catch {
        draw(null);
      }
    }
  }, [
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
    logs,
    categories,
    surfacePair,
    isDark,
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
    link.download = `typbox-status-${username || 'operator'}-${dateStr}.png`;
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

  const surfaceLabel = `${surfacePair.name} · ${(isDark ? surfacePair.dark : surfacePair.light).label}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-xl border ${borderCol} ${bgCard} p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 font-mono`}
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

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] uppercase shrink-0 ${textMuted}`}>{t.cardTheme}</span>
            <span
              className={`inline-block w-3 h-3 border ${borderCol} shrink-0`}
              style={{ background: surfacePair.accentHex }}
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold truncate">{surfaceLabel}</span>
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

        {/* Fixed-height stage: the canvas is scaled down to fit inside it,
            contain-style; the exported PNG is always full resolution. */}
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
            ({STATUS_CARD_SIZE}×{STATUS_CARD_SIZE}px).
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
  /** Resolves true once the log is saved; false if it failed (the caller reports why). */
  onQuickLog: (categoryId: string | number, minutes: number) => Promise<boolean>;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSetInputMode: (mode: 'manual' | 'timer') => void;
  onSetAnalyticsMode: (mode: AnalyticsHorizonMode) => void;
  onToggleMatrixColorMode: () => void;
  onOpenStatusCard: () => void;
  onOpenClearance: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onToggleTheme: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  /** Catalogs + apply callbacks behind the "font / noise / face / …" namespaces. */
  terminal: TerminalContext;
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

  // Match hours + minutes e.g. "1h30m", "1h 30m", "1.5h", "90m". A unit
  // must end the token (or run into the minutes), so "log 30 history" is
  // 30 minutes of HIST, not 30 hours of "istory". Longer unit spellings come
  // first so "1.5hours" is not read as "1.5h" + category "ours".
  const hmRegex =
    /(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)(?=\d|\s|$)\s*(?:(\d+)\s*(?:minutes|minute|mins|min|m)?(?=\s|$))?/i;
  const mOnlyRegex = /(\d+)\s*(?:minutes|minute|mins|min|m)(?=\s|$)/i;
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
    // A typed-but-unknown category must not silently log to the default one.
    if (!matchedCat) return null;
  } else {
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
  onOpenStatusCard,
  onOpenClearance,
  onOpenSettings,
  onOpenAuth,
  onToggleTheme,
  onExportJSON,
  onExportCSV,
  terminal,
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  // 'warn' is a refused terminal command (locked item, bad argument): the
  // palette stays open so the line can be corrected.
  const [bannerTone, setBannerTone] = useState<'ok' | 'warn'>('ok');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Bumped by terminal autocomplete: a clicked hint row took focus from the input.
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (focusRequest > 0) inputRef.current?.focus();
  }, [focusRequest]);
  // Blocks a second command (double Enter / key repeat) while a log commit
  // is in flight or its success banner is showing.
  const [committing, setCommitting] = useState(false);

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    setSelectedIndex(0);
    // A refusal line belongs to the command that was just tried.
    if (bannerTone === 'warn') setStatusBanner(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setQuery('');
      setSelectedIndex(0);
      setStatusBanner(null);
      setBannerTone('ok');
      setCommitting(false);
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

  const commitQuickLog = useCallback(
    async (cat: Category, minutes: number) => {
      setCommitting(true);
      const ok = await onQuickLog(cat.id, minutes);
      if (!ok) {
        setCommitting(false);
        return;
      }
      setStatusBanner(tf(t.pcCommitted, { min: minutes, code: cat.code, name: cat.name }));
      setTimeout(() => {
        onClose();
      }, 450);
    },
    [onQuickLog, onClose, t]
  );

  // How terminal rows talk back: print a line, then close (or stay open on a
  // refusal), or autocomplete the input.
  const terminalIO = useMemo<TerminalIO>(
    () => ({
      done: (message) => {
        setCommitting(true);
        setBannerTone('ok');
        setStatusBanner(message);
        setTimeout(() => {
          onClose();
        }, 450);
      },
      fail: (message) => {
        setBannerTone('warn');
        setStatusBanner(message);
      },
      complete: (text) => {
        setQuery(text);
        setSelectedIndex(0);
        setStatusBanner(null);
        setFocusRequest((n) => n + 1);
      },
      close: onClose,
    }),
    [onClose]
  );

  const parsedQuickLog = useMemo(() => {
    if (!isAuthenticated) return null;
    return parseQuickLogQuery(query, categories, selectedCatId);
  }, [isAuthenticated, query, categories, selectedCatId]);

  const commands = useMemo<PaletteCommandItem[]>(() => {
    // "font …", "noise …", "goto …": the namespace's own list replaces everything else.
    const namespaceRows = buildNamespaceRows(query, terminal, terminalIO, t);
    if (namespaceRows) return namespaceRows;

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
        action: () => commitQuickLog(category, minutes),
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
            action: () => commitQuickLog(cat, mins),
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

    // Terminal namespaces: one hint row each; running it types "font " etc.
    items.push(...buildHintRows(terminal, terminalIO, t));

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
    const instantId = parsedQuickLog ? `${parsedQuickLog.category.id}-${parsedQuickLog.minutes}` : null;
    return items.filter((item) => {
      if (item.id.startsWith('instant-log-')) return true;
      // The preset identical to the parsed command would just repeat it.
      if (instantId && item.id === `preset-log-${instantId}`) return false;
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
    commitQuickLog,
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
    onExportJSON,
    onExportCSV,
    terminal,
    terminalIO,
    t,
  ]);

  // Keep the keyboard selection visible while arrowing through a long list.
  useEffect(() => {
    if (!isOpen) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-cmd-index="${selectedIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (commands.length > 0 ? (prev + 1) % commands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        commands.length > 0 ? (prev - 1 + commands.length) % commands.length : 0
      );
    } else if (e.key === 'Tab' && commands[selectedIndex]?.complete) {
      e.preventDefault();
      updateQuery(commands[selectedIndex].complete as string);
    } else if (e.key === 'Enter' && commands[selectedIndex]) {
      e.preventDefault();
      if (!committing) commands[selectedIndex].action();
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
                updateQuery('help');
                inputRef.current?.focus();
              }}
              className={`px-1.5 py-0.5 border ${borderCol} hover:border-emerald-500/50 cursor-pointer`}
            >
              help
            </button>
          </div>
          <span className={`hidden sm:inline ${textMuted}`}>{t.pcNavigate}</span>
        </div>

        {/* Status Confirmation Banner */}
        {statusBanner && (
          <div
            role="status"
            className={`px-4 py-2.5 text-xs font-bold flex items-center space-x-2 ${
              bannerTone === 'warn' ? 'bg-amber-500 text-zinc-950' : 'bg-emerald-500 text-zinc-950'
            }`}
          >
            {bannerTone === 'warn' ? <Lock className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
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
                  data-cmd-index={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    if (!committing) cmd.action();
                  }}
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
                  <div className={`min-w-0 flex-1 space-y-0.5 ${cmd.dim ? 'opacity-50' : ''}`}>
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
// 6. DUAL-POLARITY SURFACE THEME PAIRS (900 PAIRS + 12 PRESTIGE)
//    300 CLASSIC + 300 CHROMA (saturation contrast) + 300 COMPLEMENT (hue
//    contrast), see surfaceThemes.ts; PRESTIGE art themes in surfacePrestige.ts.
// ==========================================

// Ambient motion layer a theme may carry (SurfaceFx.tsx). Purely
// decorative and switchable off; it never changes the static palette.
// Only the PRESTIGE themes use it.
export type SurfaceFx = 'dust' | 'stars' | 'embers' | 'glitch' | 'pulse' | 'matrix' | 'aurora' | 'sweep';

export interface SurfacePolarityPalette {
  label: string;
  bgMain: string;
  bgCard: string;
  bgInput: string;
  border: string;
  textMain: string;
  textMuted: string;
  glowTint: string;
}

export type SurfaceSeries = 'classic' | 'chroma' | 'complement' | 'prestige';

export interface SurfaceThemePair {
  id: string;
  code: string;
  name: string;
  pairLabel: string;
  description: string;
  accentHex: string;
  divisionCode: string;
  clearanceHintLv: number;
  dark: SurfacePolarityPalette;
  light: SurfacePolarityPalette;
  // Prestige-exclusive themes ignore clearanceHintLv entirely and gate on
  // Ascension count instead — a reward track that only grows for players
  // who keep cycling past LV.3000, independent of in-cycle rank.
  requiredAscensions?: number;
  series: SurfaceSeries;
  /** PRESTIGE backdrop: a CSS `url(...)` per polarity (surfacePrestige.ts). */
  art?: { dark: string; light: string };
  fx?: SurfaceFx;
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

// Weaves the three series together inside each division (CLASSIC, CHROMA,
// COMPLEMENT, CLASSIC, ...) so every few ranks unlock a different kind of
// theme instead of 30 classics in a row. Each series keeps its catalog
// order within a division, which puts its most distinct picks first.
function interleaveSeries(...series: SurfaceThemePair[][]): SurfaceThemePair[] {
  const result: SurfaceThemePair[] = [];
  CLEARANCE_DIVISIONS.forEach((div) => {
    const lists = series.map((list) => list.filter((p) => p.divisionCode === div.code));
    const longest = Math.max(...lists.map((l) => l.length));
    for (let i = 0; i < longest; i++) {
      lists.forEach((list) => {
        if (list[i]) result.push(list[i]);
      });
    }
  });
  return result;
}

// Rebalances every pair's clearanceHintLv with even spacing across its own
// division's level range (CLEARANCE_DIVISIONS[].minLevel..maxLevel), rather
// than the ad-hoc numbers assigned while authoring each batch. With 900
// pairs spread over 3,000 ranks a new Surface Theme unlocks roughly every
// ~3 ranks (and interleaved with the 60 Noise profiles below, a visual or
// audio reward lands every few dozen ranks instead of droughts stretching
// across whole divisions). 'monolith' stays pinned to LV.1 since it's the
// universal unlock-gate fallback theme used for locked selections.
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

// eslint-disable-next-line react-refresh/only-export-components
export const SURFACE_THEME_PAIRS: SurfaceThemePair[] = [
  ...rebalanceThemeClearanceLevels(interleaveSeries(CLASSIC_THEME_PAIRS, CHROMA_THEME_PAIRS, COMPLEMENT_THEME_PAIRS)),
  ...PRESTIGE_THEME_PAIRS,
];

// Fast lookup of theme reward by Clearance Level
const THEME_REWARD_BY_LEVEL: Record<number, SurfaceThemePair> = {};
SURFACE_THEME_PAIRS.forEach((pair) => {
  THEME_REWARD_BY_LEVEL[pair.clearanceHintLv] = pair;
});

const SURFACE_THEME_BY_ID = new Map(SURFACE_THEME_PAIRS.map((pair) => [pair.id, pair]));

// eslint-disable-next-line react-refresh/only-export-components
export function getSurfaceThemeById(id: string): SurfaceThemePair {
  return SURFACE_THEME_BY_ID.get(resolveSurfaceThemeId(id)) || SURFACE_THEME_PAIRS[0];
}

// Dark-mode corner wash strength per series: [top-right, top-left] mix of the accent into bgMain.
const CORNER_WASH: Record<SurfaceSeries, [number, number]> = {
  classic: [0.34, 0.14],
  chroma: [0.16, 0.06],
  complement: [0.26, 0.1],
  prestige: [0, 0],
};

// eslint-disable-next-line react-refresh/only-export-components
export function getSurfaceBackgroundStyle(
  pair: SurfaceThemePair,
  isDark: boolean
): React.CSSProperties {
  const pal = isDark ? pair.dark : pair.light;

  if (pair.art) {
    return {
      backgroundColor: pal.bgMain,
      color: pal.textMain,
      backgroundImage: isDark ? pair.art.dark : pair.art.light,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
    };
  }

  // No patterns: a soft glow from the top edge, plus — in dark mode — an
  // accent wash in both top corners so a dark surface reads as a deep
  // colored room rather than a flat fill. For the CHROMA and COMPLEMENT
  // series the accent is the saturated / opposite hue, so the wash carries
  // the theme's contrast into the page itself. Both anchors stay at the TOP
  // of the box: this style is applied to the page's root wrapper, whose
  // height grows with scrollable content, so a bottom-anchored gradient
  // would sit far off-screen.
  // The wash is lighter on the generated series: a CHROMA accent is the
  // theme's most saturated color, and at full strength it would tint the
  // near-grey field the series contrasts against.
  const [washStrong, washSoft] = CORNER_WASH[pair.series];
  const images: string[] = [];
  if (isDark) {
    images.push(`radial-gradient(circle at 100% 0%, ${mixHex(pal.bgMain, pair.accentHex, washStrong)}, transparent 68%)`);
    images.push(`radial-gradient(circle at 0% 0%, ${mixHex(pal.bgMain, pair.accentHex, washSoft)}, transparent 72%)`);
  }
  images.push(`radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%)`);

  return {
    backgroundColor: pal.bgMain,
    color: pal.textMain,
    backgroundImage: images.join(', '),
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
  /** Motion FX layer for PRESTIGE themes (device-local preference). */
  fxEnabled: boolean;
  onToggleFx: () => void;
}

type SurfaceSeriesFilter = 'all' | SurfaceSeries;

const SERIES_FILTERS: SurfaceSeriesFilter[] = ['all', 'classic', 'chroma', 'complement', 'prestige'];

const SERIES_BADGE: Record<SurfaceSeries, string> = {
  classic: 'border-zinc-500/40 text-zinc-400',
  chroma: 'border-cyan-500/40 text-cyan-400',
  complement: 'border-orange-500/40 text-orange-400',
  prestige: 'border-amber-400/60 text-amber-300',
};

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
  fxEnabled,
  onToggleFx,
}) => {
  const { t } = useI18n();
  const [unlockFilter, setUnlockFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [seriesFilter, setSeriesFilter] = useState<SurfaceSeriesFilter>('all');
  const [selectedDiv, setSelectedDiv] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const activePair = useMemo(() => getSurfaceThemeById(activeThemeId), [activeThemeId]);

  const checkUnlocked = useCallback(
    (item: SurfaceThemePair) =>
      isThemeUnlocked(item, {
        rewardUnlockLevel: userClearanceLevel,
        totalAscensions: userTotalAscensions,
      }),
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
      if (seriesFilter !== 'all' && item.series !== seriesFilter) return false;
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.pairLabel.toLowerCase().includes(q) ||
          item.series.includes(q) ||
          item.divisionCode.toLowerCase().includes(q) ||
          (item.fx ?? '').includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unlockFilter, selectedDiv, seriesFilter, searchQuery, checkUnlocked]);

  const seriesCounts = useMemo(() => {
    const counts: Record<SurfaceSeriesFilter, number> = { all: SURFACE_THEME_PAIRS.length, classic: 0, chroma: 0, complement: 0, prestige: 0 };
    SURFACE_THEME_PAIRS.forEach((p) => (counts[p.series] += 1));
    return counts;
  }, []);
  const seriesLabel: Record<SurfaceSeriesFilter, string> = {
    all: t.all,
    classic: t.seriesClassic,
    chroma: t.seriesChroma,
    complement: t.seriesComplement,
    prestige: t.seriesPrestige,
  };

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

          <div className="flex flex-wrap items-center gap-1.5">
          {/* Motion FX switch (only PRESTIGE themes with an fx actually animate) */}
          <button
            type="button"
            onClick={onToggleFx}
            aria-pressed={fxEnabled}
            title={t.surfaceFxHint}
            className={`px-3 py-1.5 border flex items-center space-x-1.5 text-[10px] font-bold cursor-pointer transition-colors ${
              fxEnabled ? 'border-emerald-500/60 text-emerald-400' : `${borderCol} ${textMuted}`
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {t.surfaceFxLabel}: {fxEnabled ? t.surfaceFxOn : t.surfaceFxOff}
            </span>
            {activePair.fx && <span className="font-normal opacity-70">({activePair.fx.toUpperCase()})</span>}
          </button>
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

        {/* Series Filter: CLASSIC / CHROMA (saturation) / COMPLEMENT (hue) / PRESTIGE */}
        <div className={`flex flex-wrap border ${borderCol} text-[10px] w-fit`} title={t.seriesHint}>
          {SERIES_FILTERS.map((key, idx) => (
            <button
              key={key}
              type="button"
              onClick={() => setSeriesFilter(key)}
              className={`px-2.5 py-1 uppercase cursor-pointer transition-colors ${idx > 0 ? `border-l ${borderCol}` : ''} ${
                seriesFilter === key ? 'bg-emerald-500 text-zinc-950 font-bold' : `${textMuted} hover:opacity-100`
              }`}
            >
              {seriesLabel[key]} ({seriesCounts[key]})
            </button>
          ))}
        </div>

        {/* Division Filter Strip — horizontally scrollable on mobile so 11
            buttons never spend multiple lines of the limited viewport height. */}
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 -mx-0.5 px-0.5 sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:pb-0">
          {['ALL', 'DIV-01', 'DIV-02', 'DIV-03', 'DIV-04', 'DIV-05', 'DIV-06', 'DIV-07', 'DIV-08', 'DIV-09', 'DIV-10', 'PRESTIGE'].map(
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
              className={`p-3 border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_168px] ${
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
                  <span className="flex items-center gap-1 shrink-0 ml-1">
                    {item.fx && (
                      <span className="uppercase px-1 border border-fuchsia-500/40 text-fuchsia-400" title={t.surfaceFxHint}>
                        FX·{item.fx}
                      </span>
                    )}
                    <span className={`uppercase px-1 border ${SERIES_BADGE[item.series]}`}>{seriesLabel[item.series]}</span>
                  </span>
                </div>
                <p className={`text-[10px] font-sans leading-snug line-clamp-2 ${textMuted}`}>
                  {item.description}
                </p>
              </div>

              {/* Dual Swatch Strip (Left = Dark Mode Surface, Right = Light Mode Surface) */}
              <div className="w-full grid grid-cols-2 border border-zinc-700/50 overflow-hidden h-9 shrink-0">
                <div
                  className="px-2 flex items-center justify-between text-[9px] font-bold"
                  style={getSurfaceBackgroundStyle(item, true)}
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
                  style={getSurfaceBackgroundStyle(item, false)}
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



