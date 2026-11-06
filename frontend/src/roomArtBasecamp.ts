// MY ROOM art pack: OUTDOOR GEAR, brought home: a backpack, a folding
// chair and table, a trail map on the wall. Recolourable parts use the S
// slots (roomPaint.ts): b = canvas / fabric, a = gear accent, w = wood,
// m = metal.
import { box, C, hash, S, type Art } from './roomPaint';

export const BASECAMP_ART: Record<string, Art> = {
  camp_folding_chair: (p) => {
    p.rect(0, 1, 1, 15, S.m2);
    p.rect(7, 1, 1, 15, S.m2);
    p.rect(1, 1, 6, 6, S.b);
    p.rect(1, 1, 6, 1, S.b3);
    p.rect(0, 8, 8, 3, S.b);
    p.rect(1, 11, 1, 1, S.m2);
    for (let i = 0; i < 5; i++) {
      p.px(1 + i, 11 + i, S.m);
      p.px(6 - i, 11 + i, S.m);
    }
  },
  camp_backpack: (p) => {
    p.rect(1, 1, 6, 13, S.b);
    p.rect(1, 1, 6, 2, S.b2);
    p.rect(2, 7, 4, 5, S.b2);
    p.rect(3, 9, 2, 1, S.m);
    p.rect(0, 14, 8, 2, S.a);
    p.rect(1, 13, 6, 1, S.a2);
    p.px(7, 4, S.m);
  },
  camp_trail_map: (p) => {
    box(p, 0, 0, 16, 14, S.w, S.w2);
    p.rect(1, 1, 14, 12, '#d9cba3');
    for (let y = 2; y < 12; y++) for (let x = 2; x < 14; x++) if (hash(x, y) > 0.8) p.px(x, y, '#8fa98b');
    for (let i = 0; i < 12; i++) p.px(2 + i, 10 - Math.round(Math.sin(i / 2) * 2 + i * 0.5), C.red);
    p.px(13, 3, C.red2);
    p.rect(7, 14, 2, 2, S.w2);
  },
  camp_folding_table: (p, { on, night }) => {
    const lit = on || night;
    // little stove with a kettle
    p.rect(3, 0, 4, 3, S.m);
    p.rect(4, 3, 2, 1, S.m2);
    p.rect(2, 4, 6, 1, S.m2);
    if (lit) p.rect(3, 3, 4, 1, C.blue);
    p.rect(10, 2, 3, 3, S.a);
    p.rect(0, 5, 16, 1, S.w3);
    p.rect(0, 6, 16, 1, S.w2);
    p.px(1, 7, S.m2);
    p.px(14, 7, S.m2);
  },
};
