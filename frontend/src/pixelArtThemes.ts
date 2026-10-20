// 200 new pixel-art Surface Themes, gated by the normal Clearance Level
// system (clearanceHintLv / divisionCode) rather than EXPLORE MAP clears —
// distinct from surfaceScenes.ts's 100 map-clear reward themes, which stay
// `requiredMapClear`-gated. Two batches, built from the same renderer
// (surfaceSceneArt.tsx) via the same "parameter table through a shared
// builder" strategy telemetryFeatures.tsx uses for its 240 generated pairs:
//
//   A) 100 themes inspired by the 16 EXPLORE MAP archetypes (cyberpunk
//      alley, medieval fortress, snowy summit, deep sea, space dock,
//      wasteland, etc.) — same visual family as the maps, new palette/seed
//      combinations, freely unlockable via clearance level.
//   B) 100 completely original themes built from 10 archetypes EXPLORE MAP
//      never uses (lake reflection, terraced farmland, floating islands,
//      crystal cave, windmill farm, carnival pier, subway station,
//      botanical dome, tundra outpost, shrine garden), so this batch reads
//      as genuinely new rather than "the same maps again".
import type { SceneSilhouette, SceneSpec } from './surfaceSceneArt';
import type { SurfaceThemePair } from './telemetryFeatures';

function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Same split-hue-by-polarity approach as surfaceScenes.ts's buildScenePalette
// (dark surfaces tinted by the night hue, light surfaces by the day hue) —
// duplicated locally rather than imported/exported to avoid coupling this
// file's palette tuning to the map-reward themes' tuning.
function buildPixelPalette(hueDay: number, hueNight: number) {
  return {
    dark: {
      bgMain: hsl(hueNight, 28, 10),
      bgCard: hsl(hueNight, 26, 14.5),
      bgInput: hsl(hueNight, 28, 7),
      border: hsl(hueNight, 30, 23),
      textMain: hsl(hueNight, 12, 95),
      textMuted: hsl(hueNight, 12, 63),
      patternTint: `hsla(${hueNight}, 65%, 68%, 0.06)`,
      glowTint: `hsla(${hueNight}, 65%, 58%, 0.12)`,
    },
    light: {
      bgMain: hsl(hueDay, 36, 96.5),
      bgCard: '#ffffff',
      bgInput: hsl(hueDay, 30, 92.5),
      border: hsl(hueDay, 28, 83),
      textMain: hsl(hueDay, 26, 11),
      textMuted: hsl(hueDay, 13, 43),
      patternTint: `hsla(${hueDay}, 55%, 30%, 0.05)`,
      glowTint: `hsla(${hueDay}, 65%, 55%, 0.08)`,
    },
  };
}

interface ArchetypeFlavor {
  hueBase: number;
  pairLabel: string;
  description: string;
  names: string[];
}

