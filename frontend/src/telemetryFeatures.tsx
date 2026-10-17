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
} from 'lucide-react';
import type { Category, StudyLog } from './App';

// ==========================================
// 1. TELEMETRY CLEARANCE LEVEL SYSTEM (500 RANKS // 5X EXPANSION)
// ==========================================

export interface ClearanceLevel {
  level: number;
  title: string;
  jpSubtitle: string;
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
  jpName: string;
  minLevel: number;
  maxLevel: number;
  minHours: number;
  maxHours: number;
  color: string;
}

const CLEARANCE_DIVISIONS: ClearanceDivision[] = [
  { index: 1, code: 'DIV-01', name: 'INITIATE', jpName: '初等観測部門', minLevel: 1, maxLevel: 50, minHours: 0, maxHours: 75, color: '#a1a1aa' },
  { index: 2, code: 'DIV-02', name: 'CADET', jpName: '軌道訓練部門', minLevel: 51, maxLevel: 100, minHours: 77, maxHours: 200, color: '#38bdf8' },
  { index: 3, code: 'DIV-03', name: 'OPERATOR', jpName: '実戦通信部門', minLevel: 101, maxLevel: 150, minHours: 204, maxHours: 450, color: '#10b981' },
  { index: 4, code: 'DIV-04', name: 'SPECIALIST', jpName: '高度解析部門', minLevel: 151, maxLevel: 200, minHours: 458, maxHours: 850, color: '#06b6d4' },
  { index: 5, code: 'DIV-05', name: 'VANGUARD', jpName: '先鋒突破部門', minLevel: 201, maxLevel: 250, minHours: 862, maxHours: 1500, color: '#6366f1' },
  { index: 6, code: 'DIV-06', name: 'ARCHITECT', jpName: '構造設計部門', minLevel: 251, maxLevel: 300, minHours: 1518, maxHours: 2400, color: '#a855f7' },
  { index: 7, code: 'DIV-07', name: 'OVERSEER', jpName: '広域統括部門', minLevel: 301, maxLevel: 350, minHours: 2424, maxHours: 3600, color: '#ec4899' },
  { index: 8, code: 'DIV-08', name: 'SENTINEL', jpName: '不撓守護部門', minLevel: 351, maxLevel: 400, minHours: 3632, maxHours: 5200, color: '#f97316' },
  { index: 9, code: 'DIV-09', name: 'SOVEREIGN', jpName: '絶対王権部門', minLevel: 401, maxLevel: 450, minHours: 5240, maxHours: 7200, color: '#eab308' },
  { index: 10, code: 'DIV-10', name: 'MONOLITH', jpName: '究極神話部門', minLevel: 451, maxLevel: 500, minHours: 7256, maxHours: 10000, color: '#f43f5e' },
];

