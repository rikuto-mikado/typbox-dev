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
        "dc_control_desk",
        "hw_oscilloscope_bench",
        "hw_drone_bench",
        "hw_workbench",
        "orb_holo_table",
        "orb_control_console",
        "intel_desk",
        "camp_folding_table",
        "cyber_food_stall",
    ]
)


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
    "items": [
        {"id": "starter_desk", "x": 6, "y": 7},
        {"id": "starter_chair", "x": 9, "y": 7},
    ],
}

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
    salt = (profile or UserProfile.objects.filter(user=user).first() or UserProfile()).shop_salt
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
                "items": lineup_for(tier, count, index, salt),
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
    """{item_id: copies owned}; starters count as one copy each."""
    owned = {item_id: 1 for item_id in STARTER_IDS}
    for item_id in user.bit_purchases.filter(item_id__in=FURNITURE).values_list(
        "item_id", flat=True
    ):
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
        out.append(row)
    return out


# Changes whenever the catalog sent to clients does (pieces or their `fit`).
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
        "grid": {"w": ROOM_W, "h": ROOM_H, "wall_rows": WALL_ROWS},
    }
    if with_catalog:
        state["catalog"] = catalog()
    return state