const FLAVOR: Record<SceneSilhouette, ArchetypeFlavor> = {
  'cyberpunk-alley': {
    hueBase: 282,
    pairLabel: 'MIDNIGHT ALLEY ⇄ OVERCAST BLOCK',
    description: 'A rain-slick back-alley strung with flickering neon signage.',
    names: ['MIDNIGHT CUT', 'STATIC ROW', 'CHROME UNDERPASS', 'SIGNAL DRIFT', 'GHOST CIRCUIT', 'LOW VOLTAGE', 'BACKLOT GLOW', 'WIRE HOLLOW'],
  },
  'medieval-castle': {
    hueBase: 30,
    pairLabel: 'SIEGE NIGHT ⇄ BANNER NOON',
    description: 'A stone keep and its flanking towers, standing watch through every season.',
    names: ['OATHKEEP', 'IRON RAMPART', 'GREYSTONE HOLD', 'WARDEN’S TOWER', 'SIEGE WALL', 'BANNER COURT', 'OLD GARRISON', 'STONE BASTION'],
  },
  'pixel-village': {
    hueBase: 95,
    pairLabel: 'LANTERN DUSK ⇄ HARVEST NOON',
    description: 'Thatched cottages and chimney smoke along a quiet country lane.',
    names: ['MILL ROW', 'ORCHARD LANE', 'COTTAGE ROAD', 'HEARTH VALE', 'HAY MEADOW', 'WINDFALL PATH', 'BARLEY ROW', 'QUIET COMMONS'],
  },
  'seaside-pier': {
    hueBase: 24,
    pairLabel: 'LANTERN TIDE ⇄ DAYBREAK SHORE',
    description: 'A quiet pier catching the very first light over calm water.',
    names: ['TIDE PIER', 'AMBER HARBOR', 'DAYBREAK COVE', 'GULL POINT', 'DRIFTWOOD QUAY', 'SALT ROW', 'LOW TIDE WALK', 'FAR SHORE'],
  },
  'harbor-cranes': {
    hueBase: 205,
    pairLabel: 'DRYDOCK NIGHT ⇄ FREIGHT NOON',
    description: 'Gantry cranes and stacked containers along a working waterfront.',
    names: ['DRYDOCK', 'CONTAINER ROW', 'GANTRY WHARF', 'FREIGHT BASIN', 'IRON QUAY', 'LOADING BERTH', 'TIDEWATER YARD', 'RUSTED CRANE'],
  },
  'forest-treeline': {
    hueBase: 140,
    pairLabel: 'FIREFLY NIGHT ⇄ CANOPY NOON',
    description: 'Layered treelines fading into quiet, undisturbed depth.',
    names: ['MOSSHOLLOW', 'FERN REACH', 'DEEP CANOPY', 'QUIET GROVE', 'SILVERWOOD', 'ECHO GLEN', 'ROOTBOUND PATH', 'EVERGREEN REST'],
  },
  'desert-dunes-pyramid': {
    hueBase: 42,
    pairLabel: 'COLD SAND ⇄ MIRAGE NOON',
    description: 'Buried monuments half-swallowed by drifting sand.',
    names: ['DUNE CROSS', 'GOLDEN WASTE', 'BURIED SPIRE', 'FAR DUNES', 'MIRAGE RIDGE', 'SANDFALL', 'SUN-BAKED FLAT', 'ASH PLAIN'],
  },
  'mountain-range': {
    hueBase: 165,
    pairLabel: 'STARLIT RIDGE ⇄ CLOUD NOON',
    description: 'Layered granite ridgelines rising above a quiet treeline.',
    names: ['SUMMIT WARD', 'CLOUD RIDGE', 'STONE CREST', 'HIGH TRAVERSE', 'GRANITE SPINE', 'TIMBERLINE', 'WINDSWEPT COL', 'FARSIGHT PEAK'],
  },
  'snowy-peaks': {
    hueBase: 200,
    pairLabel: 'POLAR NIGHT ⇄ GLACIER NOON',
    description: 'Wind-scoured snow peaks where the drifts never fully melt.',
    names: ['HIGH PASS', 'GLACIER STEP', 'ICEFIELD', 'PEAK’S EDGE', 'FROSTLINE', 'WHITEOUT RIDGE', 'SNOWBOUND COL', 'CRYSTAL DRIFT'],
  },
  'temple-pagoda': {
    hueBase: 355,
    pairLabel: 'LANTERN VIGIL ⇄ INCENSE NOON',
    description: 'A tiered pagoda and its stone steps, wrapped in drifting incense smoke.',
    names: ['SHRINE TERRACE', 'LANTERN STEPS', 'OLD PAGODA', 'MONASTERY ROW', 'JADE COURT', 'SACRED EAVES', 'INCENSE GATE', 'STONE SHRINE'],
  },
  'space-dock': {
    hueBase: 250,
    pairLabel: 'DEEP VOID ⇄ STATION DAY-CYCLE',
    description: 'A half-built orbital dock, assembled one truss segment at a time.',
    names: ['DOCK ALPHA', 'TRUSS BAY', 'HANGAR RING', 'OUTER BERTH', 'RELAY NODE', 'MODULE ROW', 'BERTH SEVEN', 'STATION EDGE'],
  },
  'lake-reflection': {
    hueBase: 188,
    pairLabel: 'MIRROR NIGHT ⇄ GLASS NOON',
    description: 'A still mountain lake holding a perfect, silent reflection.',
    names: ['GLASS LAKE', 'MIRROR COVE', 'STILLWATER', 'QUIET BASIN', 'REFLECTION POINT', 'CALM SHALLOWS', 'SILENT SHORE', 'DOUBLE SKY', 'MIRROR SHALLOWS', 'UNBROKEN SURFACE'],
  },
  'lighthouse-coast': {
    hueBase: 198,
    pairLabel: 'FOGBOUND NIGHT ⇄ CLEAR NOON',
    description: 'A striped lighthouse sweeping its beam through coastal fog.',
    names: ['FOG POINT', 'SIGNAL CLIFF', 'TIDEWATCH', 'LANTERN HEAD', 'BREAKWATER', 'GULL CLIFF', 'ROCKY HEADLAND', 'BEACON ROW'],
  },
  'terraced-farmland': {
    hueBase: 108,
    pairLabel: 'TERRACE DUSK ⇄ PADDY NOON',
    description: 'Stepped rice terraces climbing a quiet hillside.',
    names: ['SACRED PADDY', 'TERRACE ROW', 'HILLSIDE PLOT', 'GOLDEN STEP', 'MONSOON SLOPE', 'HARVEST TERRACE', 'STEPWELL RIDGE', 'PADDY FIELD', 'RIDGELINE PLOT', 'SUNLIT TERRACE'],
  },
  cityscape: {
    hueBase: 212,
    pairLabel: 'SKYLINE NIGHT ⇄ DOWNTOWN NOON',
    description: 'A dense downtown skyline, counted one rooftop light at a time.',
    names: ['DOWNTOWN CORE', 'FINANCIAL ROW', 'MIDTOWN BLOCK', 'SKYLINE EDGE', 'ROOFTOP DISTRICT', 'GLASS CANYON', 'TOWER ROW', 'CENTRAL BLOCK'],
  },
  'deep-sea': {
    hueBase: 192,
    pairLabel: 'ABYSSAL NIGHT ⇄ SUNLIT SHALLOWS',
    description: 'A sunken ruin far below the surface, lit only by bioluminescent drift.',
    names: ['DROWNED SPIRE', 'DEEP VENT', 'SILT BASIN', 'LANTERNFISH REACH', 'REEF HOLLOW', 'TRENCH FLOOR', 'SUNKEN COURT', 'ABYSSAL SHELF'],
  },
  wasteland: {
    hueBase: 35,
    pairLabel: 'IRRADIATED NIGHT ⇄ ASHEN NOON',
    description: 'Cracked earth and dead timber under a permanent haze.',
    names: ['ASH FLAT', 'SCRAP ROW', 'DEAD TIMBER', 'CINDER REACH', 'BLASTED PLAIN', 'RUSTBELT', 'HOLLOW CROSSING', 'GREY EXPANSE'],
  },
  'volcano': {
    hueBase: 8,
    pairLabel: 'MAGMA GLOW ⇄ ASHFALL NOON',
    description: 'A smoking volcanic cone, its slopes veined with glowing rock.',
    names: ['CINDER RIM', 'MAGMA VENT', 'ASHFALL RIDGE', 'CALDERA EDGE', 'OBSIDIAN SLOPE', 'SULFUR VENT', 'EMBER FIELD', 'SCORCHED RIM'],
  },
  'floating-islands': {
    hueBase: 198,
    pairLabel: 'MOONLIT DRIFT ⇄ SKYBOUND NOON',
    description: 'Fragments of land drifting free, linked by waterfalls and rope bridges.',
    names: ['SKYBOUND SHELF', 'CLOUD ANCHOR', 'DRIFTING ISLE', 'WATERFALL EDGE', 'SUSPENDED GROVE', 'HOVERING REACH', 'TETHERED ROCK', 'FLOATING REST', 'AERIAL TERRACE', 'WEIGHTLESS ISLE'],
  },
  'crystal-cave': {
    hueBase: 262,
    pairLabel: 'PRISM GLOW ⇄ QUARTZ DAWN',
    description: 'An underground cavern lit entirely by glowing crystal clusters.',
    names: ['GEODE HOLLOW', 'PRISM VAULT', 'QUARTZ DEEP', 'LUMEN GROTTO', 'CRYSTAL BASIN', 'GLIMMER CAVE', 'AMETHYST HOLD', 'RADIANT HOLLOW', 'GEMLIGHT DEEP', 'HOLLOW REFRACTION'],
  },
  'windmill-farm': {
    hueBase: 88,
    pairLabel: 'STILL NIGHT ⇄ BREEZY NOON',
    description: 'Rolling farmland dotted with slow-turning windmills.',
    names: ['MILL HILL', 'WINDWARD FIELD', 'GRAIN RIDGE', 'BREEZY SLOPE', 'TURNING VANE', 'PASTURE MILL', 'HIGH WINDROW', 'FIELDSTONE MILL', 'VANE RIDGE', 'OPEN PASTURE'],
  },
  'carnival-pier': {
    hueBase: 330,
    pairLabel: 'STRING-LIGHT NIGHT ⇄ BOARDWALK NOON',
    description: 'A boardwalk ferris wheel strung with string lights over the water.',
    names: ['BOARDWALK PIER', 'FERRIS POINT', 'CAROUSEL ROW', 'MIDWAY LIGHTS', 'TICKET BOOTH', 'ARCADE PIER', 'SEASIDE FAIR', 'NIGHT MARKET', 'PROMENADE LIGHTS', 'FAIRGROUND PIER'],
  },
  'subway-station': {
    hueBase: 206,
    pairLabel: 'PLATFORM GLOW ⇄ TRANSIT HOUR',
    description: 'An underground platform lit by flickering signage and an arriving train.',
    names: ['PLATFORM NINE', 'TRANSIT HUB', 'UNDERLINE STOP', 'TILEWORK STATION', 'LOWER CONCOURSE', 'EXPRESS PLATFORM', 'SIGNAL JUNCTION', 'TUNNEL TERMINUS', 'DEEP CONCOURSE', 'LAST TRAIN STOP'],
  },
  'botanical-dome': {
    hueBase: 132,
    pairLabel: 'GROW-LAMP NIGHT ⇄ GREENHOUSE NOON',
    description: 'A glass conservatory dome sheltering exotic, overgrown plant life.',
    names: ['GLASS CONSERVATORY', 'FERN DOME', 'HOTHOUSE ATRIUM', 'ORCHID GALLERY', 'CANOPY DOME', 'GREENHOUSE HALL', 'BOTANIC VAULT', 'TROPIC ENCLOSURE', 'VERDANT ATRIUM', 'GLASSHOUSE CANOPY'],
  },
  'tundra-outpost': {
    hueBase: 196,
    pairLabel: 'AURORA NIGHT ⇄ PALE NOON',
    description: 'A research outpost on the ice, watched over by drifting aurora.',
    names: ['FROSTBOUND STATION', 'AURORA FIELD', 'ICE OUTPOST', 'POLAR RELAY', 'WHITEOUT CAMP', 'TUNDRA WATCH', 'PERMAFROST BASE', 'NORTHERN REACH', 'GLACIAL RELAY', 'FAR NORTH CAMP'],
  },
  'shrine-garden': {
    hueBase: 150,
    pairLabel: 'LANTERN STILLNESS ⇄ KOI POND NOON',
    description: 'A raked zen garden with a stone lantern and a quiet koi pond.',
    names: ['KOI GARDEN', 'STONE LANTERN', 'RAKED COURT', 'TORII PATH', 'MAPLE COURTYARD', 'QUIET SHRINE', 'MOSS GARDEN', 'REFLECTION POND', 'ZEN COURTYARD', 'LANTERN PATH'],
  },
};

