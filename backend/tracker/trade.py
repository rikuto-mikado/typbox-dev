"""
TRADE: four investment packages bought and sold with BITS (the BITS // EXCHANGE's
TRADE tab).

Prices are made up, not fetched: each package follows its own random walk
(geometric Brownian motion, with a regime switch, mean reversion, leverage or
news jumps depending on its character). One game day is meant to feel like
about a week of a real market.

How a price is made
- Every package has one close per market day (a UTC date) in MarketDay. A
  day's close comes from the day before plus a draw from a random generator
  seeded with a server-side secret (TRADE_SEED, falling back to SECRET_KEY), the
  package and the date. The table is a cache: dropping it regenerates the same
  prices.
- Inside a day the price moves every TICK_SECONDS along a Brownian bridge from
  the previous close (the open) to the day's close, seeded the same way, so the
  path through the day needs no storage either.
- Today's close is decided before the day starts, so only ticks up to the
  current moment ever leave the server.

What keeps BITS from piling up (deliberately just three rules)
- a trading fee on every buy and sale (FEE_BP), higher for the wilder packages;
- a trust fee on the two funds (TRUST_BP a year), taken out of their price
  every day the way a real fund's is;
- TAX_PCT of every realised gain. Losses pay none.
On top of that, the principal that can sit in each package is capped (`cap`,
fees included; growth doesn't count against it), so one lucky day on BIO
VENTURE or QUANTUM COIN pays for a piece of furniture, not for the room. TRADE
opens once UNLOCK_MINUTES of study have been logged.

The ledger: every TradeOrder carries the BITS it moved (`bits`, signed), which
economy.bits_summary adds to the balance. Positions are the sums of their
orders' `units` (millionths of a unit) and `basis` (the principal still in).
"""

import hashlib
import math
import random
from datetime import datetime, time, timedelta
from datetime import timezone as dt_timezone
from functools import lru_cache

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import MarketDay, StudyLog, TradeOrder, UserProfile

# The first market day: there is history to look at from the start.
MARKET_EPOCH = datetime(2026, 8, 1).date()
TICK_SECONDS = 300
TICKS_PER_DAY = 86400 // TICK_SECONDS
# Closes sent for the long chart.
HISTORY_DAYS = 90
NEWS_DAYS = 14
# Positions are kept in millionths of a unit.
UNIT = 1_000_000
TAX_PCT = 20
MIN_ORDER = 10
MAX_ORDER = 10_000_000
UNLOCK_MINUTES = 600
ORDERS_SHOWN = 25

# Days of a full moon (lit fraction above this) shake BIO VENTURE harder.
FULL_MOON_FROM = 0.85
FULL_MOON_BOOST = 0.8

ASSETS = {
    "global_index": {
        "ticker": "GLBL",
        "name": "GLOBAL INDEX",
        "kind": "fund",
        "tagline": "The whole world in one fund — slow and steady",
        "detail": "Thousands of companies in one package. It wobbles a little from day to day, but held for a month or more it climbs steadily. No cap: the calm place for savings.",
        "start": 1000.0,
        "fee_bp": 20,
        "trust_bp": 50,
        "cap": None,
        "model": "drift",
        "sigma": 0.006,
        "drift": math.log(1.30) / 365,
    },
    "tech_titans": {
        "ticker": "TITN",
        "name": "TECH TITANS",
        "kind": "fund",
        "tagline": "Chips and platforms — booms and busts that last days",
        "detail": "The giants of tech and semiconductors. The market swings between booms and busts that run for several days at a time; ride a boom, step aside in a bust. Medium risk, medium return.",
        "start": 500.0,
        "fee_bp": 50,
        "trust_bp": 100,
        "cap": 30_000,
        "model": "regime",
        "sigma": 0.02,
        "bull": 0.0055,
        "bear": -0.0035,
        "switch": 0.18,
    },
    "bio_venture": {
        "ticker": "BIOV",
        "name": "BIO VENTURE",
        "kind": "stock",
        "tagline": "A biotech start-up — news and the moon move it",
        "detail": "A young lab living from one trial result to the next. Headlines send it soaring or sinking within the day, and it gets wilder around the full moon. Made for quick trades.",
        "start": 200.0,
        "fee_bp": 100,
        "trust_bp": 0,
        "cap": 10_000,
        "model": "revert",
        "sigma": 0.05,
        "anchor": 200.0,
        "kappa": 0.02,
        "moon": True,
        "events": 0.12,
        "jump": (0.10, 0.30),
    },
    "quantum_coin": {
        "ticker": "QBIT",
        "name": "QUANTUM COIN",
        "kind": "crypto",
        "tagline": "Leveraged crypto — double or half in a day",
        "detail": "A coin traded at three times leverage. It can double or halve in a single day, and leverage slowly eats into anyone who just sits on it. Only play with BITS you can lose.",
        "start": 1000.0,
        "fee_bp": 200,
        "trust_bp": 0,
        "cap": 5_000,
        "model": "leveraged",
        "sigma": 0.065,
        "leverage": 3,
        "anchor": 2000.0,
        "kappa": 0.03,
        "events": 0.06,
        "jump": (0.42, 0.69),
    },
}

