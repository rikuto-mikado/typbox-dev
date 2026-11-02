// All MY ROOM art packs, merged into ROOM_ART (roomArt.ts). A pack is a
// themed roomArt<Pack>.ts file; add new ones here. The last six (DATA
// CENTER VAULT … CYBER STREET) prefix their ids by pack: dc_, hw_, orb_,
// intel_, camp_, cyber_.
import type { Art } from './roomPaint';
import { ACTIVE_ART } from './roomArtActive';
import { ARCHIVE_ART } from './roomArtArchive';
import { BASECAMP_ART } from './roomArtBasecamp';
import { CYBER_STREET_ART } from './roomArtCyberStreet';
import { DATA_CENTER_ART } from './roomArtDataCenter';
import { KITCHEN_ART } from './roomArtKitchen';
import { LIGHT_ART } from './roomArtLight';
import { MUSIC_ART } from './roomArtMusic';
import { ORBITAL_ART } from './roomArtOrbital';
import { EXTRAS_ART } from './roomArtExtras';
import { HARDWARE_LAB_ART } from './roomArtHardwareLab';
import { HOME_ART } from './roomArtHome';
import { FEST_ART } from './roomArtFest';
import { JAPAN_ART } from './roomArtJapan';
import { LIVING_ART } from './roomArtLiving';
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
  ...DATA_CENTER_ART,
  ...HARDWARE_LAB_ART,
  ...ORBITAL_ART,
  ...ARCHIVE_ART,
  ...BASECAMP_ART,
  ...CYBER_STREET_ART,
  ...LIVING_ART,
  ...FEST_ART,
};
