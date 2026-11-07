"""
MAKE A WISH: what the worn charm's stars buy, besides its GUARD and SHIELD.
Each charm grants four wishes of its own, in its own temper, and any of them
the FESTIVAL wish (a festival piece for 5 stars):

  ASTRA   the steady lyre: sight and the shop.
    reroll     FALLING STAR  a new furniture lineup (every shelf)
    omen       OMEN          see inside this turn's MYSTERY CRATE
    starchart  STARCHART     see next week's FEATURED and LARGE pieces
    hush       QUIET SKY     the boss's next scheduled attack doesn't land
  NOVA    the burning star: hitting hard, at a price.
    supernova  SUPERNOVA     the next hit that lands deals double
    blaze      BLAZE         12h: hits x1.5, but counters land double
    wildfire   WILDFIRE      24h: each hit that lands has a 30% chance of x2
    scatter    SCATTER       re-deal only the shelves that turn daily
  NEBULA  the slow cloud: cover and money.
    veil       VEIL          the next 2 counters don't land
    drift      DRIFT         3 days with no loan interest
    mist       MIST OMEN     whether the crate holds something rare, no more
    silver     SILVER RAIN   the vault's next paying day pays double

Two things are never shown on the page, to be found by playing:
  - DUTY DAY: each charm keeps one weekday a week (a different one each week,
    and each player's own) when all its wishes cost a star less (at least 1).
  - SWELL: NEBULA's wishes sometimes (SWELL_CHANCE) come out stronger: VEIL
    covers 3, DRIFT lasts 5 days, MIST OMEN names the buff, SILVER RAIN pays
    triple.

What a wish leaves running is kept in UserProfile.shields beside the SHIELDs,
each as {"kind": <wish>, ...}; the raid replay (attacks.py), a hit's power
(challenges._boost), the shop (furniture.shop_lineup) and the bank (bank.py)
read it from there. A BITS reset clears it with the SHIELDs.
"""

import random
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from . import charms
from .models import BitPurchase, StudyLog, UserProfile

FESTIVAL_COST = 5
WISHES = {
    "astra": {"reroll": 2, "omen": 3, "starchart": 3, "hush": 4},
    "nova": {"supernova": 5, "blaze": 3, "wildfire": 4, "scatter": 2},
    "nebula": {"veil": 3, "drift": 4, "mist": 1, "silver": 4},
}
ALL = {use for uses in WISHES.values() for use in uses}
KINDS = ALL - {"reroll", "omen"}

BLAZE_HOURS = 12
BLAZE_HIT, BLAZE_COUNTER = 1.5, 2
WILDFIRE_HOURS = 24
WILDFIRE_CHANCE = 0.3
SUPERNOVA_HIT = 2.0
VEIL_COUNTERS = (2, 3)
DRIFT_DAYS = (3, 5)
SILVER_MULT = (2, 3)
SWELL_CHANCE = 0.2
# A crate's buff is RARE at this weight or under (economy.BUFFS crate).
RARE_WEIGHT = 8


class WishError(Exception):
    pass


def _parse(raw):
    try:
        moment = datetime.fromisoformat(raw)
    except (TypeError, ValueError):
        return None
    return moment if timezone.is_aware(moment) else timezone.make_aware(moment)


def _local(user, now):
    return timezone.localtime(now, charms._zone(user))


def duty_weekday(user, charm, now):
    """The weekday (0 = Monday) `charm` keeps this week: its wishes cost a star less."""
    year, week, _ = _local(user, now).isocalendar()
    return random.Random(f"typbox-duty-{user.pk}-{charm}-{year}-{week}").randrange(7)


def cost_of(user, charm, use, now):
    base = FESTIVAL_COST if use == "festival" else WISHES.get(charm, {}).get(use)
    if base is None:
        return None
    if _local(user, now).weekday() == duty_weekday(user, charm, now):
        return max(1, base - 1)
    return base


def entries(profile, kind=None):
    """The running wishes kept on the profile (`kind` for one sort)."""
    out = []
    for e in (profile.shields if profile else []) or []:
        if isinstance(e, dict) and e.get("kind") in KINDS and (kind is None or e["kind"] == kind):
            out.append(e)
    return out


