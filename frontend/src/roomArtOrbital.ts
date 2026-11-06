// MY ROOM art pack: SPACE FAN: a levitating plant and a rover model for the
// shelf. Recolourable parts use the S slots (roomPaint.ts): m = metal,
// a = accent, b = fabric.
import { box, C, disc, S, type Art } from './roomPaint';

export const ORBITAL_ART: Record<string, Art> = {
  orb_floating_plant: (p) => {
    disc(p, 4, 5, 3.4, '#cbd5e1');
    disc(p, 4, 5, 2.6, '#e0f2fe');
    p.rect(3, 4, 3, 3, C.leaf2);
    p.px(3, 3, C.leaf3);
    p.px(5, 3, C.leaf3);
    p.px(4, 2, C.leaf);
    p.px(2, 4, C.white);
  },
  orb_rover_model: (p) => {
    box(p, 3, 1, 10, 3, S.a, S.a2);
    p.rect(7, 0, 1, 1, S.m3);
    p.rect(2, 4, 12, 1, S.m2);
    for (const x of [3, 7, 11]) disc(p, x + 0.5, 6, 1.6, C.ink2);
  },
};
