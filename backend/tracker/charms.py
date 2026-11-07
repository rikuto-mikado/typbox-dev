"""
CHARMS: what STARLIGHT is gathered in. Six charms, one worn at a time, each
with a rank (like the shop's buffs: what it asks of you and how far it goes,
not a ladder where the top one wins) and a temper of its own:

  ASTRA    C  SIGHT      the first one open. A day studied with no buff
                         paying lights one. Wishes that see ahead (the crate,
                         the shop) and quiet a boss's next attack.
  POLARIS  B  ALL-ROUND  a day with two subjects or more lights one. A little of
                         every sphere, each wish dearer than the specialist's.
  NEBULA   B  COVER      any day with 30 minutes lights one, but it holds the
                         fewest. Longest SHIELD, the cheapest GUARD but one,
                         wishes for cover and money.
  AURORA   A  BUFFS      a day a buff paid on lights one: ASTRA's opposite.
                         The cheapest GUARD and no SHIELD; wishes that stretch
                         a buff and cut the shop's cooldowns.
  NOVA     A  BURST      a day of 3 hours or more lights two. No GUARD: a short
                         SHIELD that hits harder while it lasts, and wishes for
                         one huge blow, at a price.
  ORION    S  THE HUNT   a day with a log of 90 minutes or more lights one.
                         No GUARD, no SHIELD: while worn (and settled in),
                         every hit that lands on a boss hits harder, and its
                         wishes keep the pressure on.

None is worn at the start, and every charm starts locked. Once the hours
studied open it, UNLOCK pays its (high) `unlock` price, once (a BitPurchase
UNLOCK_PREFIX + id). From then on it is handled like a buff: WEAR pays its
`price` in BITS, every time it is put on (a BitPurchase
'charm:<id>' whose expires_at is set when it comes off; gone with a BITS reset
like any purchase). It stays on until it is taken off or another is worn;
then it rests for its own cooldown (`cooldown`, hours) before it can be worn
again, so a charm can't be slipped on for one fight and straight back off.

Every charm's gauge is worked out from the logs alone, worn or not (a charm
not yet bought shows what it would hold).

Wearing matters for the rest, too:
  - its insurance (the GUARD that saves a failing buff, and the SHIELD that
    stops a boss's blows, see attacks.py) only works once it has been worn
    ATTUNE_HOURS without a break, so it can't be slipped on just before a hit;
    ORION's hunt (`hit`) settles in the same way;
  - its wishes (wishes.py) spend the worn charm's stars.

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
# A charm unlocked for good: UNLOCK_PREFIX + its id.
UNLOCK_PREFIX = "unlock:charm:"
DEFAULT = "astra"
ATTUNE_HOURS = 24
# How long after its date a log can still light that day's star (as before).
STAR_LATE_DAYS = timedelta(days=2)

#   rank / role  how it is shown (C-S like the buffs; what it is for)
#   max      the gauge's size
#   guard    stars a GUARD costs (a failing buff keeps running, once per
#            buff), or None: this charm has no GUARD
#   shield   stars a SHIELD costs, and how long it holds (hours); `power` is
#            the raid damage multiplier inside it. None: no SHIELD
#   hit      raid damage multiplier on every landed hit while worn and
#            settled in (1.0: none)
#   rule     how a day lights:
#              ("nobuff", stars)          a log no buff paid on
#              ("buffed", stars)          a log a buff paid on
#              ("minutes", least, stars)  that many minutes logged that day
#              ("subjects", least, stars) logs in that many subjects that day
#              ("long_log", least, stars) one log of that many minutes
#   hours    study hours before it can be unlocked
#   unlock   what unlocking it costs, once
#   price    what each WEAR costs
#   cooldown hours it rests after coming off before it can be worn again
CHARMS = {
    "astra": {
        "name": "ASTRA",
        "title": "THE STEADY LYRE",
        "rank": "C",
        "role": "SIGHT",
        "line": "One star for every day studied without a buff.",
        "max": 14,
        "guard": 7,
        "shield": {"cost": 14, "hours": 48, "power": 1.0},
        "hit": 1.0,
        "rule": ("nobuff", 1),
        "hours": 0,
        "unlock": 3_000,
        "price": 150,
        "cooldown": 24,
    },
    "polaris": {
        "name": "POLARIS",
        "title": "THE FIXED STAR",
        "rank": "B",
        "role": "ALL-ROUND",
        "line": "One star for a day with logs in two subjects or more. A little of everything, none of it cheap.",
        "max": 12,
        "guard": 6,
        "shield": {"cost": 12, "hours": 36, "power": 1.0},
        "hit": 1.0,
        "rule": ("subjects", 2, 1),
        "hours": 50,
        "unlock": 9_000,
        "price": 450,
        "cooldown": 48,
    },
    "nova": {
        "name": "NOVA",
        "title": "THE BURNING STAR",
        "rank": "A",
        "role": "BURST",
        "line": "Two stars for a day of 3 hours or more, buffs or not. Short days light nothing. Burns too hot to GUARD.",
        "max": 12,
        "guard": None,
        "shield": {"cost": 10, "hours": 24, "power": 1.25},
        "hit": 1.0,
        "rule": ("minutes", 180, 2),
        "hours": 100,
        "unlock": 18_000,
        "price": 900,
        "cooldown": 96,
    },
    "aurora": {
        "name": "AURORA",
        "title": "THE DAWN CURTAIN",
        "rank": "A",
        "role": "BUFFS",
        "line": "One star for a day a buff paid on: the opposite of ASTRA. The cheapest GUARD, and no SHIELD.",
        "max": 12,
        "guard": 4,
        "shield": None,
        "hit": 1.0,
        "rule": ("buffed", 1),
        "hours": 200,
        "unlock": 21_000,
        "price": 1_050,
        "cooldown": 96,
    },
    "nebula": {
        "name": "NEBULA",
        "title": "THE SLOW CLOUD",
        "rank": "B",
        "role": "COVER",
        "line": "One star for any day with 30 minutes logged, buffs or not. Holds the fewest.",
        "max": 10,
        "guard": 5,
        "shield": {"cost": 10, "hours": 72, "power": 1.0},
        "hit": 1.0,
        "rule": ("minutes", 30, 1),
        "hours": 300,
        "unlock": 27_000,
        "price": 1_350,
        "cooldown": 72,
    },
    "orion": {
        "name": "ORION",
        "title": "THE HUNTER",
        "rank": "S",
        "role": "THE HUNT",
        "line": "One star for a day with a single log of 90 minutes or more. No GUARD, no SHIELD: worn, every hit on a boss lands 20% harder.",
        "max": 10,
        "guard": None,
        "shield": None,
        "hit": 1.2,
        "rule": ("long_log", 90, 1),
        "hours": 1_000,
        "unlock": 42_000,
        "price": 2_100,
        "cooldown": 168,
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
    first change none was (an account from when ASTRA came free has it in its
    log, migration 0039)."""
    out = []
    start, charm = None, ""
    for entry in (profile.charm_log if profile else []) or []:
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


