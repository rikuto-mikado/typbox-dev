"""
BLESSINGS: small, permanent favours that study opens and BITS buy.

Every blessing starts locked. Once its seal breaks (a number of hours logged
in all), UNLOCK pays its (high) `unlock` price, once (a BitPurchase
UNLOCK_PREFIX + id). From then on it is handled like a buff: WEAR pays its
`price` in BITS, every time it is put on. One is
worn at a time, with no time limit, beside any shop buff and any charm, until
it is taken off or another is worn; then it rests for its own cooldown (by
rank, COOLDOWN_HOURS) before it can be worn again.

A worn blessing adds a little to each log committed while it is on: a share
of the log's BITS, or a few BITS, when its condition holds. The bonus is worked
out once, when the log is committed, and kept on the log (`blessing_bits`, with
the blessing in `blessing` and the attunement in `blessing_pct`), so changing
blessings later never rewrites the past. Editing a log's minutes works its
bonus out again with the blessing and attunement it was committed under.

Each has a RANK (C to S, like the shop's buffs) and an AFFINITY, which says
how it sits beside the rest of the loadout:
  ANY       pays on its own pattern of study, buff or not;
  BUFFED    pays on what a buff paid on the log (RESONANCE): best beside a
            big buff, worth nothing without one;
  UNBUFFED  pays only on logs no buff paid on (STILL WATER): for the days
            between buffs, and the natural partner of ASTRA;
  STARS     pays with the worn charm's gauge (CONSTELLATION): every star
            spent on a wish or a GUARD is a little less on every log.
The rank is how far it can go and how much it asks, not a ladder: the C ones
ask nothing and give little; every one above pays well on one pattern of
study and little or nothing off it. None is meant to be best for everyone,
and none is meant to be swapped log by log:
- ATTUNEMENT: a blessing just put on works at 40% and grows by 10 points a day
  worn, to full strength after six days. Changing blessings starts the new one
  over, so picking one is a commitment, not a per-log switch;
- some of what they read is never shown in full (HEARTH's streak counts the days
  before the log, ASCENDANT's tide is drawn per day and only seen in what the
  logs earn).

The ledger (economy.bits_summary) adds sum(blessing_bits); each WEAR is a
BitPurchase whose item_id is PREFIX + the blessing's id (its expires_at set
when it comes off), so the ledger counts its price as spent and a BITS reset
takes it back like any purchase. A log
committed under a blessing that has since left the list keeps its bonus.
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
# A wear's item_id: PREFIX + the blessing's id; an unlock's: UNLOCK_PREFIX + it.
PREFIX = "blessing:"
UNLOCK_PREFIX = "unlock:blessing:"
# ATTUNEMENT: the share of the effect on the day it is put on, what each full
# day worn adds, and the most it reaches (percent).
ATTUNE_START = 40
ATTUNE_PER_DAY = 10
ATTUNE_FULL = 100
# Hours a blessing rests after it comes off, before it can be worn again.
COOLDOWN_HOURS = {"C": 24, "B": 72, "A": 120, "S": 168}

# id: name, tagline (the effect in a line), detail, rank, affinity, hours to
# open, price, and the rule (see _full_bonus).
BLESSINGS = {
    "steady": {
        "name": "STEADY HAND",
        "tagline": "+4% on every log",
        "detail": "Asks nothing and gives a little. The plainest blessing, and the only one that never misses.",
        "rank": "C",
        "affinity": "ANY",
        "hours": 10,
        "unlock": 2_400,
        "price": 100,
        "rule": ("percent", 4),
    },
    "grace": {
        "name": "GRACE",
        "tagline": "Minutes round up to the next 5",
        "detail": "The day's first four logs of 10 minutes or more count as if they ran to the next five. Worth most on odd, short logs; nothing on ones that end on a five.",
        "rank": "C",
        "affinity": "ANY",
        "hours": 50,
        "unlock": 4_500,
        "price": 200,
        "rule": ("round_up", 5, 10, 4),
    },
    "first_light": {
        "name": "FIRST LIGHT",
        "tagline": "+20% on the day's first log",
        "detail": "Pays once a day, on the first log, if it runs 45 minutes or more. A big share for one sitting a day; a small one for long days.",
        "rank": "B",
        "affinity": "ANY",
        "hours": 100,
        "unlock": 9_000,
        "price": 450,
        "rule": ("first_of_day", 20, 45),
    },
    "sprinter": {
        "name": "SPRINTER",
        "tagline": "+15% on logs of 10-35 minutes",
        "detail": "For short bursts: pays on logs of 10 to 35 minutes, on the first six of them each day. Mind a FOCUS CHIP: it burns out under 25.",
        "rank": "B",
        "affinity": "ANY",
        "hours": 150,
        "unlock": 12_000,
        "price": 600,
        "rule": ("short", 15, 10, 35, 6),
    },
    "still_water": {
        "name": "STILL WATER",
        "tagline": "+12% on logs no buff paid on",
        "detail": "For the days between buffs: pays on every log of 15 minutes or more that no buff paid on. Worth nothing while a buff pays; ASTRA lights on the same logs.",
        "rank": "B",
        "affinity": "UNBUFFED",
        "hours": 250,
        "unlock": 15_000,
        "price": 750,
        "rule": ("unbuffed", 12, 15),
    },
    "hearth": {
        "name": "HEARTH",
        "tagline": "+1% per day in a row, up to +7%",
        "detail": "Grows with the days in a row before the log's own date that had an hour or more logged. Miss one and it starts again from nothing.",
        "rank": "B",
        "affinity": "ANY",
        "hours": 400,
        "unlock": 15_000,
        "price": 750,
        "rule": ("streak", 1, 7, 60),
    },
    "sabbath": {
        "name": "SABBATH",
        "tagline": "+15% on Saturday and Sunday",
        "detail": "Only the weekend counts (the log's date), however long the logs are. Pairs with a WEEKEND SURGE.",
        "rank": "B",
        "affinity": "ANY",
        "hours": 600,
        "unlock": 18_000,
        "price": 900,
        "rule": ("weekend", 15),
    },
    "marathon": {
        "name": "MARATHON",
        "tagline": "+8% from 90 minutes, +14% from 3 hours",
        "detail": "For long sittings only. Anything shorter than an hour and a half earns nothing from it.",
        "rank": "A",
        "affinity": "ANY",
        "hours": 500,
        "unlock": 21_000,
        "price": 1_050,
        "rule": ("long", ((180, 14), (90, 8))),
    },
    "resonance": {
        "name": "RESONANCE",
        "tagline": "+15% of what the buff paid on the log",
        "detail": "Rings with the shop: adds 15% of the log's buff bonus. Huge beside a DEEP DIVE or a HYPERDRIVE, nothing at all without a buff.",
        "rank": "A",
        "affinity": "BUFFED",
        "hours": 750,
        "unlock": 24_000,
        "price": 1_200,
        "rule": ("resonance", 15),
    },
    "homecoming": {
        "name": "HOMECOMING",
        "tagline": "+25% on the first log back in a subject",
        "detail": "Pays on the day's first log of 30 minutes or more in a subject you had studied before but not in the three days before this one; at most twice a day. Rewards moving between subjects, not living in one.",
        "rank": "A",
        "affinity": "ANY",
        "hours": 1_000,
        "unlock": 27_000,
        "price": 1_350,
        "rule": ("return", 25, 3, 30, 2),
    },
    "tenacity": {
        "name": "TENACITY",
        "tagline": "Later logs of the day earn more",
        "detail": "The day's third log of 20 minutes or more gets +6%, the fourth +10%, every one after that +15%. The first two get nothing.",
        "rank": "A",
        "affinity": "ANY",
        "hours": 1_500,
        "unlock": 36_000,
        "price": 1_800,
        "rule": ("nth_of_day", 20, ((3, 6), (4, 10), (5, 15))),
    },
    "constellation": {
        "name": "CONSTELLATION",
        "tagline": "+1% per star on the worn charm",
        "detail": "Logs of 30 minutes or more get 1% for each star on the charm worn when they are committed, as that day ends. Every star spent on a wish or a GUARD is a little less on every log.",
        "rank": "S",
        "affinity": "STARS",
        "hours": 2_500,
        "unlock": 54_000,
        "price": 2_700,
        "rule": ("stars", 1, 30),
    },
    "ascendant": {
        "name": "ASCENDANT",
        "tagline": "Each day's tide: +0-18%",
        "detail": "Every day has its own tide, drawn in secret: anywhere from nothing to +18% on that day's logs of 45 minutes or more. You only see it in what they earn.",
        "rank": "S",
        "affinity": "ANY",
        "hours": 5_000,
        "unlock": 78_000,
        "price": 3_900,
        "rule": ("tide", 18, 45),
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


def _streak(log, longest, least=1):
    """Days in a row right before the log's date with `least` minutes logged (at most `longest`)."""
    since = log.date - timedelta(days=longest)
    rows = (
        StudyLog.objects.filter(user=log.user, date__lt=log.date, date__gte=since)
        .values("date")
        .annotate(m=Sum("duration_minutes"))
    )
    days = {r["date"] for r in rows if r["m"] >= least}
    n = 0
    while n < longest and log.date - timedelta(days=n + 1) in days:
        n += 1
    return n


