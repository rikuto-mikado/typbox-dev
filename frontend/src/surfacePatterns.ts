// NEO Surface Theme pattern library: seamless SVG tiles (data URIs) drawn in
// the theme's faint `patternTint`. Everything here is a *background* motif —
// thin strokes, sparse marks, low alpha — so foreground text and the matrix
// UI keep full contrast. Randomized tiles (maze, truchet, glitch, noise, ...)
// use a fixed-seed PRNG so a theme looks identical on every load.

export const NEO_PATTERNS = [
  'plusgrid',
  'pcb',
  'hexline',
  'tritess',
  'sinewave',
  'katakana',
  'binary',
  'reticle',
  'invaders',
  'glitchblocks',
  'petals',
  'zigzag',
  'argyle',
  'scales',
  'seigaiha',
  'asanoha',
  'shippo',
  'noisedots',
  'contour',
  'radar',
  'barcode',
  'sparkles',
  'cubes',
  'prompt',
  'morse',
  'snowflakes',
  'maze',
  'truchet',
  'orbits',
  'eqbars',
  'bauhaus',
  'crystal',
  'dna',
  'ecg',
  'gridglitch',
  'dither',
] as const;

export type NeoPattern = (typeof NEO_PATTERNS)[number];

const NEO_PATTERN_SET = new Set<string>(NEO_PATTERNS);
export const isNeoPattern = (p: string): p is NeoPattern => NEO_PATTERN_SET.has(p);

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

const r1 = (n: number) => Math.round(n * 10) / 10;

interface Tile {
  w: number;
  h: number;
  /** SVG body; `C` is replaced with the tint color. */
  body: string;
}

const stroke = (d: string, width = 1) => `<path d="${d}" fill="none" stroke="C" stroke-width="${width}"/>`;

function seeded<T>(seed: number, build: (rand: () => number) => T): T {
  return build(mulberry32(seed));
}

