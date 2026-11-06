"""
BLESSINGS: small, permanent favours that study opens and BITS buy.

Each blessing opens (its seal breaks) at a number of hours logged in all, and
can then be bought once, for good, at a high price. It stays usable while
the logs that opened it do. One is worn at a time, with no time limit, beside
any shop buff.

A worn blessing adds a little to each log committed while it is on: a share
of the log's BITS, or a few BITS, when its condition holds. The bonus is worked
out once, when the log is committed, and kept on the log (`blessing_bits`, with
the blessing in `blessing` and the attunement in `blessing_pct`), so changing
blessings later never rewrites the past. Editing a log's minutes works its
bonus out again with the blessing and attunement it was committed under.

No blessing is best for everyone, and none is meant to be swapped log by log:
- each pays only on its own pattern of study (long sittings, short ones, the
  first of the day, weekends, coming back to a subject, a streak...), and the
  plain one (STEADY HAND) pays least;
- ATTUNEMENT: a blessing just put on works at 40% and grows by 10 points a day
  worn, to full strength after six days. Changing blessings starts the new one
  over, so picking one is a commitment, not a per-log switch;
- some of what they read is never shown in full (HEARTH's streak counts the days
  before the log, ASCENDANT's tide is drawn per day and only seen in what the
  logs earn).

The effects are kept apart from the shop buffs: no time windows (EARLY BIRD,
NIGHT SHIFT), no flat per-hour boosts (WARM-UP, OVERCLOCK), no session-length
rates (FOCUS CHIP). The ledger (economy.bits_summary) adds sum(blessing_bits);
a purchase is a BitPurchase whose item_id is PREFIX + the blessing's id, so the
ledger counts its price as spent and a BITS reset takes it back like any
purchase.
"""

import hashlib
import math
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from .models import BitPurchase, StudyLog, UserProfile

# What a log earns at the base rate (economy.BITS_PER_HOUR; kept here so the
# two modules don't import each other).
BITS_PER_HOUR = 100
# No single log earns more than this from its blessing.
MAX_BONUS = 120
# A purchase's item_id: PREFIX + the blessing's id.
PREFIX = "blessing:"
# ATTUNEMENT: the share of the effect on the day it is put on, what each full
# day worn adds, and the most it reaches (percent).
ATTUNE_START = 40
ATTUNE_PER_DAY = 10
ATTUNE_FULL = 100

# id: name, tagline (the effect in a line), detail, hours to open, price, and
# the rule (see _bonus).
BLESSINGS = {
    "steady": {
        "name": "STEADY HAND",
        "tagline": "+3% on every log",
        "detail": "Asks nothing and gives a little. The plainest blessing, and the only one that never misses.",
        "hours": 10,
        "price": 1_500,
        "rule": ("percent", 3),
    },
    "grace": {
        "name": "GRACE",
        "tagline": "Minutes round up to the next 5",
        "detail": "Logs of 10 minutes or more count as if they ran to the next five. Worth most on odd, short logs; nothing on ones that end on a five.",
        "hours": 50,
        "price": 2_500,
        "rule": ("round_up", 5, 10),
    },
    "first_light": {
        "name": "FIRST LIGHT",
        "tagline": "+15 BITS on the day's first log",
        "detail": "Pays once a day, on the first log, if it runs 45 minutes or more. A big share for one sitting a day; a small one for long days.",
        "hours": 100,
        "price": 4_000,
        "rule": ("first_of_day", 15, 45),
    },
    "sprinter": {
        "name": "SPRINTER",
        "tagline": "+12% on logs of 10-30 minutes",
        "detail": "For short bursts: pays on logs of 10 to 30 minutes, on the first five of them each day.",
        "hours": 250,
        "price": 6_000,
        "rule": ("short", 12, 10, 30, 5),
    },
    "marathon": {
        "name": "MARATHON",
        "tagline": "+8% from 90 minutes, +14% from 3 hours",
        "detail": "For long sittings only. Anything shorter than an hour and a half earns nothing from it.",
        "hours": 500,
        "price": 6_000,
        "rule": ("long", ((180, 14), (90, 8))),
    },
    "hearth": {
        "name": "HEARTH",
        "tagline": "+1% per day in a row, up to +6%",
        "detail": "Grows with the days logged in a row before the log's own date. Miss one and it starts again from nothing.",
        "hours": 750,
        "price": 9_000,
        "rule": ("streak", 1, 6),
    },
    "homecoming": {
        "name": "HOMECOMING",
        "tagline": "+16% on a subject left for 3 days",
        "detail": "Pays on logs of 15 minutes or more in a subject you had studied before but not in the three days before this one. Rewards moving between subjects.",
        "hours": 1_000,
        "price": 10_000,
        "rule": ("return", 16, 3, 15),
    },
    "sabbath": {
        "name": "SABBATH",
        "tagline": "+12% on Saturday and Sunday",
        "detail": "Only the weekend counts (the log's date), however long the logs are.",
        "hours": 2_000,
        "price": 14_000,
        "rule": ("weekend", 12),
    },
    "tenacity": {
        "name": "TENACITY",
        "tagline": "Later logs of the day earn more",
        "detail": "The day's third log of 20 minutes or more gets +6%, the fourth +10%, every one after that +15%. The first two get nothing.",
        "hours": 3_000,
        "price": 18_000,
        "rule": ("nth_of_day", 20, ((3, 6), (4, 10), (5, 15))),
    },
    "ascendant": {
        "name": "ASCENDANT",
        "tagline": "Each day's tide: +0-12%",
        "detail": "Every day has its own tide, drawn in secret: anywhere from nothing to +12% on all of that day's logs. You only see it in what they earn.",
        "hours": 5_000,
        "price": 30_000,
        "rule": ("tide", 12),
    },
}


