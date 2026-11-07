// ASTRA, the constellation charm of STARLIGHT (StarlightSky.tsx): a medallion
// whose constellation grows with the stars. Same PixelArt format as the other
// sprites, drawn here rather than by hand so every stage is the same charm:
// - the seats come in mirrored pairs, lit top to bottom (left, then right),
//   each star joined to the one above it on its side, and the top and bottom
//   pairs joined across, so the figure grows as a symmetric lyre;
// - seats still dark show as specks, so the whole figure is there to fill;
// - a GUARD's worth of stars (cost) sets gold studs in the silver rim; the
//   guard on turns the rim gold; a full sky turns the stars gold and sets four
//   glints around the medallion.
// The three CHARMS (backend charms.py) each have a figure and a mount of their
// own, drawn by the same rules (dark seats to fill, lines as both ends shine,
// gold when full):
// - ASTRA: the lyre above, in a round silver rim;
// - NOVA: a six-pointed burst whose outline is traced point by point, star
//   after star, round the dial, in a rim of burning rays;
// - NEBULA: a spiral arm winding out from the centre, a star at a time, with
//   a short spur once it is full, in a drifting cloud.
// A charm that isn't worn is drawn dimmed by its caller.

import type { PixelArt } from './challengeArt';

const SIZE = 24;
const CX = 11.5;
const CY = 13;
const RIM_IN = 8.6;
const RIM_OUT = 10.1;
const EDGE = 11;

/** The left half of each mirrored pair, top to bottom: the stars trace a
 *  lyre, zig-zagging down each side and closed at the crown and the foot. */
const PAIRS: Array<[number, number]> = [
  [10, 6], [7, 8], [5, 11], [8, 12], [6, 15], [8, 18], [10, 20],
];
/** Pairs joined straight across once both shine: the crown and the foot. */
const CLOSED = new Set([0, PAIRS.length - 1]);
const mirror = ([x, y]: [number, number]): [number, number] => [SIZE - 1 - x, y];
/** Every seat in lighting order: left of a pair, then its right. */
const SEATS: Array<[number, number]> = PAIRS.flatMap((seat) => [seat, mirror(seat)]);

const line = (a: [number, number], b: [number, number]): Array<[number, number]> => {
  // Bresenham, ends excluded (the stars sit there).
  const out: Array<[number, number]> = [];
  let [x0, y0] = a;
  const [x1, y1] = b;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
    if (!(x0 === x1 && y0 === y1)) out.push([x0, y0]);
  }
  return out;
};

export type CharmVariant = 'astra' | 'nova' | 'nebula';

type Seat = [number, number];
interface Figure {
  /** Every seat in lighting order. */
  seats: Seat[];
  /** The lines drawn once both their stars shine: [a, b] seat indexes. */
  links: Array<[number, number]>;
}

const at = (r: number, deg: number): Seat => {
  const a = (deg * Math.PI) / 180;
  return [Math.round(CX + Math.cos(a) * r), Math.round(CY + Math.sin(a) * r)];
};

/** ASTRA's lyre: mirrored pairs, each star joined up its own side, the crown and foot joined across. */
const lyre = (): Figure => {
  const links: Array<[number, number]> = [];
  for (let i = 0; i < SEATS.length; i++) {
    if (i >= 2) links.push([i - 2, i]);
    if (i % 2 === 1 && CLOSED.has((i - 1) / 2)) links.push([i - 1, i]);
  }
  return { seats: SEATS, links };
};

/** NOVA's burst: six points and the six notches between them, traced round
 *  from the top; the last star closes the outline. */
const burst = (): Figure => {
  const seats: Seat[] = [];
  for (let k = 0; k < 6; k++) {
    seats.push(at(7, -90 + k * 60));
    seats.push(at(3.1, -60 + k * 60));
  }
  const links: Array<[number, number]> = seats.map((_, i) => [i, (i + 1) % seats.length] as [number, number]);
  return { seats, links };
};

/** NEBULA's spiral: an arm winding out from the centre; once full, a spur
 *  joins its tip back towards the heart. */
const spiral = (): Figure => {
  const seats: Seat[] = [];
  for (let i = 0; i < 10; i++) seats.push(at(1.1 + i * 0.66, -120 + i * 62));
  const links: Array<[number, number]> = seats.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  links.push([9, 3]);
  return { seats, links };
};