// Each builder returns a tile with `C` as the color placeholder.
const TILES: Record<NeoPattern, () => Tile> = {
  plusgrid: () => ({ w: 36, h: 36, body: stroke('M18 13v10M13 18h10') }),

  pcb: () => ({
    w: 120,
    h: 120,
    body:
      stroke('M8 28h30l12 12h26M76 40v30l10 10h22M30 112V86l10-10h18M112 10H90l-8 8v14M14 64h22l8 8') +
      `<g fill="C"><circle cx="8" cy="28" r="2.6"/><circle cx="76" cy="40" r="2.6"/><circle cx="108" cy="80" r="2.6"/>` +
      `<circle cx="58" cy="76" r="2.6"/><circle cx="82" cy="32" r="2"/><circle cx="44" cy="72" r="2"/>` +
      `<rect x="92" y="96" width="8" height="8"/><rect x="18" y="8" width="10" height="4"/></g>`,
  }),

  hexline: () => ({ w: 56, h: 100, body: stroke('M28 66L0 50V16L28 0l28 16v34L28 66v34M0 100V84M56 100V84') }),

  tritess: () => ({ w: 40, h: 69.28, body: stroke('M0 0h40M0 34.64h40M0 0l20 34.64L40 0M0 69.28l20-34.64 20 34.64') }),

  sinewave: () => ({ w: 120, h: 28, body: stroke('M0 14q15-10 30 0t30 0 30 0 30 0') }),

  katakana: () =>
    seeded(7, (rand) => {
      const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン';
      let body = '';
      for (let col = 0; col < 6; col++) {
        const x = 8 + col * 26;
        const count = 2 + Math.floor(rand() * 4);
        let y = 14 + Math.floor(rand() * 40);
        for (let k = 0; k < count && y < 196; k++) {
          body += `<text x="${x}" y="${y}">${glyphs[Math.floor(rand() * glyphs.length)]}</text>`;
          y += 16;
        }
      }
      return { w: 160, h: 200, body: `<g fill="C" font-family="monospace" font-size="12">${body}</g>` };
    }),

  binary: () =>
    seeded(11, (rand) => {
      let body = '';
      for (let row = 0; row < 8; row++) {
        let bits = '';
        for (let i = 0; i < 10; i++) bits += rand() > 0.5 ? '1' : '0';
        body += `<text x="${row % 2 ? 12 : 4}" y="${14 + row * 16}">${bits}</text>`;
      }
      return { w: 128, h: 128, body: `<g fill="C" font-family="monospace" font-size="9" letter-spacing="2">${body}</g>` };
    }),

  reticle: () => ({
    w: 160,
    h: 160,
    body:
      `<circle cx="46" cy="46" r="13" fill="none" stroke="C"/>` +
      stroke('M46 26v10M46 56v10M26 46h10M56 46h10M120 112h14M127 105v14M100 140h6M148 20h6') +
      `<circle cx="46" cy="46" r="1.5" fill="C"/>`,
  }),

  invaders: () => {
    const sprites = [
      ['00100100', '00011000', '00111100', '01011010', '11111111', '10111101', '10100101', '00011000'],
      ['00011000', '00111100', '01111110', '11011011', '11111111', '00100100', '01011010', '10100101'],
    ];
    let body = '';
    const place = (sprite: string[], ox: number, oy: number, px: number) =>
      sprite.forEach((row, y) =>
        row.split('').forEach((bit, x) => {
          if (bit === '1') body += `<rect x="${ox + x * px}" y="${oy + y * px}" width="${px}" height="${px}"/>`;
        })
      );
    place(sprites[0], 20, 22, 2);
    place(sprites[1], 112, 92, 2);
    place(sprites[0], 150, 150, 1.5);
    return { w: 180, h: 180, body: `<g fill="C">${body}</g>` };
  },

  glitchblocks: () =>
    seeded(23, (rand) => {
      let body = '';
      for (let i = 0; i < 16; i++) {
        const y = Math.floor(rand() * 140);
        const x = Math.floor(rand() * 200);
        const w = 6 + Math.floor(rand() * 54);
        const h = rand() > 0.7 ? 3 : 1;
        body += `<rect x="${x}" y="${y}" width="${Math.min(w, 220 - x)}" height="${h}"/>`;
      }
      return { w: 220, h: 140, body: `<g fill="C">${body}</g>` };
    }),

  petals: () =>
    seeded(31, (rand) => {
      let body = '';
      for (let i = 0; i < 6; i++) {
        const x = r1(10 + rand() * 120);
        const y = r1(10 + rand() * 120);
        const rot = Math.floor(rand() * 360);
        body += `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.4" transform="rotate(${rot} ${x} ${y})"/>`;
      }
      return { w: 140, h: 140, body: `<g fill="none" stroke="C">${body}</g>` };
    }),

  zigzag: () => ({ w: 40, h: 24, body: stroke('M0 17l10-10 10 10 10-10 10 10') }),

  argyle: () => ({
    w: 56,
    h: 56,
    body: stroke('M28 2l26 26-26 26L2 28z') + `<path d="M0 0l56 56M56 0L0 56" stroke="C" stroke-dasharray="2 5" fill="none"/>`,
  }),

  scales: () => ({ w: 40, h: 20, body: stroke('M0 20a20 20 0 0 1 40 0M-20 0a20 20 0 0 1 40 0M20 0a20 20 0 0 1 40 0') }),

  seigaiha: () => {
    const arcs = (cx: number, cy: number) =>
      [24, 17, 10].map((r) => `M${cx - r} ${cy}a${r} ${r} 0 0 1 ${r * 2} 0`).join('');
    return { w: 48, h: 24, body: stroke(arcs(0, 24) + arcs(48, 24) + arcs(24, 12) + arcs(24, 36)) };
  },

  asanoha: () => ({
    w: 60,
    h: 104,
    body: stroke(
      'M30 0v104M0 17.3l60 34.6M60 17.3L0 51.9M0 52l60 34.6M60 52L0 86.6M0 0v104M60 0v104' +
        'M30 0L0 17.3M30 0l30 17.3M30 104L0 86.6M30 104l30-17.4M0 52l30-17.4L60 52 30 69.3z',
      0.8
    ),
  }),

  shippo: () => ({
    w: 40,
    h: 40,
    body: `<g fill="none" stroke="C"><circle cx="0" cy="0" r="20"/><circle cx="40" cy="0" r="20"/><circle cx="0" cy="40" r="20"/><circle cx="40" cy="40" r="20"/><circle cx="20" cy="20" r="20"/></g>`,
  }),

  noisedots: () =>
    seeded(41, (rand) => {
      let body = '';
      for (let i = 0; i < 34; i++) {
        body += `<circle cx="${r1(rand() * 180)}" cy="${r1(rand() * 180)}" r="${r1(0.5 + rand() * 1.5)}" opacity="${r1(0.4 + rand() * 0.6)}"/>`;
      }
      return { w: 180, h: 180, body: `<g fill="C">${body}</g>` };
    }),

  contour: () =>
    seeded(53, (rand) => {
      const ring = (cx: number, cy: number, base: number, phase: number) => {
        let d = '';
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const r = base * (1 + 0.16 * Math.sin(a * 3 + phase) + 0.08 * Math.sin(a * 5 + phase * 2));
          d += `${i === 0 ? 'M' : 'L'}${r1(cx + Math.cos(a) * r)} ${r1(cy + Math.sin(a) * r)}`;
        }
        return `${d}Z`;
      };
      const p1 = rand() * 6;
      const p2 = rand() * 6;
      const d = [22, 40, 58, 76].map((b) => ring(80, 90, b, p1)).join('') + [18, 34, 50].map((b) => ring(220, 210, b, p2)).join('');
      return { w: 300, h: 300, body: stroke(d, 0.9) };
    }),

  radar: () => ({
    w: 260,
    h: 260,
    body:
      `<g fill="none" stroke="C"><circle cx="130" cy="130" r="40"/><circle cx="130" cy="130" r="80"/><circle cx="130" cy="130" r="120" stroke-dasharray="3 6"/></g>` +
      stroke('M130 0v260M0 130h260', 0.6) +
      `<g fill="C"><circle cx="168" cy="92" r="2.2"/><circle cx="84" cy="176" r="1.6"/></g>`,
  }),

  barcode: () =>
    seeded(61, (rand) => {
      let body = '';
      let x = 6;
      while (x < 150) {
        const w = 1 + Math.floor(rand() * 3);
        body += `<rect x="${x}" y="22" width="${w}" height="${rand() > 0.85 ? 26 : 20}"/>`;
        x += w + 2 + Math.floor(rand() * 4);
      }
      return { w: 160, h: 72, body: `<g fill="C">${body}</g>` };
    }),

  sparkles: () =>
    seeded(71, (rand) => {
      let body = '';
      for (let i = 0; i < 7; i++) {
        const x = r1(10 + rand() * 140);
        const y = r1(10 + rand() * 140);
        const s = r1(2 + rand() * 3.5);
        const k = r1(s * 0.22);
        body += `<path d="M${x} ${y - s}L${x + k} ${y - k}L${x + s} ${y}L${x + k} ${y + k}L${x} ${y + s}L${x - k} ${y + k}L${x - s} ${y}L${x - k} ${y - k}Z"/>`;
      }
      return { w: 160, h: 160, body: `<g fill="C">${body}</g>` };
    }),

  cubes: () => ({ w: 56, h: 100, body: stroke('M28 66L0 50V16L28 0l28 16v34L28 66v34M0 100V84M56 100V84M28 33L0 16M28 33l28-17M28 33v33', 0.9) }),

  prompt: () =>
    seeded(83, (rand) => {
      const tokens = ['&gt;_', '$', '~/', '&amp;&amp;', '{ }', '#!', '&gt;&gt;', '::', '//', '0x'];
      let body = '';
      for (let i = 0; i < 8; i++) {
        body += `<text x="${Math.floor(rand() * 150)}" y="${14 + Math.floor(rand() * 150)}">${tokens[Math.floor(rand() * tokens.length)]}</text>`;
      }
      return { w: 180, h: 180, body: `<g fill="C" font-family="monospace" font-size="10">${body}</g>` };
    }),

  morse: () =>
    seeded(97, (rand) => {
      let body = '';
      for (let row = 0; row < 3; row++) {
        let x = 4 + row * 7;
        const y = 10 + row * 16;
        while (x < 170) {
          if (rand() > 0.45) {
            body += `<circle cx="${x + 1.5}" cy="${y}" r="1.5"/>`;
            x += 7;
          } else {
            body += `<rect x="${x}" y="${y - 1.2}" width="8" height="2.4" rx="1"/>`;
            x += 13;
          }
          if (rand() > 0.82) x += 10;
        }
      }
      return { w: 180, h: 48, body: `<g fill="C">${body}</g>` };
    }),

  snowflakes: () => {
    const flake = (x: number, y: number, s: number) =>
      [0, 60, 120]
        .map((deg) => {
          const a = (deg * Math.PI) / 180;
          const dx = r1(Math.cos(a) * s);
          const dy = r1(Math.sin(a) * s);
          return `M${x - dx} ${y - dy}L${x + dx} ${y + dy}`;
        })
        .join('');
    return { w: 140, h: 140, body: stroke(flake(34, 40, 6) + flake(104, 98, 4.5) + flake(110, 24, 3), 0.9) };
  },

  maze: () =>
    seeded(101, (rand) => {
      let d = '';
      const cell = 16;
      for (let y = 0; y < 10; y++)
        for (let x = 0; x < 10; x++) {
          const px = x * cell;
          const py = y * cell;
          d += rand() > 0.5 ? `M${px} ${py}l${cell} ${cell}` : `M${px + cell} ${py}l${-cell} ${cell}`;
        }
      return { w: 160, h: 160, body: stroke(d, 0.9) };
    }),

  truchet: () =>
    seeded(113, (rand) => {
      let d = '';
      const s = 24;
      const h = s / 2;
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const px = x * s;
          const py = y * s;
          d +=
            rand() > 0.5
              ? `M${px + h} ${py}A${h} ${h} 0 0 1 ${px} ${py + h}M${px + s} ${py + h}A${h} ${h} 0 0 0 ${px + h} ${py + s}`
              : `M${px + h} ${py}A${h} ${h} 0 0 0 ${px + s} ${py + h}M${px} ${py + h}A${h} ${h} 0 0 1 ${px + h} ${py + s}`;
        }
      return { w: 168, h: 168, body: stroke(d, 0.9) };
    }),

  orbits: () => ({
    w: 240,
    h: 240,
    body:
      `<g fill="none" stroke="C"><ellipse cx="120" cy="120" rx="90" ry="34" transform="rotate(-18 120 120)"/>` +
      `<ellipse cx="120" cy="120" rx="58" ry="20" transform="rotate(24 120 120)"/><circle cx="120" cy="120" r="5"/></g>` +
      `<g fill="C"><circle cx="35" cy="140" r="2.4"/><circle cx="170" cy="138" r="1.8"/></g>`,
  }),

  eqbars: () =>
    seeded(127, (rand) => {
      let body = '';
      for (let i = 0; i < 18; i++) {
        const h = 3 + Math.floor(rand() * 30);
        body += `<rect x="${4 + i * 8}" y="${52 - h}" width="4" height="${h}"/>`;
      }
      return { w: 152, h: 60, body: `<g fill="C">${body}</g>` };
    }),

  bauhaus: () => ({
    w: 160,
    h: 160,
    body:
      `<g fill="none" stroke="C"><circle cx="38" cy="40" r="18"/><rect x="96" y="22" width="34" height="34"/>` +
      `<path d="M30 140l22-40 22 40z"/><path d="M98 132a22 22 0 0 1 44 0z"/></g>`,
  }),

  crystal: () =>
    seeded(137, (rand) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 16; i++) pts.push([r1(rand() * 220), r1(rand() * 220)]);
      let d = '';
      pts.forEach(([x, y], i) => {
        const nearest = pts
          .map((p, j) => ({ j, dist: (p[0] - x) ** 2 + (p[1] - y) ** 2 }))
          .filter((n) => n.j !== i)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);
        nearest.forEach(({ j }) => {
          if (j > i) d += `M${x} ${y}L${pts[j][0]} ${pts[j][1]}`;
        });
      });
      return { w: 220, h: 220, body: stroke(d, 0.8) };
    }),

  dna: () => {
    let a = '';
    let b = '';
    let rungs = '';
    for (let i = 0; i <= 24; i++) {
      const y = i * 5;
      const x1 = 30 + Math.sin((i / 24) * Math.PI * 2) * 14;
      const x2 = 30 - Math.sin((i / 24) * Math.PI * 2) * 14;
      a += `${i ? 'L' : 'M'}${r1(x1)} ${y}`;
      b += `${i ? 'L' : 'M'}${r1(x2)} ${y}`;
      if (i % 3 === 1) rungs += `M${r1(x1)} ${y}L${r1(x2)} ${y}`;
    }
    return { w: 90, h: 120, body: stroke(a + b) + stroke(rungs, 0.6) };
  },

  ecg: () => ({ w: 220, h: 64, body: stroke('M0 40h70l6-6 6 6h10l6-30 8 46 6-16h18l8-8 8 8h82', 1) }),

  gridglitch: () =>
    seeded(149, (rand) => {
      let d = '';
      for (let i = 0; i <= 5; i++) {
        const y = i * 32;
        let x = 0;
        while (x < 160) {
          const len = 16 + Math.floor(rand() * 48);
          const off = rand() > 0.85 ? (rand() > 0.5 ? 3 : -3) : 0;
          d += `M${x} ${y + off}h${Math.min(len, 160 - x)}`;
          x += len;
        }
        d += `M${i * 32} 0v160`;
      }
      return { w: 160, h: 160, body: stroke(d, 0.8) };
    }),

  dither: () => ({ w: 6, h: 6, body: `<g fill="C"><rect x="0" y="0" width="1.5" height="1.5"/><rect x="3" y="3" width="1.5" height="1.5"/></g>` }),
};

const tileCache = new Map<string, { image: string; size: string }>();

/** CSS background layer (image + size) for a NEO pattern in a given tint. */
export function neoPatternLayer(pattern: NeoPattern, tint: string): { image: string; size: string } {
  const key = `${pattern}|${tint}`;
  const cached = tileCache.get(key);
  if (cached) return cached;
  const tile = TILES[pattern]();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tile.w}" height="${tile.h}" viewBox="0 0 ${tile.w} ${tile.h}">${tile.body.replace(/="C"/g, `="${tint}"`)}</svg>`;
  const layer = { image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, size: `${tile.w}px ${tile.h}px` };
  tileCache.set(key, layer);
  return layer;
}
