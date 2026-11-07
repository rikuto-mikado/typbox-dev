"""
MY ROOM furniture: the catalog, the shop lineup (and its reserve) and room-layout
validation. Prices and rules live here (the server is the source of truth);
the pixel art lives in frontend/src/roomArt.ts, keyed by each piece's art
id (tests.RoomTests checks every piece has art). Ids are stored on accounts
and in purchases: never rename one.

The room is a front-on cross-section ROOM_W x ROOM_H tiles: the top
WALL_ROWS rows are wall, the rest is floor.
  - 'wall' items must sit entirely on the wall rows;
  - 'floor' items stand on the floor: their bottom row must be a floor row
    (tall pieces such as bookshelves rise into the wall rows);
  - 'paint' items re-skin the whole wall ('wall' paint) or floor.
Placed pieces may not overlap, with one exception: a chair (CHAIR_BASES)
may be tucked into a desk or table (DESK_BASES) standing on the same floor
row; it is drawn in front of it. A piece can be placed as many times as it
has been bought.
"""

import hashlib
import json
import random
from datetime import date, datetime, time, timedelta
from pathlib import Path

from django.utils import timezone

from . import festivals
from .models import UserProfile
from .timezones import get_user_zone, user_week_start, week_start_date

ROOM_W = 16
ROOM_H = 12
WALL_ROWS = 5
MAX_PLACED = 64

# The catalog lives in furniture_catalog.json: one object per piece with
#   id, name, category (editor tab), layer, w, h (tiles), price and
#   tier: 0 starter (free, owned by everyone, never sold) · 1 small ·
#         2 medium · 3 large · 4 featured · 5 limited (sold during its
#         `event`, see festivals.py).
# Colour variants add  base (the art to draw) and  recolor  ({hex: hex}
# swaps applied to that art); plain pieces draw the art named by their id.
with open(Path(__file__).with_name("furniture_catalog.json"), encoding="utf-8") as fh:
    _CATALOG = json.load(fh)

FURNITURE = {row["id"]: {k: v for k, v in row.items() if k != "id"} for row in _CATALOG}
# Changes whenever the catalog does: clients cache the (large) catalog and
# only ask for it again when this differs from the copy they hold.
# (Hashed again below, once tucking roles are known: CATALOG_VERSION.)

# Tucking: these chairs and stools may overlap these desks and tables
# (colour variants follow their base). Sent to the client as each piece's
# `fit` so the editor applies the same rule (roomRender.canPlace).
CHAIR_BASES = frozenset(
    [
        "starter_chair",
        "stool",
        "office_chair",
        "gaming_chair",
        "bar_stool",
        "zabuton",
        "pouf",
        "director_chair",
        "hw_lab_stool",
        "camp_folding_chair",
        "cyber_stall_stool",
        "chair_mesh",
        "chair_wood",
        "chair_ball",
        "chair_zaisu",
        "chair_kneeling",
        "cafe_chair",
        "racing_chair",
        "vanity_stool",
    ]
)
DESK_BASES = frozenset(
    [
        "starter_desk",
        "writing_desk",
        "standing_desk",
        "corner_desk",
        "drafting_table",
        "school_desk",
        "typewriter_table",
        "sewing_table",
        "battlestation",
        "coffee_table",
        "kitchen_counter",
        "dining_table",
        "kotatsu",
        "chabudai",
        "chess_table",
        "hw_oscilloscope_bench",
        "hw_drone_bench",
        "hw_workbench",
        "intel_desk",
        "camp_folding_table",
        "desk_simple",
        "desk_drawers",
        "desk_trestle",
        "desk_rgb",
        "desk_bureau",
        "desk_low",
        "desk_triple",
        "podcast_desk",
        "dtm_desk",
        "craft_table",
        "jigsaw_table",
        "game_table",
        "mahjong_table",
        "kitchen_island",
        "cafe_table",
        "high_table",
        "coffee_table_round",
        "coffee_table_glass",
    ]
)


