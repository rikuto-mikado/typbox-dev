// The Surface Theme catalog (surfaceThemeCatalog.json), turned into
// SurfaceThemePair objects. Three plain series of 300, all without
// patterns (a soft top glow and, in dark mode, an accent corner wash are
// the only decoration):
//  - CLASSIC: the 300 most distinct palettes kept from the former archive
//    and NEO SIGNAL waves (chosen by farthest-point sampling over their
//    OKLab colors, so no two read as near-duplicates);
//  - CHROMA: saturation contrast (surfacePalettes.ts:buildChromaPalette);
//  - COMPLEMENT: hue contrast (surfacePalettes.ts:buildComplementPalette).
// The twelve PRESTIGE themes live in surfacePrestige.ts. Clearance levels
// are assigned afterwards by telemetryFeatures' rebalancing.
import catalog from './surfaceThemeCatalog.json';
import { ensureReadable } from './surfaceColor';
import {
  buildChromaPalette,
  buildComplementPalette,
  type ChromaMode,
  type ComplementMode,
  type Depth,
  type Palette,
  type Strength,
} from './surfacePalettes';
import type { SurfaceThemePair } from './telemetryFeatures';

type PaletteRow = [string, string, string, string, string, string, string];
type ClassicRow = [string, string, string, string, string, string, string, PaletteRow, PaletteRow];
type ChromaRow = [string, string, string, string, string, string, number, ChromaMode, Depth, Strength];
type ComplementRow = [string, string, string, string, string, string, number, number, ComplementMode, Depth];

function classicPalette(row: PaletteRow): Palette {
  const [bgMain, bgCard, bgInput, border, textMain, textMuted, glowTint] = row;
  return {
    bgMain,
    bgCard,
    bgInput,
    border,
    textMain,
    // Several archive palettes shipped muted text just under WCAG AA; this
    // lifts only those to 4.5:1 without touching the rest of the palette.
    textMuted: ensureReadable(textMuted, [bgCard, bgMain], 4.5),
    glowTint,
  };
}

function pair(
  row: readonly [string, string, string, string, string, string, ...unknown[]],
  code: string,
  series: NonNullable<SurfaceThemePair['series']>,
  accentHex: string,
  dark: Palette,
  light: Palette
): SurfaceThemePair {
  const [id, name, darkLabel, lightLabel, description, divisionCode] = row;
  return {
    id,
    code,
    name,
    pairLabel: `${darkLabel} ⇄ ${lightLabel}`,
    description,
    accentHex,
    divisionCode,
    // Placeholder: rebalanceThemeClearanceLevels() assigns the real level.
    clearanceHintLv: 0,
    series,
    dark: { label: darkLabel, ...dark },
    light: { label: lightLabel, ...light },
  };
}

const code = (prefix: string, i: number) => `${prefix}-${String(i + 1).padStart(3, '0')}`;

export const CLASSIC_THEME_PAIRS: SurfaceThemePair[] = (catalog.classic.themes as ClassicRow[]).map((row, i) =>
  pair(row, code('CLS', i), 'classic', row[6], classicPalette(row[7]), classicPalette(row[8]))
);

export const CHROMA_THEME_PAIRS: SurfaceThemePair[] = (catalog.chroma.themes as ChromaRow[]).map((row, i) => {
  const [, , , , , , hue, mode, depth, strength] = row;
  const pal = buildChromaPalette(hue, mode, depth, strength);
  return pair(row, code('CHR', i), 'chroma', pal.accentHex, pal.dark, pal.light);
});

export const COMPLEMENT_THEME_PAIRS: SurfaceThemePair[] = (catalog.complement.themes as ComplementRow[]).map((row, i) => {
  const [, , , , , , hue, offset, mode, depth] = row;
  const pal = buildComplementPalette(hue, offset, mode, depth);
  return pair(row, code('HUE', i), 'complement', pal.accentHex, pal.dark, pal.light);
});

const ALIASES = catalog.aliases as Record<string, string>;

/**
 * Saved theme ids from before the catalog was rebuilt (retired archive,
 * NEO SIGNAL and pixel-art themes) map to the closest CLASSIC palette, so
 * an existing pick keeps roughly its look instead of snapping to default.
 */
export function resolveSurfaceThemeId(id: string): string {
  return ALIASES[id] ?? id;
}
