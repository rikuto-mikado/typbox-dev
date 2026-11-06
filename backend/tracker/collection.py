"""
COLLECTION: the record of every challenger met in the CHALLENGES, shown on the
DATA page. One card per challenger (BOSS RAIDs and RIVALs), with how often it
was fought and beaten, when it first went down, and how far its other side
(INVERTED) has been opened. Everything comes from the settled challenges, so a
backup brings it back by itself.

New kinds of challenger can join by adding a row to KINDS.
"""

from . import challenges
from .models import BitPurchase

# (kind, catalog, item_id prefix): the order the DATA page lists them in.
KINDS = (
    ("raid", challenges.RAIDS, challenges.RAID_PREFIX),
    ("rival", challenges.RIVALS, challenges.RIVAL_PREFIX),
)
# A settled challenge (one that is over, whatever its outcome).
SETTLED = ("down", "escaped", "won", "lost", "tie", "forfeit")


def _history(user):
    """{item_id: {'fights', 'wins', 'first_win'}} from the settled challenges."""
    out = {}
    rows = (
        BitPurchase.objects.filter(
            user=user,
            item_id__in=challenges.CHALLENGE_IDS,
            remaining_uses=0,
            state__outcome__in=SETTLED,
        )
        .order_by("created_at")
        .values_list("item_id", "state", "created_at")
    )
    for item_id, state, created_at in rows:
        entry = out.setdefault(item_id, {"fights": 0, "wins": 0, "first_win": None})
        entry["fights"] += 1
        if (state or {}).get("outcome") in challenges.BEATEN:
            entry["wins"] += 1
            if entry["first_win"] is None:
                entry["first_win"] = created_at.isoformat()
    return out


def _record(kind, key, spec, table, prefix, history):
    """One challenger's card, with its other side when it has one."""
    mine = history.get(prefix + key, {})
    inverted_key = f"{key}_inverted"
    inverted = table.get(inverted_key)
    other = history.get(prefix + inverted_key, {})
    wins = mine.get("wins", 0)
    return {
        "kind": kind,
        "key": key,
        "name": spec["name"],
        "title": spec.get("title") or spec.get("tag") or "",
        "event": spec.get("event"),
        "fights": mine.get("fights", 0),
        "wins": wins,
        "first_win": mine.get("first_win"),
        "inverted": (
            {
                "key": inverted_key,
                "name": inverted["name"],
                "unlocked": wins >= challenges.INVERT_AT,
                "fights": other.get("fights", 0),
                "wins": other.get("wins", 0),
            }
            if inverted
            else None
        ),
    }


def collection_state(user):
    history = _history(user)
    records = []
    for kind, table, prefix in KINDS:
        for key, spec in table.items():
            if spec.get("inverted_of"):
                continue
            # A festival's challengers appear once beaten: some stay hidden.
            if spec.get("event") and not history.get(prefix + key, {}).get("wins"):
                continue
            records.append(_record(kind, key, spec, table, prefix, history))
    return {"invert_at": challenges.INVERT_AT, "records": records}
