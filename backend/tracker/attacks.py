"""
ATTACKS: what a BOSS RAID takes back, in BITS.

A boss attacks on a clock (challenges.raid_attacks), whatever you do, and it
COUNTERs every log that lands on it (its
attack's `counter`, at the moment the log was committed; not the blow that
brings it down). Every blow that lands takes its damage straight from BITS,
kept in the raid's BitPurchase.struck, which the ledger counts as spent. A
wallet left short borrows the rest from TYPBOX BANK as an EMERGENCY loan
(bank.py), so a hard raid can cost far more than it did to start.

A SHIELD is the worn charm's insurance (charms.py): when a blow would land
and the charm has been worn ATTUNE_HOURS and holds its shield's cost in
stars, the stars are spent and no blow lands for the shield's hours. Raised
once per blow (the spend is keyed), kept in UserProfile.shields.

The wishes (wishes.py) have their say before a SHIELD rises: a QUIET SKY
stops the next attack, a VEIL the next counters, and inside a BLAZE every
counter lands double.

Nothing here is stored but the shields: what the raids have taken is replayed
from their attacks and hits each time, so a deleted or edited log, a reset or
an import all come out the same. Raids that fight this way carry
state['attack']['hp'] (the name is from when blows took HP first); older
raids take BITS capped at the balance (challenges._sync_attacks).
"""

from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from .models import BitPurchase, UserProfile


def _parse(raw):
    try:
        moment = datetime.fromisoformat(raw)
    except (TypeError, ValueError):
        return None
    return moment if timezone.is_aware(moment) else timezone.make_aware(moment)


def replayed_raids(user):
    from . import challenges

    return [
        p
        for p in BitPurchase.objects.filter(user=user, item_id__startswith=challenges.RAID_PREFIX).order_by(
            "created_at", "id"
        )
        if ((p.state or {}).get("attack") or {}).get("hp")
    ]


def shields(profile):
    out = []
    for s in (profile.shields if profile else []) or []:
        if not isinstance(s, dict) or s.get("kind"):
            continue  # a wish's (wishes.py)
        start, until = _parse(s.get("from")), _parse(s.get("until"))
        if start and until:
            out.append({**s, "from": start, "until": until})
    return out


def _shielded(windows, moment):
    return next((w for w in windows if w["from"] <= moment < w["until"]), None)


def replay(user, now=None, commit=False, profile=None):
    """Runs the raids' blows up to `now`. Returns {'struck': {purchase id:
    BITS}, 'events': [...] (the last ones), 'shields': [...], 'charges':
    {'hush': n, 'veil': n} still waiting, 'landed': {blow key: BITS}}. With `commit`,
    a SHIELD due on a blow is raised for real (stars spent, window saved):
    the caller holds the profile lock."""
    from . import challenges, wishes

    now = now or timezone.now()
    profile = profile or UserProfile.objects.filter(user=user).first()
    windows = shields(profile)
    hushes, veils = wishes.charges(profile, "hush"), wishes.charges(profile, "veil")
    blows = []
    for p in replayed_raids(user):
        upto = min(now, p.expires_at) if p.expires_at else now
        for attack in challenges.raid_attacks(p, upto):
            if attack["dmg"]:
                blows.append((attack["at"], p, attack["dmg"], False, attack["at"].isoformat()))
        counter = ((p.state or {}).get("attack") or {}).get("counter", 0)
        landed = [e for e in (p.state or {}).get("events", []) if e.get("dmg")]
        if (p.state or {}).get("outcome") == "down" and landed:
            landed = landed[:-1]
        for e in landed if counter else []:
            moment = _parse(e.get("at"))
            if moment and moment <= upto:
                blows.append((moment, p, counter, True, f"c{e.get('log')}"))
    struck = {}
    events = []
    landed_by = {}
    for moment, purchase, dmg, is_counter, key in sorted(blows, key=lambda b: b[0]):
        kind = "counter" if is_counter else "attack"
        window = _shielded(windows, moment)
        if window is None:
            charge = next((c for c in (veils if is_counter else hushes) if c[0] <= moment and c[1] > 0), None)
            if charge is not None:
                charge[1] -= 1
                events.append({"at": moment, "kind": "veiled" if is_counter else "hushed", "of": kind, "bits": 0, "dmg": dmg, "name": purchase.item_id})
                landed_by[f"{purchase.pk}:{key}"] = 0
                continue
        if is_counter and wishes.within(profile, "blaze", moment):
            dmg *= wishes.BLAZE_COUNTER
        if window is None and commit and profile is not None:
            window = _raise_shield(profile, f"shield:{purchase.pk}:{key}", moment, now)
            if window:
                windows.append(window)
        if window is not None:
            events.append({"at": moment, "kind": "shielded", "of": kind, "bits": 0, "dmg": dmg, "name": purchase.item_id})
            landed_by[f"{purchase.pk}:{key}"] = 0
            continue
        struck[purchase.pk] = struck.get(purchase.pk, 0) + dmg
        landed_by[f"{purchase.pk}:{key}"] = dmg
        events.append({"at": moment, "kind": kind, "bits": dmg, "dmg": dmg, "name": purchase.item_id})
    return {
        "struck": struck,
        "events": events[-16:],
        "shields": windows,
        "charges": {
            "hush": sum(c[1] for c in hushes if c[1] > 0),
            "veil": sum(c[1] for c in veils if c[1] > 0),
        },
        "landed": landed_by,
    }


