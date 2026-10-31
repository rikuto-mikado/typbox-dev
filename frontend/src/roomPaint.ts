// Drawing kit for MY ROOM pixel art (roomArt.ts) and the room renderer
// (roomRender.ts). Art is drawn with a tiny "painter" in sprite pixels:
// one room tile is TILE x TILE pixels, a piece w x h tiles is drawn into
// (w * TILE) x (h * TILE), standing on its bottom edge.

export const TILE = 8;

export interface Painter {
  rect(x: number, y: number, w: number, h: number, color: string): void;
  px(x: number, y: number, color: string): void;
}

/** Scene state a piece can react to. */
export interface ArtEnv {
  /** Stopwatch running: screens, LEDs and lamps light up. */
  on: boolean;
  /** Local evening / night: windows go dark and show stars. */
  night: boolean;
  /** Pixel size of the area being drawn (the footprint, or the whole wall / floor for paints). */
  w: number;
  h: number;
}

export type Art = (p: Painter, env: ArtEnv) => void;

export const C = {
  ink: '#18181b',
  ink2: '#27272a',
  ink3: '#3f3f46',
  white: '#f4f4f5',
  paper: '#e7e5e4',
  paper2: '#d6d3d1',
  metal: '#a1a1aa',
  metal2: '#71717a',
  metal3: '#52525b',
  wood: '#8b5a2b',
  wood2: '#6b4220',
  wood3: '#b07a45',
  wood4: '#4a2c14',
  oak: '#c8955a',
  oak2: '#b5824a',
  oak3: '#a06f3c',
  walnut: '#5b3a24',
  walnut2: '#4a2f1d',
  walnut3: '#6d4630',
  leaf: '#22c55e',
  leaf2: '#15803d',
  leaf3: '#4ade80',
  pot: '#c2410c',
  pot2: '#9a3412',
  emerald: '#10b981',
  emerald2: '#047857',
  amber: '#fbbf24',
  amber2: '#f59e0b',
  glow: '#fde68a',
  red: '#ef4444',
  red2: '#b91c1c',
  blue: '#3b82f6',
  blue2: '#1d4ed8',
  sky: '#7dd3fc',
  sky2: '#38bdf8',
  night: '#1e1b4b',
  night2: '#312e81',
  star: '#fde68a',
  teal: '#0f766e',
  teal2: '#115e59',
  teal3: '#14b8a6',
  indigo: '#6366f1',
  indigo2: '#4f46e5',
  orange: '#f97316',
  orange2: '#c2410c',
  pink: '#f472b6',
  purple: '#6d28d9',
  purple2: '#4c1d95',
  cork: '#c69c6d',
  cork2: '#a97f52',
  brick: '#b45309',
  brick2: '#92400e',
  mortar: '#d6d3d1',
  navy: '#1e3a5f',
  navy2: '#24456f',
  term: '#0a0f0d',
  term2: '#0f1f19',
  moss: '#4d7c0f',
  moss2: '#3f6212',
  wallBase: '#e8e2d6',
  wallBase2: '#ded7c9',
  screenOff: '#1f2937',
  screenOn: '#064e3b',
  // Dedicated colours for recolourable parts (roomCatalog variants swap
  // these by hex, so each must be unique in this table).
  rim: '#1c1c1f',
  frame: '#f5f5f3',
  fridge: '#e5e7e6',
  fridge2: '#c7cbc9',
  guitar: '#dc2626',
  guitar2: '#991b1b',
  cloth: '#7c3aed',
  cloth2: '#5b21b6',
  cloth3: '#c4b5fd',
  stripeA: '#e9e4da',
  stripeB: '#d9cfbf',
  dot: '#c9bba5',
  panel: '#9a6b3f',
  panel2: '#7d5531',
  concrete: '#a8a29e',
  concrete2: '#8f8984',
  tatami: '#b5b07a',
  tatami2: '#8f8a55',
  hbone: '#b88a5a',
  hbone2: '#9c7046',
  dog: '#a16207',
  dog2: '#713f12',
  racing: '#e11d48',
} as const;

// Shared shapes ---------------------------------------------------------

/** Rectangle with a 1px outline. */
export const box = (p: Painter, x: number, y: number, w: number, h: number, fill: string, line: string) => {
  p.rect(x, y, w, h, line);
  p.rect(x + 1, y + 1, w - 2, h - 2, fill);
};

/** A row of book spines standing on y = bottom (exclusive), filling [x, x + width). */
export const books = (p: Painter, x: number, bottom: number, width: number, seed: number) => {
  const colors = [C.red, C.blue, C.leaf2, C.amber2, C.indigo, C.teal, C.paper2, C.orange];
  let cx = x;
  let i = seed;
  while (cx < x + width) {
    const w = 1 + (i % 2);
    const h = 3 + ((i * 7) % 3);
    const bw = Math.min(w, x + width - cx);
    p.rect(cx, bottom - h, bw, h, colors[i % colors.length]);
    cx += bw;
    i += 3;
  }
};

/** Leafy clump centred on (cx, cy). */
export const foliage = (p: Painter, cx: number, cy: number, r: number) => {
  p.rect(cx - r, cy - r + 1, r * 2, r * 2 - 2, C.leaf2);
  p.rect(cx - r + 1, cy - r, r * 2 - 2, r * 2, C.leaf2);
  p.rect(cx - r + 1, cy - r + 1, r * 2 - 3, r * 2 - 3, C.leaf);
  p.px(cx - r + 2, cy - r + 1, C.leaf3);
  p.px(cx, cy - r + 2, C.leaf3);
};

// 3 x 5 pixel font for signs (only the letters used).
const GLYPHS: Record<string, string[]> = {
  S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
};

export const text = (p: Painter, x: number, y: number, word: string, color: string) => {
  [...word].forEach((ch, i) => {
    GLYPHS[ch]?.forEach((row, ry) =>
      [...row].forEach((c, rx) => {
        if (c === '#') p.px(x + i * 4 + rx, y + ry, color);
      })
    );
  });
};

/** Deterministic 0..1 noise for textures. */
export const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
