import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Share2,
  Download,
  Copy,
  Check,
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  Radio,
  Search,
  Terminal,
  Zap,
  CornerDownLeft,
  Sun,
  Moon,
} from 'lucide-react';
import type { Category, StudyLog } from './App';

// ==========================================
// 1. TELEMETRY CLEARANCE LEVEL SYSTEM (500 RANKS // 100% ENGLISH)
// ==========================================

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

const CLEARANCE_DIVISIONS: ClearanceDivision[] = [
  { index: 1, code: 'DIV-01', name: 'INITIATE', sectorName: 'Initial Observation Sector', minLevel: 1, maxLevel: 150, minHours: 0, maxHours: 150, color: '#a1a1aa' },
  { index: 2, code: 'DIV-02', name: 'CADET', sectorName: 'Orbital Training Sector', minLevel: 151, maxLevel: 300, minHours: 152, maxHours: 450, color: '#38bdf8' },
  { index: 3, code: 'DIV-03', name: 'OPERATOR', sectorName: 'Field Communications Sector', minLevel: 301, maxLevel: 450, minHours: 452, maxHours: 750, color: '#10b981' },
  { index: 4, code: 'DIV-04', name: 'SPECIALIST', sectorName: 'Deep Analytics Sector', minLevel: 451, maxLevel: 600, minHours: 752, maxHours: 1050, color: '#06b6d4' },
  { index: 5, code: 'DIV-05', name: 'VANGUARD', sectorName: 'Frontier Vanguard Sector', minLevel: 601, maxLevel: 750, minHours: 1052, maxHours: 1350, color: '#6366f1' },
  { index: 6, code: 'DIV-06', name: 'ARCHITECT', sectorName: 'Structural Systems Sector', minLevel: 751, maxLevel: 900, minHours: 1352, maxHours: 1650, color: '#a855f7' },
  { index: 7, code: 'DIV-07', name: 'OVERSEER', sectorName: 'High Command Sector', minLevel: 901, maxLevel: 1050, minHours: 1652, maxHours: 1950, color: '#ec4899' },
  { index: 8, code: 'DIV-08', name: 'SENTINEL', sectorName: 'Aegis Citadel Sector', minLevel: 1051, maxLevel: 1200, minHours: 1952, maxHours: 2250, color: '#f97316' },
  { index: 9, code: 'DIV-09', name: 'SOVEREIGN', sectorName: 'Imperial Dominion Sector', minLevel: 1201, maxLevel: 1350, minHours: 2252, maxHours: 2625, color: '#eab308' },
  { index: 10, code: 'DIV-10', name: 'MONOLITH', sectorName: 'Transcendent Monolith Sector', minLevel: 1351, maxLevel: 1500, minHours: 2628, maxHours: 3000, color: '#f43f5e' },
];

// 15 Archetypes per Division × 10 Grades (I..X) = 150 Ranks per Division × 10 Divisions = 1,500 Ranks
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
    ['KILO-HOUR VANGUARD', 'Crossing the 1,000-hour threshold'],
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
    ['SESQUI-KILO ARCHITECT', 'Fifteen-hundred-hour structural veteran'],
    ['CITADEL ENGINEER', 'Fortifying unshakeable domain expertise'],
    ['NEXUS STRUCTURALIST', 'Connecting core theoretical nexuses'],
    ['LATTICE MASTER', 'Crystal-lattice precision & endurance'],
    ['KEYSTONE FORGER', 'Locking complex concepts into place'],
    ['VAULT DESIGNER', 'Constructing permanent memory vaults'],
    ['GRID SOVEREIGN', 'Total command of the cadence matrix'],
    ['BLUEPRINT GRANDMASTER', 'Mastery of macro-scale study plans'],
    ['SPIRE ARCHITECT', 'Building toward the 2,000-hour sky'],
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
    ['BI-MILLENNIUM BASTION', 'Two-thousand-hour fortress of habit'],
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
    ['QUARTER-MYRIAD LORD', '2,500-hour sovereign milestone achieved'],
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
    ['ETERNAL OBELISK', 'Towering monument of 2,800+ hours'],
    ['CHRONO DEITY', 'Master of time and cognitive flow'],
    ['ASTRAL PANTHEON', 'Dwelling among the legends of focus'],
    ['TRANSCENDENT CORE', 'Pure synthesis of habit and intellect'],
    ['INFINITY ARCHITECT', 'Boundless horizon of continuous growth'],
    ['APEX OF ETERNITY', 'The final steps before the 3,000h summit'],
    ['OMEGA MONOLITH', 'Ultimate 3,000-hour Monolith perfection'],
  ],
};

// Special exact hour milestones to highlight across 0H..3,000H
const SPECIAL_HOUR_OVERRIDES: Record<number, { title: string; sub: string }> = {
  0: { title: 'ZERO-HOUR INITIALIZATION', sub: '0H MILESTONE // Telemetry archive initialized' },
  1: { title: 'FIRST IGNITION // 1H', sub: '1H MILESTONE // First hour committed to archive' },
  5: { title: 'PENTA-HOUR SPARK // 5H', sub: '5H MILESTONE // Early study routine ignited' },
  10: { title: 'DECA-HOUR LOCK // 10H', sub: '10H MILESTONE // Initial orbital lock achieved' },
  25: { title: 'QUARTER-CENTURY NODE // 25H', sub: '25H MILESTONE // Twenty-five hours recorded' },
  50: { title: 'HALF-CENTURY CORE // 50H', sub: '50H MILESTONE // Half-century foundation complete' },
  75: { title: 'THREE-QUARTER CENTURY // 75H', sub: '75H MILESTONE // Approaching triple-digit hours' },
  100: { title: 'CENTURION MILESTONE // 100H', sub: '100H MILESTONE // Triple-digit telemetry unlocked' },
  150: { title: 'INITIATE SUMMIT // 150H', sub: '150H MILESTONE // Division 01 complete' },
  200: { title: 'BI-CENTURY OPERATOR // 200H', sub: '200H MILESTONE // Two hundred hours of verified focus' },
  250: { title: 'QUARTER-MILLENNIUM // 250H', sub: '250H MILESTONE // One-fourth of a thousand hours' },
  300: { title: 'TRI-CENTURY VANGUARD // 300H', sub: '300H MILESTONE // Three hundred hours archived' },
  400: { title: 'QUAD-CENTURY ENGINE // 400H', sub: '400H MILESTONE // Four hundred hours of discipline' },
  450: { title: 'CADET SUMMIT // 450H', sub: '450H MILESTONE // Division 02 complete' },
  500: { title: 'HALF-MILLENNIUM TITAN // 500H', sub: '500H MILESTONE // Five hundred hours of discipline' },
  600: { title: 'HEXA-CENTURY GUARD // 600H', sub: '600H MILESTONE // Six hundred hours committed' },
  750: { title: 'OPERATOR SUMMIT // 750H', sub: '750H MILESTONE // Three-quarters to 1,000H' },
  900: { title: 'NONA-CENTURY SPECIALIST // 900H', sub: '900H MILESTONE // Final 100H approach to 1,000H' },
  1000: { title: 'MILLENNIUM ASCENSION // 1,000H', sub: '1,000H MILESTONE // Four-digit telemetry landmark' },
  1200: { title: 'DUODECIM-CENTURY // 1,200H', sub: '1,200H MILESTONE // Twelve hundred hours of focus' },
  1350: { title: 'VANGUARD SUMMIT // 1,350H', sub: '1,350H MILESTONE // Division 05 complete' },
  1500: { title: 'SESQUI-MILLENNIUM // 1,500H', sub: '1,500H MILESTONE // Halfway to the 3,000H Monolith' },
  1650: { title: 'ARCHITECT SUMMIT // 1,650H', sub: '1,650H MILESTONE // Division 06 complete' },
  1800: { title: 'OCTODECIM-CENTURY // 1,800H', sub: '1,800H MILESTONE // Eighteen hundred hours archived' },
  1950: { title: 'OVERSEER SUMMIT // 1,950H', sub: '1,950H MILESTONE // Approaching the 2,000H barrier' },
  2000: { title: 'BI-MILLENNIUM ARCHITECT // 2,000H', sub: '2,000H MILESTONE // Two thousand hours of mastery' },
  2250: { title: 'SENTINEL SUMMIT // 2,250H', sub: '2,250H MILESTONE // Division 08 complete' },
  2500: { title: 'QUARTER-MYRIAD SOVEREIGN // 2,500H', sub: '2,500H MILESTONE // Twenty-five hundred hours committed' },
  2625: { title: 'SOVEREIGN SUMMIT // 2,625H', sub: '2,625H MILESTONE // Entering the final Monolith Sector' },
  2750: { title: 'ASTRAL HORIZON // 2,750H', sub: '2,750H MILESTONE // Final 250 hours to Omega Monolith' },
  3000: { title: 'OMEGA MONOLITH // 3,000H', sub: '3,000H MILESTONE // Supreme 1,500th Clearance Pinnacle' },
};

