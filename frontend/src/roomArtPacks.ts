// All MY ROOM art packs, merged into ROOM_ART (roomArt.ts). A pack is a
// themed roomArt<Pack>.ts file; add new ones here. Six (HOMELAB, MAKER
// BENCH, SPACE FAN, OLD LIBRARY, OUTDOOR GEAR, STREET FINDS) prefix their
// ids: dc_, hw_, orb_, intel_, camp_, cyber_. The second wave, drawn from a
// lived-in one-room flat, is BEDROOM, STUDY DESK, KITCHENETTE, LOUNGE,
// SHELVES, GADGETS, LAMPS, WALL DECOR, HOBBIES, GREEN, SURFACES and DOORS.
import type { Art } from './roomPaint';
import { ACTIVE_ART } from './roomArtActive';
import { ARCHIVE_ART } from './roomArtArchive';
import { BASECAMP_ART } from './roomArtBasecamp';
import { BEDROOM_ART } from './roomArtBedroom';
import { CYBER_STREET_ART } from './roomArtCyberStreet';
import { DATA_CENTER_ART } from './roomArtDataCenter';
import { DOORS_ART } from './roomArtDoors';
import { KITCHEN_ART } from './roomArtKitchen';
import { KITCHENETTE_ART } from './roomArtKitchenette';
import { LAMPS_ART } from './roomArtLamps';
import { LIGHT_ART } from './roomArtLight';
import { LIVED_ART } from './roomArtLived';
import { MUSIC_ART } from './roomArtMusic';
import { ORBITAL_ART } from './roomArtOrbital';
import { EXTRAS_ART } from './roomArtExtras';
import { HARDWARE_LAB_ART } from './roomArtHardwareLab';
import { GREEN_ART } from './roomArtGreen';
import { HOBBY_ART } from './roomArtHobby';
import { HOME_ART } from './roomArtHome';
import { FEST_ART } from './roomArtFest';
import { GADGETS_ART } from './roomArtGadgets';
import { JAPAN_ART } from './roomArtJapan';
import { LIVING_ART } from './roomArtLiving';
import { LOUNGE_ART } from './roomArtLounge';
import { PLANTS_ART } from './roomArtPlants';
import { SHELVES_ART } from './roomArtShelves';
import { STUDY_ART } from './roomArtStudy';
import { SURFACES_ART } from './roomArtSurfaces';
import { STUDY_DESK_ART } from './roomArtStudyDesk';
import { TECH_ART } from './roomArtTech';
import { WALL_ART } from './roomArtWall';
import { WALL_DECOR_ART } from './roomArtWallDecor';

export const PACK_ART: Record<string, Art> = {
  ...KITCHEN_ART,
  ...STUDY_ART,
  ...PLANTS_ART,
  ...JAPAN_ART,
  ...MUSIC_ART,
  ...TECH_ART,
  ...ACTIVE_ART,
  ...LIGHT_ART,
  ...LIVED_ART,
  ...BEDROOM_ART,
  ...STUDY_DESK_ART,
  ...KITCHENETTE_ART,
  ...LOUNGE_ART,
  ...SHELVES_ART,
  ...GADGETS_ART,
  ...LAMPS_ART,
  ...WALL_DECOR_ART,
  ...HOBBY_ART,
  ...GREEN_ART,
  ...SURFACES_ART,
  ...DOORS_ART,
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
