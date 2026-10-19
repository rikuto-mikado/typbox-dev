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
