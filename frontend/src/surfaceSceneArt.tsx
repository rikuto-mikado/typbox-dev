import React from 'react';

// Parametric PIXEL ART scenes for the 100 EXPLORE MAP reward Surface Themes.
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
  | 'terraced-farmland';

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

// ==========================================
// Archetype composition
// ==========================================
export function renderScene(spec: SceneSpec, isDark: boolean): React.ReactNode {
  const rand = mulberry32(spec.seed + (isDark ? 7 : 0));
  const hue = isDark ? spec.hueNight : spec.hueDay;
  const isSpace = spec.silhouette === 'space-dock';

  const pixels: Pix[] = [];

  // ---- sky ----
  if (isSpace) {
    pixels.push({ col: 0, row: 0, w: COLS, h: SKY_ROWS, fill: hsl(hue, 35, isDark ? 7 : 10) });
    for (let i = 0; i < 60; i++) {
      pixels.push({ col: Math.floor(rand() * COLS), row: Math.floor(rand() * SKY_ROWS), w: 1, h: 1, fill: '#ffffff', opacity: 0.3 + rand() * 0.6 });
    }
  } else if (isDark) {
    pixels.push(...skyBands((t) => lerpHsl(hue, 42, 8, 20, t)));
    pixels.push(...starsAndMoon(rand, Math.round(COLS * 0.76)));
  } else {
    pixels.push(...skyBands((t) => lerpHsl(hue, 65, 92, 62, t)));
    pixels.push(...sunSprite(Math.round(COLS * 0.2)));
    pixels.push(...cloudPuff(Math.round(COLS * 0.45), 4, '#ffffff'));
    pixels.push(...cloudPuff(Math.round(COLS * 0.68), 8, '#ffffff'));
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
  }

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax slice" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {toRects(pixels, `${spec.silhouette}-${spec.seed}`)}
    </svg>
  );
}
