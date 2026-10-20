import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { tf, useI18n } from './i18n';
import { isUnlockRuleMet, unlockRuleRank, type ChronoProgress } from './chronometerThemes';
import { unlockLockedMessage, unlockRequirementLabel } from './ChronometerFace';
import {
  UI_FONTS,
  UI_FONT_KINDS,
  UI_FONT_SAMPLE,
  ensureUiFontPreview,
  uiFontStack,
  type UiFont,
  type UiFontKind,
} from './uiFonts';

// eslint-disable-next-line react-refresh/only-export-components
export const isUiFontUnlocked = (font: UiFont, progress: ChronoProgress) => isUnlockRuleMet(font.unlock, progress);

const SORTED_FONTS = [...UI_FONTS].sort((a, b) => unlockRuleRank(a.unlock) - unlockRuleRank(b.unlock));

interface UiFontPickerProps {
  activeFontId: string;
  onSelect: (id: string) => void;
  progress: ChronoProgress;
  borderCol: string;
  textMuted: string;
}

export const UiFontPicker: React.FC<UiFontPickerProps> = ({ activeFontId, onSelect, progress, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [kind, setKind] = useState<UiFontKind | 'ALL'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  // Glyph-subset previews: ~1-3 KB per face, fetched once when the tab opens.
  useEffect(() => {
    UI_FONTS.forEach(ensureUiFontPreview);
  }, []);

  const unlockedCount = useMemo(() => UI_FONTS.filter((f) => isUiFontUnlocked(f, progress)).length, [progress]);
  const visible = kind === 'ALL' ? SORTED_FONTS : SORTED_FONTS.filter((f) => f.kind === kind);

  return (
    <div className="space-y-3 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
        <span className="font-semibold">{tf(t.fontTitle, { n: UI_FONTS.length })}</span>
        <span className="text-emerald-400 tabular-nums">{tf(t.chronoUnlocked, { a: unlockedCount, b: UI_FONTS.length })}</span>
      </div>
      <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.fontHint}</p>

      <div className="flex flex-wrap gap-1">
        {[{ id: 'ALL' as const, label: t.all }, ...UI_FONT_KINDS].map((k) => (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {visible.map((font) => {
          const unlocked = isUiFontUnlocked(font, progress);
          const active = font.id === activeFontId;
          const face: React.CSSProperties = { fontFamily: uiFontStack(font) };
          return (
            <button
              key={font.id}
              type="button"
              title={font.desc}
              aria-pressed={active}
              onClick={() => {
                if (!unlocked) {
                  setNotice(unlockLockedMessage(font.unlock, font.name, progress, t));
                  return;
                }
                setNotice(null);
                onSelect(font.id);
              }}
              className={`p-2.5 border text-left cursor-pointer transition-colors flex flex-col gap-1.5 min-w-0 ${
                active ? 'border-emerald-500/70 bg-emerald-500/10' : unlocked ? `${borderCol} hover:border-zinc-500` : `${borderCol} hover:opacity-90`
              }`}
            >
              <div className={`min-w-0 ${unlocked ? '' : 'opacity-40'}`}>
                <div className={`text-[15px] truncate ${active ? 'text-emerald-400' : ''}`} style={face}>
                  {font.name}
                </div>
                <div className={`text-[11px] truncate ${textMuted}`} style={face}>
                  {UI_FONT_SAMPLE}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className={`text-[9px] px-1 border ${active ? 'border-emerald-500 text-emerald-400 font-bold' : `${borderCol} ${textMuted}`}`}>{font.code}</span>
                <span className={`text-[9px] uppercase ${textMuted}`}>{font.kind}</span>
                {!font.body && <span className="text-[9px] px-1 border border-fuchsia-500/40 text-fuchsia-400">{t.fontReadoutsOnly}</span>}
                {active && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                {!unlocked && (
                  <span className={`ml-auto text-[9px] px-1 border ${borderCol} text-amber-400 flex items-center space-x-1 shrink-0`}>
                    <Lock className="w-2.5 h-2.5" />
                    <span>{unlockRequirementLabel(font.unlock, t)}</span>
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
