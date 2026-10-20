// 300 pixel-art Surface Themes, all gated by the normal Clearance Level
// system (clearanceHintLv / divisionCode). Three batches, built from the
// same renderer (surfaceSceneArt.tsx) via the same "parameter table through
// a shared builder" strategy telemetryFeatures.tsx uses for its 240
// generated pairs:
//
//   A) 100 themes across the 16 "landmark" archetypes (cyberpunk alley,
//      medieval fortress, snowy summit, deep sea, space dock, wasteland,
//      etc.).
//   B) 100 themes built from 10 further archetypes (lake reflection,
//      terraced farmland, floating islands, crystal cave, windmill farm,
//      carnival pier, subway station, botanical dome, tundra outpost,
//      shrine garden).
//   C) 100 "region" themes (ids scene-001..scene-100) — originally the
//      retired EXPLORE MAP's clear rewards. Their art parameters are
//      reproduced exactly from the old map catalog (see SCENE_REGIONS) and
//      the ids are kept stable so any user who already had one equipped
//      keeps it; telemetryFeatures.tsx interleaves them into each
//      division's reward track rather than appending them at the end.
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

// Split hue by polarity: dark surfaces are tinted by the night hue, light
// surfaces by the day hue, so a theme's two polarities read as two
// different times of day.
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

// ==========================================
// Batch C — 100 region themes (scene-001..scene-100)
// ==========================================

// Slightly brighter tuning than buildPixelPalette — kept exactly as the
// region themes originally shipped so their look doesn't shift.
function buildScenePalette(hueDay: number, hueNight: number) {
  return {
    dark: {
      bgMain: hsl(hueNight, 30, 11),
      bgCard: hsl(hueNight, 28, 15.5),
      bgInput: hsl(hueNight, 30, 8),
      border: hsl(hueNight, 32, 24),
      textMain: hsl(hueNight, 14, 95),
      textMuted: hsl(hueNight, 14, 64),
      patternTint: `hsla(${hueNight}, 70%, 70%, 0.06)`,
      glowTint: `hsla(${hueNight}, 70%, 60%, 0.12)`,
    },
    light: {
      bgMain: hsl(hueDay, 38, 96.5),
      bgCard: '#ffffff',
      bgInput: hsl(hueDay, 32, 92.5),
      border: hsl(hueDay, 30, 83),
      textMain: hsl(hueDay, 28, 11),
      textMuted: hsl(hueDay, 14, 43),
      patternTint: `hsla(${hueDay}, 60%, 30%, 0.05)`,
      glowTint: `hsla(${hueDay}, 70%, 55%, 0.08)`,
    },
  };
}

interface SceneRegion {
  name: string;
  desc: string;
  silhouette: SceneSilhouette;
  hueBase: number;
  /** Exactly 4 locations per region. */
  places: string[];
}