def tide(user_id, day, top):
    """ASCENDANT's tide for a day: 0..top percent, secret and the same every time."""
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:tide:{user_id}:{day.isoformat()}".encode()).digest()
    return int.from_bytes(digest[:4], "big") % (top + 1)


def _returns(log, idle, least):
    """Whether `log` comes back to its subject after `idle` days away (it was
    studied before, but not in the `idle` days before the log's date)."""
    if log.category_id is None or log.duration_minutes < least:
        return False
    logs = StudyLog.objects.filter(user=log.user, category_id=log.category_id, date__lt=log.date)
    return logs.exists() and not logs.filter(date__gte=log.date - timedelta(days=idle)).exists()


def _charm_stars(log):
    """The stars on the charm worn when `log` was committed, as its day ends."""
    from . import charms

    profile = UserProfile.objects.filter(user=log.user).first()
    moment = log.created_at or timezone.now()
    charm = charms.worn_at(profile, moment) if profile else charms.DEFAULT
    if charm not in charms.CHARMS:
        return 0
    return charms.star_count(log.user, charm, profile=profile, upto=log.date)


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
        step, least, per_day = args
        if minutes < least:
            return 0
        if _earlier_same_day(log).filter(duration_minutes__gte=least).count() >= per_day:
            return 0
        rounded = math.ceil(minutes / step) * step
        return math.floor(_base(rounded)) - math.floor(_base(minutes))
    if kind == "first_of_day":
        percent, least = args
        if minutes < least or _earlier_same_day(log).exists():
            return 0
        return _share(minutes, percent)
    if kind == "short":
        percent, low, high, per_day = args
        if not low <= minutes <= high:
            return 0
        earlier = _earlier_same_day(log).filter(duration_minutes__gte=low, duration_minutes__lte=high).count()
        return _share(minutes, percent) if earlier < per_day else 0
    if kind == "unbuffed":
        percent, least = args
        return _share(minutes, percent) if minutes >= least and not log.bonus_item else 0
    if kind == "long":
        for least, percent in args[0]:
            if minutes >= least:
                return _share(minutes, percent)
        return 0
    if kind == "streak":
        per_day, top, least = args
        return _share(minutes, per_day * _streak(log, top // per_day, least))
    if kind == "resonance":
        bonus = log.bonus_bits or 0
        return max(1, round(bonus * args[0] / 100)) if bonus > 0 else 0
    if kind == "return":
        percent, idle, least, per_day = args
        if not _returns(log, idle, least):
            return 0
        # The first log back in this subject today, and one of the day's first `per_day` returns.
        earlier = _earlier_same_day(log).filter(duration_minutes__gte=least)
        if earlier.filter(category_id=log.category_id).exists():
            return 0
        returns = len({other.category_id for other in earlier.exclude(category_id=None) if _returns(other, idle, least)})
        return _share(minutes, percent) if returns < per_day else 0
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
    if kind == "stars":
        per_star, least = args
        if minutes < least:
            return 0
        return _share(minutes, per_star * _charm_stars(log))
    if kind == "tide":
        top, least = args
        if minutes < least:
            return 0
        return _share(minutes, tide(log.user_id, log.date, top))
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


def is_unlocked(user, blessing_id, hours=None):
    spec = BLESSINGS.get(blessing_id)
    if spec is None:
        return False
    return (hours_logged(user) if hours is None else hours) >= spec["hours"]


def unlocked(user):
    """The blessings the user has unlocked."""
    rows = BitPurchase.objects.filter(user=user, item_id__startswith=UNLOCK_PREFIX).values_list("item_id", flat=True)
    return {i[len(UNLOCK_PREFIX):] for i in rows if i[len(UNLOCK_PREFIX):] in BLESSINGS}


def unlock(user, blessing_id):
    """Unlocks a blessing whose seal is broken, paying its unlock price once."""
    from .economy import PurchaseError, bits_summary  # economy imports this module
    from . import bank

    spec = BLESSINGS.get(blessing_id)
    if spec is None:
        raise BlessingError("Unknown blessing.")
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if blessing_id in unlocked(user):
            raise BlessingError(f"{spec['name']} is already unlocked.")
        if not is_unlocked(user, blessing_id):
            raise BlessingError(f"{spec['name']} opens after {spec['hours']:,} hours of study.")
        try:
            bank.check_not_in_debt(user)
        except PurchaseError as exc:
            raise BlessingError(str(exc))
        if bits_summary(user)["balance"] < spec["unlock"]:
            raise BlessingError("Not enough BITS.")
        BitPurchase.objects.create(user=user, item_id=UNLOCK_PREFIX + blessing_id, price=spec["unlock"])


def cooldown(blessing_id):
    return timedelta(hours=COOLDOWN_HOURS[BLESSINGS[blessing_id]["rank"]])


def cooling_until(user, blessing_id, now=None):
    """When `blessing_id` can be worn again after it last came off, or None."""
    now = now or timezone.now()
    ended = (
        BitPurchase.objects.filter(user=user, item_id=PREFIX + blessing_id, expires_at__isnull=False)
        .order_by("-expires_at")
        .values_list("expires_at", flat=True)
        .first()
    )
    if ended is None:
        return None
    until = ended + cooldown(blessing_id)
    return until if until > now else None


def worn(user):
    """(the blessing on now, its attunement) if it is still the user's to wear."""
    profile = UserProfile.objects.filter(user=user).only("blessing", "blessing_since").first()
    blessing_id = profile.blessing if profile else ""
    if not blessing_id or not is_unlocked(user, blessing_id):
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
    if not log.blessing or log.blessing not in BLESSINGS:
        return  # none, or one that has since left the list: it keeps what it earned
    bonus = _bonus(log.blessing, log, log.blessing_pct)
    if bonus != log.blessing_bits:
        log.blessing_bits = bonus
        log.save(update_fields=["blessing_bits"])


def wear(user, blessing_id, now=None):
    """Puts a blessing on, paying its price (or takes it off with ""). A new
    one starts attuning; the one that comes off starts its cooldown."""
    from .economy import PurchaseError, bits_summary  # economy imports this module
    from . import bank

    now = now or timezone.now()
    blessing_id = blessing_id or ""
    if blessing_id and blessing_id not in BLESSINGS:
        raise BlessingError("Unknown blessing.")
    with transaction.atomic():
        # Same lock as every purchase: a double tap can't pay twice.
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        current = profile.blessing if profile.blessing in BLESSINGS else ""
        if current == blessing_id:
            return
        if blessing_id:
            spec = BLESSINGS[blessing_id]
            if not is_unlocked(user, blessing_id):
                raise BlessingError(f"{spec['name']} opens after {spec['hours']:,} hours of study.")
            if blessing_id not in unlocked(user):
                raise BlessingError(f"Unlock {spec['name']} first.")
            until = cooling_until(user, blessing_id, now)
            if until:
                raise BlessingError(f"{spec['name']} is resting until {timezone.localtime(until):%m/%d %H:%M}.")
            try:
                bank.check_not_in_debt(user)
            except PurchaseError as exc:
                raise BlessingError(str(exc))
            if bits_summary(user)["balance"] < spec["price"]:
                raise BlessingError("Not enough BITS.")
        if profile.blessing:
            BitPurchase.objects.filter(user=user, item_id=PREFIX + profile.blessing, expires_at__isnull=True).update(
                expires_at=now
            )
        if blessing_id:
            BitPurchase.objects.create(user=user, item_id=PREFIX + blessing_id, price=BLESSINGS[blessing_id]["price"])
        profile.blessing = blessing_id
        profile.blessing_since = now if blessing_id else None
        profile.save(update_fields=["blessing", "blessing_since"])


def state(user, now=None):
    """The BLESSINGS section of the shop."""
    now = now or timezone.now()
    hours = hours_logged(user)
    have = unlocked(user)
    profile = UserProfile.objects.filter(user=user).only("blessing", "blessing_since").first()
    on = profile.blessing if profile and profile.blessing and is_unlocked(user, profile.blessing, hours) else ""
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
                "rank": spec["rank"],
                "affinity": spec["affinity"],
                "hours": spec["hours"],
                "price": spec["price"],
                "unlock_price": spec["unlock"],
                "cooldown": COOLDOWN_HOURS[spec["rank"]],
                "cooling_until": (lambda u: u.isoformat() if u else None)(cooling_until(user, blessing_id, now)),
                # The seal is broken (it can be unlocked); and it has been unlocked.
                "open": hours >= spec["hours"],
                "unlocked": blessing_id in have,
            }
            for blessing_id, spec in BLESSINGS.items()
        ],
    }