HEADLINES = {
    "bio_venture": {
        "up": [
            "PHASE III TRIAL MEETS ITS ENDPOINT",
            "REGULATOR FAST-TRACKS LEAD CANDIDATE",
            "BIG PHARMA BUYOUT RUMOURS",
            "LAB REPORTS A BREAKTHROUGH",
            "LICENSING DEAL SIGNED",
        ],
        "down": [
            "TRIAL HALTED ON A SAFETY SIGNAL",
            "REGULATOR ASKS FOR MORE DATA",
            "LEAD SCIENTIST WALKS OUT",
            "PATENT CHALLENGE FILED",
            "CASH RUNWAY WARNING",
        ],
    },
    "quantum_coin": {
        "up": [
            "WHALE WALLET BUYS IN",
            "LISTED ON A MAJOR EXCHANGE",
            "CELEBRITY POST SENDS IT FLYING",
            "STAKING UPGRADE GOES LIVE",
        ],
        "down": [
            "EXCHANGE HACK DRAINS RESERVES",
            "REGULATORS CRACK DOWN",
            "DEVS ABANDON THE ROADMAP",
            "WHALE DUMPS ITS BAG",
        ],
    },
}


class TradeError(Exception):
    pass


# ------------------------------------------------------------------
# Prices
# ------------------------------------------------------------------


def _seed():
    return getattr(settings, "TRADE_SEED", "") or settings.SECRET_KEY


def _rng(asset, day, purpose):
    digest = hashlib.sha256(f"{_seed()}|{asset}|{day.isoformat()}|{purpose}".encode()).digest()
    return random.Random(int.from_bytes(digest[:16], "big"))


def _moon_boost(day):
    """BIO VENTURE's volatility multiplier for a day (1 away from the full moon)."""
    from .economy import moon_light  # economy imports this module

    light = moon_light(datetime.combine(day, time(12), tzinfo=dt_timezone.utc))
    return 1 + FULL_MOON_BOOST * max(0.0, (light - FULL_MOON_FROM) / (1 - FULL_MOON_FROM))


def next_close(asset, day, prev_close, prev_state):
    """(close, state) of `day`, from the day before. Deterministic."""
    spec = ASSETS[asset]
    rng = _rng(asset, day, "day")
    x = math.log(prev_close)
    z = rng.gauss(0, 1)
    sigma = spec["sigma"]
    trust = spec["trust_bp"] / 10000 / 365
    state = {}
    model = spec["model"]
    if model == "drift":
        r = spec["drift"] - trust + sigma * z
    elif model == "regime":
        regime = prev_state.get("regime", "bull")
        if rng.random() < spec["switch"]:
            regime = "bear" if regime == "bull" else "bull"
        state["regime"] = regime
        r = spec[regime] - trust + sigma * z
    elif model == "revert":
        if spec.get("moon"):
            boost = _moon_boost(day)
            if boost > 1:
                state["moon"] = round(boost, 2)
            sigma *= boost
        r = spec["kappa"] * (math.log(spec["anchor"]) - x) + sigma * z
    else:  # leveraged
        r = math.log(max(0.05, 1 + spec["leverage"] * sigma * z))
        r += spec["kappa"] * (math.log(spec["anchor"]) - x)
        sigma *= spec["leverage"]
    if spec.get("events") and rng.random() < spec["events"]:
        up = rng.random() < 0.5
        jump = rng.uniform(*spec["jump"]) * (1 if up else -1)
        state["event"] = {
            "tick": rng.randrange(12, TICKS_PER_DAY - 12),
            "jump": jump,
            "headline": rng.choice(HEADLINES[asset]["up" if up else "down"]),
        }
        r += jump
    state["vol"] = sigma
    close = min(1e9, max(1e-6, math.exp(x + r)))
    return close, state