function build1500ClearanceLevels(): ClearanceLevel[] {
  const divisionHourBounds: Array<[number, number]> = [
    [0, 150],     // DIV 1: LV 1..150 (1H per rank)
    [150, 450],   // DIV 2: LV 151..300 (2H per rank)
    [450, 750],   // DIV 3: LV 301..450 (2H per rank)
    [750, 1050],  // DIV 4: LV 451..600 (2H per rank)
    [1050, 1350], // DIV 5: LV 601..750 (2H per rank)
    [1350, 1650], // DIV 6: LV 751..900 (2H per rank)
    [1650, 1950], // DIV 7: LV 901..1050 (2H per rank)
    [1950, 2250], // DIV 8: LV 1051..1200 (2H per rank)
    [2250, 2625], // DIV 9: LV 1201..1350 (2.5H per rank)
    [2625, 3000], // DIV 10: LV 1351..1500 (2.5H per rank)
  ];

  const romanTiers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const tierLabels = [
    'GRADE I',
    'GRADE II',
    'GRADE III',
    'GRADE IV',
    'GRADE V',
    'GRADE VI',
    'GRADE VII',
    'GRADE VIII',
    'GRADE IX',
    'GRADE X // PRIME',
  ];
  const result: ClearanceLevel[] = [];

  for (let divIdx = 1; divIdx <= 10; divIdx++) {
    const div = CLEARANCE_DIVISIONS[divIdx - 1];
    const [startH, endH] = divisionHourBounds[divIdx - 1];
    const archetypes = DIVISION_ARCHETYPES[divIdx];

    for (let offset = 0; offset < 150; offset++) {
      const level = (divIdx - 1) * 150 + offset + 1;
      let reqHours: number;

      if (level === 1) {
        reqHours = 0;
      } else if (divIdx === 1) {
        reqHours = offset === 149 ? 150 : offset;
      } else {
        const step = (endH - startH) / 150;
        reqHours = Math.round((startH + (offset + 1) * step) * 10) / 10;
        if (Number.isInteger(reqHours)) reqHours = Math.trunc(reqHours);
      }

      const archIdx = Math.floor(offset / 10);
      const gradeIdx = offset % 10;
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
        isMajorMilestone: Boolean(override) || (offset + 1) % 50 === 0,
      });
    }
  }

  return result;
}

const CLEARANCE_LEVELS: ClearanceLevel[] = build1500ClearanceLevels();

