import React from 'react';
import { Check } from 'lucide-react';

// A compact category picker for the BITS // EXCHANGE (CATEGORY LOCK picks
// one, HYDRA two or three): one scrollable row of chips instead of a native
// <select>, whose option list takes over the whole screen on phones.

export interface ChipCategory {
  id: string | number;
  code: string;
  name: string;
  color: string;
}

interface CategoryChipsProps {
  categories: ChipCategory[];
  /** Picked ids (as strings), in the order picked. */
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  borderCol: string;
  textMuted: string;
  /** Shown under the chips, e.g. the picked names or "pick 2-3". */
  caption?: React.ReactNode;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ categories, selected, onToggle, disabled, borderCol, textMuted, caption }) => (
  <div className="min-w-0 space-y-1">
    <div className="flex gap-1 overflow-x-auto overscroll-x-contain snap-x pb-1 [scrollbar-width:thin]" role="group">
      {categories.map((c) => {
        const id = String(c.id);
        const on = selected.includes(id);
        const order = selected.indexOf(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            disabled={disabled}
            aria-pressed={on}
            title={`[${c.code}] ${c.name}`}
            className={`shrink-0 snap-start flex items-center gap-1.5 px-2 py-1 border text-[10px] font-mono tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              on ? 'font-bold' : `${borderCol} ${textMuted} hover:brightness-125`
            }`}
            style={on ? { borderColor: c.color, background: `${c.color}1f`, color: c.color } : undefined}
          >
            {on ? (
              selected.length > 1 ? (
                <span className="w-3 h-3 flex items-center justify-center text-[8px] font-bold text-zinc-950" style={{ background: c.color }}>
                  {order + 1}
                </span>
              ) : (
                <Check className="w-3 h-3" />
              )
            ) : (
              <span className="w-2 h-2 shrink-0" style={{ background: c.color }} />
            )}
            {c.code}
          </button>
        );
      })}
    </div>
    {caption && <div className={`text-[9px] truncate ${textMuted}`}>{caption}</div>}
  </div>
);