// 10 Archetypes per Division × 5 Grades (V, IV, III, II, I) = 50 Ranks per Division × 10 Divisions = 500 Ranks!
const DIVISION_ARCHETYPES: Record<number, Array<[string, string]>> = {
  1: [
    ['BOOT NODE', '初期起動ノード'],
    ['PULSE LISTENER', 'パルス聴取者'],
    ['SIGNAL SEEKER', 'シグナル探求者'],
    ['TERMINAL NOVICE', 'ターミナル実習生'],
    ['LOG APPRENTICE', '記録見習い'],
    ['SYNTAX RUNNER', '構文ランナー'],
    ['HABIT SPARK', '習慣の火花'],
    ['ROUTINE LINKER', 'ルーティン接続者'],
    ['TRACE TRACKER', 'トレース追跡者'],
    ['INITIATE PRIME', 'イニシエイト極意'],
  ],
  2: [
    ['CADET PROBATION', 'カデット候補生'],
    ['CIRCUIT BUILDER', '回路構築者'],
    ['STATIC BREAKER', 'ノイズ突破者'],
    ['VECTOR PILOT', 'ベクトル操縦士'],
    ['GRID NAVIGATOR', 'グリッド航海士'],
    ['CORE CALIBRATOR', 'コア調整官'],
    ['PHASE SPRINTER', 'フェーズ走者'],
    ['RELAY GUARDIAN', 'リレー衛士'],
    ['ORBITAL CADET', '軌道カデット'],
    ['CENTURION CADET', 'カデット主席'],
  ],
  3: [
    ['FIELD OPERATOR', 'フィールド通信官'],
    ['DATA RELAYER', 'データ中継官'],
    ['CHRONO KEEPER', '時間管理官'],
    ['STREAM ANALYST', 'ストリーム解析官'],
    ['PROTOCOL GUARD', 'プロトコル衛士'],
    ['DUPLEX OPERATOR', '二重通信オペレーター'],
    ['MATRIX WATCHER', 'マトリクス監視官'],
    ['PACKET ROUTER', 'パケット制御官'],
    ['HIGH-GAIN OPERATOR', '高出力オペレーター'],
    ['OPERATOR PRIME', 'オペレーター極意'],
  ],
  4: [
    ['TELEMETRY SPECIALIST', 'テレメトリー専門官'],
    ['CYCLE ENGINEER', '周回エンジニア'],
    ['DEEP BUFFER', 'ディープバッファ技師'],
    ['SPECTRUM TUNER', 'スペクトラム調律官'],
    ['LOGIC SYNTHESIZER', '論理シンセサイザー'],
    ['SIGNAL AUDITOR', 'シグナル監査官'],
    ['FREQUENCY MASTER', '周波数マスター'],
    ['PRECISION CRAFTER', '精密クラフト技師'],
    ['QUANTUM SPECIALIST', '量子スペシャリスト'],
    ['SPECIALIST PRIME', 'スペシャリスト極意'],
  ],
  5: [
    ['VANGUARD SCOUT', 'ヴァンガード斥候'],
    ['HORIZON BREAKER', 'ホライズン突破者'],
    ['FRONTIER RUNNER', 'フロンティア走者'],
    ['KILO-NODE STRIKER', 'キロノード撃破者'],
    ['MILLENNIUM VANGUARD', '千時間ヴァンガード'],
    ['HYPERION PILOT', 'ハイペリオン操縦長'],
    ['AETHER NAVIGATOR', 'エーテル航海長'],
    ['STARLIGHT LANCER', 'スターライト槍騎兵'],
    ['NOVA COMMANDER', 'ノヴァ指揮官'],
    ['VANGUARD PRIME', 'ヴァンガード極意'],
  ],
  6: [
    ['SYSTEM ARCHITECT', 'システム設計官'],
    ['FOUNDATION BUILDER', '基盤構築者'],
    ['SCHEMA DIRECTOR', 'スキーマ統括官'],
    ['NEURAL CARTOGRAPHER', 'ニューラル製図家'],
    ['MONOLITH DRAFTER', 'モノリス設計技師'],
    ['BI-MILLENNIUM ARCHITECT', '二千時間アーキテクト'],
    ['CITADEL ENGINEER', 'シタデル構築長'],
    ['NEXUS STRUCTURALIST', 'ネクサス構造家'],
    ['LATTICE MASTER', 'ラティス支配者'],
    ['ARCHITECT PRIME', 'アーキテクト極意'],
  ],
  7: [
    ['SECTOR OVERSEER', 'セクター監督官'],
    ['CHRONO WARDEN', 'クロノ監視長'],
    ['ORBITAL DIRECTOR', '軌道統括ディレクター'],
    ['TRI-KILO WATCHER', '三千時間ウォッチャー'],
    ['TRI-MILLENNIUM OVERSEER', '三千時間オーバーシア'],
    ['ZENITH CUSTODIAN', 'ゼニス管理官'],
    ['OBELISK GUARDIAN', 'オベリスク守護官'],
    ['DOMINION INSPECTOR', 'ドミニオン検閲官'],
    ['GRAND ARBITER', 'グランド裁定者'],
    ['OVERSEER PRIME', 'オーバーシア極意'],
  ],
  8: [
    ['AEGIS SENTINEL', 'イージス守護騎士'],
    ['TETRA-KILO BASTION', '四千時間バスティオン'],
    ['SOLAR WARDEN', 'ソーラー守護長'],
    ['VOID SENTINEL', 'ヴォイド監視騎士'],
    ['ASTRAL PALADIN', 'アストラル聖騎士'],
    ['CHRONO TEMPLAR', 'クロノ・テンプラー'],
    ['PENTA-MILLENNIUM TITAN', '五千時間タイタン'],
    ['CELESTIAL KEEPER', 'セレスティアル番人'],
    ['IMMORTAL ENGINE', '不滅の動力炉'],
    ['SENTINEL PRIME', 'センチネル極意'],
  ],
  9: [
    ['HIGH SOVEREIGN', 'ハイ・ソヴリン'],
    ['CROWN OF CADENCE', 'ケイデンスの王冠'],
    ['HEXA-MILLENNIUM LORD', '六千時間の覇王'],
    ['EMPYREAN REGENT', '天上の摂政'],
    ['IMPERIAL ARCHON', 'インペリアル執政官'],
    ['ASTRAL MONARCH', '星界の君主'],
    ['SEVEN-THOUSAND HORIZON', '七千時間ホライズン'],
    ['HEPTA-MILLENNIUM SOVEREIGN', '七千時間の絶対王者'],
    ['ETERNAL DYNASTY', '久遠の王朝'],
    ['SOVEREIGN PRIME', 'ソヴリン極意'],
  ],
  10: [
    ['MONOLITH ASCENDANT', 'モノリス覚醒者'],
    ['OCTA-MILLENNIUM TITAN', '八千時間の巨神'],
    ['SINGULARITY CORE', 'シンギュラリティ核'],
    ['COSMIC ARCHITECT', '宇宙構造設計神'],
    ['TIMELESS ORACLE', '無窮のオラクル'],
    ['NONA-MILLENNIUM DEITY', '九千時間の神域'],
    ['AKASHIC RECORDER', 'アカシック記録神'],
    ['DIMENSION WEAVER', '次元紡ぎの超越者'],
    ['APEX OF ETERNITY', '永劫の頂'],
    ['OMEGA MONOLITH', '一万時間の究極モノリス'],
  ],
};

