// MY ROOM art pack: music. Recolourable parts use the S slots
// (roomPaint.ts) so catalog variants can swap them.
import { box, C, disc, S, type Art } from './roomPaint';

export const MUSIC_ART: Record<string, Art> = {
  drum_kit: (p) => {
    // cymbals
    p.rect(1, 3, 7, 1, C.amber2);
    p.rect(4, 4, 1, 15, C.metal3);
    p.rect(24, 1, 7, 1, C.amber2);
    p.rect(27, 2, 1, 17, C.metal3);
    // toms
    box(p, 9, 6, 6, 4, S.a, S.a2);
    box(p, 17, 6, 6, 4, S.a, S.a2);
    p.rect(9, 6, 6, 1, C.white);
    p.rect(17, 6, 6, 1, C.white);
    // bass drum
    disc(p, 16, 16.5, 7, S.a2);
    disc(p, 16, 16.5, 5.6, C.white);
    disc(p, 16, 16.5, 2.5, S.a);
    p.rect(9, 13, 1, 8, S.a);
    // snare and floor tom
    box(p, 3, 13, 6, 3, C.metal, C.metal3);
    box(p, 24, 12, 6, 8, S.a, S.a2);
    p.rect(24, 12, 6, 1, C.white);
    p.rect(4, 16, 1, 7, C.metal3);
    p.rect(2, 23, 5, 1, C.metal3);
    p.rect(24, 20, 1, 4, C.metal3);
    p.rect(29, 20, 1, 4, C.metal3);
  },
  synth_stand: (p, { on }) => {
    p.rect(0, 2, 24, 4, S.m2);
    p.rect(1, 3, 6, 2, C.ink);
    if (on) p.rect(2, 3, 3, 1, C.leaf3);
    for (let x = 9; x < 22; x += 2) p.px(x, 3, x % 4 ? S.a : C.white);
    p.rect(0, 6, 24, 3, C.white);
    for (let x = 1; x < 24; x += 3) p.rect(x, 6, 1, 2, C.ink);
    p.rect(0, 9, 24, 1, S.m);
    // X stand
    for (let i = 0; i < 6; i++) {
      p.px(6 + i, 10 + i, C.ink2);
      p.px(17 - i, 10 + i, C.ink2);
    }
  },
  guitar_amp: (p, { on }) => {
    box(p, 0, 0, 16, 16, S.a, S.a2);
    p.rect(1, 1, 14, 3, S.a3);
    for (let x = 3; x < 14; x += 2) p.px(x, 2, C.ink);
    p.px(13, 2, on ? C.red : C.ink3);
    p.rect(1, 5, 14, 10, C.ink2);
    for (let y = 6; y < 15; y += 2) for (let x = 2; x < 15; x += 2) p.px(x, y, C.ink3);
    p.rect(6, 0, 4, 1, C.ink);
  },
  cello: (p) => {
    p.rect(3, 0, 2, 2, C.walnut);
    p.rect(3, 2, 1, 9, C.ink);
    disc(p, 4, 15, 3.4, S.w);
    disc(p, 4, 22, 3.8, S.w);
    p.rect(1, 15, 6, 7, S.w);
    p.rect(1, 17, 1, 2, S.w2);
    p.rect(6, 17, 1, 2, S.w2);
    p.rect(3, 13, 2, 12, C.ink);
    p.px(2, 19, C.ink);
    p.px(5, 19, C.ink);
    p.rect(2, 24, 4, 1, C.ink2);
    p.rect(4, 26, 1, 6, C.metal3);
  },
  violin_wall: (p) => {
    p.rect(3, 0, 2, 1, C.ink2);
    p.rect(3, 1, 1, 5, C.ink);
    disc(p, 3.5, 8, 2.4, S.w);
    disc(p, 3.5, 12.5, 2.8, S.w);
    p.rect(3, 7, 1, 8, C.ink);
    p.px(2, 10, C.ink);
    p.px(5, 10, C.ink);
    p.rect(6, 2, 1, 13, C.paper2);
  },
  bookshelf_speakers: (p, { on }) => {
    for (const x of [0, 5]) {
      box(p, x, 4, 3, 7, S.a, S.a2);
      disc(p, x + 1.5, 6, 0.9, C.ink);
      disc(p, x + 1.5, 9, 1.2, on ? C.ink3 : C.ink);
      p.rect(x + 1, 11, 1, 5, C.ink2);
      p.rect(x, 15, 3, 1, C.ink2);
    }
  },
  boombox: (p, { on }) => {
    p.rect(3, 0, 10, 1, C.metal3);
    p.rect(3, 0, 1, 2, C.metal3);
    p.rect(12, 0, 1, 2, C.metal3);
    box(p, 0, 2, 16, 6, S.a, S.a2);
    disc(p, 3, 5, 2, C.ink);
    disc(p, 13, 5, 2, C.ink);
    disc(p, 3, 5, 0.8, C.metal);
    disc(p, 13, 5, 0.8, C.metal);
    p.rect(6, 3, 4, 3, C.ink2);
    if (on) p.rect(7, 4, 2, 1, C.leaf3);
    p.rect(6, 7, 4, 1, C.metal);
  },
  mic_stand: (p) => {
    disc(p, 4, 2, 1.8, C.metal2);
    p.px(3, 1, C.metal);
    p.rect(4, 4, 1, 3, C.ink2);
    p.rect(3, 6, 1, 15, C.ink2);
    p.px(4, 9, C.ink);
    p.rect(1, 21, 6, 1, C.ink2);
    p.px(0, 22, C.ink2);
    p.px(3, 22, C.ink2);
    p.px(7, 22, C.ink2);
    p.rect(4, 12, 1, 6, C.red);
  },
  dj_deck: (p, { on }) => {
    p.rect(0, 2, 24, 4, S.m2);
    disc(p, 5, 3.5, 3.2, C.ink);
    disc(p, 19, 3.5, 3.2, C.ink);
    disc(p, 5, 3.5, 1, on ? C.pink : C.ink3);
    disc(p, 19, 3.5, 1, on ? C.sky : C.ink3);
    for (let x = 10; x < 15; x += 2) p.rect(x, 2, 1, 3, C.metal);
    p.rect(0, 6, 24, 2, S.m);
    p.rect(1, 8, 22, 6, S.m2);
    for (let x = 3; x < 22; x += 4) p.rect(x, 10, 2, 2, on ? C.indigo : C.ink2);
    p.rect(1, 14, 2, 2, C.ink2);
    p.rect(21, 14, 2, 2, C.ink2);
  },
  cassette_wall: (p) => {
    p.rect(0, 0, 16, 16, S.w2);
    const tapes = [C.red, C.amber, C.sky, C.pink, C.leaf3, C.white, C.orange, C.indigo, C.metal];
    for (let i = 0; i < 9; i++) {
      const x = 1 + (i % 3) * 5;
      const y = 1 + Math.floor(i / 3) * 5;
      p.rect(x, y, 4, 4, tapes[i]);
      p.rect(x + 1, y + 1, 2, 1, C.ink2);
      p.rect(x, y + 3, 4, 1, C.ink3);
    }
  },
  vinyl_crate: (p) => {
    const sleeves = [C.red, C.white, C.amber, C.ink2, C.sky, C.pink];
    sleeves.forEach((c, i) => p.rect(1 + i * 2.3, 0 + (i % 2), 2, 4, c));
    box(p, 0, 3, 16, 5, S.w, S.w2);
    p.rect(3, 4, 10, 1, S.w2);
  },
  headphone_stand: (p) => {
    p.rect(1, 0, 6, 1, S.a);
    p.rect(1, 0, 1, 4, S.a);
    p.rect(6, 0, 1, 4, S.a);
    p.rect(0, 3, 2, 3, S.a2);
    p.rect(6, 3, 2, 3, S.a2);
    p.rect(3, 1, 2, 6, C.ink2);
    p.rect(2, 7, 4, 1, C.ink2);
  },
  bass_guitar: (p) => {
    p.rect(3, 0, 2, 3, C.ink);
    p.rect(3, 3, 1, 10, S.w2);
    p.rect(1, 13, 6, 6, S.a);
    p.rect(2, 12, 4, 1, S.a);
    p.rect(0, 15, 8, 3, S.a);
    p.rect(1, 15, 6, 1, S.a3);
    p.rect(3, 13, 2, 1, C.white);
    p.rect(3, 16, 2, 1, C.ink2);
    p.rect(1, 19, 6, 1, C.ink2);
    p.rect(1, 20, 1, 4, C.ink2);
    p.rect(6, 20, 1, 4, C.ink2);
  },
  jukebox: (p, { on, night }) => {
    const lit = on || night;
    disc(p, 8, 7, 7.5, S.b);
    p.rect(0, 7, 16, 25, S.b);
    disc(p, 8, 7.5, 5.5, lit ? C.glow : S.b3);
    p.rect(2, 7, 12, 1, S.b2);
    for (let x = 3; x < 14; x += 2) p.rect(x, 9, 1, 6, lit ? C.amber : S.b3);
    box(p, 3, 16, 10, 5, C.white, C.ink3);
    p.rect(4, 17, 8, 1, C.paper2);
    p.rect(4, 19, 6, 1, C.paper2);
    p.rect(2, 22, 12, 8, C.ink2);
    for (let x = 3; x < 13; x += 2) p.rect(x, 23, 1, 6, lit ? C.pink : C.ink3);
    p.rect(0, 30, 16, 2, S.b2);
  },
  metronome: (p) => {
    p.rect(3, 0, 2, 1, S.w2);
    p.rect(2, 1, 4, 3, S.w);
    p.rect(1, 4, 6, 3, S.w);
    p.rect(0, 7, 8, 1, S.w2);
    p.rect(3, 2, 2, 4, C.paper);
    p.px(4, 1, C.metal);
    p.px(4, 2, C.ink);
    p.px(3, 3, C.ink);
  },
  gramophone: (p) => {
    // horn
    for (let i = 0; i < 8; i++) p.rect(8 + i, 7 - i, 2 + Math.floor(i / 2), 2 + i, S.m);
    p.rect(14, 0, 2, 8, S.m3);
    p.rect(7, 7, 3, 3, S.m2);
    p.rect(1, 8, 10, 1, C.ink);
    p.rect(0, 9, 13, 7, S.w);
    p.rect(1, 10, 11, 5, S.w2);
    p.rect(2, 11, 9, 3, S.w);
  },
  harp: (p) => {
    p.rect(1, 2, 2, 28, S.w);
    p.rect(1, 2, 2, 1, S.w2);
    for (let x = 3; x < 15; x++) p.px(x, 2 + Math.round(Math.sin((x - 3) / 4) * 2), S.w);
    p.rect(13, 3, 2, 26, S.w2);
    p.rect(3, 4, 1, 1, C.amber2);
    for (let x = 4; x < 13; x++) p.rect(x, 4 + Math.round(Math.sin((x - 3) / 4) * 2), 1, 25 - (x - 4), x % 3 ? C.paper2 : C.red);
    p.rect(0, 29, 16, 3, S.w2);
  },
};
