// The Surface Theme catalog (surfaceThemeCatalog.json), turned into
// SurfaceThemePair objects. Two plain series of 30, without patterns (a soft top
// glow and, in dark mode, an accent corner wash are the only decoration):
//  - SIMPLE: blacks, whites and paper colours, where only the accent has colour;
//  - DUOTONE: one deep field colour against one signal colour, navy and orange
//    and the like.
// telemetryFeatures' scheduleThemes assigns their Clearance levels.
import catalog from './surfaceThemeCatalog.json';
import type { SurfaceThemePair } from './telemetryFeatures';

type PaletteRow = [string, string, string, string, string, string, string];
type ThemeRow = [string, string, string, string, string, string, string, PaletteRow, PaletteRow];

const palette = ([bgMain, bgCard, bgInput, border, textMain, textMuted, glowTint]: PaletteRow, label: string) => ({
  label,
  bgMain,
  bgCard,
  bgInput,
  border,
  textMain,
  textMuted,
  glowTint,
});

const toPair =
  (series: 'simple' | 'duo', prefix: string) =>
  (row: ThemeRow, i: number): SurfaceThemePair => {
    const [id, name, darkLabel, lightLabel, description, divisionCode, accentHex, dark, light] = row;
    return {
      id,
      code: `${prefix}-${String(i + 1).padStart(2, '0')}`,
      name,
      pairLabel: `${darkLabel} ⇄ ${lightLabel}`,
      description,
      accentHex,
      divisionCode,
      // Placeholder: scheduleThemes() assigns the real level.
      clearanceHintLv: 0,
      series,
      dark: palette(dark, darkLabel),
      light: palette(light, lightLabel),
    };
  };

export const SIMPLE_THEME_PAIRS: SurfaceThemePair[] = (catalog.simple.themes as ThemeRow[]).map(toPair('simple', 'SMP'));
export const DUO_THEME_PAIRS: SurfaceThemePair[] = (catalog.duo.themes as ThemeRow[]).map(toPair('duo', 'DUO'));

const ALIASES = catalog.aliases as Record<string, string>;

/**
 * Saved theme ids from retired catalogs map to the closest theme of the current
 * one, so an existing pick keeps roughly its look instead of snapping to default.
 */
export function resolveSurfaceThemeId(id: string): string {
  return ALIASES[id] ?? id;
}