// Special exact hour milestones to highlight
const SPECIAL_HOUR_OVERRIDES: Record<number, { title: string; jp: string }> = {
  0: { title: 'ZERO-HOUR INITIALIZATION', jp: '0時間・観測システム初期起動' },
  1: { title: 'FIRST IGNITION // 1H', jp: '最初の1時間達成・点火完了' },
  10: { title: 'DECA-HOUR LOCK // 10H', jp: '10時間達成・初期軌道ロック' },
  50: { title: 'HALF-CENTURY CORE // 50H', jp: '50時間達成・半百の核' },
  100: { title: 'CENTURION MILESTONE // 100H', jp: '100時間達成・百時間の金字塔' },
  200: { title: 'BI-CENTURY OPERATOR // 200H', jp: '200時間達成・二百時間の証' },
  300: { title: 'TRI-CENTURY VANGUARD // 300H', jp: '300時間達成・三百時間の熟練' },
  500: { title: 'HALF-MILLENNIUM TITAN // 500H', jp: '500時間達成・五百時間の覇者' },
  750: { title: 'THREE-QUARTER KILO // 750H', jp: '750時間達成・千時間への視界' },
  1000: { title: 'MILLENNIUM ASCENSION // 1,000H', jp: '1000時間達成・千時間の大台突破' },
  1500: { title: 'SESQUI-MILLENNIUM // 1,500H', jp: '1500時間達成・千五百時間の礎' },
  2000: { title: 'BI-MILLENNIUM ARCHITECT // 2,000H', jp: '2000時間達成・二千時間の巨匠' },
  2500: { title: 'QUARTER-MYRIAD // 2,500H', jp: '2500時間達成・四分の一万時間' },
  3000: { title: 'TRI-MILLENNIUM OVERSEER // 3,000H', jp: '3000時間達成・三千時間の統治者' },
  4000: { title: 'TETRA-MILLENNIUM SENTINEL // 4,000H', jp: '4000時間達成・四千時間の不撓' },
  5000: { title: 'PENTA-MILLENNIUM MYTH // 5,000H', jp: '5000時間達成・五千時間の神話' },
  6000: { title: 'HEXA-MILLENNIUM EMPEROR // 6,000H', jp: '6000時間達成・六千時間の覇帝' },
  7000: { title: 'HEPTA-MILLENNIUM SOVEREIGN // 7,000H', jp: '7000時間達成・七千時間の絶対王者' },
  8000: { title: 'OCTA-MILLENNIUM MONOLITH // 8,000H', jp: '8000時間達成・八千時間の巨塔' },
  9000: { title: 'NONA-MILLENNIUM DEITY // 9,000H', jp: '9000時間達成・九千時間の神域' },
  10000: { title: 'OMEGA MONOLITH // 10,000H', jp: '10000時間達成・究極のモノリス' },
};

