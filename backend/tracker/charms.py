"""
CHARMS: what STARLIGHT is gathered in. Three charms, one worn at a time:

  ASTRA   everyone's from the start. A day studied with no buff paying lights
          one star (the original STARLIGHT rule).
  NOVA    for long days. A day with 3 hours or more logged (buffs or not)
          lights two stars; shorter days light none. Its SHIELD is short but
          hits harder while it lasts.
  NEBULA  for patchy weeks. Any day with 30 minutes logged lights one star,
          buffs or not, but it holds the fewest. Its SHIELD lasts longest.

NOVA and NEBULA open with the hours studied and are bought with BITS, once
(a BitPurchase 'charm:<id>', gone with a BITS reset like any purchase).

Every charm's gauge is worked out from the logs alone, worn or not (a charm
not yet bought shows what it would hold). Wearing matters for the rest:
  - its insurance (the GUARD that saves a failing buff, and the SHIELD that
    stops a boss's blows, see attacks.py) only works once it has been worn
    ATTUNE_HOURS without a break, so it can't be slipped on just before a hit;
  - its four wishes (wishes.py) spend the worn charm's stars.

Everything is worked out from the logs, the wear history (UserProfile.charm_log)
and what was spent (UserProfile.star_spends, each tagged with its charm; an
untagged spend is ASTRA's), so deletions, resets and imports need no special
handling.
"""

from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from .models import BitPurchase, StudyLog, UserProfile
from .timezones import get_user_zone

PREFIX = "charm:"
DEFAULT = "astra"
ATTUNE_HOURS = 24
# How long after its date a log can still light that day's star (as before).
STAR_LATE_DAYS = timedelta(days=2)

#   max      the gauge's size
#   guard    stars a GUARD costs (a failing buff keeps running, once per buff)
#   shield   stars a SHIELD costs, and how long it holds (hours); `power` is
#            the raid damage multiplier inside it
#   rule     how a day lights: ("nobuff", stars) a log no buff paid on;
#            ("minutes", at_least, stars) that many minutes logged that day
#   hours / price   what opens it and what it costs (ASTRA is free)
CHARMS = {
    "astra": {
        "name": "ASTRA",
        "title": "THE STEADY LYRE",
        "line": "One star for every day studied without a buff.",
        "max": 14,
        "guard": 7,
        "shield": {"cost": 14, "hours": 48, "power": 1.0},
        "rule": ("nobuff", 1),
        "hours": 0,
        "price": 0,
    },
    "nova": {
        "name": "NOVA",
        "title": "THE BURNING STAR",
        "line": "Two stars for a day of 3 hours or more, buffs or not. Short days light nothing.",
        "max": 12,
        "guard": 6,
        "shield": {"cost": 10, "hours": 24, "power": 1.25},
        "rule": ("minutes", 180, 2),
        "hours": 100,
        "price": 6000,
    },
    "nebula": {
        "name": "NEBULA",
        "title": "THE SLOW CLOUD",
        "line": "One star for any day with 30 minutes logged, buffs or not. Holds the fewest.",
        "max": 10,
        "guard": 5,
        "shield": {"cost": 10, "hours": 72, "power": 1.0},
        "rule": ("minutes", 30, 1),
        "hours": 300,
        "price": 9000,
    },
}


class CharmError(Exception):
    pass


def _zone(user):
    return get_user_zone(user) or timezone.get_current_timezone()


def _parse(raw):
    try:
        moment = datetime.fromisoformat(raw)
    except (TypeError, ValueError):
        return None
    return moment if timezone.is_aware(moment) else timezone.make_aware(moment)


def wear_periods(profile):
    """[(start or None, end or None, charm)]: who was worn when. Before the
    first change ASTRA was."""
    out = []
    start, charm = None, DEFAULT
    for entry in profile.charm_log or []:
        at = _parse(entry.get("at")) if isinstance(entry, dict) else None
        if at is None:
            continue
        out.append((start, at, charm))
        start, charm = at, entry.get("charm") or ""
    out.append((start, None, charm))
    return [p for p in out if p[2]]


def worn_at(profile, moment):
    for start, end, charm in wear_periods(profile):
        if (start is None or start <= moment) and (end is None or moment < end):
            return charm
    return ""


def attuned(profile, charm, moment):
    """Whether `charm` has been worn without a break for ATTUNE_HOURS by `moment`."""
    for start, end, worn in wear_periods(profile):
        if worn != charm or not ((start is None or start <= moment) and (end is None or moment < end)):
            continue
        return start is None or moment - start >= timedelta(hours=ATTUNE_HOURS)
    return False


def _lights(log_date, created_at, zone):
    committed = timezone.localtime(created_at, zone).date()
    return log_date - timedelta(days=1) <= committed <= log_date + STAR_LATE_DAYS


def star_days(user, charm, now=None, profile=None, exclude=None):
    """[(day, stars)] the days `charm` lit, oldest first, worn or not
    (`exclude`: a log id to leave out)."""
    now = now or timezone.now()
    zone = _zone(user)
    today = timezone.localtime(now, zone).date()
    rule = CHARMS[charm]["rule"]
    logs = StudyLog.objects.filter(user=user, date__lte=today)
    if exclude is not None:
        logs = logs.exclude(pk=exclude)
    if rule[0] == "nobuff":
        logs = logs.filter(bonus_item="")

    totals = {}
    for day, created, minutes in logs.values_list("date", "created_at", "duration_minutes"):
        if not _lights(day, created, zone):
            continue
        totals[day] = totals.get(day, 0) + minutes
    if rule[0] == "nobuff":
        return [(day, rule[1]) for day in sorted(totals)]
    return [(day, rule[2]) for day in sorted(totals) if totals[day] >= rule[1]]


