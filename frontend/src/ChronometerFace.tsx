import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { tf, useI18n } from './i18n';
import { CLEARANCE_LEVELS } from './telemetryFeatures';
import {
  CHRONO_FAMILIES,
  CHRONO_THEMES,
  chronoFontStack,
  chronoUnlockRank,
  ensureChronoFont,
  formatChronoText,
  isChronoThemeUnlocked,
  type ChronoProgress,
  type ChronoRender,
  type ChronoTheme,
} from './chronometerThemes';

// ==========================================
// Graphic numeral renderers (inline SVG, sized in em so they scale with the
// surrounding text size exactly like a font would)
// ==========================================

// Seven-segment: a..g segment polygons in a 56×100 cell.
const SEG_T = 9;
const hSeg = (x1: number, x2: number, y: number) => {
  const h = SEG_T / 2;
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`;
};
const vSeg = (x: number, y1: number, y2: number) => {
  const h = SEG_T / 2;
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`;
};
const SEG_L = 8;
const SEG_R = 48;
const SEG_TOP = 6;
const SEG_MID = 50;
const SEG_BOT = 94;
const SEG_GAP = 2;
const SEGMENTS: Record<string, string> = {
  a: hSeg(SEG_L + SEG_GAP, SEG_R - SEG_GAP, SEG_TOP),
  b: vSeg(SEG_R, SEG_TOP + SEG_GAP, SEG_MID - SEG_GAP),
  c: vSeg(SEG_R, SEG_MID + SEG_GAP, SEG_BOT - SEG_GAP),
  d: hSeg(SEG_L + SEG_GAP, SEG_R - SEG_GAP, SEG_BOT),
  e: vSeg(SEG_L, SEG_MID + SEG_GAP, SEG_BOT - SEG_GAP),
  f: vSeg(SEG_L, SEG_TOP + SEG_GAP, SEG_MID - SEG_GAP),
  g: hSeg(SEG_L + SEG_GAP, SEG_R - SEG_GAP, SEG_MID),
};
const DIGIT_SEGMENTS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];

// 5×7 dot-matrix glyphs, one string per row.
const DOT_FONT: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ':': ['0', '0', '1', '0', '1', '0', '0'],
};

const glowFilter = (r: ChronoRender) =>
  r.glow && r.on && r.on !== 'currentColor' ? `drop-shadow(0 0 0.06em ${r.on})` : undefined;

const SegmentGlyph: React.FC<{ ch: string; r: ChronoRender }> = ({ ch, r }) => {
  const on = r.on ?? 'currentColor';
  const off = r.off ?? 'transparent';
  if (ch === ':') {
    return (
      <svg viewBox="0 0 20 100" style={{ height: '1em', width: '0.2em', overflow: 'visible' }} aria-hidden>
        <rect x="5" y="27" width="9" height="9" fill={on} />
        <rect x="5" y="64" width="9" height="9" fill={on} />
      </svg>
    );
  }
  const lit = DIGIT_SEGMENTS[Number(ch)] ?? '';
  return (
    <svg
      viewBox="0 0 56 100"
      style={{ height: '1em', width: '0.56em', overflow: 'visible', transform: r.slant ? 'skewX(-7deg)' : undefined }}
      aria-hidden
    >
      {Object.entries(SEGMENTS).map(([key, points]) => (
        <polygon key={key} points={points} fill={lit.includes(key) ? on : off} />
      ))}
    </svg>
  );
};

const DotGlyph: React.FC<{ ch: string; r: ChronoRender }> = ({ ch, r }) => {
  const rows = DOT_FONT[ch] ?? DOT_FONT['0'];
  const cols = rows[0].length;
  const on = r.on ?? 'currentColor';
  const off = r.off ?? 'transparent';
  const round = r.shape !== 'square';
  return (
    <svg
      viewBox={`0 0 ${cols * 10} 70`}
      style={{ height: '1em', width: `${(cols * 10) / 70}em`, overflow: 'visible', marginRight: '0.06em' }}
      aria-hidden
    >
      {rows.flatMap((row, y) =>
        row.split('').map((bit, x) => {
          const fill = bit === '1' ? on : off;
          return round ? (
            <circle key={`${x}-${y}`} cx={x * 10 + 5} cy={y * 10 + 5} r={4} fill={fill} />
          ) : (
            <rect key={`${x}-${y}`} x={x * 10 + 0.5} y={y * 10 + 0.5} width={9} height={9} fill={fill} />
          );
        })
      )}
    </svg>
  );
};

