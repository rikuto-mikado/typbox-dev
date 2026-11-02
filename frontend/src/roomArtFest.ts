// MY ROOM art pack: the limited pieces of each festival (backend festivals.py).
import { C, disc, S, type Art } from './roomPaint';

const HOLLY = '#15803d';
const SNOW = '#f8fafc';
const SAKURA = '#f9a8d4';
const SAKURA2 = '#f472b6';
const SAKURA3 = '#fce7f3';
const BRANCH = '#5b3a24';
const INK_NIGHT = '#1e1b4b';

export const FEST_ART: Record<string, Art> = {
  // ------------------------------------------------------------- christmas
  xmas_grand_tree: (p, env) => {
    p.rect(7, 0, 2, 3, C.amber);
    p.px(6, 1, C.amber);
    p.px(9, 1, C.amber);
    const tiers: Array<[number, number, number]> = [[3, 9, 1], [9, 11, 1], [16, 13, 1], [24, 12, 0]];
    for (const [top, height] of tiers) {
      for (let i = 0; i < height; i++) {
        const w = Math.min(16, 2 + Math.floor(i * 1.25) + (top > 3 ? 4 : 0));
        p.rect(8 - Math.floor(w / 2), top + i, w, 1, i % 3 === 0 ? C.leaf2 : HOLLY);
      }
    }
    const lit = env.on || env.night;
    const baubles: Array<[number, number, string]> = [[8, 6, C.red], [5, 12, C.amber], [10, 13, C.sky], [3, 19, C.pink], [8, 20, C.red], [13, 20, C.amber], [5, 27, C.sky], [11, 28, C.pink], [8, 33, C.amber]];
    for (const [x, y, c] of baubles) p.rect(x, y, 2, 2, lit ? c : C.metal2);
    p.rect(6, 36, 4, 2, C.wood2);
    p.rect(3, 36, 3, 4, C.red);
    p.rect(4, 36, 1, 4, C.amber);
    p.rect(10, 37, 4, 3, C.sky2);
    p.rect(11, 37, 1, 3, C.white);
  },
  xmas_mantle: (p, env) => {
    p.rect(0, 2, 32, 3, C.paper);
    p.rect(0, 2, 32, 1, C.white);
    p.rect(1, 5, 30, 19, C.brick);
    for (let y = 6; y < 24; y += 3) {
      for (let x = 1 + (y % 2) * 2; x < 31; x += 5) p.rect(x, y, 1, 1, C.brick2);
    }
    p.rect(8, 11, 16, 13, C.ink);
    p.rect(9, 12, 14, 12, C.ink2);
    const flame = env.on || env.night;
    p.rect(11, 22, 10, 2, C.wood2);
    p.rect(13, 16, 6, 6, flame ? C.orange : C.ink3);
    p.rect(14, 18, 4, 4, flame ? C.amber : C.ink3);
    p.rect(15, 20, 2, 2, flame ? C.glow : C.ink3);
    // stockings
    for (const [x, c] of [[3, C.red], [14, HOLLY], [25, C.red]] as const) {
      p.rect(x, 5, 3, 5, c);
      p.rect(x, 5, 3, 1, C.white);
      p.rect(x, 10, 5, 2, c);
    }
    // holly along the shelf
    for (let x = 2; x < 31; x += 6) {
      p.rect(x, 1, 3, 1, HOLLY);
      p.px(x + 1, 0, C.red);
    }
  },
  xmas_sleigh: (p) => {
    p.rect(4, 3, 20, 8, C.red2);
    p.rect(4, 3, 20, 1, C.red);
    p.rect(24, 1, 4, 10, C.red2);
    p.rect(24, 1, 4, 1, C.amber);
    p.rect(6, 6, 16, 1, C.amber);
    p.rect(7, 0, 5, 4, C.amber2);
    p.rect(9, 0, 1, 4, C.white);
    p.rect(14, 1, 5, 3, HOLLY);
    p.rect(16, 1, 1, 3, C.red);
    p.rect(6, 11, 2, 2, C.metal2);
    p.rect(21, 11, 2, 2, C.metal2);
    p.rect(1, 13, 29, 1, C.amber2);
    p.rect(0, 14, 28, 1, C.amber2);
    p.rect(30, 11, 2, 2, C.amber2);
  },
  xmas_gingerbread: (p) => {
    for (let i = 0; i < 7; i++) p.rect(7 - i, 1 + i, 2 + i * 2, 1, C.wood3);
    for (let x = 0; x < 16; x += 2) p.px(x, 8, SNOW);
    p.rect(2, 8, 12, 8, C.oak3);
    p.rect(6, 11, 4, 5, C.wood2);
    p.px(9, 13, C.amber);
    p.rect(3, 10, 2, 2, C.glow);
    p.rect(11, 10, 2, 2, C.glow);
    for (const x of [3, 7, 11]) p.px(x, 6, C.red);
    p.px(5, 4, C.leaf3);
    p.px(10, 4, C.leaf3);
    p.rect(12, 1, 2, 4, C.wood2);
    p.rect(1, 15, 14, 1, SNOW);
  },
  xmas_sack: (p) => {
    p.rect(5, 1, 6, 2, C.red2);
    p.rect(6, 3, 4, 1, C.amber);
    p.rect(3, 4, 10, 2, C.red);
    p.rect(1, 6, 14, 9, C.red);
    p.rect(2, 15, 12, 1, C.red2);
    p.rect(3, 6, 2, 8, '#f87171');
    p.rect(12, 7, 3, 8, C.red2);
    p.rect(6, 0, 2, 2, C.sky2);
    p.rect(9, 0, 2, 1, C.amber);
  },
  xmas_wreath: (p) => {
    // a ring: nothing drawn through the middle, so the wall shows
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
        if (d <= 7.6 && d >= 3.4) p.px(x, y, (x * 3 + y * 5) % 4 ? HOLLY : C.leaf);
      }
    }
    for (const [x, y] of [[3, 4], [12, 4], [2, 10], [13, 10], [8, 2], [5, 13], [11, 13]]) p.px(x, y, C.red);
    p.rect(6, 13, 4, 2, C.red);
    p.rect(7, 15, 1, 1, C.red2);
    p.rect(9, 15, 1, 1, C.red2);
  },
  xmas_candy_cane: (p) => {
    for (let y = 4; y < 24; y++) p.rect(3, y, 3, 1, Math.floor(y / 3) % 2 ? C.red : SNOW);
    p.rect(3, 1, 3, 3, C.red);
    p.rect(1, 0, 5, 2, SNOW);
    p.rect(0, 1, 2, 3, C.red);
    p.rect(0, 4, 2, 1, SNOW);
  },
  // ------------------------------------------------------------- halloween
  hw_tombstone: (p) => {
    p.rect(4, 0, 8, 1, C.metal);
    p.rect(3, 1, 10, 2, C.metal);
    p.rect(2, 3, 12, 11, C.metal2);
    p.rect(3, 3, 1, 11, C.metal);
    p.rect(5, 5, 6, 1, C.ink3);
    p.rect(6, 7, 4, 1, C.ink3);
    p.rect(7, 4, 2, 5, C.ink3);
    p.rect(11, 9, 2, 2, C.moss);
    p.rect(0, 14, 16, 2, C.moss2);
    p.px(2, 13, C.moss);
    p.px(14, 13, C.moss);
  },
  hw_cauldron: (p, env) => {
    const glow = env.on || env.night;
    p.rect(3, 3, 10, 1, C.ink3);
    p.rect(4, 4, 8, 1, C.leaf3);
    for (const [x, y] of [[6, 1], [10, 0], [8, 2]]) disc(p, x, y + 1, 1.1, C.leaf3);
    p.rect(2, 5, 12, 7, C.ink2);
    p.rect(1, 6, 14, 5, C.ink2);
    p.rect(3, 6, 2, 4, C.ink3);
    p.rect(3, 12, 10, 1, C.ink);
    p.rect(2, 13, 2, 2, C.ink);
    p.rect(12, 13, 2, 2, C.ink);
    p.rect(5, 13, 6, 3, glow ? C.orange : C.ink3);
    p.rect(7, 14, 2, 2, glow ? C.amber : C.ink3);
  },
  hw_ghost: (p, env) => {
    const sheet = env.night ? '#e0e7ff' : SNOW;
    p.rect(2, 0, 4, 1, sheet);
    p.rect(1, 1, 6, 13, sheet);
    p.rect(0, 5, 1, 3, sheet);
    p.rect(7, 5, 1, 3, sheet);
    p.rect(2, 3, 1, 2, C.ink);
    p.rect(5, 3, 1, 2, C.ink);
    p.rect(3, 6, 2, 2, C.ink2);
    p.rect(1, 14, 1, 1, sheet);
    p.rect(3, 14, 2, 1, sheet);
    p.rect(6, 14, 1, 1, sheet);
    p.rect(6, 2, 1, 11, C.paper2);
  },
  hw_web: (p) => {
    const web = C.paper2;
    for (let i = 0; i < 16; i++) {
      p.px(i, 0, web);
      p.px(0, i, web);
      p.px(i, i, web);
      p.px(i, Math.floor(i / 2), web);
      p.px(Math.floor(i / 2), i, web);
    }
    for (const r of [4, 8, 12]) {
      for (let i = 0; i <= r; i++) p.px(i, r - Math.floor(i * 0.6), web);
    }
    p.rect(9, 8, 3, 3, C.ink);
    p.px(8, 9, C.ink);
    p.px(12, 9, C.ink);
    p.px(10, 11, C.red);
  },
  // -------------------------------------------------------------- new year
  ny_kagami: (p) => {
    p.rect(6, 0, 3, 2, C.orange);
    p.rect(7, 2, 1, 1, C.leaf2);
    p.rect(4, 3, 8, 3, SNOW);
    p.rect(5, 3, 2, 1, C.white);
    p.rect(2, 6, 12, 4, SNOW);
    p.rect(2, 9, 12, 1, C.paper2);
    p.rect(1, 10, 14, 1, C.red);
    p.rect(1, 11, 14, 1, C.paper);
    for (let x = 2; x < 14; x += 3) p.px(x, 11, C.red);
    p.rect(2, 12, 12, 2, C.wood3);
    p.rect(3, 14, 10, 2, C.wood);
    p.rect(6, 14, 4, 1, C.wood2);
  },
  ny_shishi: (p) => {
    // Lion mask under a green cloth with white curls.
    p.rect(6, 1, 9, 12, HOLLY);
    for (const [x, y] of [[8, 3], [12, 5], [9, 8], [13, 10]]) {
      p.rect(x, y, 2, 1, SNOW);
      p.px(x + 2, y + 1, SNOW);
    }
    p.rect(1, 2, 7, 9, C.red2);
    p.rect(1, 2, 7, 2, C.red);
    p.rect(2, 4, 2, 2, C.amber);
    p.rect(5, 4, 2, 2, C.amber);
    p.px(3, 5, C.ink);
    p.px(6, 5, C.ink);
    p.rect(1, 8, 7, 1, C.ink);
    p.rect(2, 9, 5, 1, SNOW);
    p.rect(1, 10, 7, 2, C.red2);
    p.rect(7, 13, 2, 3, C.wood2);
    p.rect(12, 13, 2, 3, C.wood2);
  },
  ny_hagoita: (p) => {
    p.rect(1, 0, 6, 15, C.wood3);
    p.rect(1, 0, 6, 1, C.amber2);
    p.rect(2, 2, 4, 5, C.paper);
    p.rect(3, 2, 2, 2, C.ink);
    p.rect(3, 4, 2, 1, C.paper2);
    p.rect(2, 7, 4, 5, C.red);
    for (const y of [8, 10]) p.rect(2, y, 4, 1, C.amber);
    p.rect(3, 15, 2, 7, C.wood2);
    p.rect(3, 22, 2, 2, C.red2);
  },
  // ---------------------------------------------------------------- hanami
  hn_sakura_tree: (p) => {
    p.rect(10, 18, 4, 22, BRANCH);
    p.rect(11, 18, 1, 22, C.walnut3);
    p.rect(14, 22, 5, 2, BRANCH);
    p.rect(5, 19, 5, 2, BRANCH);
    p.rect(8, 38, 8, 2, BRANCH);
    const blooms: Array<[number, number, number]> = [[12, 7, 8], [5, 11, 5.5], [19, 11, 5.5], [8, 17, 5], [17, 18, 5], [12, 15, 6]];
    for (const [x, y, r] of blooms) disc(p, x, y, r, SAKURA);
    for (const [x, y, r] of [[10, 5, 4], [4, 10, 3], [17, 9, 3.5], [14, 14, 3]] as const) disc(p, x, y, r, SAKURA3);
    for (const [x, y] of [[8, 9], [15, 6], [19, 14], [6, 17], [13, 19], [21, 9]]) p.px(x, y, SAKURA2);
    for (const [x, y] of [[3, 25], [20, 28], [6, 33], [18, 36], [15, 31]]) p.px(x, y, SAKURA);
  },
  hn_blue_sheet: (p) => {
    p.rect(0, 3, 32, 5, C.blue);
    p.rect(0, 3, 32, 1, C.sky2);
    for (let x = 0; x < 32; x += 4) p.rect(x, 3, 1, 5, C.blue2);
    p.rect(3, 1, 7, 3, C.wood4);
    p.rect(4, 1, 5, 1, C.red);
    p.rect(5, 2, 3, 1, C.paper);
    p.rect(20, 1, 2, 3, C.leaf2);
    p.rect(24, 2, 2, 2, C.paper);
    for (const [x, y] of [[13, 5], [17, 6], [28, 5], [1, 6]]) p.px(x, y, SAKURA3);
  },
  hn_lantern: (p, env) => {
    const lit = env.on || env.night;
    p.rect(0, 0, 24, 1, C.ink3);
    for (const x of [1, 9, 17]) {
      p.px(x + 2, 1, C.ink3);
      p.rect(x, 2, 6, 5, lit ? C.glow : C.paper);
      p.rect(x + 1, 2, 4, 1, C.red);
      p.rect(x + 1, 6, 4, 1, C.red);
      p.rect(x + 2, 3, 2, 3, lit ? C.amber : SAKURA);
    }
  },
  // -------------------------------------------------------------- tanabata
  tb_bamboo: (p, env) => {
    p.rect(7, 2, 2, 38, C.leaf2);
    for (let y = 6; y < 40; y += 7) p.rect(7, y, 2, 1, C.moss2);
    const leaves: Array<[number, number, number]> = [[9, 3, 6], [2, 7, 5], [9, 10, 6], [1, 14, 6], [9, 18, 5], [2, 22, 5]];
    for (const [x, y, w] of leaves) {
      p.rect(x, y, w, 1, C.leaf);
      p.rect(x + 1, y + 1, Math.max(1, w - 2), 1, C.leaf2);
    }
    const lit = env.night;
    const strips: Array<[number, number, string]> = [[3, 9, C.red], [12, 12, C.sky2], [4, 16, C.amber], [12, 20, SAKURA2], [3, 24, C.white], [11, 27, C.purple]];
    for (const [x, y, c] of strips) {
      p.rect(x, y, 2, 5, c);
      p.px(x, y + 5, lit ? C.star : c);
    }
  },
  tb_tanzaku: (p) => {
    p.rect(0, 0, 16, 1, C.leaf2);
    for (const [x, len, c] of [[1, 12, C.red], [5, 14, C.sky2], [9, 11, C.amber], [13, 13, SAKURA2]] as const) {
      p.px(x + 1, 1, C.paper2);
      p.rect(x, 2, 3, len, c);
      p.rect(x + 1, 4, 1, len - 4, C.white);
    }
  },
  tb_magpie: (p, env) => {
    p.rect(0, 0, 32, 8, env.night ? INK_NIGHT : '#312e81');
    for (let i = 0; i < 20; i++) p.px((i * 7) % 32, (i * 3) % 8, C.star);
    const arch = [6, 5, 4, 3, 3, 3, 4, 5, 6];
    arch.forEach((y, i) => {
      const x = 2 + i * 3;
      p.rect(x, y, 2, 1, C.white);
      p.px(x + 2, y, C.ink);
      p.px(x - 1, y + 1, C.ink);
    });
    p.rect(1, 6, 1, 2, C.star);
    p.rect(30, 6, 1, 2, C.star);
  },
  // ---------------------------------------------------------------- summer
  sm_mosquito_net: (p) => {
    p.rect(0, 0, 32, 2, C.moss2);
    p.rect(0, 0, 32, 1, C.moss);
    for (const x of [0, 31]) p.rect(x, 2, 1, 28, C.moss);
    for (let y = 2; y < 30; y += 2) p.rect(1, y, 30, 1, 'rgba(101,163,13,0.25)');
    for (let x = 3; x < 31; x += 3) p.rect(x, 2, 1, 28, 'rgba(101,163,13,0.25)');
    p.rect(2, 24, 28, 3, C.white);
    p.rect(2, 27, 28, 1, C.paper2);
    p.rect(3, 21, 6, 3, C.white);
    p.rect(11, 23, 18, 2, C.sky2);
    p.rect(0, 30, 32, 2, C.oak);
  },
  sm_kakigori: (p) => {
    p.rect(2, 0, 4, 1, SNOW);
    p.rect(1, 1, 6, 2, C.red);
    p.rect(1, 3, 6, 1, SNOW);
    p.rect(0, 4, 8, 1, C.sky);
    p.rect(1, 5, 6, 1, C.sky2);
    p.rect(2, 6, 4, 1, C.sky);
    p.rect(3, 7, 2, 1, C.paper2);
  },
  sm_bug_cage: (p) => {
    p.rect(1, 0, 6, 1, C.oak);
    p.rect(3, 0, 2, 1, C.red);
    for (const x of [1, 3, 4, 6]) p.rect(x, 1, 1, 6, C.oak3);
    p.rect(1, 7, 6, 1, C.oak);
    p.rect(2, 3, 3, 2, C.wood4);
    p.px(3, 5, C.ink);
    p.px(5, 2, C.leaf);
  },
  sm_watermelon: (p) => {
    p.rect(3, 1, 10, 1, C.leaf2);
    p.rect(1, 2, 14, 2, C.leaf2);
    p.rect(0, 4, 16, 3, C.leaf2);
    p.rect(1, 7, 14, 1, HOLLY);
    for (const x of [3, 8, 13]) p.rect(x, 1, 1, 7, HOLLY);
    p.rect(9, 4, 6, 3, C.white);
    p.rect(10, 4, 5, 2, C.red);
    p.px(11, 4, C.ink);
    p.px(13, 5, C.ink);
  },
  sm_uchiwa: (p) => {
    const fan = (cx: number, cy: number, c: string, c2: string) => {
      disc(p, cx, cy, 3.6, c);
      p.px(cx, cy - 1, c2);
      p.px(cx + 1, cy, c2);
      p.rect(cx, cy + 3, 1, 4, C.wood2);
    };
    fan(4, 5, C.sky2, C.white);
    fan(11, 7, C.red, C.amber);
  },
  // -------------------------------------------------------------- setsubun
  st_oni_mask: (p) => {
    p.rect(2, 0, 2, 3, C.amber);
    p.rect(12, 0, 2, 3, C.amber);
    p.rect(2, 3, 12, 11, C.red);
    p.rect(1, 5, 14, 7, C.red);
    p.rect(3, 3, 10, 1, '#f87171');
    p.rect(3, 6, 4, 1, C.ink);
    p.rect(9, 6, 4, 1, C.ink);
    p.rect(4, 7, 2, 2, C.amber);
    p.rect(10, 7, 2, 2, C.amber);
    p.rect(4, 11, 8, 2, C.ink);
    p.rect(4, 11, 2, 2, C.white);
    p.rect(10, 11, 2, 2, C.white);
    p.rect(7, 9, 2, 1, C.red2);
    p.rect(3, 14, 10, 1, C.red2);
  },
  st_bean_box: (p) => {
    p.rect(0, 3, 8, 5, C.oak);
    p.rect(0, 3, 8, 1, C.oak2);
    p.rect(1, 7, 6, 1, C.oak3);
    for (const [x, y] of [[1, 2], [3, 1], [5, 2], [2, 3], [4, 3], [6, 3]]) p.rect(x, y, 2, 1, C.paper2);
    p.px(3, 5, C.ink3);
    p.px(5, 5, C.ink3);
  },
  st_ehomaki: (p) => {
    p.rect(0, 6, 16, 2, C.red2);
    p.rect(1, 5, 14, 1, C.red);
    p.rect(2, 2, 12, 4, C.ink2);
    p.rect(2, 2, 12, 1, C.ink3);
    disc(p, 13, 4, 2, C.white);
    p.px(13, 3, C.amber);
    p.px(14, 4, C.leaf);
    p.px(12, 4, C.orange);
    p.px(13, 5, C.pink);
    p.rect(5, 2, 2, 4, C.paper2);
  },
  // ------------------------------------------------------------- valentine
  vt_fountain: (p) => {
    const choc = '#5b2a10';
    const lit = '#8b4a1f';
    p.rect(7, 0, 2, 1, lit);
    p.rect(5, 1, 6, 2, choc);
    p.rect(7, 3, 2, 3, C.metal);
    p.rect(3, 6, 10, 2, choc);
    p.rect(3, 6, 10, 1, lit);
    p.rect(4, 8, 1, 3, choc);
    p.rect(11, 8, 1, 3, choc);
    p.rect(7, 8, 2, 4, C.metal);
    p.rect(1, 12, 14, 2, choc);
    p.rect(1, 12, 14, 1, lit);
    p.rect(2, 14, 1, 4, choc);
    p.rect(13, 14, 1, 4, choc);
    p.rect(6, 14, 4, 4, C.metal2);
    p.rect(0, 18, 16, 6, C.metal);
    p.rect(0, 18, 16, 2, choc);
    p.rect(1, 22, 14, 1, C.metal2);
    for (const x of [2, 7, 12]) {
      p.rect(x, 19, 2, 2, C.red);
      p.px(x, 18, C.leaf);
    }
  },
  vt_gift: (p) => {
    const c = '#e11d48';
    p.rect(2, 3, 5, 3, c);
    p.rect(9, 3, 5, 3, c);
    p.rect(1, 5, 14, 3, c);
    p.rect(2, 8, 12, 2, c);
    p.rect(3, 10, 10, 2, c);
    p.rect(5, 12, 6, 2, c);
    p.rect(7, 14, 2, 2, c);
    p.rect(3, 4, 2, 1, C.pink);
    p.rect(7, 3, 2, 13, C.amber);
    p.rect(1, 6, 14, 1, C.amber);
    p.rect(5, 1, 3, 2, C.amber);
    p.rect(8, 1, 3, 2, C.amber2);
  },
  vt_letters: (p) => {
    p.rect(0, 0, 16, 1, C.wood2);
    for (const [x, y, c] of [[1, 1, C.white], [6, 2, '#fda4af'], [11, 1, C.paper]] as const) {
      p.px(x + 1, y, C.metal2);
      p.rect(x, y + 1, 4, 4, c);
      p.px(x + 1, y + 2, C.metal);
      p.px(x + 2, y + 2, C.metal);
      p.px(x + 2, y + 3, '#e11d48');
    }
  },
  // --------------------------------------------------------------- tsukimi
  tk_dango: (p) => {
    for (const [x, y] of [[3, 0], [1, 2], [5, 2], [0, 4], [3, 4], [6, 4]]) disc(p, x + 1, y + 1.2, 1.4, C.white);
    p.rect(1, 6, 6, 1, C.paper2);
    p.rect(0, 7, 8, 2, C.wood3);
    p.rect(2, 9, 4, 4, C.wood2);
    p.rect(3, 9, 2, 1, C.ink2);
    p.rect(1, 13, 6, 3, C.wood3);
    p.rect(1, 15, 6, 1, C.wood2);
  },
  tk_susuki: (p) => {
    for (const [x, top] of [[1, 2], [3, 0], [5, 1], [6, 4]]) {
      p.rect(x, top + 4, 1, 12 - top, C.oak3);
      p.rect(x - 1, top, 2, 2, C.paper);
      p.rect(x, top + 2, 2, 2, C.paper2);
    }
    p.rect(2, 16, 4, 1, C.ink2);
    p.rect(1, 17, 6, 7, C.navy);
    p.rect(2, 18, 1, 5, C.navy2);
    p.rect(1, 23, 6, 1, C.ink2);
  },
  tk_moon_window: (p, env) => {
    p.rect(0, 0, 24, 24, S.w2);
    p.rect(2, 2, 20, 19, env.night ? C.night : '#3b4a7a');
    disc(p, 12, 9, 6, C.glow);
    disc(p, 12, 9, 5, '#fef3c7');
    p.rect(10, 7, 2, 1, C.glow);
    p.rect(13, 11, 2, 1, C.glow);
    for (const x of [3, 6, 18, 21]) {
      p.rect(x, 13, 1, 8, C.oak3);
      p.rect(x - 1, 12, 2, 2, C.paper);
    }
    p.rect(2, 19, 20, 2, C.ink2);
    p.rect(0, 21, 24, 3, S.w);
    p.rect(0, 21, 24, 1, S.w3);
  },
  // --------------------------------------------------------------- culture
  bk_stall: (p, env) => {
    p.rect(0, 0, 32, 2, C.red);
    for (let x = 0; x < 32; x += 8) p.rect(x, 0, 4, 2, C.white);
    for (let x = 0; x < 32; x += 8) {
      p.rect(x, 2, 4, 2, C.red);
      p.rect(x + 4, 2, 4, 2, C.white);
    }
    p.rect(1, 4, 2, 24, C.wood2);
    p.rect(29, 4, 2, 24, C.wood2);
    // lanterns
    const lit = env.on || env.night;
    for (const x of [6, 14, 22]) {
      p.rect(x, 4, 4, 5, lit ? C.glow : C.paper);
      p.rect(x, 4, 4, 1, C.red);
      p.rect(x, 8, 4, 1, C.red);
    }
    // griddle with noodles
    p.rect(3, 15, 26, 2, C.ink3);
    p.rect(5, 13, 22, 2, C.oak);
    for (let x = 6; x < 26; x += 3) p.px(x, 12, C.oak3);
    p.px(9, 13, C.leaf);
    p.px(18, 13, C.red);
    // counter sign
    p.rect(3, 17, 26, 11, C.white);
    p.rect(3, 17, 26, 1, C.paper2);
    p.rect(6, 20, 20, 5, C.red2);
    for (const x of [8, 12, 16, 20]) p.rect(x, 21, 2, 3, C.white);
    p.rect(0, 28, 32, 4, C.wood2);
    p.rect(0, 28, 32, 1, C.wood3);
  },
  bk_banner: (p) => {
    p.rect(0, 0, 32, 1, C.ink3);
    p.rect(1, 1, 30, 7, '#7c3aed');
    p.rect(1, 1, 30, 1, '#c084fc');
    for (const x of [4, 9, 14, 19, 24]) {
      p.rect(x, 3, 3, 3, C.white);
      p.px(x + 1, 4, '#7c3aed');
    }
    for (let x = 1; x < 31; x += 4) p.px(x, 7, C.amber);
  },
  bk_curtain: (p, env) => {
    p.rect(0, 0, 32, 3, C.amber2);
    p.rect(0, 2, 32, 1, C.wood2);
    p.rect(0, 3, 32, 21, env.on || env.night ? '#1e1b4b' : C.ink2);
    // the drapes, pulled aside
    for (let x = 0; x < 9; x += 2) {
      p.rect(x, 3, 1, 21 - x, C.red);
      p.rect(x + 1, 3, 1, 21 - x, C.red2);
      p.rect(31 - x, 3, 1, 21 - x, C.red);
      p.rect(30 - x, 3, 1, 21 - x, C.red2);
    }
    // spotlight
    if (env.on || env.night) {
      for (let i = 0; i < 16; i++) p.rect(16 - 2 - Math.floor(i / 3), 3 + i, 4 + Math.floor((i * 2) / 3), 1, 'rgba(253,230,138,0.3)');
    }
    p.rect(0, 22, 32, 2, C.wood);
    p.rect(0, 22, 32, 1, C.wood3);
  },
  bk_sign: (p) => {
    p.rect(0, 0, 8, 15, C.white);
    p.rect(0, 0, 8, 2, '#7c3aed');
    p.rect(1, 3, 6, 1, C.red);
    p.rect(1, 5, 6, 1, C.metal3);
    p.rect(1, 7, 4, 1, C.metal3);
    p.rect(1, 9, 6, 3, C.amber);
    p.rect(2, 10, 1, 1, C.ink);
    p.rect(5, 10, 1, 1, C.ink);
    p.rect(3, 15, 2, 7, C.wood2);
    p.rect(1, 22, 6, 2, C.wood);
  },
};
