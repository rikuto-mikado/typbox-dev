// MY ROOM art pack: SURFACES: more wallpapers and floors. A paint is drawn
// across the whole wall or floor (w x h pixels); colours a variant swaps use
// the S slots (roomPaint.ts).
import { C, hash, S, type Art } from './roomPaint';

export const SURFACES_ART: Record<string, Art> = {
  // ---------------------------------------------------------------- walls
  wall_limewash: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = hash(x >> 1, y) * 0.6 + hash(x >> 3, y >> 2) * 0.4;
        if (r > 0.78) p.px(x, y, S.a);
        else if (r < 0.14) p.px(x, y, '#ffffff');
      }
    }
  },
  wall_zellige: (p, { w, h }) => {
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const r = hash(x, y);
        p.rect(x, y, 4, 4, r > 0.66 ? S.a3 : r > 0.33 ? S.a : S.a2);
        p.px(x + 1, y + 1, S.a3);
        p.rect(x, y + 3, 4, 1, C.mortar);
        p.rect(x + 3, y, 1, 4, C.mortar);
      }
    }
  },
  wall_cork: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.cork);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x, y) > 0.8) p.px(x, y, hash(y, x) > 0.5 ? C.cork2 : '#d8b483');
  },
  wall_slats: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.ink2);
    for (let x = 0; x < w; x += 3) {
      p.rect(x, 0, 2, h, S.w);
      p.rect(x, 0, 1, h, S.w3);
    }
  },
  wall_beadboard: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.wallBase);
    const top = Math.floor(h * 0.45);
    p.rect(0, top, w, h - top, S.a);
    for (let x = 1; x < w; x += 3) p.rect(x, top + 2, 1, h - top - 2, S.a2);
    p.rect(0, top, w, 2, S.a3);
  },
  wall_waves: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.wallBase);
    for (let y = 3; y < h; y += 6) {
      for (let x = 0; x < w; x++) p.px(x, y + Math.round(Math.sin((x + (y % 12)) / 2) * 1.2), S.a);
    }
  },
  wall_grid: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#f7f7f2');
    for (let x = 0; x < w; x += 4) p.rect(x, 0, 1, h, x % 16 === 0 ? S.a : S.a3);
    for (let y = 0; y < h; y += 4) p.rect(0, y, w, 1, y % 16 === 0 ? S.a : S.a3);
  },
  wall_terrazzo: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#ece7df');
    const chips = ['#c46a4a', '#8fa98b', '#3d5a80', '#d4a017', '#a8a29e'];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const r = hash(x * 5, y * 3);
        if (r > 0.72) p.rect(x, y, 1 + (r > 0.9 ? 1 : 0), 1, chips[Math.floor(hash(y, x) * chips.length)]);
      }
    }
  },
  wall_two_tone: (p, { w, h }) => {
    const mid = Math.floor(h * 0.55);
    p.rect(0, 0, w, mid, C.wallBase);
    p.rect(0, mid, w, h - mid, S.a);
    p.rect(0, mid, w, 1, S.a3);
  },
  wall_leaves: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#eef5ea');
    for (let y = 2; y < h; y += 9) {
      for (let x = (y / 9) % 2 ? 6 : 1; x < w; x += 11) {
        for (let i = 0; i < 6; i++) {
          p.rect(x + i, y + Math.floor(i / 2), 1, 4 - Math.abs(3 - i) + 1, '#4a7d56');
          p.px(x + i, y + Math.floor(i / 2) + 1, '#2f5d3a');
        }
      }
    }
  },
  wall_clouds: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let y = 3; y < h; y += 10) {
      for (let x = (y / 10) % 2 ? 9 : 2; x < w; x += 16) {
        p.rect(x, y + 1, 8, 2, C.white);
        p.rect(x + 2, y, 4, 1, C.white);
        p.rect(x + 1, y + 3, 6, 1, '#f1f5f9');
      }
    }
  },
  wall_washi: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#f6f1e3');
    for (let x = 0; x < w; x += 6) p.rect(x, 0, 1, h, S.w);
    for (let y = 0; y < h; y += 8) p.rect(0, y, w, 1, S.w);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 3) if (hash(x, y) > 0.9) p.px(x, y, '#ebe3cc');
  },
  wall_concrete: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.concrete);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x, y) > 0.9) p.px(x, y, C.concrete2);
    for (let y = 5; y < h; y += 12) for (let x = 5; x < w; x += 12) p.px(x, y, C.ink3);
    for (let y = 11; y < h; y += 12) p.rect(0, y, w, 1, '#9c968f');
  },
  wall_scallop: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let y = 0; y < h; y += 4) {
      for (let x = (y / 4) % 2 ? 0 : 3; x < w; x += 6) {
        p.rect(x, y + 3, 5, 1, S.a);
        p.px(x, y + 2, S.a);
        p.px(x + 4, y + 2, S.a);
      }
    }
  },
  wall_gingham: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.white);
    for (let x = 0; x < w; x += 6) p.rect(x, 0, 3, h, S.a3);
    for (let y = 0; y < h; y += 6) {
      p.rect(0, y, w, 3, S.a3);
      for (let x = 0; x < w; x += 6) p.rect(x, y, 3, 3, S.a);
    }
  },
  wall_night_city: (p, { w, h, night }) => {
    p.rect(0, 0, w, h, '#1e1b4b');
    p.rect(0, Math.floor(h / 2), w, h, '#312e81');
    for (let x = 0; x < w; x += 5) {
      const top = Math.floor(h * 0.35 + hash(x, 1) * h * 0.4);
      const bw = 3 + Math.floor(hash(x, 2) * 3);
      p.rect(x, top, bw, h - top, '#0f0d2e');
      for (let y = top + 2; y < h - 1; y += 3) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (hash(xx, y) > (night ? 0.3 : 0.6)) p.px(xx, y, '#fbbf24');
    }
    for (let i = 0; i < 20; i++) p.px(Math.floor(hash(i, 3) * w), Math.floor(hash(i, 4) * h * 0.3), C.star);
  },
  // ---------------------------------------------------------------- floors
  floor_light_oak: (p, { w, h }) => {
    for (let y = 0; y < h; y += 5) {
      p.rect(0, y, w, 5, (y / 5) % 2 ? '#e3c697' : '#ead2a8');
      p.rect(0, y + 4, w, 1, '#c9a874');
      for (let x = ((y / 5) % 3) * 9; x < w; x += 27) p.rect(x, y, 1, 4, '#c9a874');
    }
  },
  floor_chevron: (p, { w, h }) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = Math.floor((y + (x % 8 < 4 ? x % 4 : 3 - (x % 4))) / 3);
        p.px(x, y, k % 2 ? S.w : S.w3);
      }
    }
    for (let x = 3; x < w; x += 8) p.rect(x, 0, 1, h, S.w2);
  },
  floor_vinyl: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) p.rect(x, y, 3, 3, S.a);
  },
  floor_hex_tile: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.mortar);
    for (let y = 0; y < h; y += 4) {
      for (let x = (y / 4) % 2 ? 3 : 0; x < w; x += 6) {
        p.rect(x + 1, y, 3, 3, S.a);
        p.rect(x, y + 1, 5, 1, S.a);
        p.px(x + 1, y, S.a3);
      }
    }
  },
  floor_cork: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#c8a06a');
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) p.rect(x, y, 8, 8, (x + y) % 16 ? '#c8a06a' : '#bf955e');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x, y) > 0.85) p.px(x, y, '#a97f52');
  },
  floor_brick: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#a8a29e');
    for (let y = 0; y < h; y += 3) {
      for (let x = (y / 3) % 2 ? -3 : 0; x < w; x += 7) {
        p.rect(x, y, 6, 2, hash(x, y) > 0.5 ? '#b45f3c' : '#a24f30');
      }
    }
  },
  floor_jute: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#c8ad7f');
    for (let y = 0; y < h; y += 2) for (let x = (y / 2) % 2; x < w; x += 2) p.px(x, y, '#b39465');
    for (let y = 1; y < h; y += 6) p.rect(0, y, w, 1, '#a88a5c');
  },
  floor_carpet_tile: (p, { w, h }) => {
    for (let y = 0; y < h; y += 6) {
      for (let x = 0; x < w; x += 6) {
        p.rect(x, y, 6, 6, S.a);
        const horiz = ((x + y) / 6) % 2;
        for (let i = 1; i < 6; i += 2) p.rect(x + (horiz ? 0 : i), y + (horiz ? i : 0), horiz ? 6 : 1, horiz ? 1 : 6, S.a2);
      }
    }
  },
  floor_epoxy: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x, y) > 0.94) p.px(x, y, S.a3);
    for (let i = 0; i < w; i += 9) p.rect(i, 0, 2, 1, S.a3);
  },
  floor_whitewash: (p, { w, h }) => {
    for (let y = 0; y < h; y += 4) {
      p.rect(0, y, w, 4, (y / 4) % 2 ? '#e8e4dc' : '#efece5');
      p.rect(0, y + 3, w, 1, '#cfc9bd');
      for (let x = ((y / 4) % 3) * 11; x < w; x += 33) p.rect(x, y, 1, 3, '#cfc9bd');
    }
  },
  floor_mosaic: (p, { w, h }) => {
    const tones = ['#e5e7eb', '#cbd5e1', '#94a3b8', '#bae6fd', '#e5e7eb'];
    p.rect(0, 0, w, h, '#f8fafc');
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) p.rect(x, y, 2, 2, tones[Math.floor(hash(x, y) * tones.length)]);
  },
  floor_igusa: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.tatami);
    for (let x = 0; x < w; x += 2) p.rect(x, 0, 1, h, C.tatami2);
    for (let y = 0; y < h; y += 12) p.rect(0, y, w, 2, '#4a6b3a');
  },
  floor_shag: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = hash(x, y);
      if (r > 0.7) p.px(x, y, S.a3);
      else if (r < 0.2) p.px(x, y, S.a2);
    }
  },
  floor_kilim: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#9a3412');
    for (let y = 0; y < h; y += 8) {
      p.rect(0, y, w, 1, '#efe6d2');
      for (let x = 0; x < w; x += 8) {
        for (let i = 0; i < 3; i++) p.rect(x + 3 - i, y + 2 + i, 1 + i * 2, 1, (x / 8) % 2 ? '#d4a017' : '#1e3a6e');
        for (let i = 0; i < 2; i++) p.rect(x + 2 + i, y + 5 + i, 3 - i * 2, 1, (x / 8) % 2 ? '#d4a017' : '#1e3a6e');
      }
    }
  },
};