// Mayan base-20: two stacked places (20s above 1s), dots over bars, shell = 0.
const MayanPlace: React.FC<{ value: number; y: number; color: string }> = ({ value, y, color }) => {
  if (value === 0) {
    return (
      <g stroke={color} strokeWidth={3} fill="none">
        <ellipse cx={20} cy={y + 20} rx={14} ry={7} />
        <path d={`M10 ${y + 18} Q20 ${y + 12} 30 ${y + 18}`} />
        <path d={`M12 ${y + 23} Q20 ${y + 27} 28 ${y + 23}`} />
      </g>
    );
  }
  const bars = Math.floor(value / 5);
  const dots = value % 5;
  const barTop = y + 33 - (bars - 1) * 9;
  const dotsY = bars > 0 ? barTop - 7 : y + 30;
  return (
    <g fill={color}>
      {Array.from({ length: bars }, (_, i) => (
        <rect key={`b${i}`} x={3} y={y + 33 - i * 9} width={34} height={6.5} rx={2} />
      ))}
      {Array.from({ length: dots }, (_, i) => (
        <circle key={`d${i}`} cx={20 + (i - (dots - 1) / 2) * 9} cy={dotsY} r={4} />
      ))}
    </g>
  );
};

const MayanNumber: React.FC<{ n: number; r: ChronoRender }> = ({ n, r }) => {
  const color = r.on ?? 'currentColor';
  return (
    <svg viewBox="0 0 40 84" style={{ height: '1.6em', width: '0.76em', overflow: 'visible' }} aria-hidden>
      <MayanPlace value={Math.floor(n / 20)} y={0} color={color} />
      <MayanPlace value={n % 20} y={44} color={color} />
    </svg>
  );
};

// Binary-coded decimal: each decimal digit is a column of 4 bits (8-4-2-1).
const BcdNumber: React.FC<{ n: number; r: ChronoRender }> = ({ n, r }) => {
  const on = r.on ?? 'currentColor';
  const off = r.off ?? 'transparent';
  const digits = String(n).padStart(2, '0').split('').map(Number);
  return (
    <svg
      viewBox="0 0 22 44"
      style={{ height: '1.3em', width: '0.65em', overflow: 'visible', filter: glowFilter(r) }}
      aria-hidden
    >
      {digits.flatMap((d, col) =>
        [8, 4, 2, 1].map((bit, row) => (
          <circle key={`${col}-${bit}`} cx={col * 11 + 5.5} cy={row * 11 + 5.5} r={4.2} fill={d & bit ? on : off} />
        ))
      )}
    </svg>
  );
};

// Soroban: one rod per decimal digit — the heaven bead (5) drops to the
// beam when active, earth beads (1 each) rise to it.
const SorobanDigit: React.FC<{ d: number; r: ChronoRender }> = ({ d, r }) => {
  const on = r.on ?? 'currentColor';
  const earthActive = d % 5;
  const beads: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const active = i < earthActive;
    const y = active ? 28.5 + i * 9.5 : 59.5 - (3 - i) * 9.5;
    beads.push(<ellipse key={i} cx={11} cy={y} rx={9} ry={4.3} fill={on} opacity={active ? 1 : 0.22} />);
  }
  return (
    <svg viewBox="0 0 22 66" style={{ height: '1.35em', width: '0.45em', overflow: 'visible' }} aria-hidden>
      <line x1={11} y1={0} x2={11} y2={66} stroke={on} strokeWidth={1.2} opacity={0.4} />
      <rect x={0} y={21} width={22} height={2.4} fill={on} opacity={0.6} />
      <ellipse cx={11} cy={d >= 5 ? 15.5 : 6} rx={9} ry={4.3} fill={on} opacity={d >= 5 ? 1 : 0.22} />
      {beads}
    </svg>
  );
};

// Counting rods: units drawn vertical, tens horizontal (the alternation that
// let Chinese and Japanese calculators read place value without a zero).
const RodDigit: React.FC<{ d: number; tens: boolean; r: ChronoRender }> = ({ d, tens, r }) => {
  const on = r.on ?? 'currentColor';
  const lines: React.ReactNode[] = [];
  const five = d >= 6 ? 1 : 0;
  const ones = d >= 6 ? d - 5 : d;
  if (d === 0) {
    lines.push(<circle key="z" cx={11} cy={16} r={5} fill="none" stroke={on} strokeWidth={1.4} opacity={0.35} />);
  } else if (tens) {
    for (let i = 0; i < ones; i++) {
      const y = 16 + (i - (ones - 1) / 2) * 5;
      lines.push(<line key={i} x1={3} y1={y} x2={19} y2={y} stroke={on} strokeWidth={2.2} strokeLinecap="round" />);
    }
    if (five) lines.push(<line key="f" x1={11} y1={2} x2={11} y2={8} stroke={on} strokeWidth={2.2} strokeLinecap="round" />);
  } else {
    for (let i = 0; i < ones; i++) {
      const x = 11 + (i - (ones - 1) / 2) * 4.5;
      lines.push(<line key={i} x1={x} y1={five ? 10 : 4} x2={x} y2={28} stroke={on} strokeWidth={2.2} strokeLinecap="round" />);
    }
    if (five) lines.push(<line key="f" x1={3} y1={5} x2={19} y2={5} stroke={on} strokeWidth={2.2} strokeLinecap="round" />);
  }
  return (
    <svg viewBox="0 0 22 32" style={{ height: '1em', width: '0.68em', overflow: 'visible' }} aria-hidden>
      {lines}
    </svg>
  );
};