# ==========================================
# Light: what glows, how strongly, and what turns it on
# ==========================================
# Only the pieces listed here give off light; everything else is lit by
# them. Each entry is (kind, power, colour, x, y): x and y place the glow's
# centre within the piece (0..1 of its width and height, from the top left;
# a light hung from the ceiling shines from below itself, so y can pass 1).
#
# kind decides what switches it:
#   lamp, neon, flame   the room's lights (the LIGHTS dimmer in MY ROOM)
#   screen, appliance   running while you study (the stopwatch)
#   led, window         always: small indicator lights, and the night
#                       outside coming in through a window
# power is how far it reaches:
#   1  a glint: an indicator, a candle stub, a window at night
#   2  an accent: a small lamp, a neon sign, a monitor
#   3  a working light: a desk or floor lamp, a television, a stove
#   4  the room's main light: a pendant, a chandelier, an open fire
# Colour variants share their base's light; a variant that recolours the
# light's colour glows in its own colour (catalog()).
LIGHT_KINDS = ("lamp", "neon", "flame", "screen", "appliance", "led", "window")
LIGHTS = {
    # ---- lamps
    "floor_lamp": ("lamp", 3, "#fde68a", 0.44, 0.10),
    "tripod_lamp": ("lamp", 3, "#fde68a", 0.44, 0.10),
    "arc_lamp": ("lamp", 3, "#fde68a", 0.75, 0.52),
    "desk_lamp": ("lamp", 3, "#fde68a", 0.63, 0.25),
    "ring_light": ("lamp", 3, "#f4f4f5", 0.44, 0.15),
    "hw_magnifier_lamp": ("lamp", 3, "#fde68a", 0.63, 0.19),
    "intel_banker_lamp": ("lamp", 3, "#fde68a", 0.44, 0.38),
    "ceiling_light": ("lamp", 4, "#fef9e7", 0.50, 2.50),
    "pendant_lights": ("lamp", 4, "#fde68a", 0.46, 1.80),
    "chandelier": ("lamp", 4, "#fef3c7", 0.49, 1.20),
    "side_table": ("lamp", 2, "#fde68a", 0.44, 0.10),
    "wall_sconce": ("lamp", 2, "#fde68a", 0.19, 0.19),
    "string_lights": ("lamp", 2, "#fde68a", 0.47, 0.76),
    "cyber_lantern_string": ("lamp", 2, "#f9a8d4", 0.47, 0.54),
    "hex_lights": ("lamp", 2, "#a5b4fc", 0.50, 0.38),
    "chochin": ("lamp", 2, "#fca5a5", 0.44, 0.47),
    "andon": ("lamp", 2, "#fde68a", 0.42, 0.38),
    "moon_lamp": ("lamp", 2, "#fef3c7", 0.44, 0.38),
    "salt_lamp": ("lamp", 2, "#fb923c", 0.44, 0.38),
    "sunset_lamp": ("lamp", 2, "#f86a4c", 0.44, 0.19),
    "camping_lantern": ("lamp", 2, "#fde68a", 0.44, 0.50),
    "disco_ball": ("lamp", 2, "#c4b5fd", 0.44, 0.28),
    "study_carrel": ("lamp", 2, "#fde68a", 0.73, 0.25),
    "intel_desk": ("lamp", 2, "#fde68a", 0.69, 0.19),
    "hw_workbench": ("lamp", 2, "#fde68a", 0.81, 0.13),
    "aquarium": ("lamp", 2, "#7dd3fc", 0.46, 0.27),
    "xmas_tree": ("lamp", 2, "#fca5a5", 0.47, 0.50),
    "xmas_grand_tree": ("lamp", 2, "#fca5a5", 0.52, 0.51),
    "hn_lantern": ("lamp", 2, "#fcd34d", 0.48, 0.50),
    "bk_stall": ("lamp", 2, "#fde68a", 0.48, 0.19),
    "mushroom_lamp": ("lamp", 1, "#fda4af", 0.44, 0.34),
    "fairy_jar": ("lamp", 1, "#fde68a", 0.42, 0.55),
    "lava_lamp": ("lamp", 1, "#f472b6", 0.46, 0.15),
    "lava_tall": ("lamp", 1, "#c084fc", 0.44, 0.38),
    "tb_bamboo": ("lamp", 1, "#fde68a", 0.47, 0.57),
    # ---- neon
    "neon_sign": ("neon", 2, "#f472b6", 0.44, 0.36),
    "neon_moon": ("neon", 2, "#fde047", 0.43, 0.48),
    "neon_heart": ("neon", 2, "#f472b6", 0.50, 0.47),
    "neon_code": ("neon", 2, "#4ade80", 0.46, 0.38),
    "neon_focus": ("neon", 2, "#7dd3fc", 0.49, 0.37),
    "neon_open": ("neon", 2, "#ef4444", 0.47, 0.36),
    "neon_cat": ("neon", 2, "#c4b5fd", 0.47, 0.46),
    "hw_ghost": ("neon", 1, "#e0e7ff", 0.39, 0.45),
    # ---- flame
    "fireplace": ("flame", 4, "#fb923c", 0.48, 0.70),
    "xmas_mantle": ("flame", 3, "#fb923c", 0.48, 0.77),
    "candles": ("flame", 2, "#fdba74", 0.45, 0.20),
    "hw_cauldron": ("flame", 2, "#fb923c", 0.47, 0.88),
    "jack_o_lantern": ("flame", 1, "#fdba74", 0.43, 0.70),
    # ---- screens (while you study)
    "wall_tv": ("screen", 3, "#7dd3fc", 0.42, 0.41),
    "tv_stand": ("screen", 3, "#a7f3d0", 0.43, 0.24),
    "projector_screen": ("screen", 3, "#7dd3fc", 0.49, 0.40),
    "battlestation": ("screen", 3, "#5eead4", 0.49, 0.32),
    "streaming_setup": ("screen", 3, "#a78bfa", 0.36, 0.21),
    "jukebox": ("screen", 3, "#fdba74", 0.47, 0.37),
    "crt_tv": ("screen", 2, "#93c5fd", 0.38, 0.42),
    "corner_desk": ("screen", 2, "#a7f3d0", 0.58, 0.17),
    "standing_desk": ("screen", 2, "#86efac", 0.46, 0.17),
    "arcade_cabinet": ("screen", 2, "#a7f3d0", 0.47, 0.37),
    "pinball": ("screen", 2, "#fb923c", 0.47, 0.18),
    "dj_deck": ("screen", 2, "#818cf8", 0.48, 0.58),
    "pc_tower": ("screen", 2, "#a5b4fc", 0.34, 0.47),
    "writing_desk": ("screen", 1, "#86efac", 0.37, 0.15),
    "retro_computer": ("screen", 1, "#86efac", 0.39, 0.18),
    "oscilloscope": ("screen", 1, "#4ade80", 0.31, 0.30),
    "hw_oscilloscope_bench": ("screen", 1, "#4ade80", 0.37, 0.28),
    "robot": ("screen", 1, "#5eead4", 0.46, 0.54),
    # ---- appliances (while you study)
    "stove": ("appliance", 3, "#f97316", 0.48, 0.64),
    "kotatsu": ("appliance", 2, "#f97316", 0.48, 0.88),
    "printer_3d": ("appliance", 1, "#fdba74", 0.59, 0.26),
    "hw_solder_station": ("appliance", 1, "#fb923c", 0.38, 0.60),
    # ---- indicator lights (always)
    "digital_clock": ("led", 1, "#f43f5e", 0.46, 0.38),
    "nightstand": ("led", 1, "#ef4444", 0.44, 0.22),
    "ac_unit": ("led", 1, "#7dd3fc", 0.51, 0.78),
    "wifi_router": ("led", 1, "#4ade80", 0.50, 0.63),
    "smart_speaker": ("led", 1, "#7dd3fc", 0.44, 0.25),
    "server_rack": ("led", 1, "#86efac", 0.21, 0.42),
    "dc_patch_panel": ("led", 1, "#4ade80", 0.47, 0.38),
    "microwave_cart": ("led", 1, "#fde047", 0.47, 0.11),
    "espresso_machine": ("led", 1, "#86efac", 0.50, 0.19),
    "washing_machine": ("led", 1, "#7dd3fc", 0.49, 0.30),
    "intel_cipher_machine": ("led", 1, "#fde68a", 0.63, 0.25),
    # ---- the night through a window (always)
    "window": ("window", 1, "#bfdbfe", 0.50, 0.40),
    "win_arched": ("window", 1, "#bfdbfe", 0.50, 0.40),
    "win_forest": ("window", 1, "#bfdbfe", 0.50, 0.40),
    "win_sea": ("window", 1, "#e0f2fe", 0.50, 0.40),
    "win_peak": ("window", 1, "#bfdbfe", 0.50, 0.40),
    "win_city": ("window", 2, "#fcd34d", 0.50, 0.50),
    "tk_moon_window": ("window", 2, "#fef3c7", 0.50, 0.40),
    # ---- added with the second wave of furniture
    # lamps
    "bedside_lamp": ("lamp", 2, "#fde68a", 0.50, 0.18),
    "nightlight": ("lamp", 1, "#76a3da", 0.50, 0.35),
    "reading_sconce": ("lamp", 2, "#fde68a", 0.60, 0.75),
    "task_floor_lamp": ("lamp", 3, "#fde68a", 0.40, 0.20),
    "range_hood": ("lamp", 2, "#fde68a", 0.50, 1.10),
    "figure_case": ("lamp", 1, "#f1f5f9", 0.50, 0.40),
    "softbox_light": ("lamp", 3, "#f8fafc", 0.50, 0.18),
    "lamp_paper_floor": ("lamp", 3, "#fef3c7", 0.50, 0.22),
    "lamp_torchiere": ("lamp", 3, "#fffbeb", 0.50, 0.05),
    "lamp_tree": ("lamp", 3, "#fde68a", 0.50, 0.18),
    "lamp_globe_floor": ("lamp", 3, "#fffbeb", 0.50, 0.17),
    "lamp_mushroom_floor": ("lamp", 3, "#fde68a", 0.50, 0.25),
    "lamp_shelf_floor": ("lamp", 3, "#fef3c7", 0.50, 0.14),
    "lamp_rattan_floor": ("lamp", 3, "#fde68a", 0.50, 0.30),
    "lamp_arc_marble": ("lamp", 3, "#fde68a", 0.75, 0.35),
    "lamp_bubble": ("lamp", 2, "#7dd3fc", 0.50, 0.45),
    "lamp_star_projector": ("lamp", 2, "#c7d2fe", 0.50, 0.40),
    "lamp_dome": ("lamp", 2, "#fde68a", 0.50, 0.50),
    "lamp_tiffany": ("lamp", 2, "#fbbf24", 0.50, 0.20),
    "lamp_paper_cube": ("lamp", 2, "#fef3c7", 0.50, 0.50),
    "lamp_edison": ("lamp", 2, "#fde68a", 0.50, 0.35),
    "lamp_cloud": ("lamp", 1, "#f8fafc", 0.50, 0.45),
    "lamp_planet": ("lamp", 1, "#fde68a", 0.50, 0.45),
    "lamp_led_candles": ("lamp", 1, "#fdba74", 0.50, 0.30),
    "sconce_swing": ("lamp", 2, "#fde68a", 0.69, 0.60),
    "sconce_pair": ("lamp", 2, "#fde68a", 0.50, 0.25),
    "marquee_letters": ("lamp", 2, "#fde68a", 0.50, 0.50),
    "fairy_curtain": ("lamp", 2, "#fde68a", 0.50, 0.40),
    "paper_lanterns": ("lamp", 2, "#fca5a5", 0.50, 0.60),
    "pendant_single": ("lamp", 3, "#fffbeb", 0.50, 1.00),
    "pendant_rattan": ("lamp", 3, "#fde68a", 0.50, 1.00),
    "pendant_globe": ("lamp", 3, "#fef9c3", 0.50, 0.80),
    "track_lights": ("lamp", 3, "#fde68a", 0.50, 1.30),
    "paper_pendant": ("lamp", 3, "#fef3c7", 0.50, 0.70),
    "ceiling_fan": ("lamp", 4, "#fef9e7", 0.50, 2.20),
    # neon
    "lamp_neon_tube": ("neon", 2, "#76a3da", 0.50, 0.45),
    "light_bar_wall": ("neon", 2, "#76a3da", 0.50, 0.50),
    "neon_wave": ("neon", 2, "#38bdf8", 0.50, 0.50),
    "neon_star": ("neon", 2, "#fde047", 0.50, 0.50),
    "neon_bolt": ("neon", 2, "#facc15", 0.50, 0.50),
    "neon_plant": ("neon", 2, "#4ade80", 0.50, 0.50),
    "neon_smile": ("neon", 2, "#fde047", 0.50, 0.50),
    "neon_study": ("neon", 2, "#f472b6", 0.50, 0.50),
    # flame
    "lamp_oil": ("flame", 1, "#fb923c", 0.50, 0.35),
    # screens (while you study)
    "tv_wide": ("screen", 3, "#7dd3fc", 0.50, 0.30),
    "racing_rig": ("screen", 3, "#7dd3fc", 0.78, 0.20),
    "desk_triple": ("screen", 3, "#a7f3d0", 0.50, 0.25),
    "desk_trestle": ("screen", 2, "#a7f3d0", 0.52, 0.22),
    "desk_rgb": ("screen", 2, "#a5b4fc", 0.50, 0.30),
    "wall_monitor": ("screen", 2, "#a7f3d0", 0.62, 0.45),
    "console_setup": ("screen", 2, "#93c5fd", 0.50, 0.28),
    "projector_mini": ("screen", 2, "#e0f2fe", 0.30, 0.60),
    "projector_mount": ("screen", 2, "#e0f2fe", 0.25, 0.65),
    "gaming_pc_glass": ("screen", 2, "#c084fc", 0.45, 0.40),
    "hifi_stack": ("screen", 2, "#fbbf24", 0.50, 0.18),
    "arcade_mini": ("screen", 2, "#f472b6", 0.50, 0.25),
    "crt_stack": ("screen", 2, "#93c5fd", 0.50, 0.55),
    "fitness_mirror": ("screen", 2, "#e0f2fe", 0.50, 0.45),
    "karaoke_machine": ("screen", 2, "#f0abfc", 0.50, 0.40),
    "dtm_desk": ("screen", 2, "#a7f3d0", 0.50, 0.20),
    "desk_simple": ("screen", 1, "#86efac", 0.50, 0.25),
    "laptop_stand_floor": ("screen", 1, "#a7f3d0", 0.50, 0.12),
    "podcast_desk": ("screen", 1, "#ef4444", 0.52, 0.10),
    "vcr_shelf": ("screen", 1, "#22d3ee", 0.80, 0.28),
    "ham_radio": ("screen", 1, "#fbbf24", 0.25, 0.40),
    # appliances (while you study)
    "drinks_fridge": ("appliance", 2, "#e0f2fe", 0.50, 0.45),
    "popcorn_cart": ("appliance", 2, "#fef3c7", 0.50, 0.30),
    "kerosene_heater": ("appliance", 2, "#f97316", 0.50, 0.45),
    "oil_heater": ("appliance", 1, "#fb923c", 0.50, 0.40),
    "toaster": ("appliance", 1, "#fb923c", 0.50, 0.30),
    "microwave_box": ("appliance", 1, "#fbbf24", 0.38, 0.55),
    "kitchen_rack": ("appliance", 1, "#fbbf24", 0.30, 0.20),
    "coffee_station": ("appliance", 1, "#86efac", 0.25, 0.20),
    "bread_maker": ("appliance", 1, "#fbbf24", 0.38, 0.30),
    "air_fryer": ("appliance", 1, "#fb923c", 0.45, 0.15),
    # indicator lights (always)
    "humidifier": ("led", 1, "#7dd3fc", 0.50, 0.60),
    "air_purifier": ("led", 1, "#7dd3fc", 0.50, 0.15),
    "dehumidifier": ("led", 1, "#38bdf8", 0.50, 0.60),
    "nas_box": ("led", 1, "#4ade80", 0.60, 0.50),
    "rice_cooker": ("led", 1, "#fb923c", 0.65, 0.75),
    "aroma_diffuser": ("led", 1, "#c4b5fd", 0.50, 0.85),
    "handheld_dock": ("led", 1, "#86efac", 0.50, 0.45),
    "home_server": ("led", 1, "#4ade80", 0.70, 0.50),
    "smart_display": ("led", 1, "#fde68a", 0.50, 0.40),
    "clock_radio": ("led", 1, "#f43f5e", 0.50, 0.55),
    "camera_tripod": ("led", 1, "#ef4444", 0.75, 0.10),
    "robot_dog": ("led", 1, "#7dd3fc", 0.88, 0.30),
    "charging_station": ("led", 1, "#4ade80", 0.75, 0.80),
    "ups_battery": ("led", 1, "#4ade80", 0.60, 0.60),
    "wall_dashboard": ("led", 1, "#93c5fd", 0.50, 0.50),
    "weather_station": ("led", 1, "#7dd3fc", 0.50, 0.50),
    "digital_frame": ("led", 1, "#fde68a", 0.50, 0.45),
    "external_drives": ("led", 1, "#60a5fa", 0.65, 0.50),
    "air_hockey": ("led", 1, "#ef4444", 0.50, 0.05),
    "pedalboard": ("led", 1, "#ef4444", 0.50, 0.30),
    "herb_garden_led": ("led", 1, "#e9d5ff", 0.50, 0.20),
    "gecko_tank": ("led", 1, "#fb923c", 0.25, 0.10),
    "shrimp_tank": ("led", 1, "#7dd3fc", 0.50, 0.40),
    "glow_stars": ("led", 1, "#bef264", 0.50, 0.50),
    "intercom": ("led", 1, "#4ade80", 0.65, 0.65),
    # the night through a window (always)
    "window_small": ("window", 1, "#bfdbfe", 0.50, 0.45),
    "window_round": ("window", 1, "#bfdbfe", 0.50, 0.50),
    "window_shoji": ("window", 1, "#fef3c7", 0.50, 0.50),
    "door_glass": ("window", 1, "#bfdbfe", 0.50, 0.50),
    "window_tall": ("window", 2, "#bfdbfe", 0.50, 0.45),
}