class BlessingError(Exception):
    pass


def _base(minutes):
    return minutes * BITS_PER_HOUR / 60


def _share(minutes, percent):
    """`percent` of a log's base BITS, at least 1 when the log earns any."""
    if minutes <= 0 or percent <= 0:
        return 0
    return max(1, round(_base(minutes) * percent / 100))


def _earlier_same_day(log):
    """Other logs on the same date committed before this one (two committed
    in the same instant go in the order they were saved)."""
    others = StudyLog.objects.filter(user=log.user, date=log.date).exclude(pk=log.pk)
    if log.created_at is None:
        return others
    return others.filter(Q(created_at__lt=log.created_at) | Q(created_at=log.created_at, pk__lt=log.pk))


def _streak(log, longest):
    """Days logged in a row right before the log's date (at most `longest`)."""
    since = log.date - timedelta(days=longest)
    days = set(
        StudyLog.objects.filter(user=log.user, date__lt=log.date, date__gte=since)
        .values_list("date", flat=True)
        .distinct()
    )
    n = 0
    while n < longest and log.date - timedelta(days=n + 1) in days:
        n += 1
    return n


def tide(user_id, day, top):
    """ASCENDANT's tide for a day: 0..top percent, secret and the same every time."""
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:tide:{user_id}:{day.isoformat()}".encode()).digest()
    return int.from_bytes(digest[:4], "big") % (top + 1)