const FIGURES: Record<CharmVariant, () => Figure> = { astra: lyre, nova: burst, nebula: spiral };

/** How far a mount's rim and edge reach out at an angle (0 for a plain ring). */
const reach = (variant: CharmVariant, angle: number) => {
  if (variant === 'nova') return 1.5 * Math.max(0, Math.cos(12 * angle)) ** 3;
  if (variant === 'nebula') return 0.7 * Math.sin(5 * angle) + 0.45 * Math.sin(9 * angle + 1.3);
  return 0;
};

const PALETTES: Record<CharmVariant, Record<string, string>> = {
  astra: { s: '#64748b', S: '#cbd5e1', n: '#111a3a', N: '#1e2a5c', u: '#334170', l: '#2f3d73', b: '#93a4d8' },
  nova: { s: '#9a3412', S: '#fb923c', n: '#260d08', N: '#47170c', u: '#6b2c1a', l: '#b4532a', b: '#fdba74' },
  nebula: { s: '#6d28d9', S: '#c4b5fd', n: '#170f30', N: '#2a1a52', u: '#43306f', l: '#6b52b8', b: '#a5b4fc' },
};

export const starCharmArt = (
  stars: number,
  max: number,
  cost: number,
  guardOn: boolean,
  variant: CharmVariant = 'astra'
): PixelArt => {
  const figure = FIGURES[variant]();
  const seats = figure.seats.slice(0, Math.max(1, Math.min(figure.seats.length, max)));
  const lit = Math.max(0, Math.min(seats.length, stars));
  const full = lit >= seats.length;
  const studded = lit >= cost;
  const grid: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill('.'));

  // Bail and ring at the top.
  for (const [x, y, key] of [
    [11, 0, 'k'], [12, 0, 'k'], [10, 1, 'k'], [11, 1, 'S'], [12, 1, 'S'], [13, 1, 'k'],
    [10, 2, 'k'], [11, 2, 'k'], [12, 2, 'k'], [13, 2, 'k'],
  ] as Array<[number, number, string]>) {
    grid[y][x] = key;
  }

  // Halo, outline, rim, dial.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x + 0.5 - CX - 0.5, y + 0.5 - CY);
      const angle = Math.atan2(y - CY, x - CX);
      const out = reach(variant, angle);
      if (d <= RIM_IN + Math.min(0, out) * 0.4) grid[y][x] = full ? 'N' : 'n';
      else if (d <= RIM_OUT + out) {
        const stud = studded && Math.round(((angle + Math.PI) / (2 * Math.PI)) * 16) % 4 === 0;
        const light = y < CY - 2;
        grid[y][x] = guardOn ? (light ? 'G' : 'g') : stud ? 'g' : light ? 'S' : 's';
      } else if (d <= EDGE + out) grid[y][x] = 'k';
    }
  }

  // A full sky: four glints around the medallion.
  if (full) {
    for (const [cx, cy] of [[2, 5], [21, 5], [1, 21], [22, 21]] as Array<[number, number]>) {
      grid[cy][cx] = 'y';
      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]] as Array<[number, number]>) {
        if (grid[ny]?.[nx] === '.') grid[ny][nx] = 'a';
      }
    }
  }

  // The figure: dark seats, then lines and stars as far as it has grown.
  for (const [x, y] of seats) grid[y][x] = 'u';
  // A line shows once both its stars shine.
  const links = figure.links.filter(([a, b]) => a < lit && b < lit && a < seats.length && b < seats.length);
  for (const [a, b] of links) for (const [x, y] of line(seats[a], seats[b])) grid[y][x] = 'l';
  for (let i = 0; i < lit; i++) {
    const [x, y] = seats[i];
    grid[y][x] = full ? 'y' : 'w';
  }
  // The newest star glints.
  if (lit > 0 && !full) {
    const [x, y] = seats[lit - 1];
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as Array<[number, number]>) {
      if (grid[ny]?.[nx] === 'n' || grid[ny]?.[nx] === 'l') grid[ny][nx] = 'b';
    }
  }

  return {
    palette: {
      k: '#0b0b0e',
      g: '#d97706',
      G: '#fcd34d',
      w: '#f8fafc',
      y: '#fde047',
      a: '#a16207',
      ...PALETTES[variant],
    },
    rows: grid.map((row) => row.join('')),
  };
};