def light_of(item_id):
    """The piece's light for the client, or None: {kind, power, color, x, y}."""
    spec = FURNITURE[item_id]
    entry = LIGHTS.get(spec.get("base", item_id))
    if entry is None:
        return None
    kind, power, color, x, y = entry
    recolor = {k.lower(): v for k, v in (spec.get("recolor") or {}).items()}
    return {"kind": kind, "power": power, "color": recolor.get(color.lower(), color), "x": x, "y": y}


def fit_of(item_id):
    """'chair' | 'desk' | None: how a piece takes part in tucking."""
    base = FURNITURE[item_id].get("base", item_id)
    return "chair" if base in CHAIR_BASES else "desk" if base in DESK_BASES else None


STARTER_IDS = [item_id for item_id, spec in FURNITURE.items() if spec["tier"] == 0]

def event_pieces(festival_id):
    return [
        item_id for item_id, spec in FURNITURE.items() if spec.get("event") == festival_id
    ]
DEFAULT_LAYOUT = {
    "wall": "wall_plain",
    "floor": "floor_wood",
    # An empty room. Nothing shows until a starter pack: see starter_required.
    "items": [],
}

# ==========================================
# Starter packs
# ==========================================
# Everyone starts with nothing at all: no walls, no floor, no desk. The first
# furniture anyone gets is one of these, a finished room; the rest of the shop
# stays locked until then (a BITS reset goes back to this). Once a user owns any
# furniture the free basics are theirs too, and the packs are gone.
#
# Three of them, each a whole lived-in room: thirty-odd pieces crowded in
# the way a room is once someone lives there (a desk under the shelves, the
# laundry drying, a kettle by the low table), so the first thing anyone sees
# is a room worth coming back to, not a desk on an empty floor.
#
# Balance: 4,000 BITS is about 40 hours of study, once per economy. Small and
# medium pieces only (tiers 1 and 2): large and featured pieces stay out,
# since those are what the weeks of saving are for. Each pack is worth about
# the same, so the choice is only about the room you want.
# tests.StarterPackTests holds every pack to this.
STARTER_PACK_PRICE = 4000
STARTER_PACK_VALUE = (85000, 100000)


