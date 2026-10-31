// MY ROOM renderer and layout rules. The room is a front-on cross-section
// of ROOM_W x ROOM_H tiles: the top WALL_ROWS rows are wall, the rest is
// floor. Mirrors backend/tracker/furniture.py (validate_layout), which has
// the final say when a layout is saved.
import { ROOM_ART } from './roomArt';
import { C, TILE, type ArtEnv, type Painter } from './roomPaint';

export const ROOM_W = 16;
export const ROOM_H = 12;
export const WALL_ROWS = 5;

export type FurnitureLayer = 'wall' | 'floor' | 'wall_paint' | 'floor_paint';

export interface FurnitureSpec {
  id: string;
  name: string;
  category: string;
  layer: FurnitureLayer;
  w: number;
  h: number;
  tier: number;
  price: number;
  /** Colour variants: the art to draw and {hex: hex} swaps applied to it. */
  base?: string;
  recolor?: Record<string, string>;
}

export interface PlacedPiece {
  id: string;
  x: number;
  y: number;
}

export interface RoomLayout {
  wall: string;
  floor: string;
  items: PlacedPiece[];
}

export interface Ghost {
  id: string;
  x: number;
  y: number;
  valid: boolean;
}

const painterFor = (
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  clipW: number,
  clipH: number,
  recolor?: Record<string, string>
): Painter => ({
  rect(x, y, w, h, color) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(clipW, Math.round(x + w));
    const y1 = Math.min(clipH, Math.round(y + h));
    if (x1 <= x0 || y1 <= y0) return;
    ctx.fillStyle = recolor?.[color] ?? color;
    ctx.fillRect(ox + x0, oy + y0, x1 - x0, y1 - y0);
  },
  px(x, y, color) {
    this.rect(x, y, 1, 1, color);
  },
});

const artFor = (spec: FurnitureSpec) => ROOM_ART[spec.base ?? spec.id];

/** Paints a piece (or a paint's area) straight onto ctx. */
const paint = (
  ctx: CanvasRenderingContext2D,
  spec: FurnitureSpec,
  ox: number,
  oy: number,
  w: number,
  h: number,
  env: Omit<ArtEnv, 'w' | 'h'>
) => artFor(spec)?.(painterFor(ctx, ox, oy, w, h, spec.recolor), { ...env, w, h });

// Pieces are pre-rendered with a 1px dark outline so they read clearly
// against any wall or floor (a wooden desk on an oak floor, an orange cat
// on cherry boards). Cached per piece and scene state.
const OUTLINE = 'rgba(17, 17, 20, 0.85)';
const spriteCache = new Map<string, HTMLCanvasElement>();