def windows(profile, kind):
    """[(from, until)] of a timed wish."""
    out = []
    for e in entries(profile, kind):
        start, until = _parse(e.get("from")), _parse(e.get("until"))
        if start and until:
            out.append((start, until))
    return out


def within(profile, kind, moment):
    return any(start <= moment < until for start, until in windows(profile, kind))


def _swells(profile):
    seed = f"typbox-swell-{profile.user_id}-{len(profile.star_spends or [])}"
    return random.Random(seed).random() < SWELL_CHANCE


def _keep(profile, entry):
    profile.shields = [*(profile.shields or []), entry][-200:]


# ---------------------------------------------------------------- raids


def hit_power(log, now):
    """(multiplier, [wish ids]) a landed hit gets from NOVA's wishes. Spends
    a waiting SUPERNOVA on it (one freed again if its log is deleted)."""
    with transaction.atomic():
        profile = UserProfile.objects.select_for_update().filter(user=log.user).first()
        if profile is None:
            return 1.0, []
        power, used = 1.0, []
        waiting = _waiting_supernova(profile)
        if waiting is not None:
            waiting["log"] = log.pk
            profile.save(update_fields=["shields"])
            power *= SUPERNOVA_HIT
            used.append("supernova")
        if within(profile, "blaze", now):
            power *= BLAZE_HIT
            used.append("blaze")
        if within(profile, "wildfire", now) and random.Random(f"typbox-wildfire-{log.pk}").random() < WILDFIRE_CHANCE:
            power *= 2
            used.append("wildfire")
        return power, used


def _waiting_supernova(profile):
    for e in entries(profile, "supernova"):
        log = e.get("log")
        if not log or not StudyLog.objects.filter(pk=log).exists():
            return e
    return None


def charges(profile, kind):
    """[[from, left]] of the wishes that stop blows (QUIET SKY, VEIL), oldest
    first: attacks.replay spends them as the blows come."""
    out = []
    for e in entries(profile, kind):
        start = _parse(e.get("from"))
        if start:
            out.append([start, int(e.get("n") or 1)])
    return sorted(out, key=lambda c: c[0])


# ---------------------------------------------------------------- bank


def drift_windows(user, profile=None):
    profile = profile or UserProfile.objects.filter(user=user).first()
    return windows(profile, "drift")


def silver_rains(user, profile=None):
    """[(from, multiplier)] oldest first: each doubles (or triples) the first
    vault day ending after it that pays."""
    profile = profile or UserProfile.objects.filter(user=user).first()
    out = []
    for e in entries(profile, "silver"):
        start = _parse(e.get("from"))
        if start:
            out.append((start, int(e.get("mult") or 2)))
    return sorted(out)


# ---------------------------------------------------------------- shop


def scatter_salt(profile):
    """Extra salt for the shelves that turn daily: one per SCATTER."""
    return len(entries(profile, "scatter")) * 7919


def chart_until(profile, now):
    for e in entries(profile, "starchart"):
        until = _parse(e.get("until"))
        if until and until > now:
            return until
    return None


def chart(user, now, profile):
    """Next week's FEATURED and LARGE pieces, while a STARCHART is up."""
    from . import furniture

    until = chart_until(profile, now)
    if not until:
        return None
    index, _ = furniture.shop_period(user, 7, now)
    salt = profile.shop_salt if profile else 0
    items = [
        item_id
        for tier, count, every in furniture.SHOP_ROTATION
        if every == 7
        for item_id in furniture.lineup_for(tier, count, index + 1, salt)
    ]
    return {"items": items, "until": until.isoformat()}


# ---------------------------------------------------------------- granting