def _pack(name, line, wall, floor, items):
    placed = [{"id": item_id, "x": x, "y": y} for item_id, x, y in items]
    return {
        "name": name,
        "line": line,
        "layout": {"wall": wall, "floor": floor, "items": placed},
    }


STARTER_PACKS = {
    "pack_study": _pack(
        "STUDY ROOM",
        "A desk under the shelves, a bed by the window, homework everywhere",
        "wall_two_tone__navy",
        "floor_light_oak",
        [
            ("window_small", 0, 1), ("wall_books", 3, 1), ("study_plan", 3, 2), ("reading_sconce", 5, 2),
            ("desk_simple", 3, 4), ("chair_mesh", 4, 4), ("book_tower", 2, 3), ("manga_shelf", 6, 3),
            ("clock_big", 8, 0), ("vocab_cards", 8, 2), ("poster_rocket", 11, 1), ("hat_hooks", 14, 1),
            ("plastic_drawers", 8, 4), ("zz_plant", 9, 4), ("bed_single", 12, 4), ("rolling_cart", 0, 4),
            ("paper_bin", 1, 5), ("bookcase_low", 0, 7), ("rug_stripe", 5, 8), ("bean_lounger", 6, 9),
            ("alarm_clock", 12, 6), ("laundry_basket", 13, 7), ("hamper", 15, 6), ("task_floor_lamp", 10, 3),
            ("nightlight", 11, 5), ("file_boxes", 3, 7), ("cat_bed_round", 3, 8), ("chair_ball", 9, 8),
            ("storage_bins", 13, 9), ("sneakers", 8, 11), ("textbook_pile", 0, 10), ("school_bag", 1, 11),
            ("paper_stack", 3, 11), ("clothes_pile", 10, 11), ("slippers", 13, 11), ("pilea", 15, 11),
        ],
    ),
    "pack_cozy": _pack(
        "ONE-ROOM FLAT",
        "A sofa, a kitchen corner and the laundry still drying",
        "wall_limewash__blush",
        "floor_herringbone",
        [
            ("window_small", 1, 1), ("photo_ledge", 4, 1), ("pendant_globe", 8, 0), ("poster_coffee", 12, 0),
            ("jar_shelf", 12, 2), ("utensil_rail", 14, 2), ("teapot_clock", 15, 0), ("calathea", 0, 4),
            ("throw_basket", 1, 5), ("lamp_torchiere", 2, 3), ("sofa_bed", 3, 4), ("side_table_c", 7, 5),
            ("fan_tower", 8, 3), ("high_table", 9, 4), ("cafe_chair", 10, 4), ("trash_sorter", 11, 4),
            ("microwave_cart", 12, 4), ("sink_counter", 13, 4), ("coffee_table_round", 4, 7),
            ("pouf_knit", 7, 7), ("rug_berber", 3, 8), ("kitchen_mat", 12, 7), ("laundry_rack", 14, 8),
            ("cat_bed_round", 9, 9), ("peace_lily", 8, 10), ("floor_pillows", 1, 8),
            ("lamp_paper_cube", 0, 7), ("nesting_tables", 9, 7), ("tray_table", 10, 9),
            ("laundry_basket", 15, 11), ("board_games", 0, 11), ("tote_bag", 2, 11), ("blanket_pile", 5, 11),
            ("sneakers", 11, 11), ("door_mat", 12, 11),
        ],
    ),
    "pack_washitsu": _pack(
        "TATAMI ROOM",
        "Shoji light, a low desk and the futon laid out",
        "wall_washi",
        "floor_tatami",
        [
            ("window_shoji", 0, 1), ("furin", 3, 0), ("chochin", 4, 0), ("paper_fan", 6, 1),
            ("kakejiku", 9, 1), ("tear_calendar", 11, 1), ("noren", 13, 0), ("desk_low", 0, 5),
            ("chair_zaisu", 1, 5), ("andon", 3, 4), ("tansu", 5, 4), ("bonsai", 8, 5), ("daruma", 9, 5),
            ("ikebana", 10, 4), ("futon_folded", 11, 4), ("kerosene_heater", 13, 4),
            ("umbrella_stand", 14, 4), ("futon", 0, 8), ("zabuton", 5, 8), ("chabudai", 6, 8),
            ("electric_kettle", 11, 8), ("kitten_box", 13, 8), ("tea_shelf", 11, 3), ("go_board", 9, 9),
            ("lamp_paper_cube", 8, 9), ("yarn_basket", 14, 7), ("lucky_bamboo", 0, 11),
            ("pickle_crock", 2, 11), ("book_crate", 4, 10), ("maneki_neko", 12, 11), ("rice_bag", 15, 11),
        ],
    ),
}