const sprite = (spec: FurnitureSpec, env: Omit<ArtEnv, 'w' | 'h'>): HTMLCanvasElement | null => {
  const key = `${spec.id}|${env.on ? 1 : 0}|${env.night ? 1 : 0}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const w = spec.w * TILE;
  const h = spec.h * TILE;
  const canvas = document.createElement('canvas');
  canvas.width = w + 2;
  canvas.height = h + 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paint(ctx, spec, 1, 1, w, h, env);
  const img = ctx.getImageData(0, 0, w + 2, h + 2);
  const a = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w + 2 && y < h + 2 ? img.data[(y * (w + 2) + x) * 4 + 3] : 0;
  ctx.fillStyle = OUTLINE;
  for (let y = 0; y < h + 2; y++) {
    for (let x = 0; x < w + 2; x++) {
      if (a(x, y)) continue;
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) ctx.fillRect(x, y, 1, 1);
    }
  }
  spriteCache.set(key, canvas);
  return canvas;
};

const drawPiece = (
  ctx: CanvasRenderingContext2D,
  spec: FurnitureSpec,
  x: number,
  y: number,
  env: Omit<ArtEnv, 'w' | 'h'>
) => {
  const px = x * TILE;
  const py = y * TILE;
  const w = spec.w * TILE;
  const h = spec.h * TILE;
  if (spec.layer === 'floor') {
    // contact shadow on the floor, under legs and bases
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(px + 1, py + h - 2, w - 2, 2);
  }
  const img = sprite(spec, env);
  if (img) ctx.drawImage(img, px - 1, py - 1);
};

/** Footprint cells of a piece as "x,y" keys. */
const cells = (spec: FurnitureSpec, x: number, y: number) => {
  const out: string[] = [];
  for (let cx = x; cx < x + spec.w; cx++) for (let cy = y; cy < y + spec.h; cy++) out.push(`${cx},${cy}`);
  return out;
};

/** Same rules as furniture.validate_layout, for one piece against the rest. */
export const canPlace = (
  spec: FurnitureSpec,
  x: number,
  y: number,
  items: PlacedPiece[],
  catalog: Record<string, FurnitureSpec>,
  ignoreIndex = -1
): boolean => {
  if (x < 0 || y < 0 || x + spec.w > ROOM_W || y + spec.h > ROOM_H) return false;
  const bottom = y + spec.h - 1;
  if (spec.layer === 'wall' && bottom >= WALL_ROWS) return false;
  if (spec.layer === 'floor' && bottom < WALL_ROWS) return false;
  const mine = new Set(cells(spec, x, y));
  return items.every((it, i) => {
    if (i === ignoreIndex) return true;
    const other = catalog[it.id];
    return !other || cells(other, it.x, it.y).every((c) => !mine.has(c));
  });
};

/** Where a piece lands when grabbed at tile (tx, ty): bottom row at the pointer, centred, clamped in. */
export const anchorAt = (spec: FurnitureSpec, tx: number, ty: number) => ({
  x: Math.max(0, Math.min(ROOM_W - spec.w, tx - Math.floor((spec.w - 1) / 2))),
  y: Math.max(0, Math.min(ROOM_H - spec.h, ty - (spec.h - 1))),
});

/** Index of the topmost placed piece covering tile (tx, ty), or -1. */
export const pieceAt = (items: PlacedPiece[], catalog: Record<string, FurnitureSpec>, tx: number, ty: number) => {
  for (let i = items.length - 1; i >= 0; i--) {
    const spec = catalog[items[i].id];
    if (spec && tx >= items[i].x && tx < items[i].x + spec.w && ty >= items[i].y && ty < items[i].y + spec.h) return i;
  }
  return -1;
};

interface RenderOptions {
  env: Omit<ArtEnv, 'w' | 'h'>;
  selected?: number;
  /** Index of the piece being dragged (drawn as the ghost instead). */
  lifted?: number;
  ghost?: Ghost | null;
}

export const renderRoom = (
  canvas: HTMLCanvasElement,
  layout: RoomLayout,
  catalog: Record<string, FurnitureSpec>,
  { env, selected = -1, lifted = -1, ghost = null }: RenderOptions
) => {
  const W = ROOM_W * TILE;
  const H = ROOM_H * TILE;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const wallH = WALL_ROWS * TILE;

  const wallSpec = catalog[layout.wall];
  const floorSpec = catalog[layout.floor];
  if (wallSpec) paint(ctx, wallSpec, 0, 0, W, wallH, env);
  if (floorSpec) paint(ctx, floorSpec, 0, wallH, W, H - wallH, env);
  // floor fades darker toward the back wall, for depth
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.16 - i * 0.04})`;
    ctx.fillRect(0, wallH + i * 2, W, 2);
  }
  // skirting board
  ctx.fillStyle = C.wood2;
  ctx.fillRect(0, wallH - 2, W, 2);
  ctx.fillStyle = C.wood3;
  ctx.fillRect(0, wallH - 2, W, 1);

  // Wall pieces behind floor pieces; floor pieces nearer the front (lower) drawn last.
  const order = layout.items
    .map((it, i) => ({ it, i, spec: catalog[it.id] }))
    .filter((e) => e.spec && e.i !== lifted)
    .sort((a, b) => {
      const la = a.spec.layer === 'wall' ? 0 : 1;
      const lb = b.spec.layer === 'wall' ? 0 : 1;
      return la - lb || a.it.y + a.spec.h - (b.it.y + b.spec.h);
    });
  for (const { it, spec } of order) drawPiece(ctx, spec, it.x, it.y, env);

  const outline = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  };

  const sel = layout.items[selected];
  if (sel && selected !== lifted && catalog[sel.id]) {
    const s = catalog[sel.id];
    outline(sel.x * TILE, sel.y * TILE, s.w * TILE, s.h * TILE, C.emerald);
  }

  if (ghost && catalog[ghost.id]) {
    const s = catalog[ghost.id];
    ctx.globalAlpha = 0.75;
    drawPiece(ctx, s, ghost.x, ghost.y, env);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = ghost.valid ? C.emerald : C.red;
    ctx.fillRect(ghost.x * TILE, ghost.y * TILE, s.w * TILE, s.h * TILE);
    ctx.globalAlpha = 1;
    outline(ghost.x * TILE, ghost.y * TILE, s.w * TILE, s.h * TILE, ghost.valid ? C.emerald : C.red);
  }
};

const thumbCache = new Map<string, string>();

/** Data URL of a piece (or a swatch of a paint) for shop / inventory cards. */
export const thumbnail = (spec: FurnitureSpec): string => {
  const key = spec.id;
  const hit = thumbCache.get(key);
  if (hit) return hit;
  const swatch = spec.layer === 'wall_paint' || spec.layer === 'floor_paint';
  const w = swatch ? 2 * TILE : spec.w * TILE;
  const h = swatch ? 2 * TILE : spec.h * TILE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  paint(ctx, spec, 0, 0, w, h, { on: true, night: false });
  const url = canvas.toDataURL();
  thumbCache.set(key, url);
  return url;
};

export const TIER_LABEL: Record<number, string> = {
  0: 'STARTER',
  1: 'SMALL',
  2: 'MEDIUM',
  3: 'LARGE',
  4: 'FEATURED',
};
