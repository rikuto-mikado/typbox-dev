// NEO SIGNAL series: the third Surface Theme wave (THM-289..588 + PRS-05..12),
// defined in surfaceThemesNeo.json. Each row carries two hues — `hue` tints
// the surfaces, `hue2` drives the pattern and glow — so a theme can be a
// navy room lit by magenta neon instead of a single-hue wash.
//
// Readability rules for every palette produced here:
//  - dark surfaces stay at L ≤ 17 with text at L 95 / muted L 64;
//  - light surfaces stay at L ≥ 92 with text at L 11 / muted L 43;
//  - pattern ink never exceeds ~8% alpha, so motifs sit well under text.
import catalog from './surfaceThemesNeo.json';
import type { SurfaceFx, SurfacePatternType, SurfacePolarityPalette, SurfaceThemePair } from './telemetryFeatures';

type Tone = 'void' | 'deep' | 'dusk';
type Row = [string, string, string, string, string, number, number, Tone, SurfacePatternType, SurfaceFx | null];
type PrestigeRow = [...Row, number];

// Local copy of the HSL helper (telemetryFeatures imports this module, so
// importing helpers back from it would create a runtime cycle).
function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

const TONES: Record<Tone, { l: number; s: number; ink: number; glow: number }> = {
  // Near-black with a hint of hue: the neon/cyber look.
  void: { l: 7, s: 30, ink: 0.08, glow: 0.16 },
  // A genuine deep color (navy, forest, plum) like the archive series.
  deep: { l: 12, s: 34, ink: 0.07, glow: 0.12 },
  // Warmer, more saturated twilight base.
  dusk: { l: 14, s: 42, ink: 0.07, glow: 0.14 },
};

function buildNeoPalette(
  hue: number,
  hue2: number,
  tone: Tone
): { dark: Omit<SurfacePolarityPalette, 'label'>; light: Omit<SurfacePolarityPalette, 'label'> } {
  const tn = TONES[tone];
  // Achromatic rows (hue === hue2 === 0 with "void") read as pure graphite.
  const s = hue === 0 && hue2 === 0 ? 0 : tn.s;
  return {
    dark: {
      bgMain: hsl(hue, s, tn.l),
      bgCard: hsl(hue, s * 0.9, tn.l + 4.5),
      bgInput: hsl(hue, s, Math.max(4, tn.l - 3)),
      border: hsl(hue, s * 0.9 + 6, tn.l + 15),
      textMain: hsl(hue, 14, 95),
      textMuted: hsl(hue, 14, 64),
      patternTint: `hsla(${hue2}, ${s ? 85 : 0}%, 72%, ${tn.ink})`,
      glowTint: `hsla(${hue2}, ${s ? 90 : 0}%, 60%, ${tn.glow})`,
    },
    light: {
      bgMain: hsl(hue, s ? 38 : 0, 96.5),
      bgCard: '#ffffff',
      bgInput: hsl(hue, s ? 32 : 0, 92.5),
      border: hsl(hue, s ? 30 : 0, 83),
      textMain: hsl(hue, s ? 28 : 0, 11),
      textMuted: hsl(hue, s ? 14 : 0, 43),
      patternTint: `hsla(${hue2}, ${s ? 60 : 0}%, 30%, 0.065)`,
      glowTint: `hsla(${hue2}, ${s ? 75 : 0}%, 50%, 0.08)`,
    },
  };
}

function toPair(row: Row, code: string, divisionCode: string): SurfaceThemePair {
  const [id, name, darkLabel, lightLabel, description, hue, hue2, tone, pattern, fx] = row;
  const pal = buildNeoPalette(hue, hue2, tone);
  return {
    id,
    code,
    name,
    pairLabel: `${darkLabel} ⇄ ${lightLabel}`,
    description,
    pattern,
    accentHex: hue === 0 && hue2 === 0 ? '#e4e4e7' : hsl(hue2, 78, 60),
    divisionCode,
    // Placeholder: rebalanceThemeClearanceLevels() assigns the real level.
    clearanceHintLv: 0,
    series: 'neo',
    ...(fx ? { fx } : {}),
    dark: { label: darkLabel, ...pal.dark },
    light: { label: lightLabel, ...pal.light },
  };
}

const FIRST_NEO_CODE = 289;

export const NEO_SURFACE_THEME_PAIRS: SurfaceThemePair[] = (() => {
  let n = FIRST_NEO_CODE;
  return catalog.divisions.flatMap((div) =>
    (div.themes as Row[]).map((row) => toPair(row, `THM-${n++}`, div.division))
  );
})();

const FIRST_NEO_PRESTIGE_CODE = 5;

export const NEO_PRESTIGE_THEME_PAIRS: SurfaceThemePair[] = (catalog.prestige.themes as PrestigeRow[]).map(
  (row, i) => {
    const required = row[10];
    return {
      ...toPair(row.slice(0, 10) as Row, `PRS-${String(FIRST_NEO_PRESTIGE_CODE + i).padStart(2, '0')}`, 'PRESTIGE'),
      clearanceHintLv: 3000,
      requiredAscensions: required,
    };
  }
);