def pack_piece_ids(pack):
    """The pieces a pack sells: everything in its room but the free ones."""
    layout = pack["layout"]
    ids = [layout["wall"], layout["floor"]] + [item["id"] for item in layout["items"]]
    return [item_id for item_id in dict.fromkeys(ids) if FURNITURE[item_id]["tier"] != 0]


def owns_furniture(user):
    return user.bit_purchases.filter(item_id__in=FURNITURE).exists()


def starter_packs_state():
    return [
        {
            "id": pack_id,
            "name": pack["name"],
            "line": pack["line"],
            "price": STARTER_PACK_PRICE,
            "value": sum(FURNITURE[item_id]["price"] for item_id in pack_piece_ids(pack)),
            "layout": pack["layout"],
            "pieces": pack_piece_ids(pack),
        }
        for pack_id, pack in STARTER_PACKS.items()
    ]


# The shop's rotation: (tier, pieces shown, days each lineup lasts). Cheap
# pieces turn over fast so there is something new (and affordable, at ~100
# BITS per study hour) every day, while large and featured pieces stay a
# whole week: they take weeks of study to save up for, so they shouldn't
# vanish before anyone could afford them. Up to 12 pieces at once.
SHOP_ROTATION = ((4, 1, 7), (3, 2, 7), (2, 4, 2), (1, 5, 1))


