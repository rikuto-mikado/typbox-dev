"""
COLLECTION: what study and the CHALLENGES have earned, shown beside the
furniture shop and never placed in a room. Everything here is worked out from
the logs and the settled challenges, so a backup brings it back by itself.
"""

from datetime import timedelta

from django.db.models import Sum

from . import challenges, festival_pass

GROUPS = (
    ("hours", "STUDY HOURS"),
    ("logs", "SESSIONS LOGGED"),
    ("days", "DAYS STUDIED"),
    ("streak", "LONGEST STREAK"),
    ("beaten", "CHALLENGERS BEATEN"),
    ("inverted", "OTHER SIDES BEATEN"),
    ("festival", "FESTIVAL BARS FINISHED"),
)

# Six grades, the same across every group's art.
_RUNGS = {
    # group: [(need, grade)]
    "hours": [
        (10, 1), (50, 1), (100, 2), (250, 2), (500, 3), (750, 3), (1000, 4),
        (1500, 4), (2000, 5), (3000, 5), (5000, 6), (7500, 6), (10000, 6),
    ],
    "logs": [(10, 1), (50, 1), (100, 2), (500, 3), (1000, 4), (2500, 4), (5000, 5), (10000, 6)],
    "days": [(7, 1), (30, 2), (100, 3), (200, 4), (365, 4), (730, 5), (1000, 6)],
    "streak": [(3, 1), (7, 2), (14, 2), (30, 3), (60, 4), (100, 5), (200, 5), (365, 6)],
    "beaten": [(1, 1), (5, 1), (10, 2), (25, 3), (50, 4), (100, 5), (250, 6)],
    "inverted": [(1, 3), (3, 4), (6, 5), (12, 6)],
    "festival": [(1, 2), (3, 3), (5, 4), (10, 5), (20, 6)],
}
TROPHIES = [
    (f"{group}_{need}", group, need, grade)
    for group, _ in GROUPS
    for need, grade in _RUNGS[group]
]


def _dates(user):
    return sorted(set(user.study_logs.values_list("date", flat=True)))


def _longest_run(days):
    best = run = 0
    previous = None
    for day in days:
        run = run + 1 if previous is not None and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return best


def _record(kind, key, spec, beaten, prefix):
    """One challenger's card, with its other side when it has one."""
    inverted_key = f"{key}_inverted"
    table = challenges.RAIDS if kind == "raid" else challenges.RIVALS
    inverted = table.get(inverted_key)
    wins = beaten.get(prefix + key, 0)
    return {
        "kind": kind,
        "key": key,
        "name": spec["name"],
        "event": spec.get("event"),
        "wins": wins,
        "inverted": (
            {
                "key": inverted_key,
                "name": inverted["name"],
                "unlocked": wins >= challenges.INVERT_AT,
                "wins": beaten.get(prefix + inverted_key, 0),
            }
            if inverted
            else None
        ),
    }


def collection_state(user):
    minutes = user.study_logs.aggregate(m=Sum("duration_minutes"))["m"] or 0
    beaten = challenges.defeats(user)
    days = _dates(user)
    last_step = len(festival_pass.STEP_KINDS) - 1
    progress = {
        "hours": minutes // 60,
        "logs": user.study_logs.count(),
        "days": len(days),
        "streak": _longest_run(days),
        "beaten": sum(beaten.values()),
        "inverted": sum(
            1 for item_id in beaten if item_id.endswith("_inverted")
        ),
        "festival": user.bit_purchases.filter(
            item_id__startswith=festival_pass.PREFIX, item_id__endswith=f"_{last_step}"
        ).count(),
    }
    records = []
    for kind, table, prefix in (
        ("raid", challenges.RAIDS, challenges.RAID_PREFIX),
        ("rival", challenges.RIVALS, challenges.RIVAL_PREFIX),
    ):
        for key, spec in table.items():
            if spec.get("inverted_of"):
                continue
            # A festival's challengers appear once beaten: some stay hidden.
            if spec.get("event") and not beaten.get(prefix + key):
                continue
            records.append(_record(kind, key, spec, beaten, prefix))
    return {
        "invert_at": challenges.INVERT_AT,
        "groups": [{"id": group, "name": name, "progress": progress[group]} for group, name in GROUPS],
        "trophies": [
            {
                "id": item_id,
                "group": group,
                "need": need,
                "grade": grade,
                "earned": progress[group] >= need,
            }
            for item_id, group, need, grade in TROPHIES
        ],
        "records": records,
    }
