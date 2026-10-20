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
  silhouettes: SceneSilhouette[];
  hueBase: number;
  nameWords: string[];
}

// 8 regions x 8 maps = 64. Each region cycles through a small pool of
// silhouette archetypes (surfaceSceneArt.tsx) so every map still looks
// distinct while staying implementable without 64 bespoke illustrations —
// the same parameter-table-through-a-shared-builder strategy
// telemetryFeatures.tsx already uses for its 240 generated theme pairs.
const REGIONS: RegionSpec[] = [
  {
    code: 'NEON-FRONTIER',
    name: 'NEON FRONTIER',
    desc: 'A pixel-art cyberlight sprawl, rebuilt one city block at a time.',
    silhouettes: ['pixel-village', 'cityscape'],
    hueBase: 285,
    nameWords: ['GRID WARD', 'NEON ALLEY', 'CIRCUIT BLOCK', 'CHROME DISTRICT', 'SIGNAL PLAZA', 'PIXEL QUARTER', 'DATA SPIRE', 'ARCADE ROW'],
  },
  {
    code: 'MEDIEVAL-REACHES',
    name: 'MEDIEVAL REACHES',
    desc: 'Stone keeps and timber villages, hidden beneath centuries of fog.',
    silhouettes: ['medieval-castle', 'pixel-village'],
    hueBase: 28,
    nameWords: ['KEEP', 'BARROW', 'HOLLOW', 'WARDEN’S REST', 'RAMPART', 'HEARTH VALE', 'STONEGATE', 'OLD MARCH'],
  },
  {
    code: 'SUNRISE-COAST',
    name: 'SUNRISE COAST',
    desc: 'Harbor towns waking up to the first light over calm water.',
    silhouettes: ['seaside-pier', 'harbor-cranes', 'lighthouse-coast'],
    hueBase: 24,
    nameWords: ['TIDE PIER', 'AMBER HARBOR', 'DAYBREAK COVE', 'GULL POINT', 'SALT ROW', 'LANTERN QUAY', 'DOCKSIDE', 'FAR SHORE'],
  },
  {
    code: 'DEEP-FOREST',
    name: 'DEEP FOREST',
    desc: 'Quiet treelines and still water, charted step by careful step.',
    silhouettes: ['forest-treeline', 'lake-reflection'],
    hueBase: 142,
    nameWords: ['MOSSHOLLOW', 'STILLWATER', 'FERN REACH', 'GLASS LAKE', 'DEEP CANOPY', 'QUIET GROVE', 'SILVERWOOD', 'ECHO GLEN'],
  },
  {
    code: 'DESERT-EXPANSE',
    name: 'DESERT EXPANSE',
    desc: 'Dunes and buried monuments, half-swallowed by drifting sand.',
    silhouettes: ['desert-dunes-pyramid'],
    hueBase: 38,
    nameWords: ['DUNE CROSS', 'SUN-BAKED FLAT', 'GOLDEN WASTE', 'MIRAGE RIDGE', 'BURIED SPIRE', 'ASH PLAIN', 'FAR DUNES', 'SANDFALL'],
  },
  {
    code: 'ALPINE-PEAKS',
    name: 'ALPINE PEAKS',
    desc: 'Switchback trails toward summits that vanish into cloud.',
    silhouettes: ['mountain-range', 'snowy-peaks'],
    hueBase: 205,
    nameWords: ['HIGH PASS', 'FROSTLINE', 'SUMMIT WARD', 'GLACIER STEP', 'CLOUD RIDGE', 'STONE CREST', 'ICEFIELD', 'PEAK’S EDGE'],
  },
  {
    code: 'ANCIENT-TEMPLES',
    name: 'ANCIENT TEMPLES',
    desc: 'Terraced shrines and forgotten pagodas, step by overgrown step.',
    silhouettes: ['temple-pagoda', 'terraced-farmland'],
    hueBase: 352,
    nameWords: ['SHRINE TERRACE', 'LANTERN STEPS', 'SACRED PADDY', 'JADE COURT', 'OLD PAGODA', 'MONASTERY ROW', 'INCENSE GATE', 'STONE SHRINE'],
  },
  {
    code: 'ORBITAL-FRONTIER',
    name: 'ORBITAL FRONTIER',
    desc: 'A half-built orbital dock, assembled one truss at a time.',
    silhouettes: ['space-dock'],
    hueBase: 258,
    nameWords: ['DOCK ALPHA', 'TRUSS BAY', 'HANGAR RING', 'RELAY NODE', 'BERTH SEVEN', 'MODULE ROW', 'OUTER BERTH', 'STATION EDGE'],
  },
];

function buildExploreMaps(): ExploreMapDef[] {
  const maps: ExploreMapDef[] = [];
  let sceneCursor = 1;
  let mapIndex = 0;

  REGIONS.forEach((region) => {
    for (let i = 0; i < 8; i++) {
      mapIndex += 1;
      const id = `map-${String(mapIndex).padStart(2, '0')}`;
      const code = `MAP-${String(mapIndex).padStart(2, '0')}`;
      const silhouette = region.silhouettes[i % region.silhouettes.length];
      const seed = mapIndex * 97 + i * 13;
      const hueDay = region.hueBase + (((i * 11) % 30) - 15);
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
        silhouette,
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