const MAP_ARCHETYPES: SceneSilhouette[] = [
  'cyberpunk-alley', 'medieval-castle', 'snowy-peaks', 'deep-sea', 'space-dock', 'wasteland',
  'cityscape', 'pixel-village', 'seaside-pier', 'harbor-cranes', 'forest-treeline',
  'desert-dunes-pyramid', 'mountain-range', 'temple-pagoda', 'lighthouse-coast', 'volcano',
];

const ORIGINAL_ARCHETYPES: SceneSilhouette[] = [
  'lake-reflection', 'terraced-farmland', 'floating-islands', 'crystal-cave', 'windmill-farm',
  'carnival-pier', 'subway-station', 'botanical-dome', 'tundra-outpost', 'shrine-garden',
];

function buildBatch(archetypes: SceneSilhouette[], count: number, idOffset: number, seedBase: number): SurfaceThemePair[] {
  const perArchetypeUsage: Record<string, number> = {};
  const pairs: SurfaceThemePair[] = [];

  for (let i = 0; i < count; i++) {
    const archetype = archetypes[i % archetypes.length];
    const flavor = FLAVOR[archetype];
    const usage = perArchetypeUsage[archetype] ?? 0;
    perArchetypeUsage[archetype] = usage + 1;
    const name = flavor.names[usage % flavor.names.length];

    const globalIndex = idOffset + i; // 0-based across the full 200
    const num = globalIndex + 1;
    const seed = seedBase + i * 41;
    const hueDay = flavor.hueBase + (((i * 17) % 30) - 15);
    const hueNight = 200 + (seed % 50);
    const scene: SceneSpec = { silhouette: archetype, seed, hueDay, hueNight };
    const pal = buildPixelPalette(hueDay, hueNight);
    const divisionIndex = (globalIndex % 10) + 1;
    const [darkLabel, lightLabel] = flavor.pairLabel.split(' ⇄ ');

    pairs.push({
      id: `pixelart-${String(num).padStart(3, '0')}`,
      code: `PXL-${String(num).padStart(3, '0')}`,
      name,
      pairLabel: flavor.pairLabel,
      description: flavor.description,
      pattern: 'none',
      accentHex: hsl(hueDay, 70, 55),
      divisionCode: `DIV-${String(divisionIndex).padStart(2, '0')}`,
      // Placeholder — rebalanceThemeClearanceLevels() assigns the real level,
      // same as every other generated-expansion batch.
      clearanceHintLv: 0,
      series: 'pixelart',
      scene,
      dark: { label: darkLabel ?? `${name} NIGHT`, ...pal.dark },
      light: { label: lightLabel ?? `${name} DAY`, ...pal.light },
    });
  }

  return pairs;
}

const MAP_INSPIRED_PIXEL_THEMES = buildBatch(MAP_ARCHETYPES, 100, 0, 50000);
const ORIGINAL_PIXEL_THEMES = buildBatch(ORIGINAL_ARCHETYPES, 100, 100, 70000);

export const PIXEL_ART_THEME_PAIRS: SurfaceThemePair[] = [...MAP_INSPIRED_PIXEL_THEMES, ...ORIGINAL_PIXEL_THEMES];
