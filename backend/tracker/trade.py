"""
TRADE: fifteen investment packages in five sectors, bought and sold with BITS
(the BITS // EXCHANGE's TRADE tab).

Prices are made up, not fetched: each package grows over the long run and has
its own way of getting there (see "The market" below: steps, booms and
pullbacks, swells, breakthroughs, moving against the market...), while money
rotates between sectors out of sight. One game day is meant to feel like about
a week of a real market.

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

# ------------------------------------------------------------------
# The market: fifteen packages in five sectors
# ------------------------------------------------------------------
# Every package grows over the long run (a positive drift), and each has a
# way of getting there (`model`):
#   steady    climbs at an even slope with little noise
#   step      sags a little for days, then a contract lifts it a notch
#   momentum  booms and busts that last days; a long run tends to end in a
#             sharp pullback (more likely the longer it runs, never certain)
#   cycle     swells and dips whose length and depth change every time, at a
#             pace that wobbles day to day, under noise as large as the swing:
#             no clock to trade by
#   catalyst  drifts lower while it waits, then a breakthrough spikes it; over
#             the next days it may give some back or keep climbing (drawn each
#             time, roughly even on average)
#   defensive moves against the market: firm when the rest is weak
#   noisy     a lot of day-to-day noise around a steady climb
#   wild      three times leveraged: halves or doubles, and decays if held
#   index     the market itself
# On top of that, money rotates between sectors (_sector_heat): for a few
# days at a time one runs hot while another cools, and the market as a whole
# (_market_heat) leans with them. None of that is shown; it can only be read
# from the prices. One game day is meant to feel like about a week.

SECTORS = {
    "defense": "DEFENSE & AEROSPACE",
    "energy": "ENERGY & INFRASTRUCTURE",
    "semis": "CHIPS, AI & CYBER",
    "bio": "BIO & MEDTECH",
    "market": "RESOURCES, SHIPPING & INDEX",
}

_A = lambda yearly: math.log(1 + yearly) / 365  # noqa: E731  a yearly drift as a daily one

ASSETS = {
    # ---- DEFENSE & AEROSPACE: firm floors, rises a step at a time
    "aero_dynamics": {
        "ticker": "AERO", "name": "AERO DYNAMICS", "sector": "defense", "kind": "stock",
        "tagline": "Fighter jets and big contracts — quiet for days, then a step up",
        "detail": "A defence prime that barely moves between contracts. When one lands the price jumps a notch, and the new level tends to hold.",
        "start": 400.0, "fee_bp": 40, "trust_bp": 0, "cap": 10_000,
        "model": "step", "sigma": 0.004, "drift": _A(-0.4), "beta": 0.6,
        "steps": 0.05, "step_size": (0.03, 0.07), "slips": 0.01, "slip_size": (0.02, 0.04),
    },
    "aegis_systems": {
        "ticker": "AEGS", "name": "AEGIS SYSTEMS", "sector": "defense", "kind": "stock",
        "tagline": "Air defence and armour — strongest when everything else is weak",
        "detail": "Where money hides when the rest of the market sells off. It edges up on bad days for everyone else, and lags when the market is euphoric.",
        "start": 250.0, "fee_bp": 40, "trust_bp": 0, "cap": 10_000,
        "model": "defensive", "sigma": 0.008, "drift": _A(0.18), "beta": 0.3, "market_beta": -0.8,
    },
    "orbital_launch": {
        "ticker": "ORBT", "name": "ORBITAL LAUNCH", "sector": "defense", "kind": "stock",
        "tagline": "Private rockets — long silences, then a launch",
        "detail": "A launch company waiting on its next flight. It sags while it waits; a successful launch sends it soaring before it settles back about halfway.",
        "start": 120.0, "fee_bp": 100, "trust_bp": 0, "cap": 5_000,
        "model": "catalyst", "sigma": 0.02, "drift": _A(-0.12), "beta": 0.8,
        "spikes": 0.01, "spike_size": (0.22, 0.38), "giveback": (-0.45, 0.65), "flops": 0.008, "flop_size": (0.12, 0.2),
    },
    # ---- ENERGY & INFRASTRUCTURE: the economy's backbone, hard to knock down
    "volt_grid": {
        "ticker": "VOLT", "name": "VOLT GRID", "sector": "energy", "kind": "stock",
        "tagline": "Transformers and power lines — a slow, straight climb",
        "detail": "Every data centre needs power. It climbs at a gentle, almost straight angle; the calmest growth on the board.",
        "start": 300.0, "fee_bp": 30, "trust_bp": 0, "cap": 10_000,
        "model": "steady", "sigma": 0.005, "drift": _A(0.2), "beta": 0.4,
    },
    "atom_core": {
        "ticker": "ATOM", "name": "ATOM CORE", "sector": "energy", "kind": "stock",
        "tagline": "Reactors and uranium — big swells that keep rising",
        "detail": "Energy demand comes in waves, and this rides them: swells and dips of uneven length, each low a little higher than the last.",
        "start": 180.0, "fee_bp": 50, "trust_bp": 0, "cap": 8_000,
        "model": "cycle", "sigma": 0.022, "drift": _A(0.22), "beta": 0.7,
        "period": (3, 8), "swing": (0.012, 0.026),
    },
    "terra_nexus": {
        "ticker": "TERA", "name": "TERRA NEXUS", "sector": "energy", "kind": "stock",
        "tagline": "Wind, solar and batteries — jittery, but growing",
        "detail": "Plenty of day-to-day noise, but averaged over a couple of weeks it grows steadily. Medium risk.",
        "start": 90.0, "fee_bp": 50, "trust_bp": 0, "cap": 8_000,
        "model": "noisy", "sigma": 0.026, "drift": _A(0.3), "beta": 0.8,
    },
    # ---- CHIPS, AI & CYBER: the fastest growers, with the deepest pullbacks
    "tech_titans": {
        "ticker": "SFND", "name": "SILICON FOUNDRY", "sector": "semis", "kind": "stock",
        "tagline": "AI chips — runs for days, then a sharp pullback",
        "detail": "The market's favourite. Once it starts climbing it can run for days, and the longer it runs the more likely a sharp pullback becomes. Timing is the game.",
        "start": 500.0, "fee_bp": 50, "trust_bp": 0, "cap": 10_000,
        "model": "momentum", "sigma": 0.017, "drift": _A(0.35), "beta": 1.2,
        "bull": 0.006, "bear": -0.004, "switch": 0.16, "pullback": (0.05, 0.1),
    },
    "sentinel_eye": {
        "ticker": "SNTL", "name": "SENTINEL EYE", "sector": "semis", "kind": "stock",
        "tagline": "Security and intelligence AI — wild swings, steep growth",
        "detail": "Big moves inside the day and a steep climb over weeks. For trades of a few days to a few weeks.",
        "start": 160.0, "fee_bp": 60, "trust_bp": 0, "cap": 6_000,
        "model": "noisy", "sigma": 0.034, "drift": _A(0.45), "beta": 1.3,
    },
    "quantum_coin": {
        "ticker": "QMTX", "name": "QUANTUM MATRIX", "sector": "semis", "kind": "venture",
        "tagline": "Quantum computing venture — double or half in a day",
        "detail": "The roughest ride on the board: it can lose half its value and still be the best performer over a month. Traded at three times leverage, which slowly eats into anyone who just sits on it.",
        "start": 1000.0, "fee_bp": 200, "trust_bp": 0, "cap": 4_000,
        "model": "wild", "sigma": 0.055, "leverage": 3, "anchor": 2000.0, "kappa": 0.03, "beta": 1.5,
        "events": 0.05, "jump": (0.35, 0.6),
    },
    # ---- BIO & MEDTECH: long waits and sudden breakthroughs
    "bio_venture": {
        "ticker": "GNOM", "name": "GENOME LABS", "sector": "bio", "kind": "stock",
        "tagline": "Next-generation drugs — quiet, then an approval",
        "detail": "Dull for long stretches, drifting lower while trials run. An approval sends it straight up, and about half of that comes back over the next days.",
        "start": 200.0, "fee_bp": 100, "trust_bp": 0, "cap": 5_000,
        "model": "catalyst", "sigma": 0.022, "drift": _A(-0.1), "beta": 0.7,
        "spikes": 0.01, "spike_size": (0.25, 0.42), "giveback": (-0.45, 0.65), "flops": 0.009, "flop_size": (0.12, 0.22),
    },
    "bionic_med": {
        "ticker": "BION", "name": "BIONIC MED", "sector": "bio", "kind": "stock",
        "tagline": "Surgical robots — steady growth with bursts",
        "detail": "Hospitals keep buying. A steady climb, with runs of a few days when the market notices it.",
        "start": 350.0, "fee_bp": 40, "trust_bp": 0, "cap": 10_000,
        "model": "momentum", "sigma": 0.009, "drift": _A(0.24), "beta": 0.6,
        "bull": 0.003, "bear": -0.0015, "switch": 0.2, "pullback": (0.02, 0.05),
    },
    "agri_harvest": {
        "ticker": "AGRI", "name": "AGRI HARVEST", "sector": "bio", "kind": "stock",
        "tagline": "Autonomous farming — its own seasons, out of step with the rest",
        "detail": "Moves with the harvest, not with the market: swells and dips of its own that rarely line up with anything else on the board.",
        "start": 140.0, "fee_bp": 50, "trust_bp": 0, "cap": 8_000,
        "model": "cycle", "sigma": 0.02, "drift": _A(0.16), "beta": 0.0,
        "period": (4, 9), "swing": (0.01, 0.022),
    },
    # ---- RESOURCES, SHIPPING & INDEX: the economy's tides, and the benchmark
    "ocean_freight": {
        "ticker": "OCNF", "name": "OCEAN FREIGHT", "sector": "market", "kind": "stock",
        "tagline": "Global shipping — clear tides of boom and lull",
        "detail": "Freight rates come and go in tides you can see on the chart, though no two are the same length or height. Each low tends to sit above the last.",
        "start": 220.0, "fee_bp": 50, "trust_bp": 0, "cap": 8_000,
        "model": "cycle", "sigma": 0.02, "drift": _A(0.15), "beta": 0.5,
        "period": (3, 7), "swing": (0.01, 0.02),
    },
    "rare_earth": {
        "ticker": "RARE", "name": "RARE EARTH", "sector": "market", "kind": "commodity",
        "tagline": "Gold, copper and lithium — up when tech is down",
        "detail": "Hard assets that keep their value. It tends to rise when chips and AI are being sold, which makes it a natural partner for them.",
        "start": 600.0, "fee_bp": 30, "trust_bp": 0, "cap": 10_000,
        "model": "defensive", "sigma": 0.009, "drift": _A(0.16), "beta": 0.2, "market_beta": -0.6,
        "against": "semis",
    },
    "global_index": {
        "ticker": "G500", "name": "GLOBAL 500", "sector": "market", "kind": "fund",
        "tagline": "The whole market in one fund — if in doubt, this",
        "detail": "Moves with the board as a whole: it never runs the hottest, never falls the hardest, and over a month or more it climbs. No cap: the calm place for savings.",
        "start": 1000.0, "fee_bp": 20, "trust_bp": 50, "cap": None,
        "model": "index", "sigma": 0.005, "drift": _A(0.2), "beta": 0.0, "market_beta": 0.5,
    },
}

HEADLINES = {
    "step": {
        "up": ["WINS A MULTI-YEAR CONTRACT", "BUDGET APPROVED FOR NEW ORDERS", "EXPORT DEAL SIGNED", "PRODUCTION RAMP AHEAD OF PLAN"],
        "down": ["PROGRAM DELAYED", "AUDIT FLAGS COST OVERRUNS"],
    },
    "catalyst": {
        "up": ["BREAKTHROUGH CONFIRMED", "REGULATOR GIVES THE GREEN LIGHT", "FLAWLESS RESULT", "BIG PARTNER SIGNS ON"],
        "down": ["SETBACK IN THE FINAL STAGE", "RESULTS DISAPPOINT", "SAFETY REVIEW OPENED"],
    },
    "momentum": {"down": ["PROFIT-TAKING HITS THE LEADERS", "VALUATION WORRIES SPREAD", "A BIG FUND TRIMS ITS STAKE"]},
    "wild": {
        "up": ["QUBIT RECORD SHATTERED", "TECH GIANT ANNOUNCES PARTNERSHIP", "RETAIL FRENZY", "ERROR-CORRECTION MILESTONE"],
        "down": ["KEY RESULT FAILS TO REPLICATE", "FUNDING ROUND COLLAPSES", "SHORT SELLER REPORT", "LEAD ENGINEERS LEAVE"],
    },
}

# Sector heat: for a few days at a time each sector runs hot, warm, cool or
# cold. Relative to each other mostly (money moves between them), with a
# little of it left over for the market as a whole.
HEAT = [(0.0055, 0.2), (0.002, 0.3), (-0.0015, 0.3), (-0.0045, 0.2)]
HEAT_SPELL = (3, 6)


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


# Sector heat, worked out spell by spell from the market's first day and kept
# per seed: {(seed, sector): [(first offset, last offset + 1, heat), ...]}.
_SPELLS = {}


def _raw_heat(sector, day):
    offset = (day - MARKET_EPOCH).days
    if offset < 0:
        return 0.0
    spells = _SPELLS.setdefault((_seed(), sector), [])
    while not spells or spells[-1][1] <= offset:
        start = spells[-1][1] if spells else 0
        rng = _rng(f"heat-{sector}", MARKET_EPOCH, f"spell-{len(spells)}")
        length = rng.randint(*HEAT_SPELL)
        roll, heat = rng.random(), HEAT[-1][0]
        for value, weight in HEAT:
            if roll < weight:
                heat = value
                break
            roll -= weight
        spells.append((start, start + length, heat))
    for first, end, heat in reversed(spells):
        if first <= offset < end:
            return heat
    return 0.0


_ROTATING = ("defense", "energy", "semis", "bio")


def _market_heat(day):
    """The market as a whole: what the sectors' heat shares, plus a little noise."""
    shared = sum(_raw_heat(sector, day) for sector in _ROTATING) / len(_ROTATING)
    return 0.6 * shared + 0.003 * _rng("market", day, "mood").gauss(0, 1)


