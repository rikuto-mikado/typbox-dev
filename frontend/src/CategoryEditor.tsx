import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ColorSwatchGrid } from './ColorSwatchGrid';
import { tf, useI18n } from './i18n';
import { inactiveHatch, swatchStyle } from './categoryStyle';

// The category editor opens over the CATEGORY REGISTRY panel (the panel
// keeps its size) for both NEW CATEGORY and editing a row. A live preview
// at the top shows the row exactly as it will appear in the registry, the
// code fills itself from the name until it is typed by hand, and the weekly
// target is a stepper with quick picks. Esc or [CLOSE] backs out.

interface PaletteColor {
  name: string;
  hex: string;
}

interface CategoryEditorProps {
  mode: 'create' | 'edit';
  /** The code being edited (edit mode), shown in the title. */
  originalCode?: string;
  name: string;
  setName: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  target: number;
  setTarget: (v: number) => void;
  /** Edit mode only: ACTIVE / INACTIVE. */
  active?: boolean;
  setActive?: (v: boolean) => void;
  /** Hours logged this week (edit mode), for the preview bar. */
  weekHours?: number;
  /** Codes already used by other categories (duplicate warning). */
  takenCodes: string[];
  palette: PaletteColor[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  borderCol: string;
  bgCard: string;
  textMuted: string;
  inputBg: string;
  isDark: boolean;
}

const TARGET_PICKS = [2, 5, 10, 15, 20];
const MAX_TARGET = 168;

/** First four letters/digits of the name, upper-cased: "Linear Algebra" → "LINE". */
const codeFromName = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4);

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  mode,
  originalCode,
  name,
  setName,
  code,
  setCode,
  color,
  setColor,
  target,
  setTarget,
  active = true,
  setActive,
  weekHours = 0,
  takenCodes,
  palette,
  onSubmit,
  onClose,
  borderCol,
  bgCard,
  textMuted,
  inputBg,
  isDark,
}) => {
  const { t } = useI18n();
  // New categories: the code follows the name until it is typed by hand.
  const [codeTouched, setCodeTouched] = useState(mode === 'edit' || code.trim() !== '');
  const shownCode = code.trim().toUpperCase().slice(0, 4);
  const codeTaken = shownCode !== '' && takenCodes.includes(shownCode);
  const safeTarget = Math.min(MAX_TARGET, Math.max(1, Number(target) || 1));
  const progress = Math.min(100, (weekHours / safeTarget) * 100);
  const colorName = palette.find((c) => c.hex === color)?.name ?? t.custom;
  const label = `block font-mono text-[10px] uppercase tracking-wider mb-1.5 ${textMuted}`;
  const field = `w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs border outline-none focus:border-emerald-500/70 transition-colors ${inputBg}`;
  const stepBtn = `w-9 shrink-0 flex items-center justify-center border ${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`;

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col ${bgCard} tb-overlay-in`}
      role="dialog"
      aria-label={mode === 'create' ? t.addCategory : tf(t.editCategoryHeader, { code: originalCode ?? '' })}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={`flex items-center justify-between gap-3 px-5 py-3 border-b ${borderCol} font-mono text-[10px] uppercase tracking-widest`}>
        <span className="font-semibold text-emerald-400 truncate">
          {mode === 'create' ? `+ ${t.addCategory}` : tf(t.editCategoryHeader, { code: originalCode ?? '' })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 min-h-[28px] px-2 border ${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50 cursor-pointer`}
        >
          {t.closeBracket}
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4 [scrollbar-width:thin]">
          {/* Live preview: the row as it will look in the registry */}
          <div className={`p-2.5 border border-dashed ${borderCol} flex flex-col gap-2`} aria-hidden>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className={`flex items-center gap-2 min-w-0 ${active ? '' : 'opacity-60'}`}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors" style={swatchStyle(color, active)} />
                <span className="font-mono font-semibold text-[11px] shrink-0">[{shownCode || 'CODE'}]</span>
                <span className={`truncate font-medium ${name.trim() ? '' : textMuted}`}>{name.trim() || t.catNamePlaceholder}</span>
              </span>
              <span className="font-mono text-[11px] tabular-nums shrink-0">
                {active ? (
                  <>
                    {weekHours.toFixed(1).replace(/\.0$/, '')}h <span className={textMuted}>/ {safeTarget}h</span>
                  </>
                ) : (
                  <span className={textMuted}>{t.inactive}</span>
                )}
              </span>
            </div>
            {active ? (
              <div className={`w-full h-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} overflow-hidden`}>
                <div className="h-full transition-all duration-500" style={{ width: `${Math.max(progress, 4)}%`, backgroundColor: color }} />
              </div>
            ) : (
              <div className="w-full h-1.5 opacity-35" style={{ backgroundImage: inactiveHatch(color) }} />
            )}
          </div>

          <div>
            <label className={label} htmlFor="cat-editor-name">
              {t.catName}
            </label>
            <input
              id="cat-editor-name"
              type="text"
              required
              autoFocus
              placeholder={t.catNamePlaceholder}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeTouched) setCode(codeFromName(e.target.value));
              }}
              className={field}
            />
          </div>

          <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
            <div>
              <label className={`${label} truncate`} htmlFor="cat-editor-code" title={t.catCode}>
                {t.catCodeShort}
              </label>
              <input
                id="cat-editor-code"
                type="text"
                required
                maxLength={4}
                placeholder="MATH"
                value={code}
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(e.target.value.toUpperCase());
                }}
                aria-invalid={codeTaken}
                className={`${field} font-mono uppercase tracking-widest ${codeTaken ? 'border-amber-500/70' : ''}`}
              />
            </div>
            <div className={active ? '' : 'opacity-40'} title={active ? undefined : t.targetLockedTitle}>
              <span className={`${label} truncate`}>{t.catTarget}</span>
              <div className="flex h-10 lg:h-[30px]">
                <button
                  type="button"
                  className={stepBtn}
                  disabled={!active || safeTarget <= 1}
                  onClick={() => setTarget(Math.max(1, safeTarget - 1))}
                  aria-label={t.catTargetDown}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={MAX_TARGET}
                  required={active}
                  disabled={!active}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  aria-label={t.catTarget}
                  className={`min-w-0 flex-1 px-2 text-center text-base sm:text-xs font-mono tabular-nums border-y outline-none ${inputBg} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                />
                <button
                  type="button"
                  className={stepBtn}
                  disabled={!active || safeTarget >= MAX_TARGET}
                  onClick={() => setTarget(Math.min(MAX_TARGET, safeTarget + 1))}
                  aria-label={t.catTargetUp}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {codeTaken && (
            <p className="-mt-2 font-mono text-[10px] uppercase tracking-wider text-amber-400">{tf(t.catCodeTaken, { code: shownCode })}</p>
          )}

          <div className="flex flex-wrap gap-1.5 -mt-1" role="group" aria-label={t.catTarget}>
            {TARGET_PICKS.map((h) => (
              <button
                key={h}
                type="button"
                disabled={!active}
                onClick={() => setTarget(h)}
                className={`min-h-[30px] lg:min-h-0 px-2.5 py-1 border font-mono text-[10px] tabular-nums transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  safeTarget === h ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold' : `${borderCol} ${textMuted} hover:text-emerald-400`
                }`}
              >
                {tf(t.catTargetPick, { h })}
              </button>
            ))}
          </div>

          {mode === 'edit' && setActive && (
            <div>
              <span className={label}>{t.catStatus}</span>
              <div className={`grid grid-cols-2 border ${borderCol} font-mono text-xs`} role="radiogroup" aria-label={t.catStatus}>
                {([true, false] as const).map((isActive) => (
                  <button
                    key={String(isActive)}
                    type="button"
                    role="radio"
                    aria-checked={active === isActive}
                    onClick={() => setActive(isActive)}
                    className={`min-h-[38px] lg:min-h-0 py-2 lg:py-1.5 flex items-center justify-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
                      isActive ? '' : `border-l ${borderCol}`
                    } ${
                      active === isActive
                        ? isActive
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : `${isDark ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-300 text-zinc-900'} font-bold`
                        : textMuted
                    }`}
                  >
                    {isActive ? t.active : t.inactive}
                  </button>
                ))}
              </div>
              {!active && <p className={`mt-1.5 text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.inactiveHint}</p>}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`font-mono text-[10px] uppercase tracking-wider ${textMuted}`}>{t.indicatorAccent}</span>
              <span className={`font-mono text-[10px] ${textMuted}`}>
                {colorName} · {color}
              </span>
            </div>
            <ColorSwatchGrid palette={palette} value={color} onChange={setColor} isDark={isDark} label={t.indicatorAccent} />
          </div>
        </div>

        {/* Actions stay put at the bottom while the fields scroll */}
        <div className={`grid grid-cols-[1fr_2fr] gap-2 px-5 py-3 border-t ${borderCol}`}>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[40px] lg:min-h-0 py-2 font-mono text-xs uppercase border ${borderCol} ${textMuted} hover:text-emerald-400 cursor-pointer`}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !shownCode}
            className="min-h-[40px] lg:min-h-0 py-2 font-mono text-xs uppercase tracking-widest font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === 'create' ? `+ ${t.create}` : t.saveChanges}
          </button>
        </div>
      </form>
    </div>
  );
};