# ==========================================
# Shop lineup
# ==========================================


def _local_today(user, now):
    zone = get_user_zone(user)
    return (timezone.localtime(now, zone) if zone else timezone.localtime(now)).date()


def shop_week(user, now=None):
    """(week_index, start_date) of the user's current shop week. The index
    is taken mid-week so Monday- and Sunday-start users share a lineup."""
    now = now or timezone.now()
    start = week_start_date(_local_today(user, now), user_week_start(user))
    index = (start + timedelta(days=3)).toordinal() // 7
    return index, start


def shop_period(user, every_days, now=None):
    """(index, start_date) of the lineup period a tier is in: the shop week
    for weekly tiers, else blocks of `every_days` calendar days counted from
    a fixed epoch, so everyone on the same local date sees the same pieces."""
    now = now or timezone.now()
    if every_days == 7:
        return shop_week(user, now)
    index = _local_today(user, now).toordinal() // every_days
    return index, date.fromordinal(index * every_days)


def art_of(item_id):
    """The base piece a colour variant is drawn from (itself for plain pieces)."""
    return FURNITURE[item_id].get("base", item_id)


def _bases_of_tier(tier):
    """{base: [its colour variants, sorted]} for one sold tier."""
    by_base = {}
    for item_id in sorted(FURNITURE):
        if FURNITURE[item_id]["tier"] == tier:
            by_base.setdefault(art_of(item_id), []).append(item_id)
    return by_base


_TIER_BASES = {tier: _bases_of_tier(tier) for tier, _, _ in SHOP_ROTATION}