def _full_bonus(blessing_id, log):
    """What `blessing_id` adds to `log` at full attunement (0 when its condition doesn't hold)."""
    spec = BLESSINGS.get(blessing_id)
    if spec is None:
        return 0
    kind, *args = spec["rule"]
    minutes = log.duration_minutes
    if kind == "percent":
        return _share(minutes, args[0])
    if kind == "round_up":
        step, least = args
        if minutes < least:
            return 0
        rounded = math.ceil(minutes / step) * step
        return math.floor(_base(rounded)) - math.floor(_base(minutes))
    if kind == "first_of_day":
        amount, least = args
        if minutes < least or _earlier_same_day(log).exists():
            return 0
        return amount
    if kind == "short":
        percent, low, high, per_day = args
        if not low <= minutes <= high:
            return 0
        earlier = _earlier_same_day(log).filter(duration_minutes__gte=low, duration_minutes__lte=high).count()
        return _share(minutes, percent) if earlier < per_day else 0
    if kind == "long":
        for least, percent in args[0]:
            if minutes >= least:
                return _share(minutes, percent)
        return 0
    if kind == "streak":
        per_day, top = args
        return _share(minutes, per_day * _streak(log, top // per_day))
    if kind == "return":
        percent, idle, least = args
        if log.category_id is None or minutes < least:
            return 0
        logs = StudyLog.objects.filter(user=log.user, category_id=log.category_id, date__lt=log.date)
        recent = logs.filter(date__gte=log.date - timedelta(days=idle))
        return _share(minutes, percent) if logs.exists() and not recent.exists() else 0
    if kind == "weekend":
        return _share(minutes, args[0]) if log.date.weekday() >= 5 else 0
    if kind == "nth_of_day":
        least, steps = args
        if minutes < least:
            return 0
        nth = _earlier_same_day(log).filter(duration_minutes__gte=least).count() + 1
        percent = 0
        for from_nth, step_percent in steps:
            if nth >= from_nth:
                percent = step_percent
        return _share(minutes, percent)
    if kind == "tide":
        return _share(minutes, tide(log.user_id, log.date, args[0]))
    return 0


def _bonus(blessing_id, log, pct):
    full = _full_bonus(blessing_id, log)
    if full <= 0:
        return 0
    return max(0, min(MAX_BONUS, max(1, round(full * pct / 100))))


def attunement(since, now=None):
    """The share of its effect (percent) a blessing worn since `since` works at."""
    if since is None:
        return ATTUNE_FULL
    days = max(0, ((now or timezone.now()) - since).days)
    return min(ATTUNE_FULL, ATTUNE_START + ATTUNE_PER_DAY * days)


def hours_logged(user):
    return (StudyLog.objects.filter(user=user).aggregate(m=Sum("duration_minutes"))["m"] or 0) // 60


def owned(user):
    """The ids of the blessings the user has bought."""
    rows = BitPurchase.objects.filter(user=user, item_id__startswith=PREFIX).values_list("item_id", flat=True)
    return {item_id[len(PREFIX):] for item_id in rows if item_id[len(PREFIX):] in BLESSINGS}


def is_unlocked(user, blessing_id, hours=None):
    spec = BLESSINGS.get(blessing_id)
    if spec is None:
        return False
    return (hours_logged(user) if hours is None else hours) >= spec["hours"]


def _usable(user, blessing_id, hours=None, mine=None):
    return blessing_id in (owned(user) if mine is None else mine) and is_unlocked(user, blessing_id, hours)


def worn(user):
    """(the blessing on now, its attunement) if it is still the user's to wear."""
    profile = UserProfile.objects.filter(user=user).only("blessing", "blessing_since").first()
    blessing_id = profile.blessing if profile else ""
    if not blessing_id or not _usable(user, blessing_id):
        return "", 0
    return blessing_id, attunement(profile.blessing_since)


def apply_to_new_log(log):
    """Called once per committed log (StudyLogViewSet.perform_create)."""
    blessing_id, pct = worn(log.user)
    if not blessing_id:
        return 0
    bonus = _bonus(blessing_id, log, pct)
    log.blessing = blessing_id
    log.blessing_pct = pct
    log.blessing_bits = bonus
    log.save(update_fields=["blessing", "blessing_pct", "blessing_bits"])
    return bonus


def on_log_edited(log):
    """A log's minutes changed: its bonus again, under the blessing and attunement it was committed with."""
    if not log.blessing:
        return
    bonus = _bonus(log.blessing, log, log.blessing_pct)
    if bonus != log.blessing_bits:
        log.blessing_bits = bonus
        log.save(update_fields=["blessing_bits"])


def buy(user, blessing_id):
    """Buys a blessing whose seal is broken (it is not put on)."""
    spec = BLESSINGS.get(blessing_id)
    if spec is None:
        raise BlessingError("Unknown blessing.")
    # Imported here: economy imports this module.
    from .economy import bits_summary

    with transaction.atomic():
        # Same lock as every purchase: a double tap can't buy it twice.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if not is_unlocked(user, blessing_id):
            raise BlessingError(f"{spec['name']} opens after {spec['hours']:,} hours of study.")
        if blessing_id in owned(user):
            raise BlessingError(f"You already have {spec['name']}.")
        if bits_summary(user)["balance"] < spec["price"]:
            raise BlessingError("Not enough BITS.")
        BitPurchase.objects.create(user=user, item_id=PREFIX + blessing_id, price=spec["price"])


def wear(user, blessing_id, now=None):
    """Puts a blessing on (or takes it off with ""); a new one starts attuning."""
    if blessing_id and blessing_id not in BLESSINGS:
        raise BlessingError("Unknown blessing.")
    if blessing_id and not is_unlocked(user, blessing_id):
        need = BLESSINGS[blessing_id]["hours"]
        raise BlessingError(f"{BLESSINGS[blessing_id]['name']} opens after {need:,} hours of study.")
    if blessing_id and blessing_id not in owned(user):
        raise BlessingError(f"Buy {BLESSINGS[blessing_id]['name']} first.")
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        if profile.blessing != blessing_id:
            profile.blessing = blessing_id
            profile.blessing_since = (now or timezone.now()) if blessing_id else None
            profile.save(update_fields=["blessing", "blessing_since"])


def state(user, now=None):
    """The BLESSINGS section of the shop."""
    now = now or timezone.now()
    hours = hours_logged(user)
    mine = owned(user)
    profile = UserProfile.objects.filter(user=user).only("blessing", "blessing_since").first()
    on = profile.blessing if profile and profile.blessing and _usable(user, profile.blessing, hours, mine) else ""
    pct = attunement(profile.blessing_since, now) if on else 0
    full_at = None
    if on and pct < ATTUNE_FULL and profile.blessing_since:
        full_at = profile.blessing_since + timedelta(days=math.ceil((ATTUNE_FULL - ATTUNE_START) / ATTUNE_PER_DAY))
    earned = StudyLog.objects.filter(user=user).aggregate(b=Sum("blessing_bits"))["b"] or 0
    return {
        "hours": hours,
        "worn": on or None,
        "attunement": pct,
        "attuned_at": full_at.isoformat() if full_at else None,
        "attune_start": ATTUNE_START,
        "earned": earned,
        "items": [
            {
                "id": blessing_id,
                "name": spec["name"],
                "effect": spec["tagline"],
                "detail": spec["detail"],
                "hours": spec["hours"],
                "price": spec["price"],
                "unlocked": hours >= spec["hours"],
                "owned": blessing_id in mine,
            }
            for blessing_id, spec in BLESSINGS.items()
        ],
    }