@lru_cache(maxsize=128)
def _path(asset, day, open_, close, vol, jump, jump_tick):
    """The day's price at every tick (tick 0 is the open)."""
    rng = _rng(asset, day, "path")
    n = TICKS_PER_DAY
    walk = [0.0]
    for _ in range(n):
        walk.append(walk[-1] + rng.gauss(0, 1))
    scale = 1 / math.sqrt(n)
    x0, x1 = math.log(open_), math.log(close)
    end = walk[n]
    prices = []
    for k in range(n):
        frac = k / n
        bridge = (walk[k] - frac * end) * scale
        x = x0 + frac * (x1 - x0 - jump) + (jump if k >= jump_tick else 0.0) + vol * bridge
        prices.append(math.exp(x))
    return tuple(prices)


def day_path(asset, day, open_, row):
    event = (row.state or {}).get("event") or {}
    return _path(
        asset,
        day,
        open_,
        row.close,
        (row.state or {}).get("vol", ASSETS[asset]["sigma"]),
        event.get("jump", 0.0),
        event.get("tick", TICKS_PER_DAY),
    )


def ensure_market(today):
    """Generates every missing close up to and including `today`."""
    for asset, spec in ASSETS.items():
        last = MarketDay.objects.filter(asset=asset, day__lte=today).order_by("-day").first()
        if last is not None and last.day >= today:
            continue
        if last is None:
            day, close, state = MARKET_EPOCH, spec["start"], {}
        else:
            day, close, state = last.day + timedelta(days=1), last.close, last.state or {}
        rows = []
        while day <= today:
            close, state = next_close(asset, day, close, state)
            rows.append(MarketDay(asset=asset, day=day, close=close, state=state))
            day += timedelta(days=1)
        MarketDay.objects.bulk_create(rows, ignore_conflicts=True)


def _market_day(now):
    return now.astimezone(dt_timezone.utc).date()


def _day_start(day):
    return datetime.combine(day, time(0), tzinfo=dt_timezone.utc)


