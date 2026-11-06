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

export const starCharmArt = (stars: number, max: number, cost: number, guardOn: boolean): PixelArt => {
  const seats = SEATS.slice(0, Math.max(1, Math.min(SEATS.length, max)));
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
      if (d <= RIM_IN) grid[y][x] = full ? 'N' : 'n';
      else if (d <= RIM_OUT) {
        const angle = Math.atan2(y - CY, x - CX);
        const stud = studded && Math.round(((angle + Math.PI) / (2 * Math.PI)) * 16) % 4 === 0;
        const light = y < CY - 2;
        grid[y][x] = guardOn ? (light ? 'G' : 'g') : stud ? 'g' : light ? 'S' : 's';
      } else if (d <= EDGE) grid[y][x] = 'k';
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
  const links: Array<[number, number]> = [];
  for (let i = 0; i < lit; i++) {
    if (i >= 2) links.push([i - 2, i]); // up its own side
    if (i % 2 === 1 && CLOSED.has((i - 1) / 2)) links.push([i - 1, i]); // across, at the crown and the foot
  }
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
      s: '#64748b',
      S: '#cbd5e1',
      g: '#d97706',
      G: '#fcd34d',
      n: '#111a3a',
      N: '#1e2a5c',
      u: '#334170',
      l: '#2f3d73',
      w: '#f8fafc',
      b: '#93a4d8',
      y: '#fde047',
      a: '#a16207',
    },
    rows: grid.map((row) => row.join('')),
  };
};