function build500ClearanceLevels(): ClearanceLevel[] {
  // Hour anchors at every 50th level (0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500)
  // Designed so 0h..75h has 50 ranks (~1.5h/rank), 75h..200h has 50 ranks (2.5h/rank),
  // 200h..450h (5h/rank), 450h..850h (8h/rank), 850h..1500h (13h/rank),
  // 1500h..2400h (18h/rank), 2400h..3600h (24h/rank), 3600h..5200h (32h/rank),
  // 5200h..7200h (40h/rank -> hits 7,000h at LV.445!), 7200h..10000h (56h/rank)
  const divisionHourBounds: Array<[number, number]> = [
    [0, 75],       // DIV 1: LV 1..50
    [75, 200],     // DIV 2: LV 51..100
    [200, 450],    // DIV 3: LV 101..150
    [450, 850],    // DIV 4: LV 151..200
    [850, 1500],   // DIV 5: LV 201..250
    [1500, 2400],  // DIV 6: LV 251..300
    [2400, 3600],  // DIV 7: LV 301..350
    [3600, 5200],  // DIV 8: LV 351..400
    [5200, 7200],  // DIV 9: LV 401..450 (LV.445 = 7,000H!)
    [7200, 10000], // DIV 10: LV 451..500
  ];

  const romanTiers = ['I', 'II', 'III', 'IV', 'V'];
  const jpTierLabels = ['壱式', '弐式', '参式', '肆式', '伍式・極'];
  const result: ClearanceLevel[] = [];

  for (let divIdx = 1; divIdx <= 10; divIdx++) {
    const div = CLEARANCE_DIVISIONS[divIdx - 1];
    const [startH, endH] = divisionHourBounds[divIdx - 1];
    const archetypes = DIVISION_ARCHETYPES[divIdx];

    for (let offset = 0; offset < 50; offset++) {
      const level = (divIdx - 1) * 50 + offset + 1;
      let reqHours: number;

      if (level === 1) {
        reqHours = 0;
      } else if (divIdx === 1) {
        // LV 1..50: 0h to 75h, smooth 1h-2h steps
        reqHours = Math.round((offset / 49) * 75);
        // ensure strictly increasing at least +1h from previous
        const prevH = result[result.length - 1].requiredHours;
        if (reqHours <= prevH) reqHours = prevH + 1;
      } else {
        const step = (endH - startH) / 50;
        reqHours = Math.round(startH + (offset + 1) * step);
      }

      // Snap near major round milestones if closest
      const archIdx = Math.floor(offset / 5);
      const gradeIdx = offset % 5;
      const [archTitle, archJp] = archetypes[archIdx];
      const roman = romanTiers[gradeIdx];
      const jpGrade = jpTierLabels[gradeIdx];

      const override = SPECIAL_HOUR_OVERRIDES[reqHours];
      const title = override ? override.title : `${archTitle} ${roman}`;
      const jpSubtitle = override
        ? override.jp
        : `${div.jpName} // ${archJp}（${jpGrade}）`;

      result.push({
        level,
        requiredHours: reqHours,
        title,
        jpSubtitle,
        division: div.name,
        divisionIndex: divIdx,
        color: div.color,
        isMajorMilestone: Boolean(override) || (offset + 1) % 25 === 0,
      });
    }
  }

  return result;
}

