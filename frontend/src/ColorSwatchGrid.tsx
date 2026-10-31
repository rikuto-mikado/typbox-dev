import React from 'react';
import { Check } from 'lucide-react';
import { tf, useI18n } from './i18n';

// The square colour picker shared by the category editor and the avatar
// colour in 01 / PROFILE: 12 squares a row, the picked one raised with a
// ring and a check. A radio group, so arrow keys / screen readers read it
// as one choice.

interface PaletteColor {
  name: string;
  hex: string;
}

interface ColorSwatchGridProps {
  palette: PaletteColor[];
  value: string;
  onChange: (hex: string) => void;
  isDark: boolean;
  /** Accessible name of the group (e.g. "INDICATOR ACCENT"). */
  label: string;
  className?: string;
}

export const ColorSwatchGrid: React.FC<ColorSwatchGridProps> = ({ palette, value, onChange, isDark, label, className = '' }) => {
  const { t } = useI18n();
  return (
    <div className={`grid grid-cols-12 gap-1 ${className}`} role="radiogroup" aria-label={label}>
      {palette.map((col) => {
        const on = value.toLowerCase() === col.hex.toLowerCase();
        return (
          <button
            key={col.hex}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(col.hex)}
            title={`${col.name} (${col.hex})`}
            aria-label={tf(t.selectColor, { name: col.name })}
            className={`relative aspect-square min-h-[22px] flex items-center justify-center transition-transform cursor-pointer ${
              on ? `scale-110 ring-2 ${isDark ? 'ring-zinc-100' : 'ring-zinc-900'} z-10` : 'hover:scale-110'
            }`}
            style={{ backgroundColor: col.hex }}
          >
            {on && <Check className="w-3 h-3 text-white drop-shadow" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
};