// 16 regions x 4 locations = 64 locations; the first 36 locations also get
// an "// ECLIPSE CUT" variant, for 100 themes in total. Order matters: the
// location index drives each theme's seed/hue, so reordering this table
// changes the art of every theme after the edit.
const SCENE_REGIONS: SceneRegion[] = [
  { name: 'NEON FRONTIER', desc: 'A rain-slick cyberpunk back-alley, strung with flickering neon signage.', silhouette: 'cyberpunk-alley', hueBase: 280, places: ['GRID WARD', 'NEON ALLEY', 'CIRCUIT BLOCK', 'CHROME DISTRICT'] },
  { name: 'MEDIEVAL REACHES', desc: 'A stone keep and its flanking towers, hidden beneath centuries of fog.', silhouette: 'medieval-castle', hueBase: 30, places: ['KEEP', 'BARROW', 'HOLLOW', 'RAMPART'] },
  { name: 'FROSTLINE SUMMIT', desc: 'Wind-scoured snow peaks where the drifts never fully melt.', silhouette: 'snowy-peaks', hueBase: 200, places: ['HIGH PASS', 'GLACIER STEP', 'ICEFIELD', 'PEAK’S EDGE'] },
  { name: 'ABYSSAL TRENCH', desc: 'A sunken ruin far below the surface, lit only by bioluminescent drift.', silhouette: 'deep-sea', hueBase: 192, places: ['DROWNED SPIRE', 'DEEP VENT', 'SILT BASIN', 'LANTERNFISH REACH'] },
  { name: 'ORBITAL FRONTIER', desc: 'A half-built orbital dock, assembled one truss segment at a time.', silhouette: 'space-dock', hueBase: 250, places: ['DOCK ALPHA', 'TRUSS BAY', 'HANGAR RING', 'OUTER BERTH'] },
  { name: 'ASHEN WASTES', desc: 'Cracked earth and dead timber under a permanent haze.', silhouette: 'wasteland', hueBase: 35, places: ['ASH FLAT', 'SCRAP ROW', 'DEAD TIMBER', 'CINDER REACH'] },
  { name: 'STEEL SKYLINE', desc: 'A dense downtown skyline, counted one rooftop light at a time.', silhouette: 'cityscape', hueBase: 212, places: ['DOWNTOWN CORE', 'FINANCIAL ROW', 'MIDTOWN BLOCK', 'SKYLINE EDGE'] },
  { name: 'HARVEST HAMLET', desc: 'Thatched cottages and chimney smoke along a quiet country lane.', silhouette: 'pixel-village', hueBase: 95, places: ['MILL ROW', 'ORCHARD LANE', 'COTTAGE ROAD', 'HEARTH VALE'] },
  { name: 'SUNRISE COAST', desc: 'A quiet pier catching the very first light over calm water.', silhouette: 'seaside-pier', hueBase: 24, places: ['TIDE PIER', 'AMBER HARBOR', 'DAYBREAK COVE', 'GULL POINT'] },
  { name: 'IRON HARBOR', desc: 'Gantry cranes and stacked containers along a working waterfront.', silhouette: 'harbor-cranes', hueBase: 205, places: ['DRYDOCK', 'CONTAINER ROW', 'GANTRY WHARF', 'FREIGHT BASIN'] },
  { name: 'SILVERWOOD REACH', desc: 'Layered treelines fading into quiet, undisturbed depth.', silhouette: 'forest-treeline', hueBase: 140, places: ['MOSSHOLLOW', 'FERN REACH', 'DEEP CANOPY', 'QUIET GROVE'] },
  { name: 'SUNBAKED DUNES', desc: 'Buried monuments half-swallowed by drifting sand.', silhouette: 'desert-dunes-pyramid', hueBase: 42, places: ['DUNE CROSS', 'GOLDEN WASTE', 'BURIED SPIRE', 'FAR DUNES'] },
  { name: 'STONECREST RANGE', desc: 'Layered granite ridgelines rising above a quiet treeline.', silhouette: 'mountain-range', hueBase: 165, places: ['SUMMIT WARD', 'CLOUD RIDGE', 'STONE CREST', 'HIGH TRAVERSE'] },
  { name: 'INCENSE TERRACE', desc: 'A tiered pagoda and its stone steps, wrapped in drifting incense smoke.', silhouette: 'temple-pagoda', hueBase: 355, places: ['SHRINE TERRACE', 'LANTERN STEPS', 'OLD PAGODA', 'MONASTERY ROW'] },
  { name: 'FOGBOUND COAST', desc: 'A striped lighthouse sweeping its beam through coastal fog.', silhouette: 'lighthouse-coast', hueBase: 198, places: ['FOG POINT', 'SIGNAL CLIFF', 'TIDEWATCH', 'LANTERN HEAD'] },
  { name: 'EMBER CALDERA', desc: 'A smoking volcanic cone, its slopes veined with glowing rock.', silhouette: 'volcano', hueBase: 8, places: ['CINDER RIM', 'MAGMA VENT', 'ASHFALL RIDGE', 'CALDERA EDGE'] },
];

const LOCATIONS_WITH_ECLIPSE_CUT = 36;
const VARIANT_SUFFIX = [null, '// ECLIPSE CUT'] as const;
const VARIANT_HUE_SHIFT = [0, 34];
const VARIANT_SEED_SHIFT = [0, 500];

function buildSceneRegionThemes(): SurfaceThemePair[] {
  const pairs: SurfaceThemePair[] = [];
  let location = 0;

  SCENE_REGIONS.forEach((region) => {
    region.places.forEach((place, i) => {
      location += 1;
      const baseSeed = location * 97 + i * 13;
      const baseHueDay = region.hueBase + (((i * 11) % 24) - 12);
      const hueNight = 222 + (baseSeed % 36);
      const variants = location <= LOCATIONS_WITH_ECLIPSE_CUT ? 2 : 1;

      for (let v = 0; v < variants; v++) {
        const num = pairs.length + 1;
        const hueDay = baseHueDay + VARIANT_HUE_SHIFT[v];
        const seed = baseSeed + VARIANT_SEED_SHIFT[v];
        const scene: SceneSpec = { silhouette: region.silhouette, seed, hueDay, hueNight };
        const pal = buildScenePalette(hueDay, hueNight);
        const suffix = VARIANT_SUFFIX[v];
        const baseName = `${region.name} — ${place}`;

        pairs.push({
          id: `scene-${String(num).padStart(3, '0')}`,
          code: `SCN-${String(num).padStart(3, '0')}`,
          name: suffix ? `${baseName} ${suffix}` : baseName,
          pairLabel: `${region.name} NIGHT ⇄ ${region.name} DAY`,
          description: region.desc,
          pattern: 'none',
          accentHex: hsl(hueDay, 70, 55),
          // Round-robin so every division gets 10 themes drawn from across
          // all 16 regions, instead of whole regions clumping into one
          // division.
          divisionCode: `DIV-${String(((num - 1) % 10) + 1).padStart(2, '0')}`,
          // Placeholder — rebalanceThemeClearanceLevels() assigns the real level.
          clearanceHintLv: 0,
          series: 'pixelart',
          scene,
          dark: { label: `${region.name} NIGHT`, ...pal.dark },
          light: { label: `${region.name} DAY`, ...pal.light },
        });
      }
    });
  });

  return pairs;
}

export const SCENE_REGION_THEME_PAIRS: SurfaceThemePair[] = buildSceneRegionThemes();
