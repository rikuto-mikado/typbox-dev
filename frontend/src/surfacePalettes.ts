// Palette builders for the two generated Surface Theme series. Neither one
// gets its identity from light-vs-dark: brightness is held at the same
// level as the CLASSIC series (dark surfaces ≈ OKLCH L 0.17–0.26, light
// ≈ L 0.93–0.99) and text is solved for contrast separately, so what
// distinguishes a theme is
//  - CHROMA: saturation contrast — one layer is saturated, the layers next
//    to it are near-grey versions of the same hue;
//  - COMPLEMENT: hue contrast — a field hue answered by its opposite (or a
//    near-opposite) hue, with the opposite hue always much lighter in dark
//    mode (and much deeper in light mode) than the field it sits on.
import { maxChroma, oklch, oklchAlpha, readableText } from './surfaceColor';
import type { SurfacePolarityPalette } from './telemetryFeatures';

export type Palette = Omit<SurfacePolarityPalette, 'label'>;
export interface PalettePair {
  dark: Palette;
  light: Palette;
  accentHex: string;
}

/** Where the saturated layer goes: the cards, the page field, or only the edges. */
export type ChromaMode = 'inlay' | 'field' | 'edge';
/** Complement layouts: opposite hue on edges+accent, on the cards, or on edges+inputs. */
export type ComplementMode = 'flare' | 'split' | 'seam';
export type Depth = 'deep' | 'dusk';
export type Strength = 'vivid' | 'hush';

// Base lightness of the dark page field. "dusk" is a touch lifted, still
// within the range the CLASSIC series already uses.
const DARK_FIELD_L: Record<Depth, number> = { deep: 0.17, dusk: 0.215 };
// Tinted grey: enough hue that the grey belongs to the theme, not enough
// to read as a color next to the saturated layer.
const GREY_C = 0.008;

/** Chroma capped to what the hue can actually reach at that lightness. */
const vividAt = (l: number, h: number, cap: number) => Math.min(cap, maxChroma(l, h));

function finishDark(h: number, textHue: number, textChroma: number, base: Omit<Palette, 'textMain' | 'textMuted'>): Palette {
  const surfaces = [base.bgCard, base.bgMain, base.bgInput];
  return {
    ...base,
    textMain: readableText(0.95, 0.012, h, surfaces, 9),
    textMuted: readableText(0.72, textChroma, textHue, surfaces, 4.6),
  };
}

function finishLight(h: number, textHue: number, textChroma: number, base: Omit<Palette, 'textMain' | 'textMuted'>): Palette {
  const surfaces = [base.bgCard, base.bgMain, base.bgInput];
  return {
    ...base,
    textMain: readableText(0.24, 0.03, h, surfaces, 9),
    textMuted: readableText(0.5, textChroma, textHue, surfaces, 4.6),
  };
}

export function buildChromaPalette(h: number, mode: ChromaMode, depth: Depth, strength: Strength): PalettePair {
  const l0 = DARK_FIELD_L[depth];
  const cap = strength === 'vivid' ? 0.13 : 0.075;
  const lightCap = strength === 'vivid' ? 1 : 0.6;
  const grey = (l: number) => oklch(l, GREY_C, h);
  const vivid = (l: number, scale = 1) => oklch(l, vividAt(l, h, cap * scale), h);

  let dark: Omit<Palette, 'textMain' | 'textMuted'>;
  let light: Omit<Palette, 'textMain' | 'textMuted'>;
  switch (mode) {
    case 'inlay':
      // Saturated cards set into an ash-grey page.
      dark = {
        bgMain: grey(l0),
        bgCard: vivid(l0 + 0.045),
        bgInput: vivid(l0 - 0.03, 0.7),
        border: vivid(l0 + 0.2, 1.4),
        glowTint: oklchAlpha(0.65, 0.2, h, 0.14),
      };
      light = {
        bgMain: oklch(0.955, 0.006, h),
        bgCard: oklch(0.975, 0.05 * lightCap, h),
        bgInput: oklch(0.93, 0.065 * lightCap, h),
        border: oklch(0.78, 0.14 * lightCap, h),
        glowTint: oklchAlpha(0.72, 0.15, h, 0.08),
      };
      break;
    case 'field':
      // Ash-grey cards floating on a saturated page.
      dark = {
        bgMain: vivid(l0),
        bgCard: grey(l0 + 0.045),
        bgInput: grey(l0 - 0.03),
        border: oklch(l0 + 0.16, GREY_C * 2, h),
        glowTint: oklchAlpha(0.65, 0.2, h, 0.12),
      };
      light = {
        bgMain: oklch(0.93, 0.08 * lightCap, h),
        bgCard: oklch(0.99, 0.003, h),
        bgInput: oklch(0.955, 0.005, h),
        border: oklch(0.86, 0.008, h),
        glowTint: oklchAlpha(0.72, 0.15, h, 0.08),
      };
      break;
    case 'edge':
      // Everything grey except a saturated wire around each card.
      dark = {
        bgMain: grey(l0),
        bgCard: grey(l0 + 0.045),
        bgInput: grey(l0 - 0.03),
        border: vivid(l0 + 0.3, 1.8),
        glowTint: oklchAlpha(0.65, 0.2, h, 0.16),
      };
      light = {
        bgMain: oklch(0.965, 0.005, h),
        bgCard: oklch(0.995, 0.002, h),
        bgInput: oklch(0.945, 0.005, h),
        border: oklch(0.72, 0.16 * lightCap, h),
        glowTint: oklchAlpha(0.72, 0.15, h, 0.08),
      };
      break;
  }

  // Muted text follows the theme: saturated where the layout is saturated.
  const mutedChroma = mode === 'edge' ? 0.02 : 0.045 * lightCap;
  return {
    dark: finishDark(h, h, mutedChroma, dark),
    light: finishLight(h, h, mutedChroma, light),
    accentHex: oklch(0.78, vividAt(0.78, h, strength === 'vivid' ? 0.19 : 0.12), h),
  };
}