def lit_days(user, charm, now=None, exclude=None):
    """[(day, stars, log id, when)] the days `charm` lit, oldest first, worn
    or not: the log that made the day light and when it was committed
    (`exclude`: a log id to leave out)."""
    now = now or timezone.now()
    zone = _zone(user)
    today = timezone.localtime(now, zone).date()
    kind, *args = CHARMS[charm]["rule"]
    stars = args[-1]
    logs = StudyLog.objects.filter(user=user, date__lte=today)
    if exclude is not None:
        logs = logs.exclude(pk=exclude)
    if kind == "nobuff":
        logs = logs.filter(bonus_item="")
    elif kind == "buffed":
        logs = logs.exclude(bonus_item="")
    elif kind == "long_log":
        logs = logs.filter(duration_minutes__gte=args[0])

    # In commit order, so the log that tips a day over is the one that lit it.
    rows = logs.order_by("created_at", "pk").values_list("pk", "date", "created_at", "duration_minutes", "category_id")
    lit, minutes, subjects = {}, {}, {}
    for pk, day, created, mins, category in rows:
        if day in lit or not _lights(day, created, zone):
            continue
        if kind in ("nobuff", "buffed", "long_log"):
            lit[day] = (pk, created)
        elif kind == "minutes":
            minutes[day] = minutes.get(day, 0) + mins
            if minutes[day] >= args[0]:
                lit[day] = (pk, created)
        elif kind == "subjects":
            if category is None:
                continue
            subjects.setdefault(day, set()).add(category)
            if len(subjects[day]) >= args[0]:
                lit[day] = (pk, created)
    return [(day, stars, pk, created) for day, (pk, created) in sorted(lit.items())]


def star_days(user, charm, now=None, profile=None, exclude=None):
    """[(day, stars)] the days `charm` lit, oldest first, worn or not."""
    return [(day, n) for day, n, _, _ in lit_days(user, charm, now, exclude)]


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


def held(user):
    """The charms the user has worn at least once (the log list marks theirs)."""
    ids = {
        item_id[len(PREFIX):]
        for item_id in BitPurchase.objects.filter(user=user, item_id__startswith=PREFIX).values_list(
            "item_id", flat=True
        )
    }
    worn = UserProfile.objects.filter(user=user).values_list("charm", flat=True).first()
    return {i for i in ids | {worn or ""} if i in CHARMS}


def unlocked(user):
    """The charms the user has unlocked."""
    rows = BitPurchase.objects.filter(user=user, item_id__startswith=UNLOCK_PREFIX).values_list("item_id", flat=True)
    return {i[len(UNLOCK_PREFIX):] for i in rows if i[len(UNLOCK_PREFIX):] in CHARMS}


