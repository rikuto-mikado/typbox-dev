import React from 'react';

// Parametric PIXEL ART scenes for the 300 pixel-art Surface Themes
// (pixelArtThemes.ts).
// Everything is drawn on a fixed logical pixel grid (COLS x ROWS) and
// rendered as crisp, non-anti-aliased <rect> blocks — the "chunky" retro
// dot-art look — rather than smooth SVG paths/gradients. The day/night
// gimmick the feature spec asks for (windows lighting up, stars appearing,
// a beacon switching on) is built the same way as before: the same
// SceneSpec renders a genuinely different pixel composition depending on
// `isDark`, not a darker palette.
//
// 14 silhouette archetypes are composed from a small shared "pixel sprite"
// library (tree, building-with-roof-style, heightmap mountain, pyramid,
// pagoda tiers, crane, lighthouse stripes, dithered water) so 100 theme rows
// stay tractable without hand-drawing each one individually — the same
// "shared builder + parameter table" strategy telemetryFeatures.tsx already
// uses for its 240 generated Surface Theme pairs.

export type SceneSilhouette =
  | 'cityscape'
  | 'medieval-castle'
  | 'pixel-village'
  | 'seaside-pier'
  | 'harbor-cranes'
  | 'forest-treeline'
  | 'desert-dunes-pyramid'
  | 'mountain-range'
  | 'snowy-peaks'
  | 'temple-pagoda'
  | 'space-dock'
  | 'lake-reflection'
  | 'lighthouse-coast'
  | 'terraced-farmland'
  // 12 archetypes added for stronger per-theme distinctiveness.
  | 'cyberpunk-alley'
  | 'deep-sea'
  | 'wasteland'
  | 'volcano'
  | 'floating-islands'
  | 'crystal-cave'
  | 'windmill-farm'
  | 'carnival-pier'
  | 'subway-station'
  | 'botanical-dome'
  | 'tundra-outpost'
  | 'shrine-garden';

