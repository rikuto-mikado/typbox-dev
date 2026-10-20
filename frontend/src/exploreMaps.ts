import type { SceneSilhouette } from './surfaceSceneArt';

// Display-only mirror of backend/tracker/maps_catalog.py's GRID_SIZE/CENTER.
// Purely cosmetic here (grid rendering) — the backend is the authoritative
// source for anything with an attached economy (cell cost, adjacency rules).
export const GRID_SIZE = 25;
export const CENTER: [number, number] = [12, 12];
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
export const TOTAL_MAPS = 64;
export const TOTAL_SCENE_THEMES = 100;
// Keep in lockstep with MAPS_WITH_TWO_THEMES in backend/tracker/maps_catalog.py.
const MAPS_WITH_TWO_THEMES = 36;

// Display-only mirror of backend/tracker/maps_catalog.py's cell_cost() — used
// purely to preview a cell's cost/affordability before spending; the server
// is the sole authority on the actual deduction, so drift here is a display
// nit, never an economy risk.
const COST_BASE = 80;
const COST_K = 5;
const COST_P = 1.7;

export function cellCost(x: number, y: number): number {
  if (x === CENTER[0] && y === CENTER[1]) return 0;
  const d = Math.abs(x - CENTER[0]) + Math.abs(y - CENTER[1]);
  return Math.round(COST_BASE + COST_K * d ** COST_P);
}

export interface ExploreMapDef {
  id: string; // 'map-01'..'map-64'
  code: string; // 'MAP-01'..'MAP-64'
  name: string;
  desc: string;
  regionCode: string;
  regionName: string;
  silhouette: SceneSilhouette;
  seed: number;
  hueDay: number;
  hueNight: number;
  /** Surface Theme ids granted when this map is fully cleared (1 or 2). */
  rewardThemeIds: string[];
}

interface RegionSpec {
  code: string;
  name: string;
  desc: string;
  /** One archetype per region (not a blended pool) — maximizes the visual
   * gap between adjacent maps in the switcher, per the "too similar" feedback
   * that drove this restructure from 8 blended regions to 16 single-archetype
   * ones. */
  silhouette: SceneSilhouette;
  hueBase: number;
  nameWords: string[];
}

