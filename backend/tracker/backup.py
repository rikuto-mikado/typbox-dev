"""
The BITS side of a backup: purchases (with what they paid, cost and how they
ended), TRADE orders, the room, what was spent of STARLIGHT and the account's preferences.
An export carries it as `economy`, and importing the same file puts the balance,
the furniture, the COLLECTION and the room back where they were.

A backup is the owner's own file. Its logs already decide its BITS, so the checks
here are about keeping the account working (shape, known ids, sane numbers), not
about catching a doctored file.

Not everything can come back as it was: a CHALLENGE still running at export isn't
restored and its entry fee comes back (its hits point at logs that get new ids),
and a buff still running ends at the import with the usual refund.
"""

from collections import Counter
from datetime import timezone as dt_timezone

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from . import challenges, trade
from .blessings import BLESSINGS, PREFIX as BLESSING_PREFIX
from .economy import BUFFS, LEGACY_BUFFS, RUNNABLE_BUFFS, crate_turns_at, active_buff, refund_amount
from .furniture import (
    FURNITURE,
    ROOM_NAME_MAX,
    ROOM_SLOTS,
    inventory,
    sanitize_layout,
)
from .models import BitPurchase, TradeOrder, UserProfile

MAX_IMPORTED_PURCHASES = 20000
MAX_IMPORTED_TRADES = 20000
MAX_AMOUNT = 10_000_000
MAX_TRADE_UNITS = 10**15
MAX_LOG_BONUS = 100_000
OUTCOMES = ("down", "escaped", "won", "lost", "tie", "forfeit")
# What the ledger and the cooldown still read off an ended buff.
KEPT_BUFF_STATE = ("no_cooldown", "ended_at")
# Plain settings, restored only where the account has none of its own.
PREFERENCES = (
    "avatar_color",
    "avatar_preset",
    "surface_theme",
    "language",
    "timezone",
    "week_start",
    "chrono_theme",
    "user_statuses",
    "weather_theme",
    "weather_unit",
    "weather_hidden",
    "ui_font",
    "ambient_theme",
    "ambient_clock",
    "cursor_theme",
)


def export_economy(user):
    """The `economy` section of a backup. Settles what has finished first."""
    now = timezone.now()
    challenges.active_challenge(user, now)
    active_buff(user, now)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    purchases = [
        {
            "item_id": p.item_id,
            "price": p.price,
            "refunded": p.refunded,
            "payout": p.payout,
            "struck": p.struck,
            "bonus_earned": p.bonus_earned,
            "via": p.via,
            "rules": p.rules,
            "state": p.state,
            "category_code": p.category.code if p.category else "",
            "created_at": p.created_at.isoformat(),
            "expires_at": p.expires_at.isoformat() if p.expires_at else None,
            "remaining_minutes": p.remaining_minutes,
            "remaining_uses": p.remaining_uses,
        }
        for p in BitPurchase.objects.filter(user=user).select_related("category")
    ]
    trades = [
        {
            "asset": o.asset,
            "kind": o.kind,
            "units": o.units,
            "price": o.price,
            "bits": o.bits,
            "basis": o.basis,
            "fee": o.fee,
            "tax": o.tax,
            "created_at": o.created_at.isoformat(),
        }
        for o in TradeOrder.objects.filter(user=user).order_by("created_at", "id")
    ]
    return {
        "version": 1,
        "purchases": purchases,
        "trades": trades,
        "room": {
            "layout": profile.room_layout,
            "slots": profile.room_slots,
            "active_slot": profile.room_active_slot,
            "reserve": profile.shop_reserve,
        },
        "starlight": {
            "spends": profile.star_spends,
            "last_guard": profile.last_guard,
            "crate_omen": profile.crate_omen,
            "crate_omen_until": profile.crate_omen_until,
            "shop_salt": profile.shop_salt,
        },
        "preferences": {key: getattr(profile, key) for key in PREFERENCES},
    }


def log_blessing(entry):
    """(blessing, bonus) a log carried in a backup with its economy."""
    from .blessings import MAX_BONUS

    blessing = entry.get("blessing")
    if not isinstance(blessing, str) or blessing not in BLESSINGS:
        return "", 0
    return blessing, _amount(entry.get("blessingBits", entry.get("blessing_bits")), MAX_BONUS)


