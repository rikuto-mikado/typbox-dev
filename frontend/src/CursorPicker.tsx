import React, { useMemo, useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { tf, useI18n } from './i18n';
import { isUnlockRuleMet, type ChronoProgress } from './chronometerThemes';
import { unlockLockedMessage, unlockRequirementLabel } from './ChronometerFace';
import { CLEARANCE_LEVELS } from './telemetryFeatures';
import { CURSOR_KINDS, CURSOR_SIZES, CURSOR_THEMES, type CursorKind, type CursorSize, type CursorTheme } from './cursorThemes';

// eslint-disable-next-line react-refresh/only-export-components
export const isCursorThemeUnlocked = (cursor: CursorTheme, progress: ChronoProgress) => isUnlockRuleMet(cursor.unlock, progress);

const lvLabel = (lv: number) => `LV.${String(lv).padStart(4, '0')}`;
const reqHoursForLevel = (lv: number) => CLEARANCE_LEVELS[lv - 1]?.requiredHours ?? 0;

// Faint chessboard behind each cursor; neutral grey reads on light and dark surfaces.
const BOARD: React.CSSProperties = {
  backgroundImage: 'conic-gradient(rgb(113 113 122 / 0.16) 25%, transparent 0 50%, rgb(113 113 122 / 0.16) 0 75%, transparent 0)',
  backgroundSize: '16px 16px',
};

interface CursorPickerProps {
  activeCursorId: string;
  onSelect: (id: string) => void;
  size: CursorSize;
  onSelectSize: (size: CursorSize) => void;
  progress: ChronoProgress;
  borderCol: string;
  textMuted: string;
}

export const CursorPicker: React.FC<CursorPickerProps> = ({ activeCursorId, onSelect, size, onSelectSize, progress, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [kind, setKind] = useState<CursorKind | 'ALL'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  // Same wording as a locked Surface Theme: the level, its cycle hours and how many are left.
  const lockedNotice = (cursor: CursorTheme): string => {
    const u = cursor.unlock;
    if (u.type === 'level') {
      const req = reqHoursForLevel(u.value);
      return tf(t.noiseLockedNotice, {
        code: cursor.code,
        name: cursor.name,
        lv: String(u.value).padStart(4, '0'),
        req,
        rem: Math.max(0, +(req - progress.totalHours).toFixed(1)),
      });
    }
    if (u.type === 'ascension') {
      return tf(t.themePrestigeNotice, { code: cursor.code, name: cursor.name, n: u.value, have: progress.totalAscensions });
    }
    return unlockLockedMessage(u, cursor.name, progress, t);
  };

  const unlockedCount = useMemo(() => CURSOR_THEMES.filter((c) => isCursorThemeUnlocked(c, progress)).length, [progress]);
  const visible = kind === 'ALL' ? CURSOR_THEMES : CURSOR_THEMES.filter((c) => c.kind === kind);

  return (
    <div className="space-y-3 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
        <span className="font-semibold">{tf(t.cursorTitle, { n: CURSOR_THEMES.length })}</span>
        <span className="text-emerald-400 tabular-nums">{tf(t.chronoUnlocked, { a: unlockedCount, b: CURSOR_THEMES.length })}</span>
      </div>
      <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.cursorHint}</p>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-widest ${textMuted}`}>{t.cursorSize}</span>
          <div className={`grid grid-cols-3 border ${borderCol}`} role="radiogroup" aria-label={t.cursorSize}>
            {CURSOR_SIZES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={size === s.id}
                title={tf(t.cursorSizeScale, { n: s.scale })}
                onClick={() => size !== s.id && onSelectSize(s.id)}
                className={`min-w-8.5 px-2.5 py-1 text-[10px] transition-colors cursor-pointer ${idx > 0 ? `border-l ${borderCol}` : ''} ${
                  size === s.id ? 'bg-emerald-500 text-zinc-950 font-bold' : `${textMuted} hover:text-emerald-400`
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.cursorSizeHint}</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {[{ id: 'ALL' as const, label: t.all }, ...CURSOR_KINDS].map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`px-1.5 py-0.5 text-[9px] border cursor-pointer ${
              kind === k.id ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold' : `${borderCol} ${textMuted} hover:opacity-100`
            }`}
          >
            {k.label}
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {visible.map((cursor) => {
          const unlocked = isCursorThemeUnlocked(cursor, progress);
          const active = cursor.id === activeCursorId;
          return (
            <button
              key={cursor.id}
              type="button"
              title={cursor.desc}
              aria-pressed={active}
              onClick={() => {
                if (!unlocked) {
                  setNotice(lockedNotice(cursor));
                  return;
                }
                setNotice(null);
                onSelect(cursor.id);
              }}
              className={`p-2 border text-left cursor-pointer transition-colors flex flex-col gap-2 min-w-0 ${
                active ? 'border-emerald-500/70 bg-emerald-500/10' : unlocked ? `${borderCol} hover:border-zinc-500` : `${borderCol} hover:opacity-90`
              }`}
            >
              <div className={`relative h-20 border ${borderCol} flex items-center justify-center`} style={BOARD}>
                {/* Natural size scaled 3x (a whole multiple, so every pixel stays square). */}
                <img
                  src={cursor.src}
                  alt=""
                  className={`scale-[3] [image-rendering:pixelated] ${unlocked ? '' : 'opacity-25 grayscale'}`}
                  draggable={false}
                />
                {!unlocked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-amber-400" />}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[9px] px-1 border shrink-0 ${active ? 'border-emerald-500 text-emerald-400 font-bold' : `${borderCol} ${textMuted}`}`}>
                    {cursor.code}
                  </span>
                  <span className={`text-[12px] truncate ${active ? 'text-emerald-400 font-bold' : unlocked ? '' : textMuted}`}>{cursor.name}</span>
                  {active && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 ml-auto" />}
                </div>
                {unlocked ? (
                  <p className={`text-[10px] font-sans leading-snug line-clamp-2 ${textMuted}`}>{cursor.desc}</p>
                ) : cursor.unlock.type === 'ascension' ? (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] px-1 border border-amber-400/60 text-amber-300"
                    title={tf(t.prestigeRequires, { n: cursor.unlock.value })}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>✦ ×{cursor.unlock.value}</span>
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] px-1 border ${borderCol} text-amber-400`}
                    title={cursor.unlock.type === 'level' ? tf(t.requiresClearance, { lv: cursor.unlock.value, h: reqHoursForLevel(cursor.unlock.value) }) : undefined}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>
                      {cursor.unlock.type === 'level'
                        ? `${lvLabel(cursor.unlock.value)} (${reqHoursForLevel(cursor.unlock.value)}H)`
                        : unlockRequirementLabel(cursor.unlock, t)}
                    </span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