// 16 regions x 4 maps = 64. Each region is pinned to exactly one of
// surfaceSceneArt.tsx's archetypes (not a shared pool), so every region reads
// as a clearly distinct biome/theme (cyberpunk alley vs medieval fortress vs
// deep sea vs wasteland, etc.) rather than near-duplicate compositions with
// slightly different hues. This still follows the same
// parameter-table-through-a-shared-builder strategy telemetryFeatures.tsx
// uses for its 240 generated theme pairs — only the grouping granularity
// changed.
const REGIONS: RegionSpec[] = [
  {
    code: 'NEON-FRONTIER',
    name: 'NEON FRONTIER',
    desc: 'A rain-slick cyberpunk back-alley, strung with flickering neon signage.',
    silhouette: 'cyberpunk-alley',
    hueBase: 280,
    nameWords: ['GRID WARD', 'NEON ALLEY', 'CIRCUIT BLOCK', 'CHROME DISTRICT'],
  },
  {
    code: 'MEDIEVAL-REACHES',
    name: 'MEDIEVAL REACHES',
    desc: 'A stone keep and its flanking towers, hidden beneath centuries of fog.',
    silhouette: 'medieval-castle',
    hueBase: 30,
    nameWords: ['KEEP', 'BARROW', 'HOLLOW', 'RAMPART'],
  },
  {
    code: 'FROSTLINE-SUMMIT',
    name: 'FROSTLINE SUMMIT',
    desc: 'Wind-scoured snow peaks where the drifts never fully melt.',
    silhouette: 'snowy-peaks',
    hueBase: 200,
    nameWords: ['HIGH PASS', 'GLACIER STEP', 'ICEFIELD', 'PEAK’S EDGE'],
  },
  {
    code: 'ABYSSAL-TRENCH',
    name: 'ABYSSAL TRENCH',
    desc: 'A sunken ruin far below the surface, lit only by bioluminescent drift.',
    silhouette: 'deep-sea',
    hueBase: 192,
    nameWords: ['DROWNED SPIRE', 'DEEP VENT', 'SILT BASIN', 'LANTERNFISH REACH'],
  },
  {
    code: 'ORBITAL-FRONTIER',
    name: 'ORBITAL FRONTIER',
    desc: 'A half-built orbital dock, assembled one truss segment at a time.',
    silhouette: 'space-dock',
    hueBase: 250,
    nameWords: ['DOCK ALPHA', 'TRUSS BAY', 'HANGAR RING', 'OUTER BERTH'],
  },
  {
    code: 'ASHEN-WASTES',
    name: 'ASHEN WASTES',
    desc: 'Cracked earth and dead timber under a permanent haze.',
    silhouette: 'wasteland',
    hueBase: 35,
    nameWords: ['ASH FLAT', 'SCRAP ROW', 'DEAD TIMBER', 'CINDER REACH'],
  },
  {
    code: 'STEEL-SKYLINE',
    name: 'STEEL SKYLINE',
    desc: 'A dense downtown skyline, counted one rooftop light at a time.',
    silhouette: 'cityscape',
    hueBase: 212,
    nameWords: ['DOWNTOWN CORE', 'FINANCIAL ROW', 'MIDTOWN BLOCK', 'SKYLINE EDGE'],
  },
  {
    code: 'HARVEST-HAMLET',
    name: 'HARVEST HAMLET',
    desc: 'Thatched cottages and chimney smoke along a quiet country lane.',
    silhouette: 'pixel-village',
    hueBase: 95,
    nameWords: ['MILL ROW', 'ORCHARD LANE', 'COTTAGE ROAD', 'HEARTH VALE'],
  },
  {
    code: 'SUNRISE-COAST',
    name: 'SUNRISE COAST',
    desc: 'A quiet pier catching the very first light over calm water.',
    silhouette: 'seaside-pier',
    hueBase: 24,
    nameWords: ['TIDE PIER', 'AMBER HARBOR', 'DAYBREAK COVE', 'GULL POINT'],
  },
  {
    code: 'IRON-HARBOR',
    name: 'IRON HARBOR',
    desc: 'Gantry cranes and stacked containers along a working waterfront.',
    silhouette: 'harbor-cranes',
    hueBase: 205,
    nameWords: ['DRYDOCK', 'CONTAINER ROW', 'GANTRY WHARF', 'FREIGHT BASIN'],
  },
  {
    code: 'SILVERWOOD-REACH',
    name: 'SILVERWOOD REACH',
    desc: 'Layered treelines fading into quiet, undisturbed depth.',
    silhouette: 'forest-treeline',
    hueBase: 140,
    nameWords: ['MOSSHOLLOW', 'FERN REACH', 'DEEP CANOPY', 'QUIET GROVE'],
  },
  {
    code: 'SUNBAKED-DUNES',
    name: 'SUNBAKED DUNES',
    desc: 'Buried monuments half-swallowed by drifting sand.',
    silhouette: 'desert-dunes-pyramid',
    hueBase: 42,
    nameWords: ['DUNE CROSS', 'GOLDEN WASTE', 'BURIED SPIRE', 'FAR DUNES'],
  },
  {
    code: 'STONECREST-RANGE',
    name: 'STONECREST RANGE',
    desc: 'Layered granite ridgelines rising above a quiet treeline.',
    silhouette: 'mountain-range',
    hueBase: 165,
    nameWords: ['SUMMIT WARD', 'CLOUD RIDGE', 'STONE CREST', 'HIGH TRAVERSE'],
  },
  {
    code: 'INCENSE-TERRACE',
    name: 'INCENSE TERRACE',
    desc: 'A tiered pagoda and its stone steps, wrapped in drifting incense smoke.',
    silhouette: 'temple-pagoda',
    hueBase: 355,
    nameWords: ['SHRINE TERRACE', 'LANTERN STEPS', 'OLD PAGODA', 'MONASTERY ROW'],
  },
  {
    code: 'FOGBOUND-COAST',
    name: 'FOGBOUND COAST',
    desc: 'A striped lighthouse sweeping its beam through coastal fog.',
    silhouette: 'lighthouse-coast',
    hueBase: 198,
    nameWords: ['FOG POINT', 'SIGNAL CLIFF', 'TIDEWATCH', 'LANTERN HEAD'],
  },
  {
    code: 'EMBER-CALDERA',
    name: 'EMBER CALDERA',
    desc: 'A smoking volcanic cone, its slopes veined with glowing rock.',
    silhouette: 'volcano',
    hueBase: 8,
    nameWords: ['CINDER RIM', 'MAGMA VENT', 'ASHFALL RIDGE', 'CALDERA EDGE'],
  },
];

function buildExploreMaps(): ExploreMapDef[] {
  const maps: ExploreMapDef[] = [];
  let sceneCursor = 1;
  let mapIndex = 0;

  REGIONS.forEach((region) => {
    for (let i = 0; i < 4; i++) {
      mapIndex += 1;
      const id = `map-${String(mapIndex).padStart(2, '0')}`;
      const code = `MAP-${String(mapIndex).padStart(2, '0')}`;
      const seed = mapIndex * 97 + i * 13;
      const hueDay = region.hueBase + (((i * 11) % 24) - 12);
      const hueNight = 222 + (seed % 36);
      const themeCount = mapIndex <= MAPS_WITH_TWO_THEMES ? 2 : 1;
      const rewardThemeIds = Array.from({ length: themeCount }, (_, k) => `scene-${String(sceneCursor + k).padStart(3, '0')}`);
      sceneCursor += themeCount;

      maps.push({
        id,
        code,
        name: `${region.name} — ${region.nameWords[i]}`,
        desc: region.desc,
        regionCode: region.code,
        regionName: region.name,
        silhouette: region.silhouette,
        seed,
        hueDay,
        hueNight,
        rewardThemeIds,
      });
    }
  });

  return maps;
}

export const EXPLORE_MAPS: ExploreMapDef[] = buildExploreMaps();

const EXPLORE_MAP_BY_ID: Record<string, ExploreMapDef> = {};
EXPLORE_MAPS.forEach((m) => {
  EXPLORE_MAP_BY_ID[m.id] = m;
});

export function getExploreMapById(id: string): ExploreMapDef | undefined {
  return EXPLORE_MAP_BY_ID[id];
}

export function getExploreMapNameById(id: string): string {
  return EXPLORE_MAP_BY_ID[id]?.name ?? id;
}