def _tick_index(now):
    start = _day_start(_market_day(now))
    return min(TICKS_PER_DAY - 1, int((now - start).total_seconds() // TICK_SECONDS))


def market(now=None, history_days=HISTORY_DAYS):
    """{asset: {'price', 'ticks', 'closes', 'news', 'moon'}} as of now. `ticks` is
    the last 24 hours, oldest first, so it reads the same at any hour; only what
    has already happened: today's close never leaves here."""
    now = now or timezone.now()
    today = _market_day(now)
    if today < MARKET_EPOCH:
        raise TradeError("The market hasn't opened yet.")
    ensure_market(today)
    since = today - timedelta(days=max(history_days, NEWS_DAYS) + 1)
    rows = {}
    for row in MarketDay.objects.filter(day__gte=since, day__lte=today):
        rows.setdefault(row.asset, {})[row.day] = row
    tick = _tick_index(now)
    out = {}
    for asset, spec in ASSETS.items():
        days = rows.get(asset, {})
        row = days[today]
        prev = days.get(today - timedelta(days=1))
        open_ = prev.close if prev is not None else spec["start"]
        ticks = day_path(asset, today, open_, row)[: tick + 1]
        if prev is not None:
            before = days.get(today - timedelta(days=2))
            yesterday_open = before.close if before is not None else spec["start"]
            ticks = day_path(asset, today - timedelta(days=1), yesterday_open, prev)[tick:] + ticks
        news = []
        for day in sorted(days, reverse=True):
            event = (days[day].state or {}).get("event")
            if not event or day < today - timedelta(days=NEWS_DAYS):
                continue
            if day == today and event["tick"] > tick:
                continue
            news.append(
                {
                    "at": (_day_start(day) + timedelta(seconds=event["tick"] * TICK_SECONDS)).isoformat(),
                    "headline": event["headline"],
                    "up": event["jump"] > 0,
                }
            )
        out[asset] = {
            "price": ticks[-1],
            "ticks": list(ticks),
            "closes": [
                (day.isoformat(), days[day].close)
                for day in sorted(days)
                if today - timedelta(days=history_days) <= day < today
            ],
            "news": news,
            "moon": (row.state or {}).get("moon"),
        }
    return out


def price_now(asset, now=None):
    return market(now, history_days=1)[asset]["price"]


# ------------------------------------------------------------------
# Money
# ------------------------------------------------------------------


def fee_for(amount, fee_bp):
    """The trading fee on `amount` BITS, rounded up (never more than the amount)."""
    return min(amount, -(-amount * fee_bp // 10000)) if amount > 0 else 0


def tax_for(gain):
    return max(0, gain) * TAX_PCT // 100


def value_of(units, price):
    return math.floor(units * price / UNIT)


def positions(user):
    """{asset: (units, basis)} for what is held now."""
    held = {}
    for row in (
        TradeOrder.objects.filter(user=user)
        .values("asset")
        .annotate(units=Sum("units"), basis=Sum("basis"))
    ):
        if row["units"]:
            held[row["asset"]] = (row["units"], row["basis"] or 0)
    return held


def studied_minutes(user):
    return StudyLog.objects.filter(user=user).aggregate(m=Sum("duration_minutes"))["m"] or 0


def is_unlocked(user):
    return studied_minutes(user) >= UNLOCK_MINUTES


def _parse_amount(raw):
    if isinstance(raw, bool):
        raise TradeError("Enter an amount of BITS.")
    try:
        amount = int(raw)
    except (TypeError, ValueError, OverflowError):
        raise TradeError("Enter an amount of BITS.")
    if amount != raw and not (isinstance(raw, str) and raw.strip().isdigit()):
        raise TradeError("Enter a whole amount of BITS.")
    if amount < MIN_ORDER:
        raise TradeError(f"The smallest order is {MIN_ORDER} BITS.")
    if amount > MAX_ORDER:
        raise TradeError("That order is too large.")
    return amount


def place_order(user, asset, side, amount=None, units=None, now=None):
    """Buys `amount` BITS' worth of `asset`, or sells `units` of it (millionths
    of a unit, or 'all'), at the current tick. Returns the TradeOrder or
    raises TradeError."""
    from .economy import bits_summary  # economy imports this module

    now = now or timezone.now()
    spec = ASSETS.get(asset)
    if spec is None:
        raise TradeError("Unknown package.")
    if side not in ("buy", "sell"):
        raise TradeError("Choose BUY or SELL.")
    # Only buying is gated: deleting logs must never trap what is already held.
    if side == "buy" and not is_unlocked(user):
        raise TradeError(f"TRADE opens after {UNLOCK_MINUTES // 60} hours of study.")
    price = price_now(asset, now)
    with transaction.atomic():
        # Same lock as a shop purchase: two quick taps can't spend one balance.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        held_units, held_basis = positions(user).get(asset, (0, 0))
        if side == "buy":
            amount = _parse_amount(amount)
            if bits_summary(user)["balance"] < amount:
                raise TradeError("Not enough BITS.")
            if spec["cap"] is not None and held_basis + amount > spec["cap"]:
                room = max(0, spec["cap"] - held_basis)
                raise TradeError(
                    f"{spec['name']} holds at most {spec['cap']:,} BITS of principal — {room:,} left."
                )
            fee = fee_for(amount, spec["fee_bp"])
            bought = math.floor((amount - fee) * UNIT / price)
            if bought <= 0:
                raise TradeError("That amount is too small to buy any.")
            return TradeOrder.objects.create(
                user=user,
                asset=asset,
                kind=TradeOrder.BUY,
                units=bought,
                price=price,
                bits=-amount,
                basis=amount,
                fee=fee,
            )
        if held_units <= 0:
            raise TradeError("You don't hold any of this.")
        if units == "all":
            sold = held_units
        else:
            if isinstance(units, bool) or not isinstance(units, int) or units <= 0:
                raise TradeError("Choose how much to sell.")
            sold = min(units, held_units)
        basis = held_basis if sold == held_units else round(held_basis * sold / held_units)
        gross = value_of(sold, price)
        if gross <= 0:
            raise TradeError("That is too little to sell.")
        fee = fee_for(gross, spec["fee_bp"])
        tax = tax_for(gross - fee - basis)
        return TradeOrder.objects.create(
            user=user,
            asset=asset,
            kind=TradeOrder.SELL,
            units=-sold,
            price=price,
            bits=gross - fee - tax,
            basis=-basis,
            fee=fee,
            tax=tax,
        )


# ------------------------------------------------------------------
# What the TRADE tab shows
# ------------------------------------------------------------------


def _round_price(price):
    return float(f"{price:.6g}")


def serialize_order(order):
    return {
        "id": order.id,
        "asset": order.asset,
        "kind": order.kind,
        "units": order.units,
        "price": _round_price(order.price),
        "bits": order.bits,
        "fee": order.fee,
        "tax": order.tax,
        "at": order.created_at.isoformat(),
    }


def trade_state(user, now=None):
    from .economy import bits_summary  # economy imports this module

    now = now or timezone.now()
    minutes = studied_minutes(user)
    prices = market(now)
    held = positions(user)
    today = _market_day(now)
    assets = []
    totals = {"invested": 0, "value": 0}
    for asset, spec in ASSETS.items():
        live = prices[asset]
        units, basis = held.get(asset, (0, 0))
        value = value_of(units, live["price"])
        totals["invested"] += basis
        totals["value"] += value
        assets.append(
            {
                "id": asset,
                "ticker": spec["ticker"],
                "name": spec["name"],
                "kind": spec["kind"],
                "tagline": spec["tagline"],
                "detail": spec["detail"],
                "fee_bp": spec["fee_bp"],
                "trust_bp": spec["trust_bp"],
                "cap": spec["cap"],
                "price": _round_price(live["price"]),
                # What the day's change is measured against: the price 24 hours ago.
                "day_ago": _round_price(live["ticks"][0]),
                "ticks": [_round_price(p) for p in live["ticks"]],
                "closes": [[day, _round_price(close)] for day, close in live["closes"]],
                "news": live["news"],
                "moon": live["moon"],
                "position": {"units": units, "basis": basis, "value": value},
            }
        )
    flows = {
        row["kind"]: row
        for row in TradeOrder.objects.filter(user=user)
        .values("kind")
        .annotate(bits=Sum("bits"), basis=Sum("basis"), fee=Sum("fee"), tax=Sum("tax"))
    }
    sells = flows.get(TradeOrder.SELL, {})
    totals.update(
        {
            "unrealized": totals["value"] - totals["invested"],
            # What sales brought in over the principal they took out.
            "realized": (sells.get("bits") or 0) + (sells.get("basis") or 0),
            "fees": sum((row.get("fee") or 0) for row in flows.values()),
            "taxes": sum((row.get("tax") or 0) for row in flows.values()),
        }
    )
    tick_end = _day_start(today) + timedelta(seconds=(_tick_index(now) + 1) * TICK_SECONDS)
    return {
        "unlocked": minutes >= UNLOCK_MINUTES,
        "unlock_minutes": UNLOCK_MINUTES,
        "studied_minutes": minutes,
        "market_day": today.isoformat(),
        "closes_at": _day_start(today + timedelta(days=1)).isoformat(),
        "next_tick_at": tick_end.isoformat(),
        "tick_seconds": TICK_SECONDS,
        "ticks_per_day": TICKS_PER_DAY,
        "unit": UNIT,
        "tax_pct": TAX_PCT,
        "min_order": MIN_ORDER,
        "assets": assets,
        "totals": totals,
        "orders": [
            serialize_order(o) for o in TradeOrder.objects.filter(user=user)[:ORDERS_SHOWN]
        ],
        "bits": bits_summary(user),
    }