// Punched paper tape: each digit is one frame of 4 data holes (1-2-4-8),
// an odd-parity hole and the small sprocket feed hole.
const TapeDigit: React.FC<{ d: number; r: ChronoRender }> = ({ d, r }) => {
  const on = r.on ?? 'currentColor';
  const bits = [1, 2, 4, 8].map((b) => (d & b) !== 0);
  const parity = bits.filter(Boolean).length % 2 === 0;
  const rows = [bits[0], bits[1], null, bits[2], bits[3], parity];
  return (
    <svg viewBox="0 0 12 66" style={{ height: '1.35em', width: '0.25em', overflow: 'visible' }} aria-hidden>
      <rect x={0} y={0} width={12} height={66} fill={on} opacity={0.08} />
      {rows.map((bit, i) =>
        bit === null ? (
          <circle key={i} cx={6} cy={6 + i * 10.8} r={1.6} fill={on} opacity={0.5} />
        ) : (
          <circle key={i} cx={6} cy={6 + i * 10.8} r={3.6} fill={on} opacity={bit ? 1 : 0.12} />
        )
      )}
    </svg>
  );
};

// Pips: dice-style 3×3 pip layouts, extended to 0 and 7–9.
const PIP_LAYOUTS = ['', '4', '08', '048', '0268', '02468', '023568', '0234568', '01235678', '012345678'];
const PipDigit: React.FC<{ d: number; r: ChronoRender }> = ({ d, r }) => {
  const on = r.on ?? 'currentColor';
  return (
    <svg viewBox="0 0 30 30" style={{ height: '0.9em', width: '0.9em', overflow: 'visible', marginRight: '0.06em' }} aria-hidden>
      <rect x={1} y={1} width={28} height={28} rx={6} fill="none" stroke={on} strokeWidth={1.4} opacity={0.4} />
      {PIP_LAYOUTS[d].split('').map((k) => {
        const i = Number(k);
        return <circle key={k} cx={7.5 + (i % 3) * 7.5} cy={7.5 + Math.floor(i / 3) * 7.5} r={2.6} fill={on} />;
      })}
    </svg>
  );
};

// ==========================================
// Instrument faces (analog dial, rings, gauges, word clock): one widget for
// the whole time, shown with a small digital readout beside it.
// ==========================================

const SECOND_RED = '#e11d48';

const hand = (deg: number, from: number, to: number, width: number, color: string, cap: 'round' | 'butt' = 'round') => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return (
    <line
      x1={50 + Math.cos(rad) * from}
      y1={50 + Math.sin(rad) * from}
      x2={50 + Math.cos(rad) * to}
      y2={50 + Math.sin(rad) * to}
      stroke={color}
      strokeWidth={width}
      strokeLinecap={cap}
    />
  );
};