const CLEARANCE_LEVELS: ClearanceLevel[] = build500ClearanceLevels();

export interface UserClearanceStatus {
  current: ClearanceLevel;
  next: ClearanceLevel | null;
  totalHours: number;
  hoursIntoLevel: number;
  levelSpanHours: number;
  progressPct: number;
  hoursRemainingToNext: number;
  subPhase: number; // 1..5 stars/pips within current level to prevent monotony
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
        className={`px-2.5 py-2 border transition-colors flex items-center space-x-1.5 font-mono text-[11px] cursor-pointer ${
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
            <span className="hidden sm:inline font-semibold tracking-wider">{activeProfile.code}</span>
            <span className="flex items-end space-x-0.5 h-3 ml-0.5">
              <span className="w-0.5 h-2 bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-3 bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-1.5 bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4 opacity-75" />
            <span className={`hidden sm:inline ${textMuted}`}>NOISE</span>
          </>
        )}
      </button>

      {showPopover && (
        <div
          className={`absolute right-0 top-full mt-2 w-72 sm:w-80 border ${borderCol} ${bgCard} shadow-2xl z-50 p-4 font-mono text-xs space-y-3.5`}
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
// 3. CLEARANCE BROWSER PANEL (ALL 500 LEVELS)
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
  const [filterMode, setFilterMode] = useState<'all' | 'milestones' | 'unlocked' | 'locked'>('all');
  const [selectedDiv, setSelectedDiv] = useState<number | null>(clearance.current.divisionIndex);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLevels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CLEARANCE_LEVELS.filter((lvl) => {
      if (selectedDiv !== null && lvl.divisionIndex !== selectedDiv) return false;
      const isUnlocked = clearance.totalHours >= lvl.requiredHours;
      if (filterMode === 'unlocked' && !isUnlocked) return false;
      if (filterMode === 'locked' && isUnlocked) return false;
      if (filterMode === 'milestones' && !lvl.isMajorMilestone) return false;
      if (q) {
        const matchLv = `lv.${lvl.level}`.includes(q) || String(lvl.level) === q;
        const matchHours = `${lvl.requiredHours}h`.includes(q);
        const matchTitle =
          lvl.title.toLowerCase().includes(q) || lvl.jpSubtitle.toLowerCase().includes(q);
        return matchLv || matchHours || matchTitle;
      }
      return true;
    });
  }, [selectedDiv, filterMode, searchQuery, clearance.totalHours]);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Current Clearance Summary Card */}
      <div
        className={`p-4 border ${borderCol} ${
          isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'
        } space-y-3 relative overflow-hidden`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <span
              className="px-2 py-1 text-xs font-bold text-zinc-950"
              style={{ backgroundColor: clearance.current.color }}
            >
              LV.{String(clearance.current.level).padStart(3, '0')}
            </span>
            <div>
              <div className="text-sm font-bold tracking-wider flex items-center space-x-2">
                <span>{clearance.current.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
                  {clearance.current.division}
                </span>
              </div>
              <div className={`text-[11px] font-sans ${textMuted}`}>
                {clearance.current.jpSubtitle} — 累計{' '}
                <strong className="text-emerald-400">{clearance.totalHours}h</strong> 達成 (
                {clearance.unlockedCount} / {clearance.totalRanks} 称号解放済)
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
                Next Rank in{' '}
                <span className="text-emerald-400 font-bold">{clearance.hoursRemainingToNext}h</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span>
              CURRENT: LV.{String(clearance.current.level).padStart(3, '0')} (
              {clearance.current.requiredHours}h)
            </span>
            {clearance.next ? (
              <span>
                NEXT: LV.{String(clearance.next.level).padStart(3, '0')} {clearance.next.title} (
                {clearance.next.requiredHours}h) — {clearance.progressPct}%
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">MAX CLEARANCE ACHIEVED (10,000H+)</span>
            )}
          </div>
          <div className={`w-full h-2 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} overflow-hidden`}>
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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={`flex items-center border ${borderCol} px-2.5 py-1 flex-1 min-w-[180px]`}>
            <Search className={`w-3.5 h-3.5 mr-2 ${textMuted}`} />
            <input
              type="text"
              placeholder="Search 500 ranks (e.g. 7000h, SOVEREIGN, 王者)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) setSelectedDiv(null);
              }}
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>

          <div className={`flex border ${borderCol} text-[10px]`}>
            {(
              [
                { id: 'all', label: 'ALL' },
                { id: 'milestones', label: 'KEY MILESTONES' },
                { id: 'unlocked', label: 'UNLOCKED' },
                { id: 'locked', label: 'LOCKED' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFilterMode(m.id)}
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

        {/* 10 Division Tabs (50 Ranks per Division = 500 Total) */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedDiv(null)}
            className={`px-2 py-1 text-[10px] border cursor-pointer ${
              selectedDiv === null
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                : `${borderCol} ${textMuted}`
            }`}
          >
            ALL 500 RANKS
          </button>
          {CLEARANCE_DIVISIONS.map((div) => {
            const isSelected = selectedDiv === div.index;
            return (
              <button
                key={div.code}
                type="button"
                onClick={() => setSelectedDiv(isSelected ? null : div.index)}
                title={`${div.jpName} (LV.${div.minLevel}–${div.maxLevel} // ${div.minHours}h–${div.maxHours}h)`}
                className={`px-2 py-1 text-[10px] border flex items-center space-x-1 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                    : `${borderCol} ${textMuted} hover:opacity-100`
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: div.color }} />
                <span>
                  {div.name} ({div.minHours}h–{div.maxHours}h)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable 500 Ranks List */}
      <div
        className={`max-h-80 overflow-y-auto border ${borderCol} divide-y ${
          isDark ? 'divide-zinc-800/70' : 'divide-zinc-200'
        }`}
      >
        {filteredLevels.map((lvl) => {
          const unlocked = clearance.totalHours >= lvl.requiredHours;
          const isCurrent = clearance.current.level === lvl.level;
          return (
            <div
              key={lvl.level}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                isCurrent
                  ? 'bg-emerald-500/15'
                  : lvl.isMajorMilestone
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
                  className={`w-14 text-center py-1 text-[10px] font-bold shrink-0 border ${
                    unlocked ? 'text-zinc-950 border-transparent' : `${borderCol} ${textMuted}`
                  }`}
                  style={unlocked ? { backgroundColor: lvl.color } : undefined}
                >
                  LV.{String(lvl.level).padStart(3, '0')}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs truncate">{lvl.title}</span>
                    {lvl.isMajorMilestone && (
                      <span className="px-1.5 py-0.2 border border-amber-500/50 text-amber-400 text-[9px] font-bold uppercase shrink-0">
                        MILESTONE
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 bg-emerald-500 text-zinc-950 text-[9px] font-bold uppercase shrink-0">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] font-sans truncate ${textMuted}`}>
                    [{lvl.division}] {lvl.jpSubtitle}
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
                      あと {(lvl.requiredHours - clearance.totalHours).toFixed(1)}h
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

    const lvlTag = `LV.${String(clearance.current.level).padStart(3, '0')} // ${clearance.current.title}`;
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
        ? `CLEARANCE PROGRESS // NEXT: LV.${String(clearance.next.level).padStart(3, '0')} (${clearance.next.requiredHours}H)`
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
      `VERIFIED TELEMETRY // CLEARANCE LV.${String(clearance.current.level).padStart(3, '0')} (${clearance.current.title})`,
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
    const text = `TYPBOX // TELEMETRY SNAPSHOT\nCLEARANCE: LV.${String(clearance.current.level).padStart(3, '0')} [${clearance.current.title}]\nTOTAL: ${totalHours} HRS | STREAK: ${currentStreak} DAYS\n#TYPBOX #StudyLog`;
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

export { Award };
