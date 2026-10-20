"""
Server-side authoritative catalog for the EXPLORE MAP feature.

Unlike purely cosmetic catalog ids (surface_theme, chrono_theme — see
SURFACE_THEME_ID_RE in serializers.py), map ids carry an attached economy
(credit cost, bonus payout, theme grants), so the backend must own this data
rather than trust the client. Cosmetic content (map names/regions, the 100
scene themes' art parameters) lives purely in the frontend catalogs
(frontend/src/exploreMaps.ts, frontend/src/surfaceThemesScenes.json) and is
NOT mirrored here.

Grid size and the cost formula are identical across all 64 maps — one
formula is simplest to validate server-side, and visual variety comes from
the (frontend-only) artwork rather than per-map difficulty tuning.
"""

GRID_SIZE = 25
CENTER = (12, 12)  # 0-indexed; pre-unlocked "castle" cell
TOTAL_CELLS = GRID_SIZE * GRID_SIZE

TOTAL_MAPS = 64
TOTAL_SCENE_THEMES = 100
# First MAPS_WITH_TWO_THEMES maps grant 2 reward themes each, the rest grant
# 1 — chosen so the totals land exactly on 100
# (36*2 + 28*1 == 100, 36 + 28 == 64). Keep this in lockstep with the
# identical distribution rule in frontend/src/exploreMaps.ts.
MAPS_WITH_TWO_THEMES = 36
CLEAR_BONUS_CREDITS = 5000

# cost(d) = round(COST_BASE + COST_K * d^COST_P), d = Manhattan distance from
# CENTER. Summed over all 624 non-center cells of a 25x25 grid this totals
# 301,320 credits (~301 hours at 1,000 credits/hour) — inside the requested
# 250-500 hour full-clear band, with edge cells (~1,190cr) costing ~14x
# center-adjacent cells (~85cr) for a cheap-near-the-castle /
# expensive-at-the-frontier curve.
COST_BASE = 80
COST_K = 5
COST_P = 1.7


def cell_cost(x: int, y: int) -> int:
    if (x, y) == CENTER:
        return 0
    d = abs(x - CENTER[0]) + abs(y - CENTER[1])
    return round(COST_BASE + COST_K * (d ** COST_P))


def is_in_bounds(x: int, y: int) -> bool:
    return 0 <= x < GRID_SIZE and 0 <= y < GRID_SIZE


def _build_map_catalog():
    catalog = {}
    scene_cursor = 1
    for i in range(1, TOTAL_MAPS + 1):
        map_id = f"map-{i:02d}"
        count = 2 if i <= MAPS_WITH_TWO_THEMES else 1
        theme_ids = [f"scene-{n:03d}" for n in range(scene_cursor, scene_cursor + count)]
        scene_cursor += count
        catalog[map_id] = {
            'clear_bonus_credits': CLEAR_BONUS_CREDITS,
            'reward_theme_ids': theme_ids,
        }
    assert scene_cursor - 1 == TOTAL_SCENE_THEMES, 'reward theme distribution must total exactly 100'
    return catalog


# map_id -> {clear_bonus_credits: int, reward_theme_ids: [str, ...]}
MAP_CATALOG = _build_map_catalog()
