import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useI18n } from './i18n';
import { swatchStyle } from './categoryStyle';
import type { Category } from './App';

// Swapped in for a bare <select>: a native select opens as a near-fullscreen
// OS picker on mobile (Android especially), which feels heavy for a one-tap
// choice. Below the `sm` breakpoint this renders as a bottom sheet instead;
// at `sm` and up it's a small anchored dropdown, closer to the native desktop
// behavior it's replacing.
const MOBILE_QUERY = '(max-width: 639px)';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

interface CategorySelectProps {
  categories: Category[];
  value: string | number;
  onChange: (id: string) => void;
  borderCol: string;
  inputBg: string;
  textMuted: string;
  disabled?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  value,
  onChange,
  borderCol,
  inputBg,
  textMuted,
  disabled,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // The bottom sheet covers the page; lock background scroll while it's up.
  useEffect(() => {
    if (!open || !isMobile) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isMobile]);

  const active = categories.filter((c) => c.isActive);
  const inactive = categories.filter((c) => !c.isActive);
  const selected = categories.find((c) => String(c.id) === String(value)) ?? null;

  const pick = (id: string | number) => {
    onChange(String(id));
    setOpen(false);
  };

  const row = (c: Category) => {
    const isSelected = String(c.id) === String(value);
    return (
      <button
        key={c.id}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => pick(c.id)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2 text-left font-mono text-sm sm:text-xs cursor-pointer transition-colors ${
          isSelected ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : `${textMuted} hover:bg-[var(--tb-text-main)]/5`
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={swatchStyle(c.color, c.isActive)} />
        <span className="shrink-0 font-bold">[{c.code}]</span>
        <span className="truncate flex-1">{c.name}</span>
        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
      </button>
    );
  };

  const optionList = (
    <>
      {active.map(row)}
      {inactive.length > 0 && (
        <>
          <div className={`px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-wider ${textMuted}`}>
            — {t.inactive} —
          </div>
          {inactive.map(row)}
        </>
      )}
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full min-h-[42px] lg:min-h-0 px-3 py-2.5 lg:py-2 text-base sm:text-sm font-mono border outline-none flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${inputBg}`}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={swatchStyle(selected.color, selected.isActive)} />
            <span className="truncate">
              [{selected.code}] {selected.name}
            </span>
          </span>
        ) : (
          <span className={textMuted}>—</span>
        )}
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${textMuted}`} />
      </button>

      {open &&
        (isMobile ? (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 cat-sheet-backdrop" onClick={() => setOpen(false)} />
            <div
              role="listbox"
              className={`fixed inset-x-0 bottom-0 z-50 max-h-[70vh] flex flex-col border-t rounded-t-2xl overflow-hidden cat-sheet-panel ${borderCol} ${inputBg}`}
            >
              <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${borderCol}`}>
                <span className={`font-mono text-[11px] uppercase tracking-widest ${textMuted}`}>{t.category}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t.close}
                  className={`p-1 cursor-pointer ${textMuted}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto py-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {optionList}
              </div>
            </div>
          </>
        ) : (
          <div
            role="listbox"
            className={`absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto border shadow-lg cat-dropdown-panel ${borderCol} ${inputBg}`}
          >
            {optionList}
          </div>
        ))}
    </div>
  );
};