def log_bonus(entry):
    """A log's buff bonus from a backup that carries its economy."""
    raw = entry.get("bonusBits", entry.get("bonus_bits"))
    return _amount(raw, MAX_LOG_BONUS)


def _amount(raw, ceiling=MAX_AMOUNT):
    if isinstance(raw, bool) or not isinstance(raw, int):
        return 0
    return max(0, min(ceiling, raw))


def _moment(raw):
    if not isinstance(raw, str):
        return None
    try:
        moment = parse_datetime(raw)
    except (ValueError, OverflowError):
        return None
    if moment is None:
        return None
    if timezone.is_naive(moment):
        moment = timezone.make_aware(moment, dt_timezone.utc)
    return moment


def _purchase_from(row, user, categories, now):
    """The BitPurchase a backup row stands for, or None for what can't come back."""
    item_id = row.get("item_id")
    created = _moment(row.get("created_at"))
    if not isinstance(item_id, str) or created is None or created > now:
        return None
    price = _amount(row.get("price"))
    refunded = min(price, _amount(row.get("refunded")))
    expires = _moment(row.get("expires_at"))
    state = row.get("state") if isinstance(row.get("state"), dict) else {}
    obj = BitPurchase(
        user=user,
        item_id=item_id,
        price=price,
        refunded=refunded,
        bonus_earned=_amount(row.get("bonus_earned")),
        expires_at=expires,
        state={},
    )
    if challenges.is_challenge(item_id):
        # Only a settled one comes back: see the module's docstring.
        if row.get("remaining_uses") != 0 or state.get("outcome") not in OUTCOMES:
            return None
        obj.remaining_uses = 0
        obj.payout = _amount(row.get("payout"))
        obj.struck = _amount(row.get("struck"))
        obj.state = {"outcome": state["outcome"]}
        if _amount(state.get("bonus")):
            obj.state["bonus"] = _amount(state["bonus"])
        return obj
    if item_id.startswith(BLESSING_PREFIX):
        if item_id[len(BLESSING_PREFIX):] not in BLESSINGS or expires is not None:
            return None
        return obj
    if item_id in FURNITURE:
        if FURNITURE[item_id]["tier"] == 0 or expires is not None:
            return None
        return obj
    if item_id not in RUNNABLE_BUFFS and item_id not in LEGACY_BUFFS:
        return None
    via = row.get("via")
    obj.via = via if isinstance(via, str) and via in BUFFS else ""
    rules = row.get("rules")
    obj.rules = rules if rules in (1, 2) else 2
    if obj.rules == 1 and item_id not in LEGACY_BUFFS:
        obj.rules = 2
    if obj.rules == 2 and item_id not in BUFFS:
        return None
    code = row.get("category_code")
    if isinstance(code, str) and code:
        obj.category = categories.get(code.upper())
    obj.remaining_minutes = (
        _amount(row["remaining_minutes"]) if row.get("remaining_minutes") is not None else None
    )
    obj.remaining_uses = (
        _amount(row["remaining_uses"]) if row.get("remaining_uses") is not None else None
    )
    for key in KEPT_BUFF_STATE:
        if key in state:
            obj.state[key] = state[key]
    # Always stored the way the server writes it: with its offset.
    ended = _moment(obj.state.pop("ended_at", None))
    if ended is not None:
        obj.state["ended_at"] = ended.isoformat()
    if "no_cooldown" in obj.state and not isinstance(obj.state["no_cooldown"], bool):
        del obj.state["no_cooldown"]
    # A buff still running ends here, as if cancelled just now.
    if expires is None or expires > now:
        if (obj.remaining_minutes is None or obj.remaining_minutes > 0) and (
            obj.remaining_uses is None or obj.remaining_uses > 0
        ):
            obj.refunded = max(obj.refunded, min(obj.price, refund_amount(obj)))
        obj.expires_at = now
        obj.state["ended_at"] = now.isoformat()
    return obj