def grant(user, use, now=None, item_id=None):
    """Spends the worn charm's stars on a wish, or raises WishError."""
    from . import attacks, economy, furniture

    now = now or timezone.now()
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        charm = charms.worn_now(user, now, profile)
        if not charm:
            raise WishError("Wear a charm first: wishes spend the worn charm's stars.")
        cost = cost_of(user, charm, use, now)
        if cost is None:
            raise WishError("This charm doesn't grant that wish." if use in ALL else "Unknown wish.")
        swell = charm == "nebula" and _swells(profile)
        fields = []
        entry = None
        if use == "festival":
            festival = economy.festivals.active_on(_local(user, now).date())
            if not festival or item_id not in economy.event_pieces(festival["id"]):
                raise WishError("That piece isn't part of a festival right now.")
            if not economy.owns_furniture(user):
                raise WishError("Choose a starter pack first.")
            if user.bit_purchases.filter(item_id=item_id).exists():
                raise WishError("You already own this piece.")
        elif use == "reroll":
            profile.shop_salt += 1
            fields = ["shop_salt"]
        elif use in ("omen", "mist"):
            if economy._live_omen(profile, now):
                raise WishError("The stars have already spoken.")
            if economy._crate_rests_past_turn(user, now):
                raise WishError("The crate will have changed before it is ready.")
            profile.crate_omen = economy.roll_crate(economy.BUFFS["mystery_crate"])
            profile.crate_omen_until = economy.crate_turns_at(user, now)
            fields = ["crate_omen", "crate_omen_until"]
            if use == "mist" and not swell:
                entry = {"kind": "mist", "until": profile.crate_omen_until.isoformat()}
        elif use == "starchart":
            if chart_until(profile, now):
                raise WishError("The chart is already drawn.")
            _, start = furniture.shop_period(user, 7, now)
            zone = charms._zone(user)
            until = timezone.make_aware(datetime.combine(start + timedelta(days=7), datetime.min.time()), zone)
            entry = {"kind": "starchart", "from": now.isoformat(), "until": until.isoformat()}
        elif use in ("hush", "veil"):
            if not attacks.replayed_raids(user) or not _raid_running(user, now):
                raise WishError("No boss is fighting you.")
            if attacks.replay(user, now, profile=profile)["charges"][use]:
                raise WishError("One is already waiting.")
            entry = {"kind": use, "from": now.isoformat(), "n": 1 if use == "hush" else VEIL_COUNTERS[swell]}
        elif use == "supernova":
            if _waiting_supernova(profile) is not None:
                raise WishError("One is already waiting.")
            entry = {"kind": "supernova", "from": now.isoformat(), "log": None}
        elif use in ("blaze", "wildfire"):
            if within(profile, use, now):
                raise WishError("It is already burning.")
            hours = BLAZE_HOURS if use == "blaze" else WILDFIRE_HOURS
            entry = {"kind": use, "from": now.isoformat(), "until": (now + timedelta(hours=hours)).isoformat()}
        elif use == "scatter":
            entry = {"kind": "scatter", "from": now.isoformat()}
        elif use == "drift":
            if within(profile, "drift", now):
                raise WishError("The interest is already asleep.")
            entry = {
                "kind": "drift",
                "from": now.isoformat(),
                "until": (now + timedelta(days=DRIFT_DAYS[swell])).isoformat(),
            }
        elif use == "silver":
            from . import bank

            if any(not used for _, _, used in bank.silver_state(user, now)):
                raise WishError("The rain is already on its way.")
            entry = {"kind": "silver", "from": now.isoformat(), "mult": SILVER_MULT[swell]}
        if not charms.take_stars(profile, charm, cost, now):
            raise WishError("Not enough stars.")
        if use == "festival":
            BitPurchase.objects.create(user=user, item_id=item_id, price=0)
        if entry is not None:
            entry["charm"] = charm
            if swell:
                entry["swell"] = True
            _keep(profile, entry)
            fields.append("shields")
        if fields:
            profile.save(update_fields=sorted(set(fields)))
        return {"use": use, "swell": swell}


def _raid_running(user, now):
    from . import challenges

    return (
        BitPurchase.objects.filter(user=user, item_id__startswith=challenges.RAID_PREFIX, expires_at__gt=now)
        .exclude(state__outcome__isnull=False)
        .exists()
    )