def unlock(user, charm, now=None):
    """Unlocks a charm whose hours are in, paying its unlock price once."""
    from .economy import PurchaseError, bits_summary
    from . import bank

    now = now or timezone.now()
    spec = CHARMS.get(charm)
    if spec is None:
        raise CharmError("Unknown charm.")
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if charm in unlocked(user):
            raise CharmError(f"{spec['name']} is already unlocked.")
        if study_hours(user) < spec["hours"]:
            raise CharmError(f"{spec['name']} opens at {spec['hours']:,} hours studied.")
        try:
            bank.check_not_in_debt(user, now)
        except PurchaseError as exc:
            raise CharmError(str(exc))
        if bits_summary(user)["balance"] < spec["unlock"]:
            raise CharmError("Not enough BITS.")
        BitPurchase.objects.create(user=user, item_id=UNLOCK_PREFIX + charm, price=spec["unlock"])


def worn_now(user, now=None, profile=None):
    profile = profile or UserProfile.objects.filter(user=user).first()
    if profile is None:
        return ""
    return profile.charm if profile.charm in CHARMS else ""


def cooling_until(user, charm, now=None):
    """When `charm` can be worn again after it last came off, or None."""
    now = now or timezone.now()
    ended = (
        BitPurchase.objects.filter(user=user, item_id=PREFIX + charm, expires_at__isnull=False)
        .order_by("-expires_at")
        .values_list("expires_at", flat=True)
        .first()
    )
    if ended is None:
        return None
    until = ended + timedelta(hours=CHARMS[charm]["cooldown"])
    return until if until > now else None


def hit_bonus(user, moment, profile=None):
    """ORION's hunt: the raid damage multiplier of the charm worn (and settled
    in) at `moment`."""
    profile = profile or UserProfile.objects.filter(user=user).first()
    if profile is None:
        return 1.0
    charm = worn_at(profile, moment)
    if not charm or charm not in CHARMS or not attuned(profile, charm, moment):
        return 1.0
    return float(CHARMS[charm].get("hit") or 1.0)


def lit_logs(user, now=None, profile=None):
    """{log id: [charm, ...]}: for every charm, unlocked or not, the log that
    lit each of its days (shown on the log list)."""
    out = {}
    for charm in CHARMS:
        for _, _, pk, _ in lit_days(user, charm, now):
            out.setdefault(pk, []).append(charm)
    return out


def wear(user, charm, now=None):
    """Puts `charm` on, paying its price (or takes the worn one off for
    ""/None). The one that comes off starts its cooldown."""
    from .economy import PurchaseError, bits_summary
    from . import bank

    now = now or timezone.now()
    charm = charm or ""
    if charm and charm not in CHARMS:
        raise CharmError("Unknown charm.")
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        current = worn_now(user, now, profile)
        if current == charm:
            return profile
        if charm:
            spec = CHARMS[charm]
            if charm not in unlocked(user):
                if study_hours(user) < spec["hours"]:
                    raise CharmError(f"{spec['name']} opens at {spec['hours']:,} hours studied.")
                raise CharmError(f"Unlock {spec['name']} first.")
            until = cooling_until(user, charm, now)
            if until:
                raise CharmError(f"{spec['name']} is resting until {timezone.localtime(until, _zone(user)):%m/%d %H:%M}.")
            try:
                bank.check_not_in_debt(user, now)
            except PurchaseError as exc:
                raise CharmError(str(exc))
            if bits_summary(user)["balance"] < spec["price"]:
                raise CharmError("Not enough BITS.")
        if current:
            BitPurchase.objects.filter(user=user, item_id=PREFIX + current, expires_at__isnull=True).update(expires_at=now)
        if charm:
            BitPurchase.objects.create(user=user, item_id=PREFIX + charm, price=CHARMS[charm]["price"])
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
    hours = study_hours(user)
    have = unlocked(user)
    worn = worn_now(user, now, profile)
    cards = []
    for charm, spec in CHARMS.items():
        since = worn_since(profile, charm, now) if profile and worn == charm else None
        cards.append(
            {
                "id": charm,
                "name": spec["name"],
                "title": spec["title"],
                "rank": spec["rank"],
                "role": spec["role"],
                "line": spec["line"],
                "max": spec["max"],
                "guard": spec["guard"],
                "shield": dict(spec["shield"]) if spec["shield"] else None,
                "hit": spec["hit"],
                "wishes": _wish_costs(charm),
                "hours": spec["hours"],
                "price": spec["price"],
                "unlock_price": spec["unlock"],
                "cooldown": spec["cooldown"],
                "cooling_until": _iso(cooling_until(user, charm, now)),
                # The hours are in (it can be unlocked); and it has been unlocked.
                "open": hours >= spec["hours"],
                "unlocked": charm in have,
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


def _iso(moment):
    return moment.isoformat() if moment else None


def _wish_costs(charm):
    from .wishes import WISHES

    return [{"id": use, "cost": cost} for use, cost in WISHES.get(charm, {}).items()]