def _sector_heat(sector, day):
    """A sector's heat relative to the others: money moving between them."""
    if sector not in _ROTATING:
        return _market_heat(day)
    shared = sum(_raw_heat(other, day) for other in _ROTATING) / len(_ROTATING)
    return _raw_heat(sector, day) - 0.7 * shared


def _event(rng, pool, sign, size):
    return {
        "tick": rng.randrange(12, TICKS_PER_DAY - 12),
        "jump": sign * rng.uniform(*size),
        "headline": rng.choice(HEADLINES[pool]["up" if sign > 0 else "down"]),
    }


def next_close(asset, day, prev_close, prev_state):
    """(close, state) of `day`, from the day before. Deterministic."""
    spec = ASSETS[asset]
    rng = _rng(asset, day, "day")
    x = math.log(prev_close)
    z = rng.gauss(0, 1)
    sigma = spec["sigma"]
    model = spec["model"]
    state = {}
    event = None
    # What every package shares: its sector's heat, the market's, its drift.
    lean = spec.get("beta", 0.0) * _sector_heat(spec["sector"], day)
    lean += spec.get("market_beta", 0.0) * _market_heat(day)
    if spec.get("against"):
        lean -= 0.6 * _sector_heat(spec["against"], day)
    r = spec.get("drift", 0.0) - spec["trust_bp"] / 10000 / 365 + lean + sigma * z

    if model == "step":
        roll = rng.random()
        if roll < spec["steps"]:
            event = _event(rng, "step", 1, spec["step_size"])
        elif roll < spec["steps"] + spec["slips"]:
            event = _event(rng, "step", -1, spec["slip_size"])
    elif model == "momentum":
        regime = prev_state.get("regime", "bull")
        run = prev_state.get("run", 0)
        if rng.random() < spec["switch"]:
            regime = "bear" if regime == "bull" else "bull"
        r += spec[regime]
        # The longer it has run, the likelier a sharp pullback (never certain).
        if run >= 3 and rng.random() < min(0.4, 0.06 * (run - 2)):
            event = {
                "tick": rng.randrange(12, TICKS_PER_DAY - 12),
                "jump": -rng.uniform(*spec["pullback"]),
                "headline": rng.choice(HEADLINES["momentum"]["down"]),
            }
        state["regime"] = regime
        state["run"] = run + 1 if r > 0 and event is None else 0
    elif model == "cycle":
        phase, period, swing = prev_state.get("phase"), prev_state.get("period"), prev_state.get("swing")
        if phase is None or not period or swing is None:
            phase, period, swing = rng.random(), rng.randint(*spec["period"]), rng.uniform(*spec["swing"])
        # The pace wobbles from day to day, so a swell's turn can't be counted out.
        ahead = phase + rng.uniform(0.55, 1.45) / period
        r += swing * (math.sin(2 * math.pi * ahead) - math.sin(2 * math.pi * phase))
        if ahead >= 1:
            # Every swell is drawn afresh: its length and its height.
            ahead -= 1
            period, swing = rng.randint(*spec["period"]), rng.uniform(*spec["swing"])
        state.update(phase=round(ahead, 6), period=period, swing=round(swing, 6))
    elif model == "catalyst":
        owed, left = prev_state.get("owed", 0.0), prev_state.get("left", 0)
        if left > 0:
            part = owed / left  # negative while it keeps climbing
            r -= part
            owed, left = owed - part, left - 1
        roll = rng.random()
        if roll < spec["spikes"]:
            event = _event(rng, "catalyst", 1, spec["spike_size"])
            # Whether it gives some back or keeps going (a negative share), and
            # how quickly, is anyone's guess: on average it roughly holds.
            owed += event["jump"] * rng.uniform(*spec["giveback"])
            left = max(left, rng.randint(3, 10))
        elif roll < spec["spikes"] + spec["flops"]:
            event = _event(rng, "catalyst", -1, spec["flop_size"])
        if left > 0:
            state.update(owed=round(owed, 6), left=left)
    elif model == "wild":
        r = math.log(max(0.05, 1 + spec["leverage"] * sigma * z))
        r += spec["kappa"] * (math.log(spec["anchor"]) - x) + lean
        sigma *= spec["leverage"]
        if rng.random() < spec["events"]:
            event = _event(rng, "wild", 1 if rng.random() < 0.5 else -1, spec["jump"])
    # steady, defensive, noisy and index need nothing more than the above.

    if event is not None:
        state["event"] = event
        r += event["jump"]
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
                "sector": spec["sector"],
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
        "sectors": [{"id": key, "name": name} for key, name in SECTORS.items()],
        "assets": assets,
        "totals": totals,
        "orders": [
            serialize_order(o) for o in TradeOrder.objects.filter(user=user)[:ORDERS_SHOWN]
        ],
        "bits": bits_summary(user),
    }