def serialize(user, now, profile):
    """The worn charm's wishes, each with today's cost and what it has running."""
    from . import attacks, bank

    charm = charms.worn_now(user, now, profile) or None
    if not charm:
        return {"charm": None, "list": [], "festival": FESTIVAL_COST, "running": {}}
    replay = attacks.replay(user, now, profile=profile)
    running = {
        "hush": replay["charges"]["hush"],
        "veil": replay["charges"]["veil"],
        "supernova": int(_waiting_supernova(profile) is not None) if profile else 0,
        "blaze": _until(profile, "blaze", now),
        "wildfire": _until(profile, "wildfire", now),
        "drift": _until(profile, "drift", now),
        "silver": sum(1 for _, _, used in bank.silver_state(user, now) if not used),
        "starchart": chart(user, now, profile),
    }
    return {
        "charm": charm,
        "list": [
            {"id": use, "cost": cost_of(user, charm, use, now), "base": base}
            for use, base in WISHES[charm].items()
        ],
        "festival": cost_of(user, charm, "festival", now),
        "running": running,
    }


def _until(profile, kind, now):
    ends = [until for start, until in windows(profile, kind) if start <= now < until]
    return max(ends).isoformat() if ends else None


def omen_hint(profile, now):
    """For a MIST OMEN: 'rare' / 'common' in place of the buff's name, or None."""
    from . import economy

    omen = economy._live_omen(profile, now)
    if not omen:
        return None
    for e in entries(profile, "mist"):
        until = _parse(e.get("until"))
        if until and profile.crate_omen_until and abs((until - profile.crate_omen_until).total_seconds()) < 1:
            weight = economy.BUFFS["mystery_crate"]["crate"].get(omen, 0)
            return "rare" if weight <= RARE_WEIGHT else "common"
    return None


# A backup brings back at most this many of each wish (SCATTERs only move the
# shop), and only ones made in the last RESTORE_DAYS: a hand-edited file can't
# conjure a month of free interest or a stack of QUIET SKYs.
RESTORE_KEEP = {"scatter": 20}
RESTORE_DAYS = 7


def restore_all(rows, now=None):
    """The running wishes from a backup's list, cleaned and capped."""
    now = now or timezone.now()
    kept, counts = [], {}
    for raw in reversed(rows if isinstance(rows, list) else []):
        wish = restore(raw)
        if wish is None:
            continue
        start = _parse(wish.get("from") or wish.get("until"))
        if start is None or not now - timedelta(days=RESTORE_DAYS) <= start <= now + timedelta(days=RESTORE_DAYS):
            continue
        if counts.get(wish["kind"], 0) >= RESTORE_KEEP.get(wish["kind"], 1):
            continue
        counts[wish["kind"]] = counts.get(wish["kind"], 0) + 1
        kept.append(wish)
    return list(reversed(kept))


def restore(raw):
    """A running wish from a backup, cleaned, or None."""
    if not isinstance(raw, dict) or raw.get("kind") not in KINDS:
        return None
    out = {"kind": raw["kind"]}
    for key in ("from", "until"):
        moment = _parse(raw.get(key)) if raw.get(key) else None
        if moment:
            out[key] = moment.isoformat()
    if "from" not in out and raw["kind"] != "mist":
        return None
    if raw.get("charm") in charms.CHARMS:
        out["charm"] = raw["charm"]
    if raw["kind"] in ("hush", "veil"):
        n = raw.get("n")
        out["n"] = min(3, max(1, n)) if isinstance(n, int) and not isinstance(n, bool) else 1
    if raw["kind"] == "silver":
        out["mult"] = 3 if raw.get("mult") == 3 else 2
    if raw["kind"] == "supernova":
        if raw.get("log"):
            return None  # spent: the log it went into has a new id here
        out["log"] = None
    if raw.get("swell") is True:
        out["swell"] = True
    if raw["kind"] in ("blaze", "wildfire", "drift", "starchart", "mist") and "until" not in out:
        return None
    if "until" in out and "from" in out and not timedelta(0) < _parse(out["until"]) - _parse(out["from"]) <= timedelta(days=7):
        return None
    return out