def spends_of(profile, charm):
    return [
        s
        for s in (profile.star_spends if profile else []) or []
        if isinstance(s, dict) and (s.get("charm") or DEFAULT) == charm
    ]


def star_count(user, charm, now=None, profile=None, upto=None):
    """The gauge: lit days add up to the cap, spends take away, in the order
    they happened (a day's stars land before that day's spend). `upto` (a
    date) stops the count there."""
    profile = profile or UserProfile.objects.filter(user=user).first()
    cap = CHARMS[charm]["max"]
    events = [(d.isoformat(), 0, n) for d, n in star_days(user, charm, now, profile)]
    events += [(s["day"], 1, -s["n"]) for s in spends_of(profile, charm)]
    if upto is not None:
        events = [e for e in events if e[0] <= upto.isoformat()]
    stars = 0
    for _, _, change in sorted(events):
        stars = max(0, min(cap, stars + change))
    return stars


def take_stars(profile, charm, n, now, key=None):
    """Spends `n` of `charm`'s stars from a locked profile, or returns False.
    A `key` makes it once-only (an automatic SHIELD for one attack)."""
    if key and any(isinstance(s, dict) and s.get("key") == key for s in profile.star_spends or []):
        return False
    if star_count(profile.user, charm, now, profile) < n:
        return False
    day = timezone.localtime(now, _zone(profile.user)).date().isoformat()
    entry = {"day": day, "n": n}
    if charm != DEFAULT:
        entry["charm"] = charm
    if key:
        entry["key"] = key
    profile.star_spends = [*(profile.star_spends or []), entry]
    profile.save(update_fields=["star_spends"])
    return True


def study_hours(user):
    from django.db.models import Sum

    return (StudyLog.objects.filter(user=user).aggregate(m=Sum("duration_minutes"))["m"] or 0) / 60


def owned(user):
    ids = {
        item_id[len(PREFIX):]
        for item_id in BitPurchase.objects.filter(user=user, item_id__startswith=PREFIX).values_list(
            "item_id", flat=True
        )
    }
    return {DEFAULT} | {i for i in ids if i in CHARMS}


def worn_now(user, now=None, profile=None):
    profile = profile or UserProfile.objects.filter(user=user).first()
    if profile is None:
        return DEFAULT
    charm = profile.charm if profile.charm in CHARMS else ""
    return charm if charm in owned(user) else ""


def buy(user, charm, now=None):
    from .economy import PurchaseError, bits_summary
    from . import bank

    now = now or timezone.now()
    spec = CHARMS.get(charm)
    if spec is None or charm == DEFAULT:
        raise CharmError("Unknown charm.")
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if charm in owned(user):
            raise CharmError("You already have this charm.")
        if study_hours(user) < spec["hours"]:
            raise CharmError(f"{spec['name']} opens at {spec['hours']} hours studied.")
        try:
            bank.check_not_in_debt(user, now)
        except PurchaseError as exc:
            raise CharmError(str(exc))
        if bits_summary(user)["balance"] < spec["price"]:
            raise CharmError("Not enough BITS.")
        return BitPurchase.objects.create(user=user, item_id=PREFIX + charm, price=spec["price"])


def wear(user, charm, now=None):
    """Puts `charm` on (or takes the worn one off for ""/None)."""
    now = now or timezone.now()
    charm = charm or ""
    if charm and charm not in CHARMS:
        raise CharmError("Unknown charm.")
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        if charm and charm not in owned(user):
            raise CharmError("Buy this charm first.")
        if worn_now(user, now, profile) == charm:
            return profile
        profile.charm = charm
        profile.charm_log = [*(profile.charm_log or []), {"at": now.isoformat(), "charm": charm}][-500:]
        profile.save(update_fields=["charm", "charm_log"])
        return profile


def worn_since(profile, charm, now):
    for start, end, worn in wear_periods(profile):
        if worn == charm and (start is None or start <= now) and (end is None or now < end):
            return start
    return None


def serialize(user, now=None, profile=None):
    now = now or timezone.now()
    profile = profile or UserProfile.objects.filter(user=user).first()
    have = owned(user)
    hours = study_hours(user)
    worn = worn_now(user, now, profile)
    cards = []
    for charm, spec in CHARMS.items():
        since = worn_since(profile, charm, now) if profile and worn == charm else None
        cards.append(
            {
                "id": charm,
                "name": spec["name"],
                "title": spec["title"],
                "line": spec["line"],
                "max": spec["max"],
                "guard": spec["guard"],
                "shield": dict(spec["shield"]),
                "hours": spec["hours"],
                "price": spec["price"],
                "unlocked": hours >= spec["hours"],
                "owned": charm in have,
                "worn": charm == worn,
                "stars": star_count(user, charm, now, profile),
                "attuned_at": (
                    None
                    if charm != worn or since is None
                    else (since + timedelta(hours=ATTUNE_HOURS)).isoformat()
                ),
                "attuned": charm == worn and attuned(profile, charm, now) if profile else charm == worn,
            }
        )
    return {"worn": worn or None, "attune_hours": ATTUNE_HOURS, "charms": cards}