const AnalogDial: React.FC<{ hh: number; mm: number; ss: number; r: ChronoRender; px: number; color: string }> = ({
  hh,
  mm,
  ss,
  r,
  px,
  color,
}) => {
  const hDeg = ((hh % 12) + mm / 60) * 30;
  const mDeg = (mm + ss / 60) * 6;
  const sDeg = ss * 6;
  const accent = r.on && r.on !== 'currentColor' ? r.on : '#10b981';
  let body: React.ReactNode;
  switch (r.dial) {
    case 'swiss':
      body = (
        <>
          {Array.from({ length: 60 }, (_, i) => {
            const major = i % 5 === 0;
            return <g key={i}>{hand(i * 6, major ? 34 : 41, 46, major ? 3.4 : 1.2, color, 'butt')}</g>;
          })}
          {hand(hDeg, -10, 28, 6, color, 'butt')}
          {hand(mDeg, -12, 42, 4.4, color, 'butt')}
          {hand(sDeg, -14, 31, 1.4, SECOND_RED)}
          <circle cx={50 + Math.cos(((sDeg - 90) * Math.PI) / 180) * 31} cy={50 + Math.sin(((sDeg - 90) * Math.PI) / 180) * 31} r={4.6} fill={SECOND_RED} />
          <circle cx={50} cy={50} r={1.6} fill={SECOND_RED} />
        </>
      );
      break;
    case 'bauhaus':
      body = (
        <>
          <circle cx={50} cy={50} r={46} fill="none" stroke={color} strokeWidth={3} />
          {[0, 90, 180, 270].map((deg) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            return <rect key={deg} x={50 + Math.cos(rad) * 37 - 3} y={50 + Math.sin(rad) * 37 - 3} width={6} height={6} fill={color} />;
          })}
          {hand(hDeg, 0, 24, 7, '#ef4444', 'butt')}
          {hand(mDeg, 0, 38, 4.5, '#3b82f6', 'butt')}
          <circle cx={50 + Math.cos(((sDeg - 90) * Math.PI) / 180) * 30} cy={50 + Math.sin(((sDeg - 90) * Math.PI) / 180) * 30} r={4.2} fill="#facc15" />
          <circle cx={50} cy={50} r={4} fill={color} />
        </>
      );
      break;
    case 'radar': {
      const sweep = (sDeg - 90) * (Math.PI / 180);
      const wedge = (span: number) => {
        const a0 = sweep - span;
        return `M50 50L${50 + Math.cos(a0) * 46} ${50 + Math.sin(a0) * 46}A46 46 0 0 1 ${50 + Math.cos(sweep) * 46} ${50 + Math.sin(sweep) * 46}Z`;
      };
      const blip = (deg: number, radius: number, size: number) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        return <circle cx={50 + Math.cos(rad) * radius} cy={50 + Math.sin(rad) * radius} r={size} fill={accent} />;
      };
      body = (
        <>
          {[15, 30, 46].map((rr) => (
            <circle key={rr} cx={50} cy={50} r={rr} fill="none" stroke={accent} strokeWidth={0.8} opacity={0.45} />
          ))}
          <path d="M50 4V96M4 50H96" stroke={accent} strokeWidth={0.6} opacity={0.35} />
          <path d={wedge(0.9)} fill={accent} opacity={0.12} />
          <path d={wedge(0.35)} fill={accent} opacity={0.22} />
          {hand(sDeg, 0, 46, 1.2, accent)}
          {blip(hDeg, 22, 3.6)}
          {blip(mDeg, 38, 2.8)}
        </>
      );
      break;
    }
    default:
      body = (
        <>
          {Array.from({ length: 12 }, (_, i) => {
            const rad = ((i * 30 - 90) * Math.PI) / 180;
            return <circle key={i} cx={50 + Math.cos(rad) * 44} cy={50 + Math.sin(rad) * 44} r={i % 3 === 0 ? 2.2 : 1.3} fill={color} opacity={0.7} />;
          })}
          {hand(hDeg, 0, 24, 3.2, color)}
          {hand(mDeg, 0, 37, 2, color)}
          <circle cx={50 + Math.cos(((sDeg - 90) * Math.PI) / 180) * 44} cy={50 + Math.sin(((sDeg - 90) * Math.PI) / 180) * 44} r={3} fill={accent} />
          <circle cx={50} cy={50} r={2.4} fill={color} />
        </>
      );
  }
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} style={{ overflow: 'visible', flexShrink: 0 }} aria-hidden>
      {body}
    </svg>
  );
};

const RING_COLORS = ['#f43f5e', '#a3e635', '#22d3ee'];

