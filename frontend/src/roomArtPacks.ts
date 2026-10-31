// All MY ROOM art packs, merged into ROOM_ART (roomArt.ts). A pack is a
// themed roomArt<Pack>.ts file; add new ones here.
import type { Art } from './roomPaint';
import { ACTIVE_ART } from './roomArtActive';
import { KITCHEN_ART } from './roomArtKitchen';
import { LIGHT_ART } from './roomArtLight';
import { MUSIC_ART } from './roomArtMusic';
import { EXTRAS_ART } from './roomArtExtras';
import { HOME_ART } from './roomArtHome';
import { JAPAN_ART } from './roomArtJapan';
import { PLANTS_ART } from './roomArtPlants';
import { STUDY_ART } from './roomArtStudy';
import { TECH_ART } from './roomArtTech';
import { WALL_ART } from './roomArtWall';

export const PACK_ART: Record<string, Art> = {
  ...KITCHEN_ART,
  ...STUDY_ART,
  ...PLANTS_ART,
  ...JAPAN_ART,
  ...MUSIC_ART,
  ...TECH_ART,
  ...ACTIVE_ART,
  ...LIGHT_ART,
  ...WALL_ART,
  ...HOME_ART,
  ...EXTRAS_ART,
};
