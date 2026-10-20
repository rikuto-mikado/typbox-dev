// Builds the 100 EXPLORE MAP reward Surface Theme pairs — one SurfaceThemePair
// per map.rewardThemeIds entry (see exploreMaps.ts), each carrying a `scene`
// spec that SceneLayer.tsx renders via surfaceSceneArt.tsx's parametric
// illustrator. Mirrors surfaceNeo.ts's "data table -> procedural palette
// builder" split, but the "data table" here is EXPLORE_MAPS itself rather
// than a separate hand-authored JSON, since each reward theme's art is
// directly derived from the map it was earned on.
import { EXPLORE_MAPS } from './exploreMaps';
import type { SceneSpec } from './surfaceSceneArt';
import type { SurfaceThemePair } from './telemetryFeatures';

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

// Dark surfaces are tinted by the scene's night hue, light surfaces by its
// day hue — distinct from surfaceNeo.ts's single-hue palettes, since a scene
// theme's two polarities are meant to read as two different times of day.
function buildScenePalette(hueDay: number, hueNight: number) {
  return {
    dark: {
      bgMain: hsl(hueNight, 30, 11),
      bgCard: hsl(hueNight, 28, 15.5),
      bgInput: hsl(hueNight, 30, 8),
      border: hsl(hueNight, 32, 24),
      textMain: hsl(hueNight, 14, 95),
      textMuted: hsl(hueNight, 14, 64),
      patternTint: `hsla(${hueNight}, 70%, 70%, 0.06)`,
      glowTint: `hsla(${hueNight}, 70%, 60%, 0.12)`,
    },
    light: {
      bgMain: hsl(hueDay, 38, 96.5),
      bgCard: '#ffffff',
      bgInput: hsl(hueDay, 32, 92.5),
      border: hsl(hueDay, 30, 83),
      textMain: hsl(hueDay, 28, 11),
      textMuted: hsl(hueDay, 14, 43),
      patternTint: `hsla(${hueDay}, 60%, 30%, 0.05)`,
      glowTint: `hsla(${hueDay}, 70%, 55%, 0.08)`,
    },
  };
}

const VARIANT_SUFFIX = [null, '// ECLIPSE CUT'] as const;
const VARIANT_HUE_SHIFT = [0, 34];
const VARIANT_SEED_SHIFT = [0, 500];

function buildSceneThemePairs(): SurfaceThemePair[] {
  const pairs: SurfaceThemePair[] = [];

  EXPLORE_MAPS.forEach((map) => {
    map.rewardThemeIds.forEach((themeId, variantIdx) => {
      const hueDay = map.hueDay + VARIANT_HUE_SHIFT[variantIdx];
      const hueNight = map.hueNight;
      const seed = map.seed + VARIANT_SEED_SHIFT[variantIdx];
      const scene: SceneSpec = { silhouette: map.silhouette, seed, hueDay, hueNight };
      const pal = buildScenePalette(hueDay, hueNight);
      const suffix = VARIANT_SUFFIX[variantIdx];
      const name = suffix ? `${map.name} ${suffix}` : map.name;
      const num = themeId.split('-')[1];

      pairs.push({
        id: themeId,
        code: `SCN-${num}`,
        name,
        pairLabel: `${map.regionName} NIGHT ⇄ ${map.regionName} DAY`,
        description: `An EXPLORE MAP reward illustration revealed by fully charting ${map.name}. ${map.desc}`,
        pattern: 'none',
        accentHex: hsl(hueDay, 70, 55),
        divisionCode: 'EXPLORE',
        // Unused for unlock gating (requiredMapClear short-circuits
        // isThemeUnlocked before clearanceHintLv is ever read); kept only so
        // this still sorts sensibly alongside clearance-gated themes.
        clearanceHintLv: 9999,
        requiredMapClear: map.id,
        series: 'scene',
        scene,
        dark: { label: `${map.regionName} NIGHT`, ...pal.dark },
        light: { label: `${map.regionName} DAY`, ...pal.light },
      });
    });
  });

  return pairs;
}

export const SCENE_SURFACE_THEME_PAIRS: SurfaceThemePair[] = buildSceneThemePairs();