export function buildComplementPalette(h1: number, offset: number, mode: ComplementMode, depth: Depth): PalettePair {
  const h2 = (h1 + offset) % 360;
  const l0 = DARK_FIELD_L[depth];
  // The field hue is a real color (navy, oxblood, forest), not a tinted grey.
  const c1 = (l: number, scale = 1) => vividAt(l, h1, 0.06 * scale);
  const field = (l: number, scale = 1) => oklch(l, c1(l, scale), h1);
  const counter = (l: number, cap: number) => oklch(l, vividAt(l, h2, cap), h2);

  let dark: Omit<Palette, 'textMain' | 'textMuted'>;
  let light: Omit<Palette, 'textMain' | 'textMuted'>;
  let accentHue = h2;
  switch (mode) {
    case 'flare':
      // A field hue lit up by bright opposite-hue edges and accents.
      dark = {
        bgMain: field(l0),
        bgCard: field(l0 + 0.045, 0.9),
        bgInput: field(l0 - 0.03),
        border: counter(0.52, 0.13),
        glowTint: oklchAlpha(0.68, 0.18, h2, 0.15),
      };
      light = {
        bgMain: oklch(0.95, 0.04, h1),
        bgCard: oklch(0.99, 0.008, h1),
        bgInput: oklch(0.93, 0.035, h1),
        border: counter(0.72, 0.13),
        glowTint: oklchAlpha(0.72, 0.14, h2, 0.08),
      };
      break;
    case 'split':
      // Page in one hue, cards in the opposite one, the cards a step lighter.
      dark = {
        bgMain: field(l0),
        bgCard: counter(l0 + 0.055, 0.055),
        bgInput: field(l0 - 0.03),
        border: counter(l0 + 0.21, 0.08),
        glowTint: oklchAlpha(0.68, 0.18, h1, 0.13),
      };
      light = {
        bgMain: oklch(0.94, 0.045, h1),
        bgCard: oklch(0.982, 0.022, h2),
        bgInput: oklch(0.925, 0.04, h1),
        border: counter(0.8, 0.08),
        glowTint: oklchAlpha(0.72, 0.14, h1, 0.08),
      };
      accentHue = h1;
      break;
    case 'seam':
      // Quiet field-hue cards stitched together by opposite-hue edges and inputs.
      dark = {
        bgMain: field(l0),
        bgCard: field(l0 + 0.045, 0.6),
        bgInput: counter(l0 - 0.02, 0.06),
        border: counter(0.62, 0.15),
        glowTint: oklchAlpha(0.68, 0.18, h2, 0.13),
      };
      light = {
        bgMain: oklch(0.96, 0.025, h1),
        bgCard: oklch(0.995, 0.004, h1),
        bgInput: oklch(0.935, 0.045, h2),
        border: counter(0.7, 0.14),
        glowTint: oklchAlpha(0.72, 0.14, h2, 0.08),
      };
      break;
  }

  // Muted text carries the answering hue, so the contrast reaches the type too.
  const mutedHue = mode === 'split' ? h1 : h2;
  return {
    dark: finishDark(h1, mutedHue, 0.05, dark),
    light: finishLight(h1, mutedHue, 0.07, light),
    accentHex: oklch(0.8, vividAt(0.8, accentHue, 0.17), accentHue),
  };
}