def _restore_purchases(user, rows, categories, now):
    held = {
        (item_id, created.astimezone(dt_timezone.utc))
        for item_id, created in BitPurchase.objects.filter(user=user).values_list(
            "item_id", "created_at"
        )
    }
    objs, stamps = [], []
    for row in rows:
        if not isinstance(row, dict):
            continue
        obj = _purchase_from(row, user, categories, now)
        if obj is None:
            continue
        created = _moment(row["created_at"]).astimezone(dt_timezone.utc)
        if (obj.item_id, created) in held:
            continue
        held.add((obj.item_id, created))
        objs.append(obj)
        stamps.append(created)
    if objs:
        created_rows = BitPurchase.objects.bulk_create(objs)
        # created_at is auto_now_add (overwritten on insert).
        for obj, stamp in zip(created_rows, stamps):
            obj.created_at = stamp
        BitPurchase.objects.bulk_update(created_rows, ["created_at"], batch_size=1000)
    return len(objs)


def _trade_from(row, user, now):
    """(order, moment) for a backup row, with the signs its kind must have, or None."""
    if not isinstance(row, dict):
        return None
    asset, kind = row.get("asset"), row.get("kind")
    created = _moment(row.get("created_at"))
    if not isinstance(asset, str) or asset not in trade.ASSETS or created is None or created > now:
        return None
    price = row.get("price")
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not 0 < price < 1e10:
        return None
    units = _amount(abs(row["units"]) if isinstance(row.get("units"), int) else 0, MAX_TRADE_UNITS)
    bits = _amount(abs(row["bits"]) if isinstance(row.get("bits"), int) else 0)
    basis = _amount(abs(row["basis"]) if isinstance(row.get("basis"), int) else 0)
    fee, tax = _amount(row.get("fee")), _amount(row.get("tax"))
    if kind == TradeOrder.BUY:
        if not units or not bits:
            return None
        bits, basis = -bits, bits
    elif kind == TradeOrder.SELL:
        if not units:
            return None
        units, basis = -units, -basis
    else:
        return None
    order = TradeOrder(
        user=user, asset=asset, kind=kind, units=units, price=float(price),
        bits=bits, basis=basis, fee=fee, tax=tax,
    )
    return order, created.astimezone(dt_timezone.utc)


def _restore_trades(user, rows, now):
    """Adds what the account doesn't have yet, oldest first. Walking the merged
    history keeps every position at or above zero: a sale with nothing left to
    sell stays out."""
    existing = list(
        TradeOrder.objects.filter(user=user).values_list(
            "asset", "kind", "units", "basis", "created_at"
        )
    )
    held = {(a, k, c.astimezone(dt_timezone.utc)) for a, k, _, _, c in existing}
    incoming = []
    for row in rows:
        parsed = _trade_from(row, user, now)
        if parsed is None:
            continue
        order, created = parsed
        if (order.asset, order.kind, created) in held:
            continue
        held.add((order.asset, order.kind, created))
        incoming.append((created, order))
    # Same-moment rows: what is already there first, buys before sales.
    timeline = [(c.astimezone(dt_timezone.utc), 0, u, b, a, None) for a, _, u, b, c in existing]
    timeline += [
        (created, 1 if o.units >= 0 else 2, o.units, o.basis, o.asset, o) for created, o in incoming
    ]
    timeline.sort(key=lambda e: (e[0], e[1]))
    units, basis = Counter(), Counter()
    objs, stamps = [], []
    for created, _, u, b, asset, order in timeline:
        if order is not None and units[asset] + u < 0:
            continue
        if order is not None and order.kind == TradeOrder.SELL:
            b = order.basis = max(b, -basis[asset])
        units[asset] += u
        basis[asset] += b
        if order is not None:
            objs.append(order)
            stamps.append(created)
    if objs:
        created_rows = TradeOrder.objects.bulk_create(objs)
        # created_at is auto_now_add (overwritten on insert).
        for obj, stamp in zip(created_rows, stamps):
            obj.created_at = stamp
        TradeOrder.objects.bulk_update(created_rows, ["created_at"], batch_size=1000)
    return len(objs)