const ActivityRings: React.FC<{ hh: number; mm: number; ss: number; px: number }> = ({ hh, mm, ss, px }) => {
  const fracs = [(hh + mm / 60) / 24, (mm + ss / 60) / 60, ss / 60];
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} style={{ flexShrink: 0 }} aria-hidden>
      {[44, 33, 22].map((rr, i) => {
        const c = 2 * Math.PI * rr;
        return (
          <g key={rr} transform="rotate(-90 50 50)">
            <circle cx={50} cy={50} r={rr} fill="none" stroke={RING_COLORS[i]} strokeWidth={8.5} opacity={0.16} />
            <circle
              cx={50}
              cy={50}
              r={rr}
              fill="none"
              stroke={RING_COLORS[i]}
              strokeWidth={8.5}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0.001, fracs[i]) * c} ${c}`}
            />
          </g>
        );
      })}
    </svg>
  );
};

const Gauges: React.FC<{ hh: number; mm: number; ss: number; compact: boolean }> = ({ hh, mm, ss, compact }) => {
  const rows: Array<[string, number, number, string]> = [
    ['H', hh, 24, '#f59e0b'],
    ['M', mm, 60, '#10b981'],
    ['S', ss, 60, '#22d3ee'],
  ];
  return (
    <span className="inline-flex flex-col gap-[3px]" style={{ fontSize: compact ? 8 : 10, lineHeight: 1 }} aria-hidden>
      {rows.slice(0, compact ? 2 : 3).map(([label, v, max, col]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="w-2 opacity-60">{label}</span>
          <span className="relative inline-block overflow-hidden" style={{ width: compact ? 70 : 120, height: compact ? 4 : 6, background: 'rgba(127,127,127,0.18)' }}>
            <span className="absolute inset-y-0 left-0" style={{ width: `${(v / max) * 100}%`, background: col }} />
          </span>
          <span className="tabular-nums w-5 text-right">{pad2(v)}</span>
        </span>
      ))}
    </span>
  );
};

// English word clock (11×10 grid, 5-minute resolution + minute dots).
const WORD_GRID = [
  'ITLISASAMPM',
  'ACQUARTERDC',
  'TWENTYFIVEX',
  'HALFSTENFTO',
  'PASTERUNINE',
  'ONESIXTHREE',
  'FOURFIVETWO',
  'EIGHTELEVEN',
  'SEVENTWELVE',
  'TENSEOCLOCK',
];
type WordPos = [row: number, col: number, len: number];
const W: Record<string, WordPos> = {
  IT: [0, 0, 2],
  IS: [0, 3, 2],
  A: [1, 0, 1],
  QUARTER: [1, 2, 7],
  TWENTY: [2, 0, 6],
  FIVE_M: [2, 6, 4],
  HALF: [3, 0, 4],
  TEN_M: [3, 5, 3],
  TO: [3, 9, 2],
  PAST: [4, 0, 4],
  OCLOCK: [9, 5, 6],
};
const HOUR_WORDS: WordPos[] = [
  [8, 5, 6], // TWELVE
  [5, 0, 3],
  [6, 8, 3],
  [5, 6, 5],
  [6, 0, 4],
  [6, 4, 4],
  [5, 3, 3],
  [8, 0, 5],
  [7, 0, 5],
  [4, 7, 4],
  [9, 0, 3],
  [7, 5, 6], // ELEVEN
];

function wordClockWords(hh: number, mm: number): WordPos[] {
  const m5 = Math.floor(mm / 5) * 5;
  const hour = (hh + (m5 > 30 ? 1 : 0)) % 12;
  const words: WordPos[] = [W.IT, W.IS];
  const minuteWords: Record<number, WordPos[]> = {
    0: [W.OCLOCK],
    5: [W.FIVE_M, W.PAST],
    10: [W.TEN_M, W.PAST],
    15: [W.A, W.QUARTER, W.PAST],
    20: [W.TWENTY, W.PAST],
    25: [W.TWENTY, W.FIVE_M, W.PAST],
    30: [W.HALF, W.PAST],
    35: [W.TWENTY, W.FIVE_M, W.TO],
    40: [W.TWENTY, W.TO],
    45: [W.A, W.QUARTER, W.TO],
    50: [W.TEN_M, W.TO],
    55: [W.FIVE_M, W.TO],
  };
  return [...words, ...minuteWords[m5], HOUR_WORDS[hour]];
}

const WordClock: React.FC<{ hh: number; mm: number; compact: boolean }> = ({ hh, mm, compact }) => {
  const lit = new Set<string>();
  wordClockWords(hh, mm).forEach(([row, col, len]) => {
    for (let i = 0; i < len; i++) lit.add(`${row}-${col + i}`);
  });
  if (compact) {
    // Tiles are too short for the grid: show the lit phrase instead.
    const phrase = wordClockWords(hh, mm)
      .map(([row, col, len]) => WORD_GRID[row].slice(col, col + len))
      .join(' ')
      .replace('OCLOCK', "O'CLOCK");
    return <span style={{ fontSize: 9, letterSpacing: '0.12em' }}>{phrase}</span>;
  }
  return (
    <span className="inline-flex flex-col" style={{ fontSize: 9, lineHeight: 1.25, letterSpacing: '0.42em' }} aria-hidden>
      {WORD_GRID.map((row, y) => (
        <span key={y}>
          {row.split('').map((ch, x) => (
            <span key={x} style={{ opacity: lit.has(`${y}-${x}`) ? 1 : 0.14, fontWeight: lit.has(`${y}-${x}`) ? 700 : 400 }}>
              {ch}
            </span>
          ))}
        </span>
      ))}
      <span className="mt-1 flex gap-1" style={{ letterSpacing: 0 }}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="inline-block rounded-full" style={{ width: 4, height: 4, background: 'currentColor', opacity: i <= mm % 5 ? 1 : 0.14 }} />
        ))}
      </span>
    </span>
  );
};

const INSTRUMENT_KINDS = new Set(['analog', 'rings', 'gauges', 'wordgrid']);

const pad2 = (n: number) => String(n).padStart(2, '0');

function renderGraphic(r: ChronoRender, values: number[], withLeadingColon: boolean): React.ReactNode {
  const glyphStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.06em' };
  const colon = (key: string) => {
    if (r.kind === 'segment') return <SegmentGlyph key={key} ch=":" r={r} />;
    if (r.kind === 'dotmatrix') return <DotGlyph key={key} ch=":" r={r} />;
    return (
      <span key={key} style={{ opacity: 0.5, padding: '0 0.08em', color: r.on === 'currentColor' ? undefined : r.on }}>
        :
      </span>
    );
  };
  const nodes: React.ReactNode[] = [];
  values.forEach((n, i) => {
    if (i > 0 || withLeadingColon) nodes.push(colon(`c${i}`));
    if (r.kind === 'mayan') nodes.push(<MayanNumber key={`n${i}`} n={n} r={r} />);
    else if (r.kind === 'bcd') nodes.push(<BcdNumber key={`n${i}`} n={n} r={r} />);
    else if (r.kind === 'soroban' || r.kind === 'rods' || r.kind === 'tape' || r.kind === 'pips')
      pad2(n)
        .split('')
        .map(Number)
        .forEach((d, j) => {
          const key = `n${i}-${j}`;
          if (r.kind === 'soroban') nodes.push(<SorobanDigit key={key} d={d} r={r} />);
          else if (r.kind === 'rods') nodes.push(<RodDigit key={key} d={d} tens={j === 0} r={r} />);
          else if (r.kind === 'tape') nodes.push(<TapeDigit key={key} d={d} r={r} />);
          else nodes.push(<PipDigit key={key} d={d} r={r} />);
        });
    else
      pad2(n)
        .split('')
        .forEach((ch, j) =>
          nodes.push(
            r.kind === 'segment' ? (
              <SegmentGlyph key={`n${i}-${j}`} ch={ch} r={r} />
            ) : (
              <DotGlyph key={`n${i}-${j}`} ch={ch} r={r} />
            )
          )
        );
  });
  return (
    <span style={{ ...glyphStyle, filter: r.kind === 'bcd' ? undefined : glowFilter(r) }} aria-hidden>
      {nodes}
    </span>
  );
}

// Text faces with per-glyph cells (Nixie tubes, split-flap tiles). Cells are
// keyed by position + glyph so a changed digit remounts and replays its
// flip animation.
function renderCells(text: string, cells: 'nixie' | 'flap'): React.ReactNode {
  return Array.from(text).map((ch, i) =>
    /[0-9]/.test(ch) ? (
      <span key={`${i}-${ch}`} className={`chrono-cell chrono-cell-${cells}`}>
        {ch}
      </span>
    ) : (
      <span key={`${i}-${ch}`} className="chrono-cell-sep">
        {ch}
      </span>
    )
  );
}

// ==========================================
// ChronoDisplay: the themed HH:MM(:SS) readout
// ==========================================

interface ChronoDisplayProps {
  theme: ChronoTheme;
  hh: number;
  mm: number;
  ss: number;
  isDark: boolean;
  /** 'main' = the SYSTEM CHRONOMETER panel; 'preview' = picker tile (no seconds). */
  variant?: 'main' | 'preview';
}

export const ChronoDisplay: React.FC<ChronoDisplayProps> = ({ theme, hh, mm, ss, isDark, variant = 'main' }) => {
  const r = theme.render;
  const isMain = variant === 'main';

  useEffect(() => {
    ensureChronoFont(theme);
  }, [theme]);

  const label = `${pad2(hh)}:${pad2(mm)}${isMain ? `:${pad2(ss)}` : ''}`;
  const themeColor = isDark ? r.color : (r.colorLight ?? r.color);
  const mainSize = isMain ? 'text-3xl sm:text-4xl' : 'text-xl';
  const secSize = 'text-lg sm:text-xl';

  let mainNode: React.ReactNode;
  let secNode: React.ReactNode;

  if (r.kind === 'text') {
    const { main, sec } = formatChronoText(r, hh, mm, ss);
    mainNode = r.cells ? renderCells(main, r.cells) : main;
    secNode = r.cells ? renderCells(sec, r.cells) : sec;
  } else {
    mainNode = renderGraphic(r, [hh, mm], false);
    secNode = renderGraphic(r, [ss], true);
  }

  const fontFamily = chronoFontStack(r.font);
  const fxClass = r.fx ? `chrono-fx chrono-fx-${r.fx}` : '';

  if (INSTRUMENT_KINDS.has(r.kind)) {
    const ink = themeColor ?? 'currentColor';
    const px = isMain ? 64 : 34;
    let instrument: React.ReactNode;
    if (r.kind === 'analog') instrument = <AnalogDial hh={hh} mm={mm} ss={ss} r={r} px={px} color={ink} />;
    else if (r.kind === 'rings') instrument = <ActivityRings hh={hh} mm={mm} ss={ss} px={px} />;
    else if (r.kind === 'gauges') instrument = <Gauges hh={hh} mm={mm} ss={ss} compact={!isMain} />;
    else instrument = <WordClock hh={hh} mm={mm} compact={!isMain} />;
    return (
      <div
        className={`font-mono min-w-0 flex items-center gap-3 ${isMain ? '' : 'pointer-events-none'}`}
        style={{ color: themeColor }}
        role="img"
        aria-label={label}
      >
        {instrument}
        {isMain && (
          <span className="flex flex-col leading-none tabular-nums">
            <span className="text-xl sm:text-2xl font-light">
              {pad2(hh)}:{pad2(mm)}
            </span>
            <span className="text-xs text-emerald-500 mt-1">:{pad2(ss)}</span>
          </span>
        )}
      </div>
    );
  }
  const textStyle: React.CSSProperties = {
    fontFamily,
    fontWeight: r.font?.weight,
    fontSize: r.scale ? `${r.scale}em` : undefined,
    color: themeColor,
  };
  // Seconds keep the app's emerald accent unless the face has its own color.
  const secClass = themeColor || r.panel ? '' : 'text-emerald-500';
  const secStyle: React.CSSProperties = {
    ...textStyle,
    opacity: themeColor ? 0.78 : undefined,
  };
  const isDefaultFace = r.kind === 'text' && !r.font && !r.numeral;

  const body = (
    <span className="flex items-baseline flex-wrap min-w-0 gap-y-1" role="img" aria-label={label}>
      <span className={`${mainSize} leading-none tabular-nums ${isDefaultFace ? 'font-light' : ''}`}>
        <span className={fxClass} style={textStyle}>
          {mainNode}
        </span>
      </span>
      {isMain && (
        <span className={`${secSize} leading-none ml-1 tabular-nums font-medium ${secClass}`}>
          <span className={fxClass} style={secStyle}>
            {secNode}
          </span>
        </span>
      )}
    </span>
  );

  const wrapperClass = `font-mono tracking-tight min-w-0 ${isMain ? '' : 'pointer-events-none'}`;
  if (r.panel) {
    return (
      <div className={wrapperClass}>
        <span
          className={`inline-flex items-center border ${isMain ? 'px-2.5 py-1.5' : 'px-1.5 py-1'}`}
          style={{ backgroundColor: r.panel.bg, borderColor: r.panel.border, boxShadow: 'inset 0 1px 6px rgba(0,0,0,0.35)' }}
        >
          {body}
        </span>
      </div>
    );
  }
  return <div className={wrapperClass}>{body}</div>;
};

// ==========================================
// Picker panel (opened from the chronometer header)
// ==========================================

interface ChronometerThemePickerProps {
  activeThemeId: string;
  onSelect: (id: string) => void;
  progress: ChronoProgress;
  hh: number;
  mm: number;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
}

const SORTED_THEMES = [...CHRONO_THEMES].sort((a, b) => chronoUnlockRank(a) - chronoUnlockRank(b));

export const ChronometerThemePicker: React.FC<ChronometerThemePickerProps> = ({
  activeThemeId,
  onSelect,
  progress,
  hh,
  mm,
  isDark,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  const [familyFilter, setFamilyFilter] = useState<string>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  const unlockedCount = useMemo(
    () => CHRONO_THEMES.filter((th) => isChronoThemeUnlocked(th, progress)).length,
    [progress]
  );
  const visible = useMemo(
    () => (familyFilter === 'ALL' ? SORTED_THEMES : SORTED_THEMES.filter((th) => th.family === familyFilter)),
    [familyFilter]
  );

  const requirementLabel = (th: ChronoTheme): string => {
    const u = th.unlock;
    switch (u.type) {
      case 'level':
        return `LV.${String(u.value).padStart(4, '0')}`;
      case 'streak':
        return tf(t.chronoReqStreak, { n: u.value });
      case 'sessions':
        return tf(t.chronoReqSessions, { n: u.value });
      case 'ascension':
        return tf(t.chronoReqAscension, { n: u.value });
      case 'hours':
        return tf(t.chronoReqHours, { n: u.value });
      case 'session':
        return tf(t.chronoReqSession, { n: u.value });
      default:
        return '';
    }
  };

  const lockedMessage = (th: ChronoTheme): string => {
    const u = th.unlock;
    switch (u.type) {
      case 'level': {
        const hours = CLEARANCE_LEVELS[u.value - 1]?.requiredHours ?? 0;
        return tf(t.chronoLockedLevel, { lv: String(u.value).padStart(4, '0'), h: hours, name: th.name });
      }
      case 'streak':
        return tf(t.chronoLockedStreak, { n: u.value, cur: progress.longestStreak, name: th.name });
      case 'sessions':
        return tf(t.chronoLockedSessions, { n: u.value, cur: progress.sessionCount, name: th.name });
      case 'ascension':
        return tf(t.chronoLockedAscension, { n: u.value, name: th.name });
      case 'hours':
        return tf(t.chronoLockedHours, { n: u.value, cur: Math.floor(progress.totalHours), name: th.name });
      case 'session':
        return tf(t.chronoLockedSession, { n: u.value, cur: progress.longestSessionMinutes, name: th.name });
      default:
        return '';
    }
  };

  const handlePick = (th: ChronoTheme) => {
    if (!isChronoThemeUnlocked(th, progress)) {
      setNotice(lockedMessage(th));
      return;
    }
    setNotice(null);
    onSelect(th.id);
  };

  return (
    <div className={`mt-4 pt-3.5 border-t ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'} space-y-3 font-mono`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
        <span className="font-semibold">{tf(t.chronoThemesTitle, { n: CHRONO_THEMES.length })}</span>
        <span className="text-emerald-400 tabular-nums">
          {tf(t.chronoUnlocked, { a: unlockedCount, b: CHRONO_THEMES.length })}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {[{ id: 'ALL', label: t.all, color: '' }, ...CHRONO_FAMILIES].map((fam) => (
          <button
            key={fam.id}
            type="button"
            onClick={() => setFamilyFilter(fam.id)}
            title={fam.id === 'ALL' ? undefined : fam.label}
            className={`px-1.5 py-0.5 text-[9px] border flex items-center space-x-1 cursor-pointer ${
              familyFilter === fam.id
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                : `${borderCol} ${textMuted} hover:opacity-100`
            }`}
          >
            {fam.color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fam.color }} />}
            <span>{fam.id === 'ALL' ? t.all : fam.id}</span>
          </button>
        ))}
      </div>

      {notice && (
        <div className="p-2 border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{notice}</span>
          </span>
          <button type="button" onClick={() => setNotice(null)} className="text-[9px] underline ml-2 cursor-pointer">
            {t.dismiss}
          </button>
        </div>
      )}

      <div className="max-h-80 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
        {visible.map((th) => {
          const unlocked = isChronoThemeUnlocked(th, progress);
          const active = th.id === activeThemeId;
          return (
            <button
              key={th.id}
              type="button"
              onClick={() => handlePick(th)}
              aria-pressed={active}
              title={th.desc}
              className={`relative p-2.5 border text-left transition-colors cursor-pointer flex flex-col gap-2 min-w-0 ${
                active
                  ? 'border-emerald-500/70 bg-emerald-500/10'
                  : unlocked
                  ? `${borderCol} hover:border-zinc-500`
                  : `${borderCol} hover:opacity-90`
              }`}
            >
              <div className={`h-9 flex items-center overflow-hidden ${unlocked ? '' : 'opacity-30 blur-[1.5px]'}`}>
                <ChronoDisplay theme={th} hh={hh} mm={mm} ss={0} isDark={isDark} variant="preview" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span
                  className={`text-[9px] px-1 border ${active ? 'border-emerald-500 text-emerald-400 font-bold' : `${borderCol} ${textMuted}`}`}
                >
                  {th.code}
                </span>
                <span className={`text-[10px] font-bold truncate ${active ? 'text-emerald-400' : ''}`}>{th.name}</span>
                {active && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                {!unlocked && (
                  <span className={`ml-auto text-[9px] px-1 border ${borderCol} text-amber-400 flex items-center space-x-1 shrink-0`}>
                    <Lock className="w-2.5 h-2.5" />
                    <span>{requirementLabel(th)}</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.chronoHint}</p>
    </div>
  );
};
