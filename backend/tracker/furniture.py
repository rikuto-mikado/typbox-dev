"""
MY ROOM furniture: the catalog, the weekly shop lineup and room-layout
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
Placed pieces may not overlap, and a piece can be placed as many times as
it has been bought.
"""

import json
import random
from datetime import datetime, time, timedelta
from pathlib import Path

from django.utils import timezone

from .timezones import get_user_zone, user_week_start, week_start_date

ROOM_W = 16
ROOM_H = 12
WALL_ROWS = 5
MAX_PLACED = 64

# The catalog lives in furniture_catalog.json: one object per piece with
#   id, name, category (editor tab), layer, w, h (tiles), price and
#   tier: 0 starter (free, owned by everyone, never sold) · 1 small ·
#         2 medium · 3 large · 4 featured.
# Colour variants add  base (the art to draw) and  recolor  ({hex: hex}
# swaps applied to that art); plain pieces draw the art named by their id.
with open(Path(__file__).with_name('furniture_catalog.json'), encoding='utf-8') as fh:
    _CATALOG = json.load(fh)

FURNITURE = {row['id']: {k: v for k, v in row.items() if k != 'id'} for row in _CATALOG}

STARTER_IDS = [item_id for item_id, spec in FURNITURE.items() if spec['tier'] == 0]
DEFAULT_LAYOUT = {
    'wall': 'wall_plain',
    'floor': 'floor_wood',
    'items': [
        {'id': 'starter_desk', 'x': 6, 'y': 7},
        {'id': 'starter_chair', 'x': 9, 'y': 7},
    ],
}

# Weekly lineup: how many pieces of each tier the shop shows (6 in all).
LINEUP_SLOTS = ((4, 1), (3, 1), (2, 2), (1, 2))


# ==========================================
# Weekly shop
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


def art_of(item_id):
    """The base piece a colour variant is drawn from (itself for plain pieces)."""
    return FURNITURE[item_id].get('base', item_id)


def lineup_for_week(index):
    """
    The same 6 pieces for everyone in a given week, drawn per tier. Each
    pick is a different piece: the week's draw chooses distinct bases
    first, then one colour of each, so a SOFA and a SOFA (NAVY) never share
    a lineup.
    """
    rng = random.Random(f'typbox-room-{index}')
    picks = []
    used_bases = set()
    for tier, count in LINEUP_SLOTS:
        by_base = {}
        for item_id in sorted(FURNITURE):
            if FURNITURE[item_id]['tier'] == tier and art_of(item_id) not in used_bases:
                by_base.setdefault(art_of(item_id), []).append(item_id)
        for base in rng.sample(sorted(by_base), count):
            used_bases.add(base)
            picks.append(rng.choice(by_base[base]))
    return picks


def weekly_shop(user, now=None):
    now = now or timezone.now()
    index, start = shop_week(user, now)
    zone = get_user_zone(user) or timezone.get_current_timezone()
    resets = timezone.make_aware(datetime.combine(start + timedelta(days=7), time.min), zone)
    return {'items': lineup_for_week(index), 'resets_at': resets}


# ==========================================
# Inventory & layout
# ==========================================

def inventory(user):
    """{item_id: copies owned}; starters count as one copy each."""
    owned = {item_id: 1 for item_id in STARTER_IDS}
    for item_id in user.bit_purchases.filter(item_id__in=FURNITURE).values_list('item_id', flat=True):
        owned[item_id] = owned.get(item_id, 0) + 1
    return owned


def stored_layout(profile):
    layout = profile.room_layout
    return layout if isinstance(layout, dict) and layout else DEFAULT_LAYOUT


class LayoutError(Exception):
    pass


def validate_layout(layout, owned):
    """Returns a cleaned layout or raises LayoutError."""
    if not isinstance(layout, dict):
        raise LayoutError('Layout must be an object.')
    wall = layout.get('wall')
    floor = layout.get('floor')
    if not isinstance(wall, str) or not isinstance(floor, str):
        raise LayoutError('Wall and floor must be piece ids.')
    if FURNITURE.get(wall, {}).get('layer') != 'wall_paint' or not owned.get(wall):
        raise LayoutError('Unknown or unowned wall.')
    if FURNITURE.get(floor, {}).get('layer') != 'floor_paint' or not owned.get(floor):
        raise LayoutError('Unknown or unowned floor.')
    items = layout.get('items')
    if not isinstance(items, list) or len(items) > MAX_PLACED:
        raise LayoutError('Too many pieces.')

    used = {}
    occupied = set()
    cleaned = []
    for entry in items:
        if not isinstance(entry, dict):
            raise LayoutError('Bad piece.')
        item_id, x, y = entry.get('id'), entry.get('x'), entry.get('y')
        spec = FURNITURE.get(item_id) if isinstance(item_id, str) else None
        if spec is None or spec['layer'] not in ('wall', 'floor'):
            raise LayoutError(f'Unknown piece "{item_id}".')
        if not isinstance(x, int) or not isinstance(y, int) or isinstance(x, bool) or isinstance(y, bool):
            raise LayoutError('Bad position.')
        used[item_id] = used.get(item_id, 0) + 1
        if used[item_id] > owned.get(item_id, 0):
            raise LayoutError(f'Not enough "{item_id}" owned.')
        w, h = spec['w'], spec['h']
        if x < 0 or y < 0 or x + w > ROOM_W or y + h > ROOM_H:
            raise LayoutError('Piece outside the room.')
        bottom = y + h - 1
        if spec['layer'] == 'wall' and bottom >= WALL_ROWS:
            raise LayoutError('Wall pieces must hang on the wall.')
        if spec['layer'] == 'floor' and bottom < WALL_ROWS:
            raise LayoutError('Floor pieces must stand on the floor.')
        cells = {(cx, cy) for cx in range(x, x + w) for cy in range(y, y + h)}
        if cells & occupied:
            raise LayoutError('Pieces overlap.')
        occupied |= cells
        cleaned.append({'id': item_id, 'x': x, 'y': y})
    return {'wall': wall, 'floor': floor, 'items': cleaned}


def catalog():
    return [{'id': item_id, **spec} for item_id, spec in FURNITURE.items()]


def room_state(user, profile, now=None):
    return {
        'layout': stored_layout(profile),
        'inventory': inventory(user),
        'catalog': catalog(),
        'weekly': weekly_shop(user, now),
        'grid': {'w': ROOM_W, 'h': ROOM_H, 'wall_rows': WALL_ROWS},
    }
