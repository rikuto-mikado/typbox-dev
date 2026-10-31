// MY ROOM art pack: fitness, sport and pets. Recolourable parts use the S
// slots (roomPaint.ts) so catalog variants can swap them.
import { box, C, disc, S, type Art } from './roomPaint';

export const ACTIVE_ART: Record<string, Art> = {
  // --------------------------------------------------------------- fitness
  dumbbell_rack: (p) => {
    for (const [y, w] of [[1, 2], [4, 3]] as const) {
      for (const x of [2, 9]) {
        p.rect(x, y, w, 2, S.a);
        p.rect(x + w, y + 0.5, 6 - w * 2, 1, C.metal);
        p.rect(x + 6 - w, y, w, 2, S.a);
      }
    }
    p.rect(0, 3, 16, 1, C.ink2);
    p.rect(0, 6, 16, 1, C.ink2);
    p.rect(1, 3, 1, 5, C.ink2);
    p.rect(14, 3, 1, 5, C.ink2);
  },
  yoga_mat: (p) => {
    disc(p, 3, 4.5, 3.4, S.a);
    disc(p, 3, 4.5, 2, S.a2);
    disc(p, 3, 4.5, 0.8, S.a);
    p.rect(3, 6, 18, 2, S.a);
    p.rect(3, 6, 18, 1, S.a3);
    p.rect(17, 2, 5, 4, S.b);
    p.rect(17, 2, 5, 1, S.b3);
  },
  treadmill: (p, { on }) => {
    p.rect(17, 0, 6, 3, C.ink2);
    p.rect(18, 1, 4, 1, on ? C.leaf3 : C.ink3);
    p.rect(19, 3, 1, 8, S.m2);
    p.rect(21, 3, 1, 8, S.m2);
    p.rect(14, 4, 9, 1, S.m);
    p.rect(0, 11, 22, 2, C.ink2);
    p.rect(0, 11, 22, 1, C.ink3);
    p.rect(0, 13, 24, 2, S.m);
    p.rect(0, 13, 24, 1, S.m3);
    disc(p, 1.5, 12, 1.4, S.m2);
    p.rect(1, 15, 2, 1, C.ink);
    p.rect(21, 15, 2, 1, C.ink);
  },
  exercise_bike: (p) => {
    p.rect(2, 3, 4, 1, C.ink2);
    p.rect(3, 4, 1, 4, S.m);
    p.rect(11, 1, 3, 1, C.ink2);
    p.rect(12, 2, 1, 6, S.m);
    p.rect(3, 8, 10, 2, S.a);
    p.rect(3, 8, 10, 1, S.a3);
    disc(p, 10, 11.5, 2.6, C.ink2);
    disc(p, 10, 11.5, 1, C.metal);
    p.rect(1, 14, 14, 2, S.m2);
  },
  punching_bag: (p) => {
    p.rect(2, 0, 12, 1, C.ink2);
    p.rect(12, 0, 2, 32, C.ink2);
    p.rect(10, 30, 6, 2, C.ink2);
    p.rect(4, 1, 1, 3, C.metal3);
    p.rect(1, 4, 7, 18, S.a);
    p.rect(1, 4, 7, 2, S.a2);
    p.rect(2, 6, 2, 14, S.a3);
    p.rect(1, 20, 7, 2, S.a2);
    p.rect(1, 12, 7, 1, S.a2);
  },
  skateboard_wall: (p) => {
    p.rect(2, 0, 4, 16, S.a);
    p.rect(3, 0, 2, 1, S.a);
    p.rect(2, 0, 1, 16, S.a2);
    p.rect(3, 4, 2, 8, S.a3);
    p.rect(1, 2, 1, 2, C.ink2);
    p.rect(6, 2, 1, 2, C.ink2);
    p.rect(1, 12, 1, 2, C.ink2);
    p.rect(6, 12, 1, 2, C.ink2);
  },
  surfboard: (p) => {
    for (let y = 0; y < 31; y++) {
      const half = Math.min(3, Math.round(Math.sin((y / 31) * Math.PI) * 4));
      p.rect(4 - half, y, half * 2, 1, S.a);
    }
    p.rect(3, 4, 1, 24, S.a3);
    p.rect(1, 14, 6, 2, S.b);
    p.rect(3, 29, 2, 3, C.ink2);
  },
  basketball_hoop: (p) => {
    box(p, 0, 0, 16, 10, C.white, S.a);
    box(p, 5, 3, 6, 5, C.white, S.a);
    p.rect(4, 10, 8, 1, C.orange2);
    for (let y = 11; y < 15; y++) for (let x = 5 + (y - 11) / 2; x < 11 - (y - 11) / 2; x += 2) p.px(Math.round(x), y, C.white);
    disc(p, 13, 13, 2.4, C.orange);
    p.px(13, 13, C.ink);
  },
  tennis_rackets: (p) => {
    for (const [x, c] of [[1, S.a], [8, S.b]] as const) {
      disc(p, x + 3.5, 4.5, 3.6, c);
      disc(p, x + 3.5, 4.5, 2.4, C.paper);
      for (let i = 1; i < 7; i += 2) {
        p.rect(x + 1, 1 + i, 5, 1, C.paper2);
        p.rect(x + i, 2, 1, 5, C.paper2);
      }
      p.rect(x + 3, 8, 1, 6, C.ink2);
    }
    disc(p, 7.5, 13.5, 1.6, '#d9f99d');
  },
  soccer_ball: (p) => {
    disc(p, 4, 4.5, 3.5, C.white);
    p.rect(3, 3, 2, 2, C.ink);
    p.px(1, 5, C.ink);
    p.px(6, 5, C.ink);
    p.px(4, 7, C.ink);
    p.px(2, 2, C.paper2);
  },
  trophy_cabinet: (p) => {
    p.rect(0, 0, 24, 16, S.w2);
    p.rect(1, 1, 22, 13, '#cfe8f3');
    p.rect(1, 7, 22, 1, S.w);
    // cups, medals and a plaque
    for (const x of [3, 10, 17]) {
      p.rect(x, 2, 4, 3, C.amber);
      p.px(x - 1, 3, C.amber);
      p.px(x + 4, 3, C.amber);
      p.rect(x + 1, 5, 2, 1, C.amber2);
      p.rect(x, 6, 4, 1, C.wood2);
    }
    disc(p, 4, 11, 1.5, C.metal);
    disc(p, 8, 11, 1.5, C.amber2);
    p.rect(12, 9, 8, 4, C.wood);
    p.rect(13, 10, 6, 2, C.amber);
    p.rect(1, 14, 22, 2, S.w);
  },
  kettlebell: (p) => {
    p.rect(2, 1, 4, 1, S.a);
    p.rect(1, 2, 1, 2, S.a);
    p.rect(6, 2, 1, 2, S.a);
    disc(p, 4, 5.5, 2.8, S.a);
    p.px(2, 4, S.a3);
  },
  bicycle: (p) => {
    disc(p, 4, 11, 4, C.ink2);
    disc(p, 4, 11, 3, C.paper);
    disc(p, 20, 11, 4, C.ink2);
    disc(p, 20, 11, 3, C.paper);
    p.px(4, 11, C.metal);
    p.px(20, 11, C.metal);
    for (let i = 0; i <= 8; i++) {
      p.px(4 + i, 11 - i * 0.6, S.a);
      p.px(12 + i, 6 + i * 0.6, S.a);
    }
    p.rect(8, 6, 9, 1, S.a);
    p.rect(8, 3, 1, 4, S.a);
    p.rect(6, 3, 4, 1, C.ink);
    p.rect(17, 3, 1, 3, S.a);
    p.rect(16, 2, 4, 1, C.ink2);
    p.rect(19, 7, 2, 1, S.a);
  },
  climbing_holds: (p) => {
    p.rect(0, 0, 24, 24, S.w3);
    for (let y = 4; y < 24; y += 8) p.rect(0, y, 24, 1, S.w);
    const holds = [C.red, C.amber, C.leaf, C.sky, C.pink, C.purple, C.orange, C.teal3];
    for (let i = 0; i < 12; i++) {
      const x = 2 + ((i * 7) % 20);
      const y = 2 + ((i * 5) % 20);
      disc(p, x, y, 1.4, holds[i % holds.length]);
    }
  },

  // ------------------------------------------------------------------ pets
  fishbowl: (p, { on }) => {
    disc(p, 4, 4.5, 3.5, C.sky);
    p.rect(1, 1, 6, 1, C.paper);
    p.rect(2, 6, 4, 1, C.amber2);
    p.rect(on ? 4 : 2, 3, 2, 1, C.orange);
    p.px(on ? 6 : 1, 3, C.orange2);
    p.px(2, 2, C.white);
    p.rect(1, 7, 6, 1, S.w2);
  },
  bird_cage: (p) => {
    p.px(4, 0, S.m);
    disc(p, 4, 5, 3.5, S.m);
    disc(p, 4, 5, 2.6, C.paper);
    for (let x = 1; x < 8; x += 2) p.rect(x, 3, 1, 7, S.m);
    p.rect(1, 9, 7, 1, S.m);
    p.rect(3, 6, 2, 2, C.amber);
    p.px(5, 6, C.orange);
    p.px(3, 6, C.ink);
    p.rect(2, 8, 4, 1, S.w);
    p.rect(4, 10, 1, 12, S.m2);
    p.rect(1, 22, 7, 2, S.m2);
  },
  cat_tree: (p) => {
    p.rect(3, 4, 2, 27, C.cork);
    p.rect(11, 13, 2, 18, C.cork);
    p.rect(0, 3, 9, 2, S.a);
    p.rect(8, 12, 8, 2, S.a);
    p.rect(1, 20, 9, 2, S.a);
    p.rect(0, 30, 16, 2, S.a);
    p.rect(0, 3, 9, 1, S.a3);
    p.rect(8, 12, 8, 1, S.a3);
    // a sleepy cat on top and a toy ball
    p.rect(2, 0, 5, 3, C.metal2);
    p.px(2, 0, C.metal3);
    p.px(6, 0, C.metal3);
    p.px(3, 1, C.ink);
    p.px(5, 1, C.ink);
    p.rect(14, 14, 1, 3, C.ink3);
    disc(p, 14.5, 17.5, 1, C.red);
  },
  dog_bed: (p) => {
    p.rect(0, 2, 16, 6, S.a);
    p.rect(1, 1, 14, 1, S.a);
    p.rect(2, 3, 12, 3, S.a2);
    p.rect(0, 2, 16, 1, S.a3);
    p.rect(9, 3, 4, 1, C.paper);
    p.px(8, 3, C.paper);
    p.px(13, 2, C.paper);
  },
  bunny: (p) => {
    p.rect(4, 0, 1, 3, C.white);
    p.rect(6, 0, 1, 3, C.white);
    p.px(4, 1, C.pink);
    p.px(6, 1, C.pink);
    p.rect(3, 3, 5, 3, C.white);
    p.rect(0, 5, 7, 3, C.white);
    p.px(6, 4, C.ink);
    p.px(7, 5, C.pink);
    p.px(0, 5, C.paper);
    p.rect(1, 7, 2, 1, C.paper2);
  },
  parrot_perch: (p) => {
    p.rect(1, 6, 7, 1, C.walnut);
    p.rect(3, 0, 3, 3, C.red);
    p.px(6, 1, C.amber);
    p.px(4, 1, C.white);
    p.px(5, 1, C.ink);
    p.rect(2, 3, 4, 3, C.red);
    p.rect(2, 4, 2, 2, C.blue);
    p.px(1, 5, C.amber);
    p.rect(3, 7, 1, 2, C.red);
    p.rect(4, 7, 1, 15, C.walnut);
    p.rect(1, 22, 7, 2, C.walnut);
  },
  turtle_tank: (p) => {
    p.rect(0, 0, 16, 1, S.m);
    p.rect(0, 1, 16, 9, '#bfe3e6');
    p.rect(0, 7, 16, 3, C.amber2);
    disc(p, 11, 6.5, 1.8, C.metal3);
    p.rect(9, 5, 4, 2, C.leaf2);
    p.px(13, 5, C.leaf);
    p.px(10, 5, C.leaf3);
    p.rect(2, 4, 1, 3, C.leaf);
    p.rect(0, 10, 16, 1, S.m);
    p.rect(0, 11, 16, 5, S.w);
    p.rect(1, 12, 14, 3, S.w2);
  },
  hedgehog: (p) => {
    p.rect(1, 3, 6, 4, C.walnut3);
    for (let x = 1; x < 7; x += 2) p.px(x, 2, C.walnut3);
    p.rect(5, 5, 3, 2, '#d6b98c');
    p.px(7, 5, C.ink);
    p.px(6, 4, C.ink);
    p.rect(2, 7, 1, 1, '#d6b98c');
    p.rect(5, 7, 1, 1, '#d6b98c');
  },
  owl_perch: (p) => {
    p.rect(1, 1, 6, 6, '#8b6b4a');
    p.px(1, 0, '#8b6b4a');
    p.px(6, 0, '#8b6b4a');
    disc(p, 2.5, 3, 1.3, C.white);
    disc(p, 5.5, 3, 1.3, C.white);
    p.px(2, 3, C.ink);
    p.px(5, 3, C.ink);
    p.px(4, 4, C.amber);
    p.rect(2, 5, 4, 2, '#c9a77c');
    p.rect(0, 7, 8, 1, C.walnut);
    p.rect(3, 8, 2, 6, C.walnut);
    p.rect(1, 14, 6, 2, C.walnut);
  },
  ant_farm: (p) => {
    box(p, 0, 0, 8, 7, '#d6b98c', S.w2);
    for (const [x, y, w] of [[1, 2, 4], [4, 4, 3], [2, 5, 2]] as const) p.rect(x, y, w, 1, '#8b6b4a');
    p.rect(4, 2, 1, 3, '#8b6b4a');
    p.px(2, 2, C.ink);
    p.px(5, 4, C.ink);
    p.rect(0, 7, 8, 1, S.w2);
  },
  plush_bear: (p) => {
    disc(p, 1.5, 1.5, 1.2, S.w);
    disc(p, 6.5, 1.5, 1.2, S.w);
    disc(p, 4, 3.5, 2.6, S.w);
    p.px(3, 3, C.ink);
    p.px(5, 3, C.ink);
    p.rect(3, 4, 2, 1, S.w3);
    disc(p, 4, 6.5, 2, S.w);
    p.rect(3, 6, 2, 1, S.b);
  },
};