def lineup_for(tier, count, index, salt=0):
    """
    The `count` pieces of one tier on show in lineup period `index`, the
    same for everyone. The tier's designs (bases) are dealt out from a
    shuffled deck, `count` per period, so none comes back until the whole
    deck has been shown: a missed piece returns within len(bases) / count
    periods (small ~33 days, medium ~88 days, large and featured ~32 weeks).
    Each pick is a different design, shown in one of its colours. `salt` deals
    from another deck (a STARLIGHT wish).
    """
    by_base = _TIER_BASES[tier]
    bases = sorted(by_base)
    per_deck = max(1, len(bases) // count)
    deck, slot = divmod(index, per_deck)
    seed = f"typbox-room-{tier}-deck-{deck}" + (f"-{salt}" if salt else "")
    random.Random(seed).shuffle(bases)
    return [
        random.Random(f"typbox-room-{tier}-{index}-{base}").choice(by_base[base])
        for base in bases[slot * count : (slot + 1) * count]
    ]


def reserved_piece(user, profile=None):
    """The piece the user has put on hold (SHOP_RESERVE), or None once it is
    owned (or no longer sold)."""
    if profile is None:
        profile = UserProfile.objects.filter(user=user).first()
    item_id = getattr(profile, "shop_reserve", "") if profile else ""
    if not item_id or FURNITURE.get(item_id, {}).get("tier", 0) == 0:
        return None
    if user.bit_purchases.filter(item_id=item_id).exists():
        return None
    return item_id


def shop_lineup(user, now=None, profile=None):
    """
    What the furniture shop sells right now:
      groups   one per SHOP_ROTATION row: {tier, every_days, items, resets_at}
      items    every piece on show (all groups, featured first)
      resets_at  the soonest change of any group
      reserve  the piece on hold, buyable even after it rotates out (or None)
    """
    now = now or timezone.now()
    zone = get_user_zone(user) or timezone.get_current_timezone()
    from . import wishes

    profile = profile or UserProfile.objects.filter(user=user).first() or UserProfile()
    salt = profile.shop_salt
    # NOVA's SCATTER re-deals only the shelves that turn daily.
    scatter = wishes.scatter_salt(profile)
    today = timezone.localtime(now, zone).date()
    groups = []
    festival = festivals.active_on(today)
    if festival:
        groups.append(
            {
                "tier": 5,
                "every_days": 0,
                "event": festivals.serialize(festival),
                "items": event_pieces(festival["id"]),
                "resets_at": timezone.make_aware(
                    datetime.combine(
                        festivals.last_day(festival, today) + timedelta(days=1), time.min
                    ),
                    zone,
                ),
            }
        )
    for tier, count, every in SHOP_ROTATION:
        index, start = shop_period(user, every, now)
        groups.append(
            {
                "tier": tier,
                "every_days": every,
                "items": lineup_for(tier, count, index, salt + (scatter if every <= 2 else 0)),
                "resets_at": timezone.make_aware(
                    datetime.combine(start + timedelta(days=every), time.min), zone
                ),
            }
        )
    return {
        "items": [item_id for group in groups for item_id in group["items"]],
        "resets_at": min(group["resets_at"] for group in groups),
        "groups": groups,
        "reserve": reserved_piece(user, profile),
    }


# ==========================================
# Inventory & layout
# ==========================================


def inventory(user):
    """{item_id: copies owned}. Nothing until the first furniture is bought (a
    starter pack): from then on the free basics count as one copy each."""
    bought = list(user.bit_purchases.filter(item_id__in=FURNITURE).values_list("item_id", flat=True))
    if not bought:
        return {}
    owned = {item_id: 1 for item_id in STARTER_IDS}
    for item_id in bought:
        owned[item_id] = owned.get(item_id, 0) + 1
    return owned


def stored_layout(profile):
    layout = profile.room_layout
    return layout if isinstance(layout, dict) and layout else DEFAULT_LAYOUT


# ==========================================
# Rooms (save slots)
# ==========================================
# Five rooms per user. Each is arranged independently from the same
# inventory: a piece standing in ROOM 1 can stand in ROOM 2 as well. The
# active room's live layout is profile.room_layout (what the editor
# autosaves, and all older clients know); switching rooms parks it in its
# slot and brings the other one in. SAVE keeps a checkpoint per room that
# the editor can load back (after an accidental CLEAR, say).

ROOM_SLOTS = 5
ROOM_NAME_MAX = 20


def _slot_default(index):
    return {"name": f"ROOM {index + 1}", "layout": {}, "saved": None, "saved_at": None}


def room_slots(profile):
    """Always ROOM_SLOTS well-formed slot dicts (missing fields filled in)."""
    raw = profile.room_slots if isinstance(profile.room_slots, list) else []
    slots = []
    for i in range(ROOM_SLOTS):
        entry = raw[i] if i < len(raw) and isinstance(raw[i], dict) else {}
        slot = _slot_default(i)
        name = entry.get("name")
        if isinstance(name, str) and name.strip():
            slot["name"] = name.strip()[:ROOM_NAME_MAX]
        for key in ("layout", "saved"):
            if isinstance(entry.get(key), dict) and entry[key]:
                slot[key] = entry[key]
        if isinstance(entry.get("saved_at"), str):
            slot["saved_at"] = entry["saved_at"]
        slots.append(slot)
    return slots


def active_slot(profile):
    index = profile.room_active_slot
    return index if isinstance(index, int) and 0 <= index < ROOM_SLOTS else 0


def sanitize_layout(layout, owned):
    """A best-effort, always-valid version of a stored layout: unknown,
    unowned (e.g. after a BITS reset), out-of-room or overlapping pieces are
    dropped instead of failing, and a missing wall / floor falls back to
    the starter one. Used for rooms parked in a slot and for checkpoints,
    which may predate changes to the inventory."""
    if not isinstance(layout, dict) or not layout:
        layout = DEFAULT_LAYOUT
    wall, floor = layout.get("wall"), layout.get("floor")
    if (
        not isinstance(wall, str)
        or FURNITURE.get(wall, {}).get("layer") != "wall_paint"
        or not owned.get(wall)
    ):
        wall = DEFAULT_LAYOUT["wall"]
    if (
        not isinstance(floor, str)
        or FURNITURE.get(floor, {}).get("layer") != "floor_paint"
        or not owned.get(floor)
    ):
        floor = DEFAULT_LAYOUT["floor"]
    kept = []
    raw_items = layout.get("items") if isinstance(layout.get("items"), list) else []
    for entry in raw_items:
        if len(kept) >= MAX_PLACED:
            break
        if not isinstance(entry, dict):
            continue
        try:
            validate_layout(
                {"wall": wall, "floor": floor, "items": kept + [entry]}, owned
            )
        except LayoutError:
            continue
        kept.append({"id": entry["id"], "x": entry["x"], "y": entry["y"]})
    return {"wall": wall, "floor": floor, "items": kept}


def rooms_state(profile, owned):
    """The five rooms for the client: name, layout (to draw a preview; the
    active one is room_layout) and the SAVE checkpoint, all sanitized."""
    current = active_slot(profile)
    out = []
    for i, slot in enumerate(room_slots(profile)):
        live = stored_layout(profile) if i == current else slot["layout"]
        out.append(
            {
                "name": slot["name"],
                "layout": sanitize_layout(live, owned),
                "saved": (
                    sanitize_layout(slot["saved"], owned) if slot["saved"] else None
                ),
                "saved_at": slot["saved_at"],
            }
        )
    return out


class LayoutError(Exception):
    pass


def _tucks(a, b):
    """Whether two overlapping pieces (fit, bottom row) are a chair tucked
    into a desk: one of each, standing on the same floor row."""
    return {a[0], b[0]} == {"chair", "desk"} and a[1] == b[1]


def validate_layout(layout, owned):
    """Returns a cleaned layout or raises LayoutError."""
    if not isinstance(layout, dict):
        raise LayoutError("Layout must be an object.")
    wall = layout.get("wall")
    floor = layout.get("floor")
    if not isinstance(wall, str) or not isinstance(floor, str):
        raise LayoutError("Wall and floor must be piece ids.")
    if FURNITURE.get(wall, {}).get("layer") != "wall_paint" or not owned.get(wall):
        raise LayoutError("Unknown or unowned wall.")
    if FURNITURE.get(floor, {}).get("layer") != "floor_paint" or not owned.get(floor):
        raise LayoutError("Unknown or unowned floor.")
    items = layout.get("items")
    if not isinstance(items, list) or len(items) > MAX_PLACED:
        raise LayoutError("Too many pieces.")

    used = {}
    occupied = {}  # (x, y) -> [(fit, bottom row)] of the pieces on that tile
    cleaned = []
    for entry in items:
        if not isinstance(entry, dict):
            raise LayoutError("Bad piece.")
        item_id, x, y = entry.get("id"), entry.get("x"), entry.get("y")
        spec = FURNITURE.get(item_id) if isinstance(item_id, str) else None
        if spec is None or spec["layer"] not in ("wall", "floor"):
            raise LayoutError(f'Unknown piece "{item_id}".')
        if (
            not isinstance(x, int)
            or not isinstance(y, int)
            or isinstance(x, bool)
            or isinstance(y, bool)
        ):
            raise LayoutError("Bad position.")
        used[item_id] = used.get(item_id, 0) + 1
        if used[item_id] > owned.get(item_id, 0):
            raise LayoutError(f'Not enough "{item_id}" owned.')
        w, h = spec["w"], spec["h"]
        if x < 0 or y < 0 or x + w > ROOM_W or y + h > ROOM_H:
            raise LayoutError("Piece outside the room.")
        bottom = y + h - 1
        if spec["layer"] == "wall" and bottom >= WALL_ROWS:
            raise LayoutError("Wall pieces must hang on the wall.")
        if spec["layer"] == "floor" and bottom < WALL_ROWS:
            raise LayoutError("Floor pieces must stand on the floor.")
        cells = {(cx, cy) for cx in range(x, x + w) for cy in range(y, y + h)}
        mine = (fit_of(item_id), bottom)
        for cell in cells:
            # At most a desk and one chair share a tile.
            owners = occupied.setdefault(cell, [])
            if owners and (len(owners) > 1 or not _tucks(mine, owners[0])):
                raise LayoutError("Pieces overlap.")
        for cell in cells:
            occupied[cell].append(mine)
        cleaned.append({"id": item_id, "x": x, "y": y})
    return {"wall": wall, "floor": floor, "items": cleaned}


def catalog():
    out = []
    for item_id, spec in FURNITURE.items():
        row = {"id": item_id, **spec}
        fit = fit_of(item_id)
        if fit:
            row["fit"] = fit
        light = light_of(item_id)
        if light:
            row["light"] = light
        out.append(row)
    return out


# Changes whenever the catalog sent to clients does (pieces, their `fit` or `light`).
CATALOG_VERSION = hashlib.sha1(
    json.dumps(catalog(), sort_keys=True).encode()
).hexdigest()[:12]


def room_state(user, profile, now=None, with_catalog=True):
    """The room for the client. The catalog (~1,800 pieces) is left out
    when the client already holds the current version (see CATALOG_VERSION)."""
    owned = inventory(user)
    state = {
        # Sanitized: a piece can stop being owned while it is placed.
        "layout": sanitize_layout(stored_layout(profile), owned),
        "inventory": owned,
        "rooms": rooms_state(profile, owned),
        "active_room": active_slot(profile),
        "catalog_version": CATALOG_VERSION,
        # 'weekly' for older clients: the shop no longer turns over weekly.
        "weekly": shop_lineup(user, now, profile),
        # No furniture yet: an empty room, the shop locked, a pack to choose.
        "starter_required": not owned,
        "starter_packs": [] if owned else starter_packs_state(),
        "grid": {"w": ROOM_W, "h": ROOM_H, "wall_rows": WALL_ROWS},
    }
    if with_catalog:
        state["catalog"] = catalog()
    return state