def _clean_slots(raw, owned):
    slots = []
    for entry in (raw if isinstance(raw, list) else [])[:ROOM_SLOTS]:
        entry = entry if isinstance(entry, dict) else {}
        name = entry.get("name")
        slot = {
            "name": name.strip()[:ROOM_NAME_MAX]
            if isinstance(name, str) and name.strip()
            else f"ROOM {len(slots) + 1}",
            "layout": {},
            "saved": None,
            "saved_at": entry["saved_at"][:40] if isinstance(entry.get("saved_at"), str) else None,
        }
        if isinstance(entry.get("layout"), dict) and entry["layout"]:
            slot["layout"] = sanitize_layout(entry["layout"], owned)
        if isinstance(entry.get("saved"), dict) and entry["saved"]:
            slot["saved"] = sanitize_layout(entry["saved"], owned)
        slots.append(slot)
    return slots


def _restore_room(profile, raw, user):
    """Only into an account that hasn't arranged a room of its own."""
    if profile.room_layout or profile.room_slots:
        return
    owned = inventory(user)
    if isinstance(raw.get("layout"), dict) and raw["layout"]:
        profile.room_layout = sanitize_layout(raw["layout"], owned)
    profile.room_slots = _clean_slots(raw.get("slots"), owned)
    active = raw.get("active_slot")
    if isinstance(active, int) and not isinstance(active, bool) and 0 <= active < ROOM_SLOTS:
        profile.room_active_slot = active
    reserve = raw.get("reserve")
    if isinstance(reserve, str) and FURNITURE.get(reserve, {}).get("tier", 0) and not profile.shop_reserve:
        profile.shop_reserve = reserve


def _restore_starlight(profile, raw):
    # Two equal wishes on one day are two wishes: count them, don't merge them.
    held = Counter(
        (s.get("day"), s.get("n"))
        for s in (profile.star_spends or [])
        if isinstance(s, dict)
    )
    spends = list(profile.star_spends or [])
    for s in raw.get("spends") if isinstance(raw.get("spends"), list) else []:
        if (
            isinstance(s, dict)
            and isinstance(s.get("day"), str)
            and len(s["day"]) <= 10
            and _amount(s.get("n"), 1000)
        ):
            if held[(s["day"], s["n"])] > 0:
                held[(s["day"], s["n"])] -= 1
                continue
            spends.append({"day": s["day"], "n": s["n"]})
    profile.star_spends = spends[-5000:]
    guard = raw.get("last_guard")
    if (
        not profile.last_guard
        and isinstance(guard, dict)
        and isinstance(guard.get("at"), str)
        and isinstance(guard.get("name"), str)
    ):
        profile.last_guard = {"at": guard["at"][:40], "name": guard["name"][:40]}
    omen = raw.get("crate_omen")
    until = _moment(raw.get("crate_omen_until"))
    # Only while that crate is still the one on the shelf, and never longer.
    if (
        not profile.crate_omen
        and isinstance(omen, str)
        and omen in RUNNABLE_BUFFS
        and until
        and timezone.now() < until <= crate_turns_at(profile.user, timezone.now())
    ):
        profile.crate_omen = omen
        profile.crate_omen_until = until
    profile.shop_salt = max(profile.shop_salt, _amount(raw.get("shop_salt"), 1_000_000))


def _restore_preferences(user, raw):
    """One field at a time through the profile's own validation, so one bad
    value doesn't cost the rest."""
    from .serializers import UserSerializer  # serializers imports economy

    profile = user.profile
    for key in PREFERENCES:
        if key not in raw or getattr(profile, key) not in ("", None, [], "initial", "mon"):
            continue
        serializer = UserSerializer(user, data={key: raw[key]}, partial=True)
        if serializer.is_valid():
            serializer.save()
            profile.refresh_from_db()


def restore_economy(user, raw, categories):
    """Puts a backup's `economy` section on the account, inside the caller's
    transaction. Returns how many purchases came back. Safe to repeat: what is
    already on the account isn't added twice."""
    if not isinstance(raw, dict):
        return 0
    now = timezone.now()
    rows = raw.get("purchases")
    rows = rows if isinstance(rows, list) else []
    restored = _restore_purchases(user, rows, categories, now)
    trades = raw.get("trades")
    _restore_trades(user, trades if isinstance(trades, list) else [], now)
    profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
    if isinstance(raw.get("room"), dict):
        _restore_room(profile, raw["room"], user)
    if isinstance(raw.get("starlight"), dict):
        _restore_starlight(profile, raw["starlight"])
    profile.save()
    if isinstance(raw.get("preferences"), dict):
        _restore_preferences(user, raw["preferences"])
    return restored