def _raise_shield(profile, key, moment, now):
    from . import charms

    charm = charms.worn_at(profile, moment)
    if not charm or not charms.attuned(profile, charm, moment):
        return None
    spec = charms.CHARMS[charm]["shield"]
    if not charms.take_stars(profile, charm, spec["cost"], now, key=key):
        return None
    window = {
        "from": moment.isoformat(),
        "until": (moment + timedelta(hours=spec["hours"])).isoformat(),
        "charm": charm,
        "key": key,
        "power": spec["power"],
    }
    profile.shields = [*(profile.shields or []), window][-200:]
    profile.save(update_fields=["shields"])
    return {**window, "from": moment, "until": moment + timedelta(hours=spec["hours"])}


def sync(user, now=None):
    """Brings what the raids have taken up to date (raising any SHIELD due on
    the way), then has the bank cover a wallet left short."""
    from . import bank

    now = now or timezone.now()
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        raids = replayed_raids(user)
        if not raids:
            return
        result = replay(user, now, commit=True, profile=profile)
        for p in raids:
            struck = result["struck"].get(p.pk, 0)
            if struck != p.struck:
                p.struck = struck
                p.save(update_fields=["struck"])
        bank.cover_shortfall(user, now)


def counter_landed(user, purchase, log_id, now):
    """BITS the counter to this log took, after a sync (a SHIELD, VEIL or
    BLAZE has had its say)."""
    sync(user, now)
    return replay(user, now)["landed"].get(f"{purchase.pk}:c{log_id}", 0)


def power_at(user, moment, profile=None):
    """The raid damage multiplier of a SHIELD up at `moment` (NOVA's)."""
    profile = profile or UserProfile.objects.filter(user=user).first()
    window = _shielded(shields(profile), moment)
    return float(window.get("power") or 1.0) if window else 1.0


def serialize(user, now=None):
    """The SHIELD up now, if any, and the last blows and what stopped them."""
    now = now or timezone.now()
    profile = UserProfile.objects.filter(user=user).first()
    result = replay(user, now, profile=profile)
    window = _shielded(result["shields"], now)
    return {
        "shield": (
            {"until": window["until"].isoformat(), "charm": window.get("charm"), "power": window.get("power", 1.0)}
            if window
            else None
        ),
        "events": [{**e, "at": e["at"].isoformat()} for e in reversed(result["events"])],
    }