export interface UserClearanceStatus {
  current: ClearanceLevel;
  next: ClearanceLevel | null;
  totalHours: number;
  hoursIntoLevel: number;
  levelSpanHours: number;
  progressPct: number;
  hoursRemainingToNext: number;
  subPhase: number; // 1..5 pips within current level
  hoursToNextSubPhase: number;
  unlockedCount: number;
  totalRanks: number;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getClearanceStatus(totalMinutes: number): UserClearanceStatus {
  const totalHours = Math.max(0, totalMinutes / 60);

  let currentIdx = 0;
  for (let i = CLEARANCE_LEVELS.length - 1; i >= 0; i--) {
    if (totalHours >= CLEARANCE_LEVELS[i].requiredHours) {
      currentIdx = i;
      break;
    }
  }

  const current = CLEARANCE_LEVELS[currentIdx];
  const next = currentIdx + 1 < CLEARANCE_LEVELS.length ? CLEARANCE_LEVELS[currentIdx + 1] : null;

  if (!next) {
    return {
      current,
      next: null,
      totalHours: +totalHours.toFixed(1),
      hoursIntoLevel: +(totalHours - current.requiredHours).toFixed(1),
      levelSpanHours: 0,
      progressPct: 100,
      hoursRemainingToNext: 0,
      subPhase: 5,
      hoursToNextSubPhase: 0,
      unlockedCount: CLEARANCE_LEVELS.length,
      totalRanks: CLEARANCE_LEVELS.length,
    };
  }

  const span = Math.max(0.1, next.requiredHours - current.requiredHours);
  const into = Math.max(0, totalHours - current.requiredHours);
  const rawPct = Math.min(100, Math.max(0, (into / span) * 100));
  const progressPct = Math.round(rawPct * 10) / 10;
  const hoursRemainingToNext = Math.max(0, +(next.requiredHours - totalHours).toFixed(1));

  const subPhase = Math.min(5, Math.floor(rawPct / 20) + 1);
  const nextSubPhaseTargetHours = current.requiredHours + (span * subPhase) / 5;
  const hoursToNextSubPhase = Math.max(0, +(nextSubPhaseTargetHours - totalHours).toFixed(1));

  return {
    current,
    next,
    totalHours: +totalHours.toFixed(1),
    hoursIntoLevel: +into.toFixed(1),
    levelSpanHours: span,
    progressPct,
    hoursRemainingToNext,
    subPhase,
    hoursToNextSubPhase,
    unlockedCount: currentIdx + 1,
    totalRanks: CLEARANCE_LEVELS.length,
  };
}

// ==========================================
// 2. WEB AUDIO API AMBIENT NOISE SYNTHESIZER
// ==========================================

export type NoiseMode = 'brown' | 'pink' | 'white' | 'drone';

const NOISE_PROFILES: Array<{
  id: NoiseMode;
  code: string;
  name: string;
  desc: string;
}> = [
  {
    id: 'brown',
    code: 'BRN',
    name: 'DEEP BROWN NOISE',
    desc: 'Warm low-frequency rumble (Cabin / Waterfall) for deep concentration',
  },
  {
    id: 'pink',
    code: 'PNK',
    name: 'WARM PINK RAIN',
    desc: 'Balanced 1/f natural rain spectrum for steady study sessions',
  },
  {
    id: 'white',
    code: 'WHT',
    name: 'SOFT WHITE STATIC',
    desc: 'Filtered air-flow static to mask background voices & distractions',
  },
  {
    id: 'drone',
    code: 'DRN',
    name: '40Hz FOCUS DRONE',
    desc: 'Subtle binaural ambient synth pad blended with warm brown noise',
  },
];

interface AmbientSoundControlProps {
  isDark: boolean;
  borderCol: string;
  bgCard: string;
  textMuted: string;
}

export const AmbientSoundControl: React.FC<AmbientSoundControlProps> = ({
  isDark,
  borderCol,
  bgCard,
  textMuted,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<NoiseMode>('brown');
  const [volume, setVolume] = useState<number>(0.35);
  const [showPopover, setShowPopover] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);

  const stopAudioNodes = useCallback(() => {
    activeNodesRef.current.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore already stopped nodes
      }
    });
    activeNodesRef.current = [];
  }, []);

  const buildAndStartGraph = useCallback(
    (targetMode: NoiseMode, targetVol: number) => {
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

      stopAudioNodes();

      if (!masterGainRef.current) {
        masterGainRef.current = ctx.createGain();
        masterGainRef.current.connect(ctx.destination);
      }
      masterGainRef.current.gain.setValueAtTime(targetVol, ctx.currentTime);

      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const output = buffer.getChannelData(ch);
        if (targetMode === 'white') {
          for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.28;
          }
        } else if (targetMode === 'pink') {
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
        } else {
          let lastOut = 0.0;
          const scale = targetMode === 'drone' ? 0.25 : 0.45;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= 3.2 * scale;
          }
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value =
        targetMode === 'white' ? 4200 : targetMode === 'pink' ? 2400 : 950;

      noiseSource.connect(filter);
      filter.connect(masterGainRef.current);
      noiseSource.start(0);
      activeNodesRef.current.push(noiseSource, filter);

      if (targetMode === 'drone') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const droneGain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.value = 110;
        osc2.frequency.value = 164.81;

        const droneFilter = ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 320;

        droneGain.gain.value = 0.08;
        osc1.connect(droneFilter);
        osc2.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(masterGainRef.current);

        osc1.start(0);
        osc2.start(0);
        activeNodesRef.current.push(osc1, osc2, droneFilter, droneGain);
      }
    },
    [stopAudioNodes]
  );

  const togglePlay = () => {
    if (isPlaying) {
      stopAudioNodes();
      setIsPlaying(false);
    } else {
      buildAndStartGraph(mode, volume);
      setIsPlaying(true);
    }
  };

  const handleModeSelect = (newMode: NoiseMode) => {
    setMode(newMode);
    buildAndStartGraph(newMode, volume);
    setIsPlaying(true);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(newVol, audioCtxRef.current.currentTime, 0.03);
    }
  };

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

  useEffect(() => {
    const handleExternalSoundCmd = (e: Event) => {
      const custom = e as CustomEvent<{ action: 'play' | 'stop' | 'toggle'; mode?: NoiseMode }>;
      if (!custom.detail) return;
      if (custom.detail.action === 'stop') {
        stopAudioNodes();
        setIsPlaying(false);
      } else if (custom.detail.action === 'toggle') {
        if (isPlaying) {
          stopAudioNodes();
          setIsPlaying(false);
        } else {
          buildAndStartGraph(mode, volume);
          setIsPlaying(true);
        }
      } else if (custom.detail.action === 'play') {
        const targetMode = custom.detail.mode || mode;
        setMode(targetMode);
        buildAndStartGraph(targetMode, volume);
        setIsPlaying(true);
      }
    };
    window.addEventListener('typbox:ambient-sound', handleExternalSoundCmd);
    return () => window.removeEventListener('typbox:ambient-sound', handleExternalSoundCmd);
  }, [buildAndStartGraph, isPlaying, mode, stopAudioNodes, volume]);

  useEffect(() => {
    return () => {
      stopAudioNodes();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopAudioNodes]);

  const activeProfile = NOISE_PROFILES.find((p) => p.id === mode) || NOISE_PROFILES[0];

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
        aria-label="Ambient Focus Sound Generator"
        title="Ambient Noise / Focus Sound Generator"
      >
        {isPlaying ? (
          <>
            <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="hidden md:inline font-semibold tracking-wider">{activeProfile.code}</span>
            <span className="flex items-end space-x-0.5 h-3 ml-0.5">
              <span className="w-0.5 h-2 bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-3 bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-1.5 bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
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
          className={`fixed left-3 right-3 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 border ${borderCol} ${bgCard} shadow-2xl z-50 p-4 font-mono text-xs space-y-3.5`}
        >
          <div className="flex items-center justify-between border-b pb-2.5 border-zinc-800/60">
            <div className="flex items-center space-x-2">
              <Radio className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-400 animate-pulse' : textMuted}`} />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                ACOUSTIC FOCUS ENGINE
              </span>
            </div>
            <button
              type="button"
              onClick={togglePlay}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                isPlaying
                  ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
              }`}
            >
              {isPlaying ? 'STOP // MUTE' : 'START NOISE'}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>
              Select Procedural Spectrum
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {NOISE_PROFILES.map((prof) => {
                const active = mode === prof.id;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => handleModeSelect(prof.id)}
                    className={`p-2.5 border text-left transition-colors cursor-pointer flex items-start justify-between ${
                      active
                        ? 'border-emerald-500/70 bg-emerald-500/10'
                        : `${borderCol} hover:border-zinc-500`
                    }`}
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] px-1 py-0.2 border ${
                            active
                              ? 'border-emerald-500 text-emerald-400 font-bold'
                              : `${borderCol} ${textMuted}`
                          }`}
                        >
                          {prof.code}
                        </span>
                        <span className={`text-[11px] font-bold ${active ? 'text-emerald-400' : ''}`}>
                          {prof.name}
                        </span>
                      </div>
                      <p className={`text-[10px] font-sans leading-snug ${textMuted}`}>{prof.desc}</p>
                    </div>
                    {active && isPlaying && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mt-1 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className={`uppercase ${textMuted}`}>Output Gain</span>
              <span className="font-bold text-emerald-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.02}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
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
// 3. CLEARANCE BROWSER PANEL (ALL 1,500 LEVELS // PURE ENGLISH)
// ==========================================

interface ClearanceBrowserProps {
  clearance: UserClearanceStatus;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
}

export const ClearanceBrowserPanel: React.FC<ClearanceBrowserProps> = ({
  clearance,
  isDark,
  borderCol,
  textMuted,
}) => {
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
              <div className="text-sm font-bold tracking-wider flex items-center space-x-2">
                <span>{clearance.current.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
                  {clearance.current.division}
                </span>
              </div>
              <div className={`text-[10px] ${textMuted}`}>
                TOTAL ARCHIVED: <strong className="text-emerald-400">{clearance.totalHours}H</strong> //{' '}
                {clearance.unlockedCount} OF {clearance.totalRanks.toLocaleString()} CLEARANCE RANKS UNLOCKED
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
                  title={`Sub-Phase ${pip}/5`}
                />
              ))}
              <span className="ml-1.5 text-[10px] text-emerald-400 font-bold">
                PHASE {clearance.subPhase}/5
              </span>
            </div>
            {clearance.next && (
              <div className={`text-[10px] mt-0.5 ${textMuted}`}>
                NEXT RANK IN{' '}
                <span className="text-emerald-400 font-bold">{clearance.hoursRemainingToNext}H</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span>
              CURRENT: LV.{String(clearance.current.level).padStart(4, '0')} (
              {clearance.current.requiredHours}H)
            </span>
            {clearance.next ? (
              <span>
                NEXT: LV.{String(clearance.next.level).padStart(4, '0')} {clearance.next.title} (
                {clearance.next.requiredHours}H) — {clearance.progressPct}%
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">MAX CLEARANCE ACHIEVED (3,000H+)</span>
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
              placeholder="Search 1,500 ranks or theme rewards (e.g. 1000h, SOVEREIGN, THM-24)..."
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
                { id: 'all', label: 'ALL' },
                { id: 'rewards', label: 'REWARDS (48)' },
                { id: 'milestones', label: 'MILESTONES' },
                { id: 'unlocked', label: 'UNLOCKED' },
                { id: 'locked', label: 'LOCKED' },
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

        {/* 10 Division Tabs (150 Ranks per Division = 1,500 Total) */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedDiv(null)}
            className={`px-2 py-0.5 text-[10px] border cursor-pointer ${
              selectedDiv === null
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                : `${borderCol} ${textMuted}`
            }`}
          >
            ALL (1,500)
          </button>
          {CLEARANCE_DIVISIONS.map((div) => {
            const isSelected = selectedDiv === div.index;
            return (
              <button
                key={div.code}
                type="button"
                onClick={() => setSelectedDiv(isSelected ? null : div.index)}
                title={`${div.sectorName} (LV.${div.minLevel}–${div.maxLevel} // ${div.minHours}H–${div.maxHours}H)`}
                className={`px-2 py-0.5 text-[10px] border flex items-center space-x-1 cursor-pointer ${
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

      {/* Scrollable 1,500 Ranks List */}
      <div
        className={`flex-1 min-h-[220px] overflow-y-auto border ${borderCol} divide-y ${
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
                        MILESTONE
                      </span>
                    )}
                    {rewardTheme && (
                      <span
                        className="px-1.5 py-0.2 border border-cyan-500/50 text-cyan-400 text-[9px] font-bold uppercase shrink-0 flex items-center space-x-1"
                        title={`Unlocks Surface Theme Pair: ${rewardTheme.code} // ${rewardTheme.name}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: rewardTheme.accentHex }}
                        />
                        <span>
                          REWARD: {rewardTheme.code} // {rewardTheme.name}
                        </span>
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 bg-emerald-500 text-zinc-950 text-[9px] font-bold uppercase shrink-0">
                        CURRENT
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
                    <span className={`text-[10px] ${textMuted}`}>HRS</span>
                  </div>
                  {!unlocked && (
                    <div className={`text-[9px] ${textMuted}`}>
                      -{Math.max(0.1, Number((lvl.requiredHours - clearance.totalHours).toFixed(1)))}H REQ
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark');
  const [showCategoriesOnCard, setShowCategoriesOnCard] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const renderCardToCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200;
    const H = 675;
    canvas.width = W;
    canvas.height = H;

    const dark = cardTheme === 'dark';
    const bg = dark ? '#09090b' : '#fafafa';
    const panelBg = dark ? '#111113' : '#ffffff';
    const stroke = dark ? '#27272a' : '#e4e4e7';
    const textPrimary = dark ? '#f4f4f5' : '#18181b';
    const textSub = dark ? '#71717a' : '#71717a';
    const accent = clearance.current.color || avatarColor || '#10b981';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    ctx.fillStyle = accent;
    ctx.fillRect(28, 28, W - 56, 5);

    ctx.fillStyle = textPrimary;
    ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText('TYPBOX.ME', 60, 78);

    ctx.fillStyle = textSub;
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText('// QUANTIFIED STUDY & TELEMETRY ARCHIVE', 200, 78);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    ctx.textAlign = 'right';
    ctx.fillStyle = textSub;
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(`SNAPSHOT // ${todayStr}`, W - 60, 78);
    ctx.textAlign = 'left';

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 102);
    ctx.lineTo(W - 28, 102);
    ctx.stroke();

    const avatarX = 60;
    const avatarY = 130;
    const avatarSize = 76;

    ctx.fillStyle = `${avatarColor}22`;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.strokeStyle = avatarColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);

    let drewCustomImg = false;
    if (avatarImage) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = avatarImage;
        });
        ctx.drawImage(img, avatarX + 2, avatarY + 2, avatarSize - 4, avatarSize - 4);
        drewCustomImg = true;
      } catch {
        drewCustomImg = false;
      }
    }
    if (!drewCustomImg) {
      ctx.fillStyle = avatarColor;
      ctx.font = 'bold 34px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        (username || 'U').slice(0, 2).toUpperCase(),
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2 + 2
      );
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    ctx.fillStyle = textPrimary;
    ctx.font = 'bold 32px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(username || 'OPERATOR', 156, 162);

    const lvlTag = `LV.${String(clearance.current.level).padStart(4, '0')} // ${clearance.current.title}`;
    ctx.font = 'bold 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const pillWidth = ctx.measureText(lvlTag).width + 24;
    ctx.fillStyle = accent;
    ctx.fillRect(156, 176, pillWidth, 28);
    ctx.fillStyle = '#09090b';
    ctx.fillText(lvlTag, 168, 195);

    ctx.fillStyle = textSub;
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(
      `DIVISION: ${clearance.current.division}  •  PHASE ${clearance.subPhase}/5`,
      156 + pillWidth + 16,
      195
    );

    const progX = 760;
    const progY = 142;
    const progW = W - 60 - progX;
    ctx.fillStyle = textSub;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(
      clearance.next
        ? `CLEARANCE PROGRESS // NEXT: LV.${String(clearance.next.level).padStart(4, '0')} (${clearance.next.requiredHours}H)`
        : 'CLEARANCE STATUS // MAXIMUM MONOLITH LEVEL',
      progX,
      progY
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    ctx.font = 'bold 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(`${clearance.progressPct}%`, W - 60, progY);
    ctx.textAlign = 'left';

    ctx.fillStyle = dark ? '#27272a' : '#e4e4e7';
    ctx.fillRect(progX, progY + 12, progW, 10);
    ctx.fillStyle = accent;
    ctx.fillRect(progX, progY + 12, (progW * clearance.progressPct) / 100, 10);

    for (let p = 0; p < 5; p++) {
      const pipW = (progW - 16) / 5;
      ctx.fillStyle = p < clearance.subPhase ? '#10b981' : dark ? '#27272a' : '#e4e4e7';
      ctx.fillRect(progX + p * (pipW + 4), progY + 28, pipW, 4);
    }

    const metricY = 232;
    const metricH = 118;
    const metricW = (W - 120 - 36) / 4;
    const metrics = [
      { label: '01 / TOTAL ARCHIVED', val: `${totalHours}`, unit: 'HRS' },
      { label: '02 / CURRENT STREAK', val: `${currentStreak}`, unit: 'DAYS' },
      { label: '03 / PEAK STREAK', val: `${longestStreak}`, unit: 'DAYS' },
      { label: '04 / 7D & 30D OUTPUT', val: `${weeklyHours}h`, unit: `/ ${monthlyHours}h (MO)` },
    ];

    metrics.forEach((m, idx) => {
      const mx = 60 + idx * (metricW + 12);
      ctx.fillStyle = panelBg;
      ctx.fillRect(mx, metricY, metricW, metricH);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx, metricY, metricW, metricH);

      ctx.fillStyle = textSub;
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(m.label, mx + 18, metricY + 28);

      ctx.fillStyle = textPrimary;
      ctx.font = 'bold 38px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(m.val, mx + 18, metricY + 82);

      const valWidth = ctx.measureText(m.val).width;
      ctx.fillStyle = accent;
      ctx.font = 'bold 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(m.unit, mx + 24 + valWidth, metricY + 82);
    });

    const bottomY = 374;
    const bottomH = 228;
    const matrixBoxW = showCategoriesOnCard ? 660 : W - 120;

    ctx.fillStyle = panelBg;
    ctx.fillRect(60, bottomY, matrixBoxW, bottomH);
    ctx.strokeStyle = stroke;
    ctx.strokeRect(60, bottomY, matrixBoxW, bottomH);

    ctx.fillStyle = textSub;
    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(
      `TELEMETRY CADENCE MATRIX // ${activeDaysCount} ACTIVE DAYS LOGGED`,
      80,
      bottomY + 28
    );

    const activeDateSet = new Set(logs.filter((l) => l.durationMinutes > 0).map((l) => l.date));
    const cols = showCategoriesOnCard ? 28 : 48;
    const cellSize = 16;
    const cellGap = 4;
    const gridStartX = 80;
    const gridStartY = bottomY + 50;

    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const currentMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

    for (let c = 0; c < cols; c++) {
      const weekOffset = cols - 1 - c;
      for (let r = 0; r < 7; r++) {
        const cellDate = new Date(currentMon);
        cellDate.setDate(currentMon.getDate() - weekOffset * 7 + r);
        const yyyy = cellDate.getFullYear();
        const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
        const dd = String(cellDate.getDate()).padStart(2, '0');
        const dStr = `${yyyy}-${mm}-${dd}`;

        const cx = gridStartX + c * (cellSize + cellGap);
        const cy = gridStartY + r * (cellSize + cellGap);

        const isActive = activeDateSet.has(dStr);
        ctx.fillStyle = isActive ? '#10b981' : dark ? '#1f1f23' : '#e4e4e7';
        ctx.fillRect(cx, cy, cellSize, cellSize);
      }
    }

    if (showCategoriesOnCard) {
      const catBoxX = 60 + matrixBoxW + 16;
      const catBoxW = W - 60 - catBoxX;
      ctx.fillStyle = panelBg;
      ctx.fillRect(catBoxX, bottomY, catBoxW, bottomH);
      ctx.strokeStyle = stroke;
      ctx.strokeRect(catBoxX, bottomY, catBoxW, bottomH);

      ctx.fillStyle = textSub;
      ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText('TOP CATEGORY ALLOCATION', catBoxX + 20, bottomY + 28);

      const totalMin = Math.max(
        1,
        logs.reduce((acc, l) => acc + l.durationMinutes, 0)
      );
      const catStats = categories
        .map((cat) => {
          const min = logs
            .filter((l) => String(l.categoryId) === String(cat.id))
            .reduce((acc, l) => acc + l.durationMinutes, 0);
          return {
            code: cat.code,
            name: cat.name,
            color: cat.color,
            hours: (min / 60).toFixed(1),
            pct: Math.round((min / totalMin) * 100),
            min,
          };
        })
        .sort((a, b) => b.min - a.min)
        .slice(0, 4);

      if (catStats.length === 0) {
        ctx.fillStyle = textSub;
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        ctx.fillText('No category telemetry recorded yet.', catBoxX + 20, bottomY + 70);
      } else {
        catStats.forEach((cs, idx) => {
          const rowY = bottomY + 58 + idx * 40;
          ctx.fillStyle = cs.color;
          ctx.fillRect(catBoxX + 20, rowY - 10, 8, 8);

          ctx.fillStyle = textPrimary;
          ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          const label = `[${cs.code}] ${cs.name}`.slice(0, 22);
          ctx.fillText(label, catBoxX + 36, rowY - 2);

          ctx.textAlign = 'right';
          ctx.fillStyle = textSub;
          ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          ctx.fillText(`${cs.hours}h (${cs.pct}%)`, catBoxX + catBoxW - 20, rowY - 2);
          ctx.textAlign = 'left';

          const barW = catBoxW - 40;
          ctx.fillStyle = dark ? '#27272a' : '#e4e4e7';
          ctx.fillRect(catBoxX + 20, rowY + 6, barW, 6);
          ctx.fillStyle = cs.color;
          ctx.fillRect(catBoxX + 20, rowY + 6, Math.max(4, (barW * cs.pct) / 100), 6);
        });
      }
    }

    ctx.fillStyle = textSub;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(
      `VERIFIED TELEMETRY // CLEARANCE LV.${String(clearance.current.level).padStart(4, '0')} (${clearance.current.title})`,
      60,
      H - 42
    );
    ctx.textAlign = 'right';
    ctx.fillText('typbox.me', W - 60, H - 42);
    ctx.textAlign = 'left';
  }, [
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
      setCopyError('Clipboard image copy is not supported in this browser. Please use DOWNLOAD PNG.');
    }
  };

  const handleShareX = () => {
    const text = `TYPBOX // TELEMETRY SNAPSHOT\nCLEARANCE: LV.${String(clearance.current.level).padStart(4, '0')} [${clearance.current.title}]\nTOTAL: ${totalHours} HRS | STREAK: ${currentStreak} DAYS\n#TYPBOX #StudyLog`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`w-full max-w-3xl border ${borderCol} ${bgCard} p-6 space-y-5 shadow-2xl my-8 font-mono`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
          <div className="flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs uppercase tracking-widest font-bold">
              TELEMETRY STATUS CARD GENERATOR // SNAPSHOT
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
          <div className="flex items-center space-x-2">
            <span className={`text-[10px] uppercase ${textMuted}`}>Card Theme:</span>
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
            <span>Include Category Breakdown</span>
          </label>
        </div>

        <div className={`border ${borderCol} p-2 ${isDark ? 'bg-black/50' : 'bg-zinc-100'}`}>
          <canvas
            ref={canvasRef}
            className="w-full h-auto block border border-zinc-800/50 shadow-lg"
          />
        </div>

        {copyError && (
          <div className="p-2.5 border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px]">
            {copyError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className={`text-[11px] font-sans ${textMuted}`}>
            Tip: Click <strong>COPY IMAGE</strong> to paste directly (Cmd+V / Ctrl+V) into X (Twitter) or Discord!
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              className={`px-4 py-2 border ${borderCol} hover:border-emerald-500/60 text-xs font-bold flex items-center space-x-1.5 cursor-pointer`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>COPY IMAGE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              className="px-4 py-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD PNG</span>
            </button>

            <button
              type="button"
              onClick={handleShareX}
              className={`px-3.5 py-2 border ${borderCol} hover:bg-zinc-500/10 text-xs font-bold flex items-center space-x-1.5 cursor-pointer`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>POST ON X</span>
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
        group: 'INSTANT TELEMETRY COMMIT',
        title: `COMMIT SESSION: [${category.code}] ${category.name} — ${minutes} MIN (${hrsStr}H)`,
        subtitle: `Immediately record ${minutes} minutes to Django backend for today`,
        badge: 'ENTER TO COMMIT',
        accentColor: category.color,
        keywords: `log commit ${category.code} ${category.name} ${minutes}`,
        action: async () => {
          await onQuickLog(category.id, minutes);
          setStatusBanner(`COMMITTED ${minutes} MIN TO [${category.code}] ${category.name}`);
          setTimeout(() => {
            onClose();
          }, 450);
        },
      });
    }

    // 2. Category Quick-Log Presets
    if (isAuthenticated && categories.length > 0) {
      categories.forEach((cat) => {
        [30, 60, 90, 120].forEach((mins) => {
          items.push({
            id: `preset-log-${cat.id}-${mins}`,
            group: 'QUICK LOG SESSION',
            title: `Log ${mins}m (${(mins / 60).toFixed(1)}h) → [${cat.code}] ${cat.name}`,
            subtitle: `One-keystroke commit (${mins} minutes) to ${cat.name}`,
            badge: `log ${mins}m ${cat.code.toLowerCase()}`,
            accentColor: cat.color,
            keywords: `log ${mins}m ${mins / 60}h ${cat.code} ${cat.name} session commit`,
            action: async () => {
              await onQuickLog(cat.id, mins);
              setStatusBanner(`COMMITTED ${mins} MIN TO [${cat.code}] ${cat.name}`);
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
        group: 'AUTHENTICATION',
        title: 'Sign In / Create Account to Record Telemetry',
        subtitle: 'Open authentication modal',
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
        group: 'ACOUSTIC FOCUS ENGINE',
        title: 'Audio: Play Brown Noise (Deep Low-Frequency Rumble)',
        subtitle: 'Start procedural brown noise synthesizer',
        badge: 'sound brown',
        keywords: 'audio sound noise brown deep focus play',
        action: () => {
          dispatchSound('play', 'brown');
          onClose();
        },
      },
      {
        id: 'sound-pink',
        group: 'ACOUSTIC FOCUS ENGINE',
        title: 'Audio: Play Pink Noise (Balanced Rainfall Spectrum)',
        subtitle: 'Start procedural -3dB/octave pink noise synthesizer',
        badge: 'sound pink',
        keywords: 'audio sound noise pink rain focus play',
        action: () => {
          dispatchSound('play', 'pink');
          onClose();
        },
      },
      {
        id: 'sound-white',
        group: 'ACOUSTIC FOCUS ENGINE',
        title: 'Audio: Play White Noise (Crisp Masking Static)',
        subtitle: 'Start procedural white noise synthesizer',
        badge: 'sound white',
        keywords: 'audio sound noise white static focus play',
        action: () => {
          dispatchSound('play', 'white');
          onClose();
        },
      },
      {
        id: 'sound-drone',
        group: 'ACOUSTIC FOCUS ENGINE',
        title: 'Audio: Play 40Hz Binaural Focus Drone',
        subtitle: 'Start warm harmonic drone + sub-bass pad',
        badge: 'sound drone',
        keywords: 'audio sound noise drone 40hz ambient focus play',
        action: () => {
          dispatchSound('play', 'drone');
          onClose();
        },
      },
      {
        id: 'sound-stop',
        group: 'ACOUSTIC FOCUS ENGINE',
        title: 'Audio: Stop / Mute Ambient Focus Sound',
        subtitle: 'Silence active procedural audio generator',
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
        group: 'ANALYTICS HORIZON',
        title: 'Analytics: 7D Daily Breakdown (1 Bar = 1 Day)',
        subtitle: 'Switch analytics chart to 7-day daily stacked bars',
        badge: '7D DAYS',
        keywords: 'analytics chart daily 7d week bars',
        action: () => {
          onSetAnalyticsMode('daily7d');
          onClose();
        },
      },
      {
        id: 'analytics-12w',
        group: 'ANALYTICS HORIZON',
        title: 'Analytics: 12W Weekly Aggregation (1 Bar = 1 Full Week)',
        subtitle: 'Compare weekly total hours across 12 consecutive weeks',
        badge: '12W WEEKS',
        keywords: 'analytics chart weekly 12w weeks aggregation bucket',
        action: () => {
          onSetAnalyticsMode('weekly12w');
          onClose();
        },
      },
      {
        id: 'analytics-12m',
        group: 'ANALYTICS HORIZON',
        title: 'Analytics: 12M Monthly Aggregation (1 Bar = 1 Full Month)',
        subtitle: 'Compare monthly total hours across 12 consecutive months',
        badge: '12M MONTHS',
        keywords: 'analytics chart monthly 12m months year aggregation bucket',
        action: () => {
          onSetAnalyticsMode('monthly12m');
          onClose();
        },
      },
      {
        id: 'analytics-cal',
        group: 'ANALYTICS HORIZON',
        title: 'Analytics: Monthly Calendar Matrix (Day-by-Day Grid)',
        subtitle: 'Switch analytics view to monthly calendar heatmap',
        badge: '1M CAL',
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
        group: 'TIMER & WORKSPACE',
        title: isRunning ? 'Timer: Pause Active Study Stopwatch' : 'Timer: Start Study Stopwatch',
        subtitle: 'Switch to Timer mode and toggle stopwatch state',
        badge: isRunning ? 'PAUSE' : 'START',
        keywords: 'timer stopwatch start pause run clock',
        action: () => {
          onSetInputMode('timer');
          onToggleTimer();
          onClose();
        },
      },
      {
        id: 'timer-reset',
        group: 'TIMER & WORKSPACE',
        title: 'Timer: Reset Stopwatch to 00:00:00',
        subtitle: 'Clear elapsed stopwatch counter',
        badge: 'RESET',
        keywords: 'timer stopwatch reset clear',
        action: () => {
          onResetTimer();
          onClose();
        },
      },
      {
        id: 'system-card',
        group: 'SYSTEM & TELEMETRY',
        title: 'Share: Open Telemetry Status Card Generator (PNG / X)',
        subtitle: 'Render high-DPI 1200x675 shareable telemetry card',
        badge: 'CARD',
        keywords: 'share status card image png twitter x snapshot',
        action: () => {
          onClose();
          onOpenStatusCard();
        },
      },
      {
        id: 'system-clearance',
        group: 'SYSTEM & TELEMETRY',
        title: 'Clearance: Open 1,500 Ranks Directory (0h – 3,000h)',
        subtitle: 'Inspect all 1,500 telemetry clearance titles, milestones, and 48 theme rewards',
        badge: '1,500 RANKS',
        keywords: 'clearance ranks levels titles 1500 progression badge rewards',
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
        group: 'SYSTEM & TELEMETRY',
        title: 'Account: Open Profile, Avatar & Security Settings',
        subtitle: 'Configure avatar, username, password, and data vault',
        badge: 'SETTINGS',
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
        group: 'SYSTEM & TELEMETRY',
        title: `Theme: Switch to ${isDark ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle workspace monochrome color scheme',
        badge: isDark ? 'LIGHT' : 'DARK',
        keywords: 'theme dark light mode color toggle',
        action: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: 'matrix-shade',
        group: 'SYSTEM & TELEMETRY',
        title: 'Cadence Matrix: Toggle Shaded / Binary Signal Mode',
        subtitle: 'Switch contribution matrix between 4-tier shade and binary signal',
        badge: 'MATRIX',
        keywords: 'matrix cadence shaded binary color mode',
        action: () => {
          onToggleMatrixColorMode();
          onClose();
        },
      },
      {
        id: 'matrix-span',
        group: 'SYSTEM & TELEMETRY',
        title: 'Cadence Matrix: Toggle 1X / 2X Week Horizon',
        subtitle: 'Expand or compact horizontal week capacity in matrix',
        badge: '1X / 2X',
        keywords: 'matrix cadence 1x 2x span horizon weeks',
        action: () => {
          onToggleMatrixSpan();
          onClose();
        },
      },
      {
        id: 'vault-json',
        group: 'SYSTEM & TELEMETRY',
        title: 'Vault: Export Full Telemetry Archive (JSON)',
        subtitle: 'Download complete backup of categories and study logs',
        badge: 'JSON',
        keywords: 'export download backup json archive vault',
        action: () => {
          onExportJSON();
          onClose();
        },
      },
      {
        id: 'vault-csv',
        group: 'SYSTEM & TELEMETRY',
        title: 'Vault: Export Study Log Spreadsheet (CSV)',
        subtitle: 'Download study log records in CSV format',
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
            placeholder={`Type a command or quick-log (e.g., "log 90m ${sampleCatCode}", "sound brown", "12w", "card")...`}
            className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-zinc-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => updateQuery('')}
              className={`text-[10px] px-1.5 py-0.5 border ${borderCol} ${textMuted} hover:opacity-80 cursor-pointer shrink-0`}
            >
              CLEAR
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
              <span>CLI QUICK-LOG:</span>
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
          <span className={`hidden sm:inline ${textMuted}`}>↑↓ NAVIGATE // ↵ EXECUTE</span>
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
              No matching telemetry commands. Try typing{' '}
              <span className="text-emerald-400 font-semibold">log 90m {sampleCatCode}</span> or{' '}
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
          <span>TYPBOX COMMAND PALETTE // DIRECT TELEMETRY DISPATCH</span>
          <span>CMD+K / CTRL+K</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. DUAL-POLARITY SURFACE THEME PAIRS (48 PAIRS = 96 DARK/LIGHT SURFACES)
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
  | 'vignette';

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
}

const SURFACE_THEME_PAIRS: SurfaceThemePair[] = [
  // ==========================================
  // DIV-01 // INITIATE (LV.1–150 // 0H–150H) — 6 PAIRS
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
    clearanceHintLv: 1,
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
    clearanceHintLv: 2,
    dark: {
      label: 'ANODIZED SLATE',
      bgMain: '#0d0f12',
      bgCard: '#14171c',
      bgInput: '#0b0d10',
      border: '#262b33',
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
    clearanceHintLv: 6,
    dark: {
      label: 'E-READER ONYX',
      bgMain: '#121314',
      bgCard: '#1a1b1d',
      bgInput: '#0e0f10',
      border: '#2d2f33',
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
    clearanceHintLv: 16,
    dark: {
      label: 'SUMI CHARCOAL',
      bgMain: '#11100e',
      bgCard: '#181613',
      bgInput: '#0d0c0a',
      border: '#2e2a24',
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
    clearanceHintLv: 36,
    dark: {
      label: 'DARK ROAST',
      bgMain: '#130d09',
      bgCard: '#1c140e',
      bgInput: '#0e0906',
      border: '#36261b',
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
    clearanceHintLv: 76,
    dark: {
      label: 'RACING ASPHALT',
      bgMain: '#111215',
      bgCard: '#181a1f',
      bgInput: '#0c0d0f',
      border: '#2c3038',
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
  // DIV-02 // CADET (LV.151–300 // 152H–450H) — 5 PAIRS
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
    clearanceHintLv: 151,
    dark: {
      label: 'MIDNIGHT NAVY',
      bgMain: '#060c17',
      bgCard: '#0c1526',
      bgInput: '#050912',
      border: '#1b2c4a',
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
    clearanceHintLv: 185,
    dark: {
      label: 'POLAR NIGHT',
      bgMain: '#151b24',
      bgCard: '#1d2531',
      bgInput: '#11161e',
      border: '#2e394a',
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
    clearanceHintLv: 220,
    dark: {
      label: 'CRYO CHAMBER',
      bgMain: '#041116',
      bgCard: '#081b22',
      bgInput: '#030d11',
      border: '#133542',
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
    clearanceHintLv: 260,
    dark: {
      label: 'DEEP PERMAFROST',
      bgMain: '#050f18',
      bgCard: '#0b1926',
      bgInput: '#030b12',
      border: '#17324a',
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
    clearanceHintLv: 300,
    dark: {
      label: 'GLACIAL CREVASSE',
      bgMain: '#041312',
      bgCard: '#09211f',
      bgInput: '#030e0d',
      border: '#143d39',
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
  // DIV-03 // OPERATOR (LV.301–450 // 452H–750H) — 5 PAIRS
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
    clearanceHintLv: 320,
    dark: {
      label: 'P31 PHOSPHOR',
      bgMain: '#040d07',
      bgCard: '#09170e',
      bgInput: '#030a05',
      border: '#143620',
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
    clearanceHintLv: 350,
    dark: {
      label: 'DEEP MOSS',
      bgMain: '#09120b',
      bgCard: '#101d13',
      bgInput: '#070e08',
      border: '#203825',
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
    clearanceHintLv: 385,
    dark: {
      label: 'CONIFER CANOPY',
      bgMain: '#06110b',
      bgCard: '#0c1c14',
      bgInput: '#040c08',
      border: '#193626',
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
    clearanceHintLv: 420,
    dark: {
      label: 'ACID LOGIC BOARD',
      bgMain: '#0a1104',
      bgCard: '#121d08',
      bgInput: '#070c02',
      border: '#263b12',
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
    clearanceHintLv: 450,
    dark: {
      label: 'OBSIDIAN JADE',
      bgMain: '#03120e',
      bgCard: '#071f19',
      bgInput: '#020d0a',
      border: '#113b30',
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
  // DIV-04 // SPECIALIST (LV.451–600 // 752H–1,050H) — 5 PAIRS
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
    clearanceHintLv: 480,
    dark: {
      label: 'MARIANA ABYSS',
      bgMain: '#030a14',
      bgCard: '#071324',
      bgInput: '#02070f',
      border: '#132847',
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
    clearanceHintLv: 510,
    dark: {
      label: 'PELAGIC BIOLUME',
      bgMain: '#021216',
      bgCard: '#061e24',
      bgInput: '#010d10',
      border: '#0f3942',
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
    clearanceHintLv: 540,
    dark: {
      label: 'SOLARIZED TEAL',
      bgMain: '#001b22',
      bgCard: '#05262f',
      bgInput: '#00141a',
      border: '#0f3d4a',
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
    description: '1,000-hour milestone core glowing with ionized Cherenkov blue lattice.',
    pattern: 'isometric',
    accentHex: '#3b82f6',
    divisionCode: 'DIV-04',
    clearanceHintLv: 575,
    dark: {
      label: 'CHERENKOV CORE',
      bgMain: '#030d21',
      bgCard: '#081736',
      bgInput: '#020917',
      border: '#162f63',
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
    clearanceHintLv: 600,
    dark: {
      label: 'BANKER LAMP GREEN',
      bgMain: '#05130d',
      bgCard: '#0b1f17',
      bgInput: '#030d09',
      border: '#173b2c',
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
  // DIV-05 // VANGUARD (LV.601–750 // 1,052H–1,350H) — 5 PAIRS
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
    clearanceHintLv: 630,
    dark: {
      label: 'ASTROMETRY BLUE',
      bgMain: '#060b1e',
      bgCard: '#0d1430',
      bgInput: '#040817',
      border: '#1e2b5c',
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
    clearanceHintLv: 660,
    dark: {
      label: 'SHIBUYA RAIN',
      bgMain: '#090b16',
      bgCard: '#111526',
      bgInput: '#060810',
      border: '#232a4a',
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
    clearanceHintLv: 690,
    dark: {
      label: 'NOCTURNE SLATE',
      bgMain: '#14151f',
      bgCard: '#1e202e',
      bgInput: '#0f1018',
      border: '#34374d',
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
    clearanceHintLv: 720,
    dark: {
      label: 'COSMIC INDIGO',
      bgMain: '#0a0617',
      bgCard: '#120d26',
      bgInput: '#070411',
      border: '#281e4d',
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
    clearanceHintLv: 750,
    dark: {
      label: 'PLANCK HORIZON',
      bgMain: '#0c051c',
      bgCard: '#150b2e',
      bgInput: '#080313',
      border: '#2e1a59',
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
  // DIV-06 // ARCHITECT (LV.751–900 // 1,352H–1,650H) — 5 PAIRS
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
    clearanceHintLv: 780,
    dark: {
      label: 'NEON VOID',
      bgMain: '#10051a',
      bgCard: '#1a0a29',
      bgInput: '#0b0312',
      border: '#381754',
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
    clearanceHintLv: 810,
    dark: {
      label: 'WEIMAR IRONWORK',
      bgMain: '#121215',
      bgCard: '#1a1a1f',
      bgInput: '#0d0d10',
      border: '#30303a',
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
    description: '1,500-hour milestone crystalline amethyst fortress with crosshatch geometry.',
    pattern: 'crosshatch',
    accentHex: '#a855f7',
    divisionCode: 'DIV-06',
    clearanceHintLv: 825,
    dark: {
      label: 'ROYAL PLUM',
      bgMain: '#110818',
      bgCard: '#1b0f26',
      bgInput: '#0c0512',
      border: '#331d47',
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
    clearanceHintLv: 860,
    dark: {
      label: 'DEEP PULSAR',
      bgMain: '#160516',
      bgCard: '#240a24',
      bgInput: '#100310',
      border: '#421542',
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
    clearanceHintLv: 900,
    dark: {
      label: 'MONASTIC SLATE',
      bgMain: '#121311',
      bgCard: '#191b18',
      bgInput: '#0d0e0c',
      border: '#2c2f2a',
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
  // DIV-07 // OVERSEER (LV.901–1,050 // 1,652H–1,950H) — 4 PAIRS
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
    clearanceHintLv: 935,
    dark: {
      label: 'NIGHT BLOSSOM',
      bgMain: '#15080f',
      bgCard: '#210d18',
      bgInput: '#0f050a',
      border: '#3d192c',
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
    clearanceHintLv: 975,
    dark: {
      label: 'OBSIDIAN BLUSH',
      bgMain: '#160b0f',
      bgCard: '#221218',
      bgInput: '#10070a',
      border: '#3d222b',
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
    clearanceHintLv: 1015,
    dark: {
      label: 'VINTAGE CELLAR',
      bgMain: '#17050a',
      bgCard: '#240911',
      bgInput: '#110307',
      border: '#421422',
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
    clearanceHintLv: 1050,
    dark: {
      label: 'BORDEAUX STEALTH',
      bgMain: '#160609',
      bgCard: '#220a10',
      bgInput: '#100406',
      border: '#421620',
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
  // DIV-08 // SENTINEL (LV.1,051–1,200 // 1,952H–2,250H) — 4 PAIRS
  // ==========================================
  {
    id: 'volcanic-basalt',
    code: 'THM-36',
    name: 'VOLCANIC MAGMA BASALT',
    pairLabel: 'MAGMA BASALT ⇄ PUMICE TRAVERTINE',
    description: '2,000-hour milestone tectonic basalt infused with ember warmth and travertine.',
    pattern: 'grid',
    accentHex: '#f97316',
    divisionCode: 'DIV-08',
    clearanceHintLv: 1075,
    dark: {
      label: 'MAGMA BASALT',
      bgMain: '#140906',
      bgCard: '#200f0b',
      bgInput: '#0e0604',
      border: '#3d1f17',
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
    clearanceHintLv: 1115,
    dark: {
      label: 'KILN EARTHENWARE',
      bgMain: '#160b07',
      bgCard: '#22120c',
      bgInput: '#100704',
      border: '#402218',
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
    clearanceHintLv: 1160,
    dark: {
      label: 'CATHODE UMBER',
      bgMain: '#130c04',
      bgCard: '#1e1408',
      bgInput: '#0d0802',
      border: '#3b2810',
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
    clearanceHintLv: 1200,
    dark: {
      label: 'SMELTED BRONZE',
      bgMain: '#130b07',
      bgCard: '#1c110b',
      bgInput: '#0d0704',
      border: '#382217',
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
  // DIV-09 // SOVEREIGN (LV.1,201–1,350 // 2,252H–2,625H) — 4 PAIRS
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
    clearanceHintLv: 1235,
    dark: {
      label: 'EDISON FILAMENT',
      bgMain: '#141007',
      bgCard: '#1e180b',
      bgInput: '#0e0b04',
      border: '#3b3016',
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
    clearanceHintLv: 1270,
    dark: {
      label: 'DARKROOM BROMIDE',
      bgMain: '#14110d',
      bgCard: '#1d1913',
      bgInput: '#0e0c09',
      border: '#362e24',
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
    description: '2,500-hour Quarter-Myriad desert twilight paired with sun-baked limestone.',
    pattern: 'dots',
    accentHex: '#eab308',
    divisionCode: 'DIV-09',
    clearanceHintLv: 1300,
    dark: {
      label: 'DESERT NIGHT',
      bgMain: '#13100a',
      bgCard: '#1c170f',
      bgInput: '#0d0b07',
      border: '#362d1f',
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
    clearanceHintLv: 1350,
    dark: {
      label: 'ONYX BULLION',
      bgMain: '#110e05',
      bgCard: '#1a1509',
      bgInput: '#0b0903',
      border: '#382f14',
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
  // DIV-10 // MONOLITH (LV.1,351–1,500 // 2,628H–3,000H) — 5 PAIRS
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
    clearanceHintLv: 1380,
    dark: {
      label: 'BALLISTIC WEAVE',
      bgMain: '#0c0d0f',
      bgCard: '#14161a',
      bgInput: '#08090b',
      border: '#272b33',
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
    clearanceHintLv: 1410,
    dark: {
      label: 'HOUSTON CONSOLE',
      bgMain: '#080e16',
      bgCard: '#101926',
      bgInput: '#05090f',
      border: '#1f314a',
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
    clearanceHintLv: 1440,
    dark: {
      label: 'GUNMETAL ALLOY',
      bgMain: '#0e1116',
      bgCard: '#161b22',
      bgInput: '#090b0f',
      border: '#293240',
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
    clearanceHintLv: 1470,
    dark: {
      label: 'IRIDIUM VOID',
      bgMain: '#07090e',
      bgCard: '#10141f',
      bgInput: '#05060a',
      border: '#242c42',
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
    name: 'OMEGA SINGULARITY // 3,000H',
    pairLabel: 'EVENT HORIZON ⇄ ASTRAL DIAMOND',
    description: 'Apex 3,000-hour (LV.1500) singularity surface combining cosmic void and diamond daylight.',
    pattern: 'blueprint',
    accentHex: '#f43f5e',
    divisionCode: 'DIV-10',
    clearanceHintLv: 1500,
    dark: {
      label: 'EVENT HORIZON',
      bgMain: '#06040b',
      bgCard: '#0e0a17',
      bgInput: '#040208',
      border: '#291d42',
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
  const base: React.CSSProperties = {
    backgroundColor: pal.bgMain,
    color: pal.textMain,
  };

  if (pair.pattern === 'grid') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%), linear-gradient(to right, ${pal.patternTint} 1px, transparent 1px), linear-gradient(to bottom, ${pal.patternTint} 1px, transparent 1px)`;
    base.backgroundSize = '100% 100%, 28px 28px, 28px 28px';
  } else if (pair.pattern === 'dots') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%), radial-gradient(${pal.patternTint} 1.25px, transparent 1.25px)`;
    base.backgroundSize = '100% 100%, 20px 20px';
  } else if (pair.pattern === 'blueprint') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 75%), linear-gradient(to right, ${pal.patternTint} 1px, transparent 1px), linear-gradient(to bottom, ${pal.patternTint} 1px, transparent 1px)`;
    base.backgroundSize = '100% 100%, 48px 48px, 48px 48px';
  } else if (pair.pattern === 'scanline') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%), repeating-linear-gradient(to bottom, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 4px)`;
  } else if (pair.pattern === 'radial') {
    base.backgroundImage = `radial-gradient(circle at 18% 12%, ${pal.glowTint}, transparent 55%), radial-gradient(circle at 82% 85%, ${pal.glowTint}, transparent 55%)`;
  } else if (pair.pattern === 'diagonal') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%), repeating-linear-gradient(135deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 14px)`;
  } else if (pair.pattern === 'crosshatch') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%), repeating-linear-gradient(45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 22px), repeating-linear-gradient(-45deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 22px)`;
  } else if (pair.pattern === 'isometric') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 75%), repeating-linear-gradient(60deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 26px), repeating-linear-gradient(-60deg, ${pal.patternTint} 0px, ${pal.patternTint} 1px, transparent 1px, transparent 26px)`;
  } else if (pair.pattern === 'horizon') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%), linear-gradient(to bottom, ${pal.patternTint} 1px, transparent 1px)`;
    base.backgroundSize = '100% 100%, 100% 24px';
  } else if (pair.pattern === 'circuit') {
    base.backgroundImage = `radial-gradient(circle at 50% 0%, ${pal.glowTint}, transparent 70%), linear-gradient(to right, ${pal.patternTint} 1px, transparent 1px)`;
    base.backgroundSize = '100% 100%, 32px 100%';
  } else if (pair.pattern === 'vignette') {
    base.backgroundImage = `radial-gradient(circle at 50% 15%, ${pal.glowTint}, transparent 65%), radial-gradient(${pal.patternTint} 1px, transparent 1px)`;
    base.backgroundSize = '100% 100%, 30px 30px';
  }

  return base;
}

interface SurfaceThemeSelectorPanelProps {
  activeThemeId: string;
  onSelectThemeId: (id: string) => void;
  isDark: boolean;
  onTogglePolarity: () => void;
  userClearanceLevel: number;
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
  userTotalHours,
  borderCol,
  textMuted,
}) => {
  const [unlockFilter, setUnlockFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedDiv, setSelectedDiv] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const activePair = useMemo(() => getSurfaceThemeById(activeThemeId), [activeThemeId]);

  const unlockedCount = useMemo(
    () => SURFACE_THEME_PAIRS.filter((t) => userClearanceLevel >= t.clearanceHintLv).length,
    [userClearanceLevel]
  );

  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SURFACE_THEME_PAIRS.filter((item) => {
      const isUnlocked = userClearanceLevel >= item.clearanceHintLv;
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
  }, [unlockFilter, selectedDiv, searchQuery, userClearanceLevel]);

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
                {unlockedCount} / {SURFACE_THEME_PAIRS.length} PAIRS UNLOCKED
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
                <span>ACTIVE: DARK // SWITCH TO LIGHT</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>ACTIVE: LIGHT // SWITCH TO DARK</span>
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
              <span>MODULE CARD</span>
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
              <span>MODULE CARD</span>
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
              DISMISS
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
              placeholder="Search 48 theme pairs (e.g., Blueprint, Matcha, Apollo, THM-24)..."
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
          <div className={`flex border ${borderCol} text-[10px]`}>
            {(
              [
                ['all', `ALL (48)`],
                ['unlocked', `UNLOCKED (${unlockedCount})`],
                ['locked', `LOCKED (${48 - unlockedCount})`],
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

        {/* Division Filter Strip */}
        <div className="flex flex-wrap gap-1">
          {['ALL', 'DIV-01', 'DIV-02', 'DIV-03', 'DIV-04', 'DIV-05', 'DIV-06', 'DIV-07', 'DIV-08', 'DIV-09', 'DIV-10'].map(
            (divCode) => (
              <button
                key={divCode}
                type="button"
                onClick={() => setSelectedDiv(divCode)}
                className={`px-2 py-0.5 text-[9px] border cursor-pointer ${
                  selectedDiv === divCode
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                    : `${borderCol} ${textMuted}`
                }`}
              >
                {divCode}
              </button>
            )
          )}
        </div>
      </div>

      {/* Scrollable 48 Theme Pairs Grid */}
      <div className="flex-1 min-h-[220px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 content-start">
        {filteredThemes.map((item) => {
          const isSelected = item.id === activeThemeId;
          const isUnlocked = userClearanceLevel >= item.clearanceHintLv;
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
                } else {
                  setLockedNotice(
                    `[${item.code} // ${item.name}] unlocks at CLEARANCE LV.${String(
                      item.clearanceHintLv
                    ).padStart(4, '0')} (${reqHours}H — need ${hoursRemaining}H more).`
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
                      EQUIPPED
                    </span>
                  ) : isUnlocked ? (
                    <span className="px-1.5 py-0.2 border border-emerald-500/40 text-emerald-400 text-[9px] font-bold uppercase shrink-0">
                      UNLOCKED
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 border ${borderCol} text-amber-400 flex items-center space-x-1 shrink-0`}
                      title={`Requires Clearance LV.${item.clearanceHintLv} (${reqHours}H)`}
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