export interface SceneSpec {
  silhouette: SceneSilhouette;
  seed: number;
  /** Tints the sky/materials by day. */
  hueDay: number;
  /** Tints the sky/materials by night (independent of hueDay — night skies read as navy/indigo regardless of the daytime hue). */
  hueNight: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue.toFixed(0)}, ${Math.max(0, Math.min(100, s))}%, ${Math.max(0, Math.min(100, l))}%)`;
}

// ==========================================
// Pixel grid
// ==========================================
const PX = 5;
const COLS = 64;
const ROWS = 36;
const VB_W = COLS * PX;
const VB_H = ROWS * PX;
const HORIZON = 23; // row where ground/water begins
// False positive from react-refresh/only-export-components: this file's
// only component-shaped export is renderScene(), a plain lowercase function,
// but the rule misattributes its warning to this unrelated local constant.
// eslint-disable-next-line react-refresh/only-export-components
const SKY_ROWS = HORIZON;

interface Pix {
  col: number;
  row: number;
  w?: number;
  h?: number;
  fill: string;
  opacity?: number;
}

function toRects(list: Pix[], keyPrefix: string): React.ReactNode[] {
  return list.map((p, i) => (
    <rect
      key={`${keyPrefix}-${i}`}
      x={p.col * PX}
      y={p.row * PX}
      width={(p.w ?? 1) * PX}
      height={(p.h ?? 1) * PX}
      fill={p.fill}
      opacity={p.opacity}
      shapeRendering="crispEdges"
    />
  ));
}

// ---------- shared pixel sprite primitives ----------

function treeSprite(cx: number, baseRow: number, style: 'conifer' | 'round', canopy: string, trunk: string): Pix[] {
  const out: Pix[] = [];
  if (style === 'conifer') {
    out.push({ col: cx, row: baseRow - 2, w: 1, h: 2, fill: trunk });
    out.push({ col: cx - 2, row: baseRow - 4, w: 5, h: 2, fill: canopy });
    out.push({ col: cx - 1, row: baseRow - 6, w: 3, h: 2, fill: canopy });
    out.push({ col: cx, row: baseRow - 7, w: 1, h: 1, fill: canopy });
  } else {
    out.push({ col: cx, row: baseRow - 2, w: 1, h: 2, fill: trunk });
    out.push({ col: cx - 1, row: baseRow - 6, w: 3, h: 1, fill: canopy });
    out.push({ col: cx - 2, row: baseRow - 5, w: 5, h: 2, fill: canopy });
    out.push({ col: cx - 1, row: baseRow - 3, w: 3, h: 1, fill: canopy });
  }
  return out;
}

interface BuildingOpts {
  cx: number;
  baseRow: number;
  width: number;
  height: number;
  wall: string;
  roof: string;
  roofStyle: 'flat' | 'pitched' | 'crenellated' | 'conical';
  windowLit: string;
  windowDark: string;
  rand: () => number;
  isDark: boolean;
}

function buildingSprite(o: BuildingOpts): Pix[] {
  const out: Pix[] = [];
  const left = o.cx - Math.floor(o.width / 2);
  const wallTop = o.baseRow - o.height;
  out.push({ col: left, row: wallTop, w: o.width, h: o.height, fill: o.wall });

  // window grid — sparse, with ~65% lit at night, dark-on-wall by day.
  for (let r = wallTop + 1; r < o.baseRow - 1; r += 2) {
    for (let c = left + 1; c < left + o.width - 1; c += 2) {
      if (o.rand() < 0.25) continue;
      const lit = o.isDark && o.rand() < 0.68;
      out.push({ col: c, row: r, w: 1, h: 1, fill: lit ? o.windowLit : o.windowDark });
    }
  }

  if (o.roofStyle === 'pitched') {
    const peakH = Math.max(2, Math.round(o.width / 3));
    for (let i = 0; i < peakH; i++) {
      const w = Math.max(1, o.width - i * 2);
      out.push({ col: o.cx - Math.floor(w / 2), row: wallTop - peakH + i, w, h: 1, fill: o.roof });
    }
  } else if (o.roofStyle === 'conical') {
    for (let i = 0; i < 4; i++) {
      const w = Math.max(1, o.width - i * 2 - 1);
      out.push({ col: o.cx - Math.floor(w / 2), row: wallTop - 4 + i, w, h: 1, fill: o.roof });
    }
  } else if (o.roofStyle === 'crenellated') {
    for (let c = left; c < left + o.width; c += 2) {
      out.push({ col: c, row: wallTop - 1, w: 1, h: 1, fill: o.roof });
    }
  } else {
    out.push({ col: left, row: wallTop - 1, w: o.width, h: 1, fill: o.roof });
  }
  return out;
}

function mountainHeightmap(baseRow: number, cols: number, startCol: number, amplitude: number, color: string, rand: () => number): Pix[] {
  const out: Pix[] = [];
  let h = amplitude * 0.4;
  for (let i = 0; i < cols; i++) {
    h += (rand() - 0.5) * amplitude * 0.5;
    h = Math.max(2, Math.min(amplitude, h));
    const peakRow = Math.round(baseRow - h);
    out.push({ col: startCol + i, row: peakRow, w: 1, h: baseRow - peakRow, fill: color });
  }
  return out;
}

function pyramidSprite(cx: number, baseRow: number, rows: number, colorA: string, colorB: string): Pix[] {
  const out: Pix[] = [];
  for (let i = 0; i < rows; i++) {
    const w = rows * 2 - i * 2;
    out.push({ col: cx - Math.floor(w / 2), row: baseRow - rows + i, w, h: 1, fill: i % 2 === 0 ? colorA : colorB });
  }
  return out;
}

function pagodaSprite(cx: number, baseRow: number, tiers: number, wall: string, roof: string, lanternColor: string, lanternsLit: boolean): Pix[] {
  const out: Pix[] = [];
  let row = baseRow;
  for (let t = 0; t < tiers; t++) {
    const roofW = 10 - t * 2;
    const wallW = roofW - 3;
    out.push({ col: cx - Math.floor(wallW / 2), row: row - 2, w: wallW, h: 2, fill: wall });
    out.push({ col: cx - Math.floor(roofW / 2), row: row - 3, w: roofW, h: 1, fill: roof });
    out.push({
      col: cx - Math.floor(roofW / 2) - 1,
      row: row - 2,
      w: 1,
      h: 1,
      fill: lanternsLit ? '#fbbf24' : lanternColor,
    });
    out.push({
      col: cx + Math.floor(roofW / 2),
      row: row - 2,
      w: 1,
      h: 1,
      fill: lanternsLit ? '#fbbf24' : lanternColor,
    });
    row -= 4;
  }
  return out;
}

function craneSprite(cx: number, baseRow: number, towerH: number, color: string, lit: boolean): Pix[] {
  const out: Pix[] = [];
  out.push({ col: cx, row: baseRow - towerH, w: 1, h: towerH, fill: color });
  for (let r = baseRow - towerH + 2; r < baseRow; r += 4) {
    out.push({ col: cx - 1, row: r, w: 3, h: 1, fill: color, opacity: 0.6 });
  }
  out.push({ col: cx - 7, row: baseRow - towerH, w: 8, h: 1, fill: color });
  out.push({ col: cx - 7, row: baseRow - towerH + 3, w: 1, h: 2, fill: color });
  out.push({ col: cx, row: baseRow - towerH - 1, w: 1, h: 1, fill: lit ? '#fb7185' : '#7f1d1d' });
  return out;
}

function lighthouseSprite(cx: number, baseRow: number, height: number, stripeA: string, stripeB: string, lit: boolean): Pix[] {
  const out: Pix[] = [];
  for (let i = 0; i < height; i++) {
    out.push({ col: cx - 1, row: baseRow - height + i, w: 3, h: 1, fill: i % 2 === 0 ? stripeA : stripeB });
  }
  out.push({ col: cx - 2, row: baseRow - height - 2, w: 5, h: 2, fill: '#3f3f46' });
  out.push({ col: cx - 1, row: baseRow - height - 1, w: 3, h: 1, fill: lit ? '#fef9c3' : '#52525b', opacity: lit ? 0.95 : 1 });
  return out;
}

function waterBand(fromRow: number, toRow: number, colorA: string, colorB: string, rand: () => number): Pix[] {
  const out: Pix[] = [];
  out.push({ col: 0, row: fromRow, w: COLS, h: toRow - fromRow, fill: colorA });
  for (let r = fromRow; r < toRow; r++) {
    for (let c = 0; c < COLS; c += 2) {
      if (rand() < 0.45) out.push({ col: c + Math.floor(rand() * 2), row: r, w: 2, h: 1, fill: colorB, opacity: 0.5 });
    }
  }
  return out;
}

function duneHeightmap(baseRow: number, amplitude: number, color: string, rand: () => number): Pix[] {
  return mountainHeightmap(baseRow, COLS, 0, amplitude, color, rand);
}

function groundTexture(fromRow: number, base: string, speckle: string, rand: () => number): Pix[] {
  const out: Pix[] = [{ col: 0, row: fromRow, w: COLS, h: ROWS - fromRow, fill: base }];
  for (let r = fromRow; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (rand() < 0.06) out.push({ col: c, row: r, w: 1, h: 1, fill: speckle, opacity: 0.55 });
    }
  }
  return out;
}

function skyBands(hueLerp: (t: number) => string): Pix[] {
  const out: Pix[] = [];
  const bandCount = 6;
  const bandH = Math.ceil(SKY_ROWS / bandCount);
  for (let b = 0; b < bandCount; b++) {
    const t = b / (bandCount - 1);
    out.push({ col: 0, row: b * bandH, w: COLS, h: bandH, fill: hueLerp(t) });
  }
  return out;
}

function lerpHsl(h: number, s: number, lFrom: number, lTo: number, t: number): string {
  return hsl(h, s, lFrom + (lTo - lFrom) * t);
}

function starsAndMoon(rand: () => number, moonX: number): Pix[] {
  const out: Pix[] = [];
  for (let i = 0; i < 34; i++) {
    const col = Math.floor(rand() * COLS);
    const row = Math.floor(rand() * (SKY_ROWS - 2));
    out.push({ col, row, w: 1, h: 1, fill: '#ffffff', opacity: 0.4 + rand() * 0.55 });
  }
  const moonRow = 5;
  const moonMask = [
    '.###.',
    '#####',
    '#####',
    '#####',
    '.###.',
  ];
  moonMask.forEach((rowStr, r) => {
    for (let c = 0; c < rowStr.length; c++) {
      if (rowStr[c] === '#') out.push({ col: moonX - 2 + c, row: moonRow + r, w: 1, h: 1, fill: '#eef2ff' });
    }
  });
  return out;
}

function sunSprite(sunX: number): Pix[] {
  const out: Pix[] = [];
  const sunRow = 6;
  const sunMask = ['.###.', '#####', '#####', '#####', '.###.'];
  sunMask.forEach((rowStr, r) => {
    for (let c = 0; c < rowStr.length; c++) {
      if (rowStr[c] === '#') out.push({ col: sunX - 2 + c, row: sunRow + r, w: 1, h: 1, fill: '#fde68a' });
    }
  });
  const rays: [number, number][] = [
    [sunX - 4, sunRow - 2],
    [sunX + 4, sunRow - 2],
    [sunX - 4, sunRow + 6],
    [sunX + 4, sunRow + 6],
  ];
  rays.forEach(([col, row]) => out.push({ col, row, w: 1, h: 1, fill: '#fde68a', opacity: 0.7 }));
  return out;
}

function cloudPuff(cx: number, row: number, color: string): Pix[] {
  return [
    { col: cx - 2, row, w: 6, h: 1, fill: color, opacity: 0.8 },
    { col: cx - 3, row: row + 1, w: 8, h: 1, fill: color, opacity: 0.8 },
  ];
}

// ---------- 12 more shared pixel sprite primitives ----------

function neonSignSprite(cx: number, baseRow: number, height: number, color: string, lit: boolean): Pix[] {
  const out: Pix[] = [];
  out.push({ col: cx, row: baseRow - height, w: 2, h: height, fill: lit ? color : 'rgba(255,255,255,0.08)', opacity: lit ? 0.95 : 1 });
  if (lit) out.push({ col: cx - 1, row: baseRow - height, w: 4, h: height, fill: color, opacity: 0.18 });
  return out;
}

function bubbleField(count: number, rand: () => number, color: string): Pix[] {
  const out: Pix[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ col: Math.floor(rand() * COLS), row: Math.floor(rand() * ROWS), w: 1, h: 1, fill: color, opacity: 0.25 + rand() * 0.4 });
  }
  return out;
}

function crystalCluster(cx: number, baseRow: number, size: number, color: string, glow: boolean): Pix[] {
  const out: Pix[] = [];
  for (let i = 0; i < size; i++) {
    const w = size - i;
    out.push({ col: cx - Math.floor(w / 2), row: baseRow - size - i, w, h: 1, fill: color, opacity: glow ? 0.95 : 0.7 });
  }
  if (glow) out.push({ col: cx - 1, row: baseRow - size - 1, w: 3, h: 3, fill: color, opacity: 0.2 });
  return out;
}

function ferrisWheelSprite(cx: number, cy: number, r: number, color: string, lit: boolean): Pix[] {
  const out: Pix[] = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const col = Math.round(cx + Math.cos(angle) * r);
    const row = Math.round(cy + Math.sin(angle) * r);
    out.push({ col, row, w: 1, h: 1, fill: lit && i % 3 === 0 ? '#fde68a' : color });
  }
  out.push({ col: cx, row: cy - r, w: 1, h: r * 2, fill: color, opacity: 0.4 });
  out.push({ col: cx - r, row: cy, w: r * 2, h: 1, fill: color, opacity: 0.4 });
  out.push({ col: cx - 1, row: cy + r, w: 2, h: 3, fill: '#57534e' });
  return out;
}

function windmillSprite(cx: number, baseRow: number, towerH: number, bladeColor: string): Pix[] {
  const out: Pix[] = [];
  out.push({ col: cx, row: baseRow - towerH, w: 1, h: towerH, fill: '#e7e5e4' });
  const hub = baseRow - towerH;
  out.push({ col: cx - 4, row: hub - 4, w: 2, h: 2, fill: bladeColor });
  out.push({ col: cx + 3, row: hub - 4, w: 2, h: 2, fill: bladeColor });
  out.push({ col: cx - 4, row: hub + 2, w: 2, h: 2, fill: bladeColor });
  out.push({ col: cx + 3, row: hub + 2, w: 2, h: 2, fill: bladeColor });
  out.push({ col: cx - 1, row: hub - 1, w: 2, h: 2, fill: '#44403c' });
  return out;
}

function auroraBand(rand: () => number, color: string): Pix[] {
  const out: Pix[] = [];
  for (let b = 0; b < 3; b++) {
    const baseRow = 4 + b * 4;
    for (let c = 0; c < COLS; c++) {
      const wobble = Math.round(Math.sin(c / 6 + b) * 2);
      out.push({ col: c, row: baseRow + wobble, w: 1, h: 2, fill: color, opacity: 0.12 + rand() * 0.1 });
    }
  }
  return out;
}

function deadTreeSprite(cx: number, baseRow: number, height: number, color: string): Pix[] {
  const out: Pix[] = [];
  out.push({ col: cx, row: baseRow - height, w: 1, h: height, fill: color });
  out.push({ col: cx - 2, row: baseRow - height, w: 2, h: 1, fill: color });
  out.push({ col: cx + 1, row: baseRow - height + 2, w: 2, h: 1, fill: color });
  out.push({ col: cx - 3, row: baseRow - height + 4, w: 3, h: 1, fill: color });
  return out;
}

function toriiGateSprite(cx: number, baseRow: number, height: number, color: string): Pix[] {
  const out: Pix[] = [];
  out.push({ col: cx - 6, row: baseRow - height, w: 2, h: height, fill: color });
  out.push({ col: cx + 4, row: baseRow - height, w: 2, h: height, fill: color });
  out.push({ col: cx - 7, row: baseRow - height - 3, w: 14, h: 2, fill: color });
  out.push({ col: cx - 5, row: baseRow - height, w: 10, h: 1, fill: color });
  return out;
}

function lanternSprite(cx: number, baseRow: number, lit: boolean): Pix[] {
  const out: Pix[] = [];
  out.push({ col: cx - 1, row: baseRow - 6, w: 3, h: 1, fill: '#78716c' });
  out.push({ col: cx - 1, row: baseRow - 5, w: 3, h: 3, fill: lit ? '#fbbf24' : '#57534e', opacity: lit ? 0.95 : 1 });
  out.push({ col: cx - 2, row: baseRow - 2, w: 5, h: 1, fill: '#78716c' });
  out.push({ col: cx, row: baseRow - 1, w: 1, h: 1, fill: '#57534e' });
  return out;
}

function domeSprite(cx: number, baseRow: number, width: number, height: number, frameColor: string): Pix[] {
  const out: Pix[] = [];
  for (let i = 0; i < height; i++) {
    const w = Math.round(width * Math.sin(((i + 1) / (height + 1)) * Math.PI));
    out.push({ col: cx - Math.floor(w / 2), row: baseRow - height + i, w: 1, h: 1, fill: frameColor });
    out.push({ col: cx + Math.ceil(w / 2), row: baseRow - height + i, w: 1, h: 1, fill: frameColor });
  }
  out.push({ col: cx - Math.floor(width / 2), row: baseRow, w: width, h: 1, fill: frameColor });
  return out;
}

// ==========================================
// Archetype composition
// ==========================================
// Archetypes with an always-ominous/hazy sky mood regardless of day/night —
// still uses the shared sky band renderer, just desaturated.
const HAZY_MOOD = new Set<SceneSilhouette>(['wasteland', 'volcano']);

export function renderScene(spec: SceneSpec, isDark: boolean): React.ReactNode {
  const rand = mulberry32(spec.seed + (isDark ? 7 : 0));
  const hue = isDark ? spec.hueNight : spec.hueDay;
  const hazy = HAZY_MOOD.has(spec.silhouette);

  const pixels: Pix[] = [];

  // ---- sky / backdrop ----
  if (spec.silhouette === 'space-dock') {
    pixels.push({ col: 0, row: 0, w: COLS, h: SKY_ROWS, fill: hsl(hue, 35, isDark ? 7 : 10) });
    for (let i = 0; i < 60; i++) {
      pixels.push({ col: Math.floor(rand() * COLS), row: Math.floor(rand() * SKY_ROWS), w: 1, h: 1, fill: '#ffffff', opacity: 0.3 + rand() * 0.6 });
    }
  } else if (spec.silhouette === 'deep-sea') {
    for (let r = 0; r < ROWS; r++) {
      const t = r / ROWS;
      pixels.push({ col: 0, row: r, w: COLS, h: 1, fill: lerpHsl(hue, 55, isDark ? 14 : 30, isDark ? 2 : 6, t) });
    }
    pixels.push(...bubbleField(50, rand, isDark ? 'rgba(165,243,252,0.5)' : 'rgba(224,242,254,0.4)'));
  } else if (spec.silhouette === 'crystal-cave') {
    pixels.push({ col: 0, row: 0, w: COLS, h: ROWS, fill: hsl(hue, 20, isDark ? 6 : 10) });
    for (let i = 0; i < 10; i++) {
      pixels.push({ col: Math.floor(rand() * COLS), row: 0, w: 2, h: 3 + Math.floor(rand() * 4), fill: hsl(hue, 15, 15) });
    }
  } else if (spec.silhouette === 'subway-station') {
    for (let r = 0; r < 14; r += 2) {
      pixels.push({ col: 0, row: r, w: COLS, h: 2, fill: hsl(hue, 10, isDark ? 16 : 24) });
      pixels.push({ col: 0, row: r, w: COLS, h: 2, fill: hsl(hue, 8, isDark ? 20 : 28), opacity: 0.4 });
    }
  } else if (isDark) {
    pixels.push(...skyBands((t) => lerpHsl(hue, hazy ? 14 : 42, hazy ? 14 : 8, hazy ? 22 : 20, t)));
    if (hazy) {
      pixels.push({ col: 0, row: 0, w: COLS, h: SKY_ROWS, fill: '#7f1d1d', opacity: 0.1 });
    }
    pixels.push(...starsAndMoon(rand, Math.round(COLS * 0.76)));
  } else {
    pixels.push(...skyBands((t) => lerpHsl(hue, hazy ? 20 : 65, hazy ? 70 : 92, hazy ? 55 : 62, t)));
    if (!hazy) {
      pixels.push(...sunSprite(Math.round(COLS * 0.2)));
      pixels.push(...cloudPuff(Math.round(COLS * 0.45), 4, '#ffffff'));
      pixels.push(...cloudPuff(Math.round(COLS * 0.68), 8, '#ffffff'));
    } else {
      pixels.push({ col: 0, row: 0, w: COLS, h: SKY_ROWS, fill: '#78716c', opacity: 0.15 });
    }
  }

  const wallA = hsl(hue, isDark ? 20 : 30, isDark ? 22 : 55);
  const wallB = hsl(hue, isDark ? 18 : 26, isDark ? 16 : 42);
  const roofColor = hsl(hue + 10, isDark ? 24 : 34, isDark ? 12 : 30);
  const litColor = '#fbbf24';
  const darkWindow = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)';
  const groundBase = hsl(hue - 6, isDark ? 20 : 30, isDark ? 10 : 42);
  const groundSpeckle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';

  switch (spec.silhouette) {
    case 'cityscape': {
      pixels.push(...groundTexture(HORIZON, groundBase, groundSpeckle, rand));
      const count = 9;
      for (let i = 0; i < count; i++) {
        const cx = Math.round((i + 0.5) * (COLS / count));
        const h = 8 + Math.floor(rand() * 14);
        const w = 5 + Math.floor(rand() * 4);
        pixels.push(
          ...buildingSprite({
            cx,
            baseRow: HORIZON,
            width: w,
            height: h,
            wall: rand() < 0.5 ? wallA : wallB,
            roof: roofColor,
            roofStyle: 'flat',
            windowLit: litColor,
            windowDark: darkWindow,
            rand,
            isDark,
          })
        );
        if (rand() < 0.4) pixels.push({ col: cx, row: HORIZON - h - 3, w: 1, h: 3, fill: roofColor });
      }
      break;
    }
    case 'medieval-castle': {
      pixels.push(...groundTexture(HORIZON, groundBase, groundSpeckle, rand));
      pixels.push(
        ...buildingSprite({ cx: 32, baseRow: HORIZON, width: 14, height: 11, wall: wallA, roof: roofColor, roofStyle: 'crenellated', windowLit: litColor, windowDark: darkWindow, rand, isDark })
      );
      pixels.push(
        ...buildingSprite({ cx: 17, baseRow: HORIZON, width: 7, height: 16, wall: wallB, roof: roofColor, roofStyle: 'conical', windowLit: litColor, windowDark: darkWindow, rand, isDark })
      );
      pixels.push(
        ...buildingSprite({ cx: 48, baseRow: HORIZON, width: 7, height: 14, wall: wallB, roof: roofColor, roofStyle: 'conical', windowLit: litColor, windowDark: darkWindow, rand, isDark })
      );
      pixels.push({ col: 29, row: HORIZON - 4, w: 6, h: 4, fill: isDark ? '#1c1917' : '#44403c' });
      pixels.push({ col: 17, row: HORIZON - 21, w: 1, h: 4, fill: '#a1a1aa' });
      pixels.push({ col: 18, row: HORIZON - 21, w: 2, h: 1, fill: hsl(hue + 30, 70, 55) });
      break;
    }
    case 'pixel-village': {
      pixels.push(...groundTexture(HORIZON, groundBase, groundSpeckle, rand));
      const n = 6;
      for (let i = 0; i < n; i++) {
        const cx = 6 + Math.round(i * (COLS - 12) / (n - 1));
        const h = 6 + Math.floor(rand() * 3);
        const w = 6 + Math.floor(rand() * 3);
        pixels.push(
          ...buildingSprite({ cx, baseRow: HORIZON, width: w, height: h, wall: rand() < 0.5 ? wallA : wallB, roof: roofColor, roofStyle: 'pitched', windowLit: litColor, windowDark: darkWindow, rand, isDark })
        );
        if (!isDark && rand() < 0.5) pixels.push(...cloudPuff(cx, HORIZON - h - 7, 'rgba(255,255,255,0.5)'));
        if (isDark && rand() < 0.5) {
          pixels.push({ col: cx + 2, row: HORIZON - h - 6, w: 1, h: 2, fill: '#78716c' });
        }
      }
      break;
    }
    case 'seaside-pier': {
      pixels.push(...waterBand(HORIZON, ROWS, hsl(hue, isDark ? 30 : 55, isDark ? 14 : 55), hsl(hue, isDark ? 25 : 45, isDark ? 20 : 68), rand));
      const pierCol = 30;
      for (let c = pierCol - 10; c < pierCol + 10; c += 4) {
        pixels.push({ col: c, row: HORIZON, w: 1, h: 6, fill: '#57534e' });
      }
      pixels.push({ col: pierCol - 11, row: HORIZON - 1, w: 22, h: 1, fill: '#78716c' });
      pixels.push({ col: pierCol, row: HORIZON - 1, w: 1, h: 4, fill: '#78716c' });
      pixels.push({ col: pierCol - 1, row: HORIZON - 5, w: 3, h: 1, fill: isDark ? '#fde68a' : '#78716c' });
      if (!isDark) {
        for (let i = 0; i < 4; i++) pixels.push({ col: 10 + i * 12, row: 10 + (i % 2), w: 2, h: 1, fill: '#f4f4f5' });
      }
      break;
    }
    case 'harbor-cranes': {
      pixels.push(...waterBand(HORIZON, ROWS, hsl(hue, isDark ? 28 : 50, isDark ? 13 : 50), hsl(hue, isDark ? 24 : 42, isDark ? 19 : 62), rand));
      pixels.push(...craneSprite(16, HORIZON, 16, roofColor, isDark));
      pixels.push(...craneSprite(40, HORIZON, 20, roofColor, isDark));
      const containerColors = [hsl(hue + 40, 60, 45), hsl(hue + 120, 55, 42), hsl(hue + 200, 50, 48)];
      for (let i = 0; i < 6; i++) {
        pixels.push({ col: 4 + i * 4, row: HORIZON - 2, w: 3, h: 2, fill: containerColors[i % containerColors.length] });
      }
      break;
    }
    case 'forest-treeline': {
      pixels.push(...groundTexture(HORIZON, groundBase, groundSpeckle, rand));
      const backGreen = hsl(hue + 20, isDark ? 20 : 35, isDark ? 10 : 28);
      const frontGreen = hsl(hue + 10, isDark ? 22 : 38, isDark ? 14 : 36);
      for (let i = 0; i < 10; i++) {
        pixels.push(...treeSprite(2 + i * 6 + Math.floor(rand() * 2), HORIZON + 1, 'conifer', backGreen, '#44403c'));
      }
      for (let i = 0; i < 8; i++) {
        pixels.push(...treeSprite(4 + i * 8, HORIZON + 2, i % 2 === 0 ? 'round' : 'conifer', frontGreen, '#44403c'));
      }
      if (isDark) {
        for (let i = 0; i < 12; i++) {
          pixels.push({ col: Math.floor(rand() * COLS), row: HORIZON - 1 + Math.floor(rand() * 4), w: 1, h: 1, fill: '#facc15', opacity: 0.5 + rand() * 0.4 });
        }
      }
      break;
    }
    case 'desert-dunes-pyramid': {
      pixels.push(...duneHeightmap(HORIZON + 3, 5, hsl(hue, isDark ? 18 : 32, isDark ? 14 : 48), rand));
      pixels.push({ col: 0, row: HORIZON + 3, w: COLS, h: ROWS - HORIZON - 3, fill: hsl(hue, isDark ? 18 : 32, isDark ? 10 : 44) });
      pixels.push(...pyramidSprite(34, HORIZON + 3, 9, hsl(hue + 8, 28, isDark ? 20 : 54), hsl(hue + 8, 28, isDark ? 14 : 46)));
      pixels.push(...pyramidSprite(46, HORIZON + 4, 6, hsl(hue + 8, 28, isDark ? 18 : 50), hsl(hue + 8, 28, isDark ? 12 : 42)));
      pixels.push(...treeSprite(12, HORIZON + 5, 'conifer', hsl(120, 30, isDark ? 16 : 32), '#44403c'));
      break;
    }
    case 'mountain-range': {
      pixels.push(...mountainHeightmap(HORIZON + 2, COLS, 0, 14, hsl(hue, isDark ? 20 : 25, isDark ? 10 : 30), rand));
      pixels.push(...mountainHeightmap(HORIZON + 6, COLS, 0, 9, hsl(hue, isDark ? 20 : 25, isDark ? 14 : 22), rand));
      pixels.push(...groundTexture(HORIZON + 8, groundBase, groundSpeckle, rand));
      pixels.push(...treeSprite(10, ROWS - 2, 'conifer', hsl(120, 28, isDark ? 14 : 28), '#44403c'));
      pixels.push(...treeSprite(52, ROWS - 2, 'conifer', hsl(120, 28, isDark ? 14 : 28), '#44403c'));
      break;
    }
    case 'snowy-peaks': {
      const peaks = mountainHeightmap(HORIZON + 2, COLS, 0, 15, hsl(hue, isDark ? 12 : 15, isDark ? 24 : 40), rand);
      pixels.push(...peaks);
      peaks.forEach((p) => {
        if ((p.h ?? 1) > 6) pixels.push({ col: p.col, row: p.row, w: 1, h: 2, fill: '#f8fafc' });
      });
      pixels.push({ col: 0, row: HORIZON + 10, w: COLS, h: ROWS - HORIZON - 10, fill: '#e2e8f0' });
      for (let i = 0; i < 20; i++) {
        pixels.push({ col: Math.floor(rand() * COLS), row: Math.floor(rand() * ROWS), w: 1, h: 1, fill: '#ffffff', opacity: 0.6 });
      }
      break;
    }
    case 'temple-pagoda': {
      pixels.push(...groundTexture(HORIZON, groundBase, groundSpeckle, rand));
      pixels.push(...pagodaSprite(32, HORIZON, 3, hsl(0, 45, isDark ? 20 : 42), hsl(hue, 30, isDark ? 16 : 26), isDark ? '#7c2d12' : '#991b1b', isDark));
      pixels.push(...pagodaSprite(14, HORIZON, 2, hsl(0, 45, isDark ? 18 : 38), hsl(hue, 30, isDark ? 14 : 24), isDark ? '#7c2d12' : '#991b1b', isDark));
      for (let c = 20; c < 44; c += 6) {
        pixels.push({ col: c, row: HORIZON - 1, w: 1, h: 1, fill: '#78716c' });
      }
      break;
    }
    case 'space-dock': {
      for (let i = 0; i < 3; i++) {
        const cx = 16 + i * 16;
        pixels.push({ col: cx - 3, row: HORIZON - 4, w: 6, h: 4, fill: hsl(hue, 20, 55) });
        pixels.push({ col: cx - 6, row: HORIZON - 3, w: 3, h: 2, fill: hsl(hue + 180, 40, 35) });
        pixels.push({ col: cx + 3, row: HORIZON - 3, w: 3, h: 2, fill: hsl(hue + 180, 40, 35) });
        pixels.push({ col: cx, row: HORIZON - 5, w: 1, h: 1, fill: isDark ? '#fda4af' : '#52525b', opacity: 0.9 });
      }
      pixels.push({ col: 8, row: HORIZON - 10, w: 48, h: 1, fill: hsl(hue, 20, 45), opacity: 0.6 });
      pixels.push(...groundTexture(HORIZON, hsl(hue, 20, isDark ? 10 : 24), 'rgba(255,255,255,0.08)', rand));
      break;
    }
    case 'lake-reflection': {
      pixels.push(...mountainHeightmap(HORIZON, COLS, 0, 10, hsl(hue, isDark ? 20 : 25, isDark ? 12 : 30), rand));
      for (let i = 0; i < 6; i++) pixels.push(...treeSprite(6 + i * 10, HORIZON + 1, 'round', hsl(hue + 20, 28, isDark ? 14 : 32), '#44403c'));
      const water = waterBand(HORIZON + 2, ROWS, hsl(hue, isDark ? 25 : 45, isDark ? 14 : 58), hsl(hue, isDark ? 20 : 38, isDark ? 20 : 68), rand);
      pixels.push(...water);
      const reflX = isDark ? Math.round(COLS * 0.76) : Math.round(COLS * 0.2);
      for (let r = HORIZON + 2; r < HORIZON + 8; r++) {
        pixels.push({ col: reflX, row: r, w: 1, h: 1, fill: isDark ? '#eef2ff' : '#fde68a', opacity: 0.35 });
      }
      pixels.push({ col: 44, row: HORIZON + 4, w: 5, h: 1, fill: '#44403c', opacity: 0.8 });
      break;
    }
    case 'lighthouse-coast': {
      pixels.push(...waterBand(HORIZON, ROWS, hsl(hue, isDark ? 28 : 48, isDark ? 14 : 52), hsl(hue, isDark ? 24 : 40, isDark ? 20 : 64), rand));
      pixels.push({ col: 0, row: HORIZON - 2, w: COLS, h: 2, fill: hsl(hue - 10, 20, isDark ? 16 : 38) });
      pixels.push(...lighthouseSprite(44, HORIZON - 1, 14, '#f4f4f5', '#dc2626', isDark));
      if (isDark) {
        pixels.push({ col: 20, row: HORIZON - 16, w: 24, h: 1, fill: '#fef9c3', opacity: 0.12 });
        pixels.push({ col: 24, row: HORIZON - 12, w: 20, h: 1, fill: '#fef9c3', opacity: 0.1 });
      }
      pixels.push(...treeSprite(10, HORIZON - 1, 'round', hsl(110, 28, isDark ? 14 : 30), '#44403c'));
      break;
    }
    case 'terraced-farmland': {
      const terraceColors = [hsl(hue, 30, isDark ? 16 : 42), hsl(hue, 28, isDark ? 13 : 36), hsl(hue, 26, isDark ? 10 : 30)];
      for (let i = 0; i < 4; i++) {
        pixels.push({ col: 0, row: HORIZON + i * 3, w: COLS, h: 3, fill: terraceColors[i % terraceColors.length] });
        pixels.push({ col: 0, row: HORIZON + i * 3, w: COLS, h: 1, fill: hsl(hue, 20, isDark ? 20 : 50), opacity: 0.5 });
        for (let c = 2; c < COLS; c += 4) {
          if (rand() < 0.6) pixels.push({ col: c, row: HORIZON + i * 3 + 1, w: 1, h: 1, fill: hsl(90, 30, isDark ? 16 : 34) });
        }
      }
      pixels.push(
        ...buildingSprite({ cx: 48, baseRow: HORIZON + 4, width: 6, height: 5, wall: wallA, roof: roofColor, roofStyle: 'pitched', windowLit: litColor, windowDark: darkWindow, rand, isDark })
      );
      break;
    }
    case 'cyberpunk-alley': {
      pixels.push({ col: 0, row: HORIZON, w: COLS, h: ROWS - HORIZON, fill: hsl(hue, 15, isDark ? 8 : 20) });
      const puddleRow = HORIZON + 4;
      pixels.push({ col: 0, row: puddleRow, w: COLS, h: 2, fill: hsl(hue, 20, isDark ? 12 : 26), opacity: 0.6 });
      pixels.push(
        ...buildingSprite({ cx: 14, baseRow: HORIZON, width: 24, height: 22, wall: wallB, roof: roofColor, roofStyle: 'flat', windowLit: '#22d3ee', windowDark: darkWindow, rand, isDark })
      );
      pixels.push(
        ...buildingSprite({ cx: 50, baseRow: HORIZON, width: 24, height: 26, wall: wallA, roof: roofColor, windowLit: '#f472b6', roofStyle: 'flat', windowDark: darkWindow, rand, isDark })
      );
      const signColors = ['#22d3ee', '#f472b6', '#a3e635', '#fb7185'];
      for (let i = 0; i < 5; i++) {
        pixels.push(...neonSignSprite(3 + i * 2, HORIZON - 2 - i * 3, 5 + (i % 3), signColors[i % signColors.length], isDark));
      }
      for (let i = 0; i < 2; i++) {
        pixels.push({ col: 30 + i * 2, row: HORIZON - 3, w: 1, h: 4, fill: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)' });
      }
      break;
    }
    case 'deep-sea': {
      pixels.push(...treeSprite(14, ROWS - 2, 'round', hsl(hue + 40, 20, isDark ? 10 : 20), hsl(hue, 10, 10)));
      pixels.push(...pyramidSprite(40, ROWS - 1, 7, hsl(hue, 15, isDark ? 14 : 24), hsl(hue, 15, isDark ? 10 : 18)));
      for (let i = 0; i < 6; i++) {
        pixels.push({ col: 4 + i * 10, row: ROWS - 10 - Math.floor(rand() * 8), w: 2, h: 1, fill: isDark ? '#a5f3fc' : '#67e8f9', opacity: 0.8 });
      }
      pixels.push({ col: 46, row: ROWS - 6, w: 10, h: 2, fill: hsl(hue, 10, isDark ? 8 : 16) });
      break;
    }
    case 'wasteland': {
      pixels.push(...duneHeightmap(HORIZON + 2, 4, hsl(hue, 10, isDark ? 14 : 30), rand));
      pixels.push({ col: 0, row: HORIZON + 2, w: COLS, h: ROWS - HORIZON - 2, fill: hsl(hue, 12, isDark ? 10 : 26) });
      pixels.push(...deadTreeSprite(10, HORIZON + 4, 9, '#44403c'));
      pixels.push(...deadTreeSprite(50, HORIZON + 5, 7, '#44403c'));
      pixels.push({ col: 28, row: HORIZON + 2, w: 8, h: 3, fill: '#57534e' });
      for (let c = 0; c < COLS; c += 5) {
        if (rand() < 0.5) pixels.push({ col: c, row: HORIZON + 2, w: 1, h: 1, fill: isDark ? '#f97316' : '#78716c', opacity: isDark ? 0.8 : 0.4 });
      }
      for (let i = 0; i < 2; i++) {
        pixels.push({ col: 16 + i * 30, row: HORIZON - 8, w: 1, h: 10, fill: '#78716c', opacity: 0.3 });
      }
      break;
    }
    case 'volcano': {
      pixels.push({ col: 0, row: HORIZON + 2, w: COLS, h: ROWS - HORIZON - 2, fill: hsl(10, 15, isDark ? 10 : 22) });
      pixels.push(...pyramidSprite(32, HORIZON + 2, 14, hsl(10, 20, isDark ? 16 : 30), hsl(10, 20, isDark ? 12 : 24)));
      pixels.push({ col: 31, row: HORIZON - 12, w: 2, h: 2, fill: isDark ? '#f97316' : '#fb923c' });
      for (let i = 0; i < 4; i++) {
        pixels.push({ col: 28 + i * 2, row: HORIZON - 2 - i, w: 1, h: 1, fill: isDark ? '#f97316' : '#fdba74', opacity: isDark ? 0.95 : 0.6 });
      }
      for (let i = 0; i < 10; i++) {
        pixels.push({ col: 28 + Math.floor(rand() * 8), row: HORIZON - 14 - Math.floor(rand() * 6), w: 1, h: 1, fill: '#78716c', opacity: 0.4 + rand() * 0.3 });
      }
      break;
    }
    case 'floating-islands': {
      const islands: [number, number, number][] = [[10, HORIZON - 4, 10], [34, HORIZON + 2, 14], [54, HORIZON - 8, 8]];
      islands.forEach(([cx, cy, w]) => {
        pixels.push({ col: cx - Math.floor(w / 2), row: cy, w, h: 3, fill: hsl(hue, 25, isDark ? 16 : 36) });
        pixels.push({ col: cx - Math.floor(w / 2) + 1, row: cy + 3, w: w - 2, h: 2, fill: hsl(hue, 20, isDark ? 10 : 24) });
        pixels.push(...treeSprite(cx, cy, 'round', hsl(hue + 20, 28, isDark ? 14 : 30), '#44403c'));
        for (let r = cy + 5; r < ROWS; r += 2) {
          pixels.push({ col: cx - 1, row: r, w: 1, h: 1, fill: isDark ? '#38bdf8' : '#7dd3fc', opacity: 0.4 });
        }
      });
      break;
    }
    case 'crystal-cave': {
      pixels.push(...crystalCluster(20, HORIZON + 6, 6, isDark ? '#c084fc' : '#818cf8', isDark));
      pixels.push(...crystalCluster(42, HORIZON + 8, 8, isDark ? '#38bdf8' : '#60a5fa', isDark));
      pixels.push(...crystalCluster(54, HORIZON + 4, 4, isDark ? '#f472b6' : '#f0abfc', isDark));
      pixels.push({ col: 0, row: HORIZON + 10, w: COLS, h: ROWS - HORIZON - 10, fill: hsl(hue, 20, isDark ? 10 : 18) });
      for (let i = 0; i < 8; i++) {
        pixels.push({ col: 4 + i * 8, row: HORIZON + 11, w: 1, h: 1, fill: isDark ? '#67e8f9' : '#a5f3fc', opacity: 0.5 });
      }
      break;
    }
    case 'windmill-farm': {
      pixels.push(...mountainHeightmap(HORIZON + 4, COLS, 0, 5, hsl(hue, isDark ? 18 : 32, isDark ? 12 : 42), rand));
      pixels.push(...groundTexture(HORIZON + 6, hsl(hue + 10, isDark ? 20 : 34, isDark ? 14 : 48), groundSpeckle, rand));
      pixels.push(...windmillSprite(16, HORIZON + 6, 14, '#f4f4f5'));
      pixels.push(...windmillSprite(40, HORIZON + 7, 11, '#f4f4f5'));
      if (isDark) pixels.push({ col: 15, row: HORIZON - 2, w: 2, h: 2, fill: '#fbbf24', opacity: 0.85 });
      break;
    }
    case 'carnival-pier': {
      pixels.push(...waterBand(HORIZON, ROWS, hsl(hue, isDark ? 28 : 50, isDark ? 14 : 55), hsl(hue, isDark ? 24 : 42, isDark ? 20 : 66), rand));
      pixels.push({ col: 0, row: HORIZON - 1, w: COLS, h: 1, fill: '#78716c' });
      pixels.push(...ferrisWheelSprite(44, HORIZON - 10, 9, '#f4f4f5', isDark));
      for (let c = 4; c < 30; c += 6) {
        pixels.push({ col: c, row: HORIZON - 5, w: 4, h: 5, fill: hsl((c * 40) % 360, 55, isDark ? 30 : 48) });
        if (isDark) pixels.push({ col: c + 1, row: HORIZON - 6, w: 1, h: 1, fill: '#fde68a', opacity: 0.9 });
      }
      break;
    }
    case 'subway-station': {
      pixels.push({ col: 0, row: 14, w: COLS, h: ROWS - 14, fill: hsl(hue, 10, isDark ? 10 : 20) });
      pixels.push({ col: 0, row: 14, w: COLS, h: 1, fill: '#fbbf24', opacity: 0.8 });
      pixels.push({ col: 4, row: ROWS - 10, w: 44, h: 8, fill: hsl(hue + 10, 30, isDark ? 24 : 40) });
      for (let r = ROWS - 9; r < ROWS - 2; r += 2) {
        pixels.push({ col: 8, row: r, w: 36, h: 1, fill: isDark ? '#fde68a' : '#1c1917', opacity: 0.7 });
      }
      pixels.push(...neonSignSprite(54, 13, 5, '#38bdf8', true));
      if (isDark) pixels.push({ col: 46, row: ROWS - 7, w: 2, h: 2, fill: '#fef9c3', opacity: 0.9 });
      break;
    }
    case 'botanical-dome': {
      pixels.push(...groundTexture(HORIZON, groundBase, groundSpeckle, rand));
      pixels.push(...domeSprite(32, HORIZON, 44, 16, isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'));
      const plantColor = hsl(120, isDark ? 25 : 40, isDark ? 22 : 30);
      for (let i = 0; i < 5; i++) {
        pixels.push(...treeSprite(16 + i * 8, HORIZON, 'round', plantColor, '#44403c'));
      }
      if (isDark) pixels.push({ col: 16, row: HORIZON - 14, w: 32, h: 2, fill: '#fde68a', opacity: 0.15 });
      break;
    }
    case 'tundra-outpost': {
      pixels.push({ col: 0, row: HORIZON, w: COLS, h: ROWS - HORIZON, fill: '#e2e8f0' });
      for (let i = 0; i < 24; i++) {
        pixels.push({ col: Math.floor(rand() * COLS), row: HORIZON + Math.floor(rand() * (ROWS - HORIZON)), w: 1, h: 1, fill: '#ffffff', opacity: 0.5 });
      }
      if (isDark) pixels.push(...auroraBand(rand, '#34d399'));
      pixels.push(
        ...buildingSprite({ cx: 32, baseRow: HORIZON + 3, width: 14, height: 7, wall: '#cbd5e1', roof: '#475569', roofStyle: 'flat', windowLit: '#fbbf24', windowDark: darkWindow, rand, isDark })
      );
      pixels.push({ col: 46, row: HORIZON - 4, w: 1, h: 7, fill: '#64748b' });
      pixels.push({ col: 44, row: HORIZON - 5, w: 5, h: 1, fill: '#64748b' });
      break;
    }
    case 'shrine-garden': {
      for (let r = HORIZON; r < ROWS; r++) {
        const wave = r % 2 === 0;
        pixels.push({ col: 0, row: r, w: COLS, h: 1, fill: hsl(hue, 12, isDark ? (wave ? 16 : 18) : wave ? 60 : 66) });
      }
      pixels.push(...toriiGateSprite(18, HORIZON + 2, 9, '#991b1b'));
      pixels.push(...lanternSprite(40, HORIZON + 5, isDark));
      pixels.push({ col: 48, row: HORIZON + 4, w: 8, h: 3, fill: hsl(200, 40, isDark ? 20 : 55) });
      pixels.push(...treeSprite(26, HORIZON + 6, 'round', hsl(340, 45, isDark ? 20 : 48), '#44403c'));
      break;
    }
  }

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax slice" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {toRects(pixels, `${spec.silhouette}-${spec.seed}`)}
    </svg>
  );
}
