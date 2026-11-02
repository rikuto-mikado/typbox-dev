"""
BITS: the study currency. 1 hour of logged study = 100 BITS, whether it was
recorded with the stopwatch or entered manually.

Base earnings are derived from the StudyLog table rather than stored, so
every log ever written (including those that predate this feature) is paid
out with no backfill, and editing, deleting, clearing or importing logs
keeps the balance in step automatically. On top of that:

- a shop buff active when a log is committed adds that log's bonus_bits
  (stored on the log). The bonus is settled at commit: editing the log never
  changes it, whether or not the buff is still running. Deleting the log
  takes it back and returns what the log drew from the buff
  (return_buff_draw). IRON CONTRACT pays its whole payout onto the log that
  seals it, the same way;
- every BitPurchase debits its price, less anything refunded when a buff
  was cancelled early (cancel_buff);
- a settled CHALLENGE (challenges.py) credits its payout.

After a buff ends it cools down on its own timer (BUFF_COOLDOWN_HOURS); other buffs can be bought meanwhile. STARLIGHT is worked out from
the logs: every day with a log no buff paid on is a star, up to STARLIGHT_MAX.
With STARLIGHT_COST stars on the gauge, a buff that fails its condition keeps
running in exchange for them, once per buff; stars also buy small wishes
(STAR_USES). Only what was spent is stored.

balance = floor(total minutes * 100 / 60) + sum(bonus_bits) + sum(payout) - sum(price - refunded + struck)

The frontend mirrors BITS_PER_HOUR and the rounding in src/bits.ts to show
an instant balance after each commit; keep the two in sync.
"""

import math
import random
from datetime import datetime, time, timedelta
from datetime import timezone as dt_timezone

from django.db import transaction
from django.db.models import F, Q, Sum
from django.utils import timezone

from . import challenges, festival_pass, festivals
from .collection import collection_state
from .furniture import FURNITURE, event_pieces, shop_lineup
from .models import BitPurchase, Category, StudyLog, UserProfile
from .timezones import get_user_zone

BITS_PER_HOUR = 100

# A buff's minute-based bonus never counts more than this much of one log,
# so a single oversized entry can't drain (or max out) a buff in one go.
MAX_BONUS_MINUTES_PER_LOG = 180

# A log is committed when the session ends, so a session that runs past a
# boundary (end of a morning, midnight, a buff's expiry) still belongs to the
# time it started in, if it is committed within this long of that boundary.
# A log's session is taken as the `duration_minutes` before its commit.
LATE_COMMIT_GRACE = timedelta(hours=3)

# How long after its commit a log can still be edited or deleted. Past this it
# is locked, so nothing a buff or challenge settled can be reopened much later.
LOG_EDIT_WINDOW = timedelta(days=3)


# After a buff ends, the next one can't be bought for this long.
# Hours before a buff can be bought again, set for each buff by how it is played.
# Each buff keeps its own timer (buff_cooldowns): while one rests, another can run.
# A MYSTERY CRATE rests on its own timer as well as the buff it opened into.
# Buffs from an older edition of the rules wait DEFAULT_BUFF_COOLDOWN_HOURS.
DEFAULT_BUFF_COOLDOWN_HOURS = 24
BUFF_COOLDOWN_HOURS = {
    "warm_up": 6,  # small and quick: meant to be run one after another
    "storm_runner": 8,  # the weather won't wait
    "overclock": 12,  # a sprint, then back at it the next morning
    "lunar_tide": 12,  # it is bought for the moon, not on a schedule
    "weekend_surge": 12,  # over on Sunday night, weekdays free again by Monday noon
    "lucky_byte": 12,
    "mystery_crate": 14,
    "focus_chip": 16,
    "category_lock": 16,
    "night_shift": 18,  # ends in the small hours: free again for the next night
    "early_bird": 20,  # ends at 09:00: free again before the next dawn
    "deep_dive": 24,
    "iron_contract": 24,  # with a signing day on top: a contract every few days
    "hyperdrive": 36,  # the biggest stretch gets the longest rest
}

STARLIGHT_MAX = 14
STARLIGHT_COST = 7
# How long after its date a log can still light that day's star.
STAR_LATE_DAYS = timedelta(days=2)


def log_editable_until(log):
    return log.created_at + LOG_EDIT_WINDOW


def log_is_locked(log, now=None):
    return (now or timezone.now()) >= log_editable_until(log)


def bits_for_minutes(minutes):
    """Whole BITS for a span of study. Floored once over the total, so many
    short logs earn exactly what one long log of the same length would."""
    return (max(0, minutes) * BITS_PER_HOUR) // 60


# ==========================================
# Shop catalog (buffs)
# ==========================================
# Only one buff can be active at a time. Tuned around ~75 study hours a
# week (~7,500 BITS, ~1,000 a day) as a real BITS sink: each costs up to
# about a day's earnings and, used to the full, returns only ~1.2-1.35x its
# price, so a buff pays off only for the operator who actually puts the
# hours in. Listed (and shown in the shop) cheapest first.
#   window:   'any' | 'night' (commits 22:00-01:59 local) |
#             'morning' (05:00-08:59 local) | 'weekend' (Sat/Sun local) |
#             'weather' (the commit came with a rain / snow / storm or
#             sub-zero reading from the CHRONOMETER weather, see
#             stormy_weather)
#   expires:  'hours' (that many hours after purchase) | 'weekend' (end of
#             the coming Sunday) | 'contract' (end of the contract's last day)
#   per_hour: extra BITS per covered hour of study (minute-capped buffs)
#   per_use:  flat bonus per qualifying log (use-capped buffs)
#   category: True = bought for one category and pays only on its logs
#   crate:    {buff_id: weight}: buying it starts one of those buffs, drawn
#             at random (the purchase records the crate in `via`)
#   lunar:    True = per_hour is scaled by the moon's lit fraction at commit
#   contract: {'days', 'min_minutes', 'multiplier'}: IRON CONTRACT. Runs the
#             `days` calendar days after the purchase day; every one of them
#             needs `min_minutes` of committed logs. The log that completes
#             the last day earns price * multiplier; a missed day ends the
#             contract and the price stays spent (no refund on cancel either)
BUFFS = {
    "warm_up": {
        "name": "WARM-UP",
        "tagline": "×2 on your next 5 study hours",
        "detail": "Every log you commit in the next 48h earns +100 BITS/h until 5 hours are covered (up to +500). A cheap first buff.",
        "price": 400,
        "window": "any",
        "expires": "hours",
        "hours": 48,
        "minutes": 300,
        "per_hour": 100,
    },
    "night_shift": {
        "name": "NIGHT SHIFT",
        "tagline": "Climbs ×2 → ×2.5 → ×3 on back-to-back nights",
        "detail": "For 72h, sessions touching 22:00–02:00 earn +100 BITS/h the first night, +150 the next and +200 the third, up to 3 hours a night (+1,350 in all). Skip a night and the rate drops back to +100.",
        "price": 900,
        "window": "night",
        "expires": "hours",
        "hours": 72,
        "minutes": 540,
        "nightly_cap": 180,
        "levels": [100, 150, 200],
        "per_hour": 100,
    },
    "early_bird": {
        "name": "EARLY BIRD",
        "tagline": "×3 at dawn — skip a morning and it ends",
        "detail": "The next 3 mornings: sessions touching 05:00–09:00 earn +200 BITS/h, up to 2 hours each morning (+1,200 in all). A morning with no log ends the buff, and whatever is left of it is lost.",
        "price": 800,
        "window": "morning",
        "expires": "mornings",
        "mornings": 3,
        "minutes": 360,
        "daily_cap": 120,
        "per_hour": 200,
    },
    "mystery_crate": {
        "name": "MYSTERY CRATE",
        "tagline": "One random buff — maybe a HYPERDRIVE",
        "detail": "Opens into one of the other buffs (not CATEGORY LOCK), which starts right away with its usual rules. Rare ones are rare.",
        "price": 700,
        "window": "any",
        "expires": "hours",
        "crate": {
            "warm_up": 20,
            "night_shift": 15,
            "early_bird": 15,
            "overclock": 15,
            "focus_chip": 12,
            "weekend_surge": 8,
            "lucky_byte": 8,
            "deep_dive": 5,
            "hyperdrive": 2,
        },
    },
    "overclock": {
        "name": "OVERCLOCK",
        "tagline": "×2 for one day — a sprint",
        "detail": "For the next 24h every log earns +100 BITS/h, up to 10 hours (+1,000). Short and sharp: whatever is left after a day is gone.",
        "price": 600,
        "window": "any",
        "expires": "hours",
        "hours": 24,
        "minutes": 600,
        "per_hour": 100,
    },
    "storm_runner": {
        "name": "STORM RUNNER",
        "tagline": "×2 while the weather is rough",
        "detail": "For 5 days, logs committed while the CHRONOMETER weather reads rain, snow, a storm or below 0°C earn +100 BITS/h (up to 10 hours, +1,000). Clear skies pay the usual rate. Needs the weather readout switched on.",
        "price": 600,
        "window": "weather",
        "expires": "hours",
        "hours": 120,
        "minutes": 600,
        "per_hour": 100,
    },
    "focus_chip": {
        "name": "FOCUS CHIP",
        "tagline": "+100 per 50-min session — a short log burns it out",
        "detail": "For 72h, each single log of 50 minutes or more earns +100 BITS (up to 12 logs, +1,200). Commit a log under 25 minutes and the chip burns out: the buff ends.",
        "price": 800,
        "window": "any",
        "expires": "hours",
        "hours": 72,
        "uses": 12,
        "min_minutes": 50,
        "per_use": 100,
        "break_under": 25,
    },
    "category_lock": {
        "name": "CATEGORY LOCK",
        "tagline": "×2 for one category you pick",
        "detail": "Pick a category: for 72h its logs earn +100 BITS/h (up to 12 hours, +1,200). Logs in other categories earn the usual rate.",
        "price": 900,
        "window": "any",
        "expires": "hours",
        "hours": 72,
        "minutes": 720,
        "per_hour": 100,
        "category": True,
    },
    "lunar_tide": {
        "name": "LUNAR TIDE",
        "tagline": "Pays with the moon — ×2 at full",
        "detail": "For 96h, each log earns extra BITS in step with the moon: +100 BITS/h at full moon, about +50 at a half moon, close to nothing at new moon (up to 12 hours). Check the LUNAR CALENDAR before you buy.",
        "price": 500,
        "window": "any",
        "expires": "hours",
        "hours": 96,
        "minutes": 720,
        "per_hour": 100,
        "lunar": True,
    },
    "weekend_surge": {
        "name": "WEEKEND SURGE",
        "tagline": "×1.5 all weekend",
        "detail": "Sessions touching this Saturday and Sunday earn +50 BITS/h (up to 24 hours, +1,200). Buy it any day — it holds your buff slot until Sunday ends.",
        "price": 600,
        "window": "weekend",
        "expires": "weekend",
        "minutes": 1440,
        "per_hour": 50,
    },
    "lucky_byte": {
        "name": "LUCKY BYTE",
        "tagline": "20% chance of ×3 on each log",
        "detail": "For 72h, each log has a 1-in-5 chance to pay triple (up to 3h of it counts; up to 20 logs).",
        "price": 600,
        "window": "any",
        "expires": "hours",
        "hours": 72,
        "uses": 20,
        "chance": 0.2,
        "multiplier": 3,
    },
    "deep_dive": {
        "name": "DEEP DIVE",
        "tagline": "The longer the session, the bigger the haul",
        "detail": "For 96h, each single log pays by its length: 2h or more earns +300, 3h +450 and 4h +700 (up to 4 logs, +2,800). Shorter logs pay nothing extra and use nothing up.",
        "price": 1200,
        "window": "any",
        "expires": "hours",
        "hours": 96,
        "uses": 4,
        "min_minutes": 120,
        "tiers": [[240, 700], [180, 450], [120, 300]],
    },
    "iron_contract": {
        "name": "IRON CONTRACT",
        "tagline": "3 days × 5h: pays ×2 — or keeps the stake",
        "detail": "Starts at midnight and runs 3 calendar days. Log 5 hours or more on every one of them (a session past midnight counts for the day it started, if committed by 03:00) and the log that completes day 3 pays twice the stake (+3,000). Miss a single day and the stake is gone. Cancelling refunds nothing.",
        "price": 1500,
        "window": "any",
        "expires": "contract",
        "contract": {"days": 3, "min_minutes": 300, "multiplier": 2},
    },
    "hyperdrive": {
        "name": "HYPERDRIVE",
        "tagline": "×2 on 25 hours — if you keep up 3h a day",
        "detail": "Every log you commit in the next 96h earns +100 BITS/h until 25 hours are covered (up to +2,500). Every full day it runs needs 3 hours of logs (a session past midnight counts for the day it started, if committed by 03:00), or the drive shuts down.",
        "price": 1200,
        "window": "any",
        "expires": "hours",
        "hours": 96,
        "minutes": 1500,
        "per_hour": 100,
        "daily_min": 180,
    },
}

# The rules these buffs had before the November 2026 rework. Purchases made
# before it carry rules=1 (BitPurchase.rules) and run on these to the end;
# the shop only sells BUFFS.
LEGACY_BUFFS = {
    "early_bird": {
        "name": "EARLY BIRD",
        "tagline": "×2 for morning study",
        "detail": "Logs committed between 05:00 and 09:00 in the next 72h earn +100 BITS/h (up to 8 hours, +800).",
        "price": 650,
        "window": "morning",
        "expires": "hours",
        "hours": 72,
        "minutes": 480,
        "per_hour": 100,
    },
    "night_shift": {
        "name": "NIGHT SHIFT",
        "tagline": "×2 for late-night study",
        "detail": "Logs committed between 22:00 and 02:00 in the next 72h earn +100 BITS/h (up to 8 hours, +800).",
        "price": 650,
        "window": "night",
        "expires": "hours",
        "hours": 72,
        "minutes": 480,
        "per_hour": 100,
    },
    "overclock": {
        "name": "OVERCLOCK",
        "tagline": "×1.5 on your next 20 study hours",
        "detail": "Every log you commit in the next 72h earns +50 BITS/h until 20 hours are covered (up to +1,000).",
        "price": 800,
        "window": "any",
        "expires": "hours",
        "hours": 72,
        "minutes": 1200,
        "per_hour": 50,
    },
    "focus_chip": {
        "name": "FOCUS CHIP",
        "tagline": "+100 for each 50-minute+ session",
        "detail": "For 72h, each single log of 50 minutes or more earns +100 BITS (up to 12 logs, +1,200).",
        "price": 900,
        "window": "any",
        "expires": "hours",
        "hours": 72,
        "uses": 12,
        "min_minutes": 50,
        "per_use": 100,
    },
    "deep_dive": {
        "name": "DEEP DIVE",
        "tagline": "+250 for each 2-hour+ session",
        "detail": "For 96h, each single log of 120 minutes or more earns +250 BITS (up to 6 logs, +1,500).",
        "price": 1200,
        "window": "any",
        "expires": "hours",
        "hours": 96,
        "uses": 6,
        "min_minutes": 120,
        "per_use": 250,
    },
    "hyperdrive": {
        "name": "HYPERDRIVE",
        "tagline": "×2 on your next 25 study hours",
        "detail": "Every log you commit in the next 96h earns +100 BITS/h until 25 hours are covered (up to +2,500).",
        "price": 2000,
        "window": "any",
        "expires": "hours",
        "hours": 96,
        "minutes": 1500,
        "per_hour": 100,
    },
}

# The crate itself never runs as a buff: its purchases carry the rolled id.
RUNNABLE_BUFFS = [item_id for item_id, spec in BUFFS.items() if "crate" not in spec]
# The rules edition new purchases are made under (see BitPurchase.rules).
CURRENT_RULES = 2


def spec_of(purchase):
    """The rules a purchase runs on: the ones it was bought under."""
    if purchase.rules < CURRENT_RULES and purchase.item_id in LEGACY_BUFFS:
        return LEGACY_BUFFS[purchase.item_id]
    return BUFFS[purchase.item_id]


def _local_now(user, now):
    zone = get_user_zone(user)
    return timezone.localtime(now, zone) if zone else timezone.localtime(now)


def _local_midnight(day, tzinfo):
    return timezone.make_aware(datetime.combine(day, time.min), tzinfo)


def _first_morning(user, start):
    """EARLY BIRD's first morning: today if bought before 09:00, else tomorrow."""
    local = _local_now(user, start)
    return local.date() if local.hour < 9 else local.date() + timedelta(days=1)


def _expiry(user, spec, now):
    if spec["expires"] == "mornings":
        zone = _local_now(user, now).tzinfo
        last = _first_morning(user, now) + timedelta(days=spec["mornings"] - 1)
        return timezone.make_aware(datetime.combine(last, time(9)), zone)
    if spec["expires"] == "contract":
        local = _local_now(user, now)
        last = local.date() + timedelta(days=spec["contract"]["days"])
        return _local_midnight(last + timedelta(days=1), local.tzinfo)
    if spec["expires"] == "weekend":
        local = _local_now(user, now)
        # Monday=0 … Sunday=6: the coming (or current) Sunday, end of day.
        sunday = local.date() + timedelta(days=6 - local.weekday())
        end = datetime.combine(sunday + timedelta(days=1), time.min)
        return timezone.make_aware(end, local.tzinfo)
    return now + timedelta(hours=spec["hours"])


# WMO weather codes (Open-Meteo, as the CHRONOMETER reads them) that count
# as rough weather: drizzle, rain, freezing rain, snow, showers, storms.
STORMY_CODES = frozenset(
    list(range(51, 58))
    + list(range(61, 68))
    + list(range(71, 78))
    + [80, 81, 82, 85, 86, 95, 96, 99]
)
# A reading older than this (the page was left open for hours) doesn't count.
WEATHER_MAX_AGE = timedelta(hours=3)


def stormy_weather(reading, now):
    """Whether a commit's weather reading counts for STORM RUNNER. The
    reading comes from the client (the same Open-Meteo call the CHRONOMETER
    makes), like the logs themselves: shape and freshness are checked, the
    sky is taken on trust. Anything malformed simply doesn't count."""
    if not isinstance(reading, dict):
        return False
    code, temp, at = reading.get("code"), reading.get("temp_c"), reading.get("at")
    if isinstance(code, bool) or not isinstance(code, int) or not 0 <= code <= 99:
        return False
    if (
        isinstance(temp, bool)
        or not isinstance(temp, (int, float))
        or not math.isfinite(temp)
        or not -90 <= temp <= 60
    ):
        return False
    if (
        isinstance(at, bool)
        or not isinstance(at, (int, float))
        or not math.isfinite(at)
    ):
        return False
    try:
        taken = datetime.fromtimestamp(at / 1000, tz=dt_timezone.utc)
    except (OverflowError, OSError, ValueError):
        return False
    if not (now - WEATHER_MAX_AGE <= taken <= now + timedelta(minutes=10)):
        return False
    return code in STORMY_CODES or temp < 0


SYNODIC_MONTH_DAYS = 29.530588853
REF_NEW_MOON = datetime(2000, 1, 6, 18, 14, tzinfo=dt_timezone.utc)


def moon_light(now):
    """The moon's lit fraction (0 new … 1 full), the same approximation as
    the LUNAR CALENDAR (frontend MoonPhaseCalendar.tsx)."""
    age = ((now - REF_NEW_MOON).total_seconds() / 86400) % SYNODIC_MONTH_DAYS
    return (1 - math.cos(2 * math.pi * age / SYNODIC_MONTH_DAYS)) / 2


def lunar_rate(spec, now):
    """LUNAR TIDE's extra BITS per hour right now (whole BITS)."""
    return round(spec["per_hour"] * moon_light(now))


def _in_window(user, spec, now, weather=None):
    if spec["window"] == "any":
        return True
    if spec["window"] == "weather":
        return stormy_weather(weather, now)
    local = _local_now(user, now)
    if spec["window"] == "night":
        return local.hour >= 22 or local.hour < 2
    if spec["window"] == "morning":
        return 5 <= local.hour < 9
    if spec["window"] == "weekend":
        return local.weekday() >= 5
    return False


def contract_days(purchase, now):
    """IRON CONTRACT's days: [{'date', 'minutes', 'state'}] with state
    'pending' (not yet), 'live' (today, short so far), 'done' (5h+) or
    'failed' (over by LATE_COMMIT_GRACE, short). Minutes are those of logs
    committed for each local day (_day_minutes), so hours can't be back-dated
    into a day."""
    spec = spec_of(purchase)["contract"]
    local = _local_now(purchase.user, purchase.created_at)
    zone = local.tzinfo
    first = local.date() + timedelta(days=1)
    covered = (purchase.state or {}).get("covered") or []
    days = []
    for i in range(spec["days"]):
        day = first + timedelta(days=i)
        start, end = _local_midnight(day, zone), _local_midnight(
            day + timedelta(days=1), zone
        )
        minutes = _day_minutes(purchase.user, day, zone)
        if minutes >= spec["min_minutes"] or day.isoformat() in covered:
            state = "done"
        elif now >= end + LATE_COMMIT_GRACE:
            state = "failed"
        elif now >= start:
            state = "live"
        else:
            state = "pending"
        days.append(
            {
                "date": day.isoformat(),
                "minutes": minutes,
                "state": state,
                "covered": day.isoformat() in covered,
            }
        )
    return days


def _day_minutes(user, day, zone):
    """Minutes logged for one local day: the logs committed on it, except
    that a session running past midnight belongs to the day before if it is
    committed within LATE_COMMIT_GRACE of that midnight. Every log counts for
    exactly one day."""
    start = _local_midnight(day, zone)
    end = _local_midnight(day + timedelta(days=1), zone)
    total = 0
    for created, minutes in StudyLog.objects.filter(
        user=user, created_at__gte=start, created_at__lt=end + LATE_COMMIT_GRACE
    ).values_list("created_at", "duration_minutes"):
        began = created - timedelta(minutes=minutes)
        if created < end:
            if not (created < start + LATE_COMMIT_GRACE and began < start):
                total += minutes
        elif began < end:
            total += minutes
    return total


def _missed_mornings(purchase, spec, now):
    """EARLY BIRD: the mornings (05:00-09:00) over by LATE_COMMIT_GRACE with
    no log whose session touched them."""
    zone = _local_now(purchase.user, now).tzinfo
    day = _first_morning(purchase.user, purchase.created_at)
    missed = []
    for _ in range(spec["mornings"]):
        start = timezone.make_aware(datetime.combine(day, time(5)), zone)
        end = timezone.make_aware(datetime.combine(day, time(9)), zone)
        if end + LATE_COMMIT_GRACE > now:
            break
        logs = StudyLog.objects.filter(
            user=purchase.user,
            created_at__gte=start,
            created_at__lt=end + LATE_COMMIT_GRACE,
        ).values_list("created_at", "duration_minutes")
        if not any(
            created - timedelta(minutes=minutes) < end for created, minutes in logs
        ):
            missed.append(day.isoformat())
        day += timedelta(days=1)
    return missed


def _short_days(purchase, spec, now):
    """HYPERDRIVE: the full days (after the purchase day, over by
    LATE_COMMIT_GRACE) with fewer than daily_min minutes logged."""
    zone = _local_now(purchase.user, now).tzinfo
    day = _local_now(purchase.user, purchase.created_at).date() + timedelta(days=1)
    short = []
    while (
        _local_midnight(day + timedelta(days=1), zone) + LATE_COMMIT_GRACE <= now
    ):
        if _day_minutes(purchase.user, day, zone) < spec["daily_min"]:
            short.append(day.isoformat())
        day += timedelta(days=1)
    return short


def _misses(purchase, now):
    """The days a running buff has failed its condition on and STARLIGHT has
    not covered, as 'YYYY-MM-DD'."""
    spec = spec_of(purchase)
    if "contract" in spec:
        return [d["date"] for d in contract_days(purchase, now) if d["state"] == "failed"]
    covered = (purchase.state or {}).get("covered") or []
    if "mornings" in spec:
        missed = _missed_mornings(purchase, spec, now)
    elif "daily_min" in spec:
        missed = _short_days(purchase, spec, now)
    else:
        missed = []
    return [day for day in missed if day not in covered]


def _spend_starlight(buff, covering, now):
    """Pays STARLIGHT_COST stars to keep `buff` running past one failure, if
    the gauge can and this buff hasn't been saved before. Returns whether it
    did."""
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=buff.user)
        locked = BitPurchase.objects.select_for_update().filter(pk=buff.pk).first()
        if locked is None:
            return False
        state = dict(locked.state or {})
        if state.get("closed") or state.get("covered"):
            return False
        if not _take_stars(profile, STARLIGHT_COST, now):
            return False
        state["covered"] = [covering]
        locked.state = state
        locked.save(update_fields=["state"])
        profile.last_guard = {"at": now.isoformat(), "name": spec_of(locked)["name"]}
        profile.save(update_fields=["last_guard"])
    buff.state = state
    return True


def buff_cooldown(purchase):
    return timedelta(hours=BUFF_COOLDOWN_HOURS.get(purchase.item_id, DEFAULT_BUFF_COOLDOWN_HOURS))


def _cooling_until(row, now, wait=None):
    """When this bought buff stops holding its own card back, or None. One cancelled
    before it paid on any log leaves no cooldown, nor does a used-up buff from
    before its end was recorded. `wait` is the wait to use, if not its own."""
    state = row.state or {}
    if state.get("no_cooldown"):
        return None
    ended_at = state.get("ended_at")
    if ended_at:
        ended = datetime.fromisoformat(ended_at)
    elif row.expires_at is not None and row.expires_at <= now:
        ended = row.expires_at
    else:
        return None
    return ended + (wait or buff_cooldown(row))


def _buff_rows(user):
    return BitPurchase.objects.filter(user=user, item_id__in=RUNNABLE_BUFFS).order_by("-created_at")


def buff_cooldowns(user, now=None):
    """{item_id: when it can be bought again}: each buff keeps its own timer, so
    another one can be bought while this one cools down. Only buffs still cooling
    are listed. A MYSTERY CRATE keeps a timer of its own, next to the one of the
    buff it opened into."""
    now = now or timezone.now()
    seen, out = set(), {}
    for row in _buff_rows(user):
        for key in {row.item_id, row.via} - {""}:
            if key in seen:
                continue
            seen.add(key)
            wait = None if key == row.item_id else timedelta(hours=BUFF_COOLDOWN_HOURS[key])
            until = _cooling_until(row, now, wait)
            if until is not None and until > now:
                out[key] = until
    return out


def _lights_a_star(log_date, created_at, zone):
    """Whether a log can light its day: committed around that date, so a day
    can't be lit after the fact by back-dating. Backups keep commit times."""
    committed = timezone.localtime(created_at, zone).date()
    return log_date - timedelta(days=1) <= committed <= log_date + STAR_LATE_DAYS


def star_days(user, now=None):
    """The days STARLIGHT is lit for: every day up to today with a log no buff
    paid on (no bonus_item, which a backup keeps), oldest first. Worked out
    from the logs each time, so old logs, deletions, resets and imports need
    no special handling."""
    local = _local_now(user, now or timezone.now())
    logs = StudyLog.objects.filter(user=user, bonus_item="", date__lte=local.date())
    return sorted(
        {
            day
            for day, created_at in logs.values_list("date", "created_at")
            if _lights_a_star(day, created_at, local.tzinfo)
        }
    )


def star_count(user, spends, now=None):
    """The gauge: lit days add a star up to the cap and spending takes them,
    in the order they happened (a day's star lands before that day's spend)."""
    events = [(day.isoformat(), 0, 1) for day in star_days(user, now)]
    events += [(s["day"], 1, -s["n"]) for s in spends]
    stars = 0
    for _, _, change in sorted(events):
        stars = max(0, min(STARLIGHT_MAX, stars + change))
    return stars


def star_lit_by(log, now=None):
    """The stars on the gauge if this new log was the first to light its day."""
    local = _local_now(log.user, now or timezone.now())
    if (
        log.bonus_item
        or log.date > local.date()
        or not _lights_a_star(log.date, log.created_at, local.tzinfo)
    ):
        return None
    others = StudyLog.objects.filter(user=log.user, date=log.date, bonus_item="").exclude(pk=log.pk)
    if any(_lights_a_star(log.date, c, local.tzinfo) for c in others.values_list("created_at", flat=True)):
        return None
    profile = UserProfile.objects.filter(user=log.user).first()
    return star_count(log.user, profile.star_spends if profile else [], now)


def _take_stars(profile, n, now):
    """Spends `n` stars from a locked profile, or returns False."""
    if star_count(profile.user, profile.star_spends, now) < n:
        return False
    day = _local_now(profile.user, now).date().isoformat()
    profile.star_spends = [*profile.star_spends, {"day": day, "n": n}]
    profile.save(update_fields=["star_spends"])
    return True


class StarlightError(Exception):
    pass


# What the stars buy, besides saving a buff. Nothing here pays BITS.
STAR_USES = {"reroll": 2, "omen": 3, "festival": 5}




def festival_state(user, now=None):
    """The year's festivals for the calendar, and what is on right now."""
    local = _local_now(user, now or timezone.now())
    festival = festivals.active_on(local.date())
    return {
        "active": festivals.serialize(festival) if festival else None,
        "calendar": [festivals.serialize(f) for f in festivals.FESTIVALS],
        "pass": festival_pass.pass_state(user, festival, local.date()) if festival else None,
        "unlocks": festival_pass.unlocks(user),
    }


def use_starlight(user, use, now=None, item_id=None):
    """Spends stars on a wish, or raises StarlightError."""
    now = now or timezone.now()
    cost = STAR_USES.get(use)
    if cost is None:
        raise StarlightError("Unknown wish.")
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        fields = []
        if use == "festival":
            festival = festivals.active_on(_local_now(user, now).date())
            if not festival or item_id not in event_pieces(festival["id"]):
                raise StarlightError("That piece isn't part of a festival right now.")
            if user.bit_purchases.filter(item_id=item_id).exists():
                raise StarlightError("You already own this piece.")
            BitPurchase.objects.create(user=user, item_id=item_id, price=0)
        elif use == "reroll":
            profile.shop_salt += 1
            fields = ["shop_salt"]
        else:
            if profile.crate_omen:
                raise StarlightError("The stars have already spoken.")
            profile.crate_omen = roll_crate(BUFFS["mystery_crate"])
            fields = ["crate_omen"]
        if not _take_stars(profile, cost, now):
            raise StarlightError("Not enough stars.")
        if fields:
            profile.save(update_fields=fields)


def serialize_starlight(user, now=None):
    profile = UserProfile.objects.filter(user=user).first()
    days = star_days(user, now)
    stars = star_count(user, profile.star_spends if profile else [], now)
    omen = profile.crate_omen if profile else ""
    return {
        "stars": stars,
        "max": STARLIGHT_MAX,
        "cost": STARLIGHT_COST,
        "guard_on": stars >= STARLIGHT_COST,
        "days": [day.isoformat() for day in days],
        "last_guard": (profile.last_guard if profile else {}) or None,
        "uses": STAR_USES,
        "omen": BUFFS[omen]["name"] if omen else None,
    }


def active_buff(user, now=None):
    """The user's live buff purchase, or None. A buff whose condition has
    failed (IRON CONTRACT's missed day, EARLY BIRD's missed morning,
    HYPERDRIVE's short day) is closed here: it ends, what is left of it is
    lost, and the buff slot is free again, unless STARLIGHT covers the one
    failure."""
    now = now or timezone.now()
    buff = (
        BitPurchase.objects.filter(
            user=user, item_id__in=RUNNABLE_BUFFS, expires_at__gt=now
        )
        .filter(Q(remaining_minutes__isnull=True) | Q(remaining_minutes__gt=0))
        .filter(Q(remaining_uses__isnull=True) | Q(remaining_uses__gt=0))
        .select_related("category", "user")
        .order_by("-created_at")
        .first()
    )
    if buff is None:
        return None
    if _misses(buff, now) and not _rescue_or_close(buff, now):
        return None
    return buff


def _rescue_or_close(buff, now):
    """A buff seen failing: STARLIGHT covers it or it ends. Returns whether it
    is still running. Decided again under the locks, since another request may
    have got here first: having just covered this failure, say."""
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=buff.user)
        locked = BitPurchase.objects.select_for_update().filter(pk=buff.pk).first()
        if locked is None or (locked.state or {}).get("closed"):
            return False
        buff.state = locked.state
        misses = _misses(locked, now)
        if not misses:
            return True
        # Two failures at once are past saving, so no stars go on them.
        if len(misses) == 1 and _spend_starlight(buff, misses[0], now):
            return True
        BitPurchase.objects.filter(pk=buff.pk, expires_at__gt=now).update(
            expires_at=now, state={**(locked.state or {}), "closed": True}
        )
        return False


def _close(buff, now):
    """Ends a buff before its time (buff row locked by the caller). 'closed'
    tells it apart from one that simply ran out, which a session started
    before the expiry can still draw on (_just_expired_buff)."""
    buff.expires_at = now
    buff.state = {**(buff.state or {}), "closed": True}
    buff.save(update_fields=["expires_at", "state"])


def _just_expired_buff(log, now):
    """The buff that ran out while this log's session was under way (and at
    most LATE_COMMIT_GRACE ago), or None. Cancelled, failed or used-up buffs
    don't qualify."""
    began = now - timedelta(minutes=log.duration_minutes)
    buff = (
        BitPurchase.objects.filter(
            user=log.user,
            item_id__in=RUNNABLE_BUFFS,
            refunded=0,
            expires_at__gt=max(began, now - LATE_COMMIT_GRACE),
            expires_at__lte=now,
        )
        .filter(Q(remaining_minutes__isnull=True) | Q(remaining_minutes__gt=0))
        .filter(Q(remaining_uses__isnull=True) | Q(remaining_uses__gt=0))
        .select_related("category", "user")
        .order_by("-expires_at")
        .first()
    )
    if buff is None or (buff.state or {}).get("closed") or _misses(buff, now):
        return None
    return buff


def _window_moment(log, buff, spec, now, weather):
    """The moment the log's session falls in the buff's window, or None: the
    commit itself if it is inside, else the latest moment of the session
    since the purchase that is. Windows last hours, so hourly steps can't
    miss one."""
    if spec["window"] in ("any", "weather"):
        return now if _in_window(log.user, spec, now, weather) else None
    began = max(now - timedelta(minutes=log.duration_minutes), buff.created_at)
    moment = now
    while moment > began:
        if _in_window(log.user, spec, moment):
            return moment
        moment -= timedelta(hours=1)
    return began if _in_window(log.user, spec, began) else None


def _night_key(local):
    """The night a local time belongs to: commits after midnight (00:00-
    01:59) count toward the evening before."""
    return (
        local.date() - timedelta(days=1) if local.hour < 12 else local.date()
    ).isoformat()


def _night_level(spec, nights, local):
    """(night key, level 1..n) for NIGHT SHIFT: one up from the night
    before if that night had a log, else back to 1."""
    key = _night_key(local)
    if key in nights:
        return key, nights[key]["lvl"]
    prev = (datetime.fromisoformat(key).date() - timedelta(days=1)).isoformat()
    level = min(nights[prev]["lvl"] + 1, len(spec["levels"])) if prev in nights else 1
    return key, level


def _draw_key(log_id):
    return f"log_{log_id}"


def return_buff_draw(log):
    """A deleted log hands back what it drew from its buff, so committing it
    again costs nothing extra. A buff that was cancelled or failed, or that
    another buff has replaced, stays as it ended. Logs committed before draws
    were recorded have nothing to hand back."""
    key = _draw_key(log.id)
    with transaction.atomic():
        buff = (
            BitPurchase.objects.select_for_update()
            .filter(user=log.user, state__draws__has_key=key)
            .first()
        )
        if buff is None:
            return
        state = dict(buff.state or {})
        draws = dict(state["draws"])
        draw = draws.pop(key)
        state["draws"] = draws
        buff.bonus_earned = max(0, buff.bonus_earned - draw.get("bonus", 0))
        replaced = BitPurchase.objects.filter(
            user=log.user, item_id__in=RUNNABLE_BUFFS, created_at__gt=buff.created_at
        ).exists()
        if not (state.get("closed") or buff.refunded or replaced):
            minutes = draw.get("minutes", 0)
            if minutes:
                buff.remaining_minutes += minutes
            if draw.get("uses"):
                buff.remaining_uses += draw["uses"]
            if minutes or draw.get("uses"):
                state.pop("ended_at", None)
            if "day" in draw:
                days = dict(state.get("days") or {})
                days[draw["day"]] = max(0, days.get(draw["day"], 0) - minutes)
                state["days"] = days
            if "night" in draw:
                nights = dict(state.get("nights") or {})
                night = dict(nights.get(draw["night"]) or {"min": 0, "lvl": 1})
                night["min"] = max(0, night["min"] - minutes)
                nights[draw["night"]] = night
                # An emptied latest night never happened, so it can't lift
                # the rate of the night after it.
                if not night["min"] and draw["night"] == max(nights):
                    del nights[draw["night"]]
                state["nights"] = nights
        buff.state = state
        buff.save(
            update_fields=[
                "remaining_minutes",
                "remaining_uses",
                "bonus_earned",
                "state",
            ]
        )


def apply_buff_to_new_log(log, now=None, weather=None):
    """
    Pays the active buff's bonus onto a just-created log and draws the buff
    down. Called once per log from StudyLogViewSet.perform_create (never for
    backup imports or edits). `weather`: the CHRONOMETER reading sent with
    the commit (STORM RUNNER only).
    """
    now = now or timezone.now()
    with transaction.atomic():
        # Profile first, then the buff, like a purchase or a cancel.
        UserProfile.objects.select_for_update().get_or_create(user=log.user)
        buff = active_buff(log.user, now) or _just_expired_buff(log, now)
        if buff is None:
            return
        # A BITS reset (or a cancel) may have removed it since the lookup:
        # the log is already saved, so just skip the bonus.
        buff = BitPurchase.objects.select_for_update().filter(pk=buff.pk).first()
        if buff is None:
            return
        # Re-check under the lock: a cancel (or another log using the last
        # minutes / uses) may have landed between the lookup and the lock.
        if (
            buff.expires_at is None
            or buff.expires_at <= now - timedelta(minutes=log.duration_minutes)
            or buff.refunded
            or (buff.state or {}).get("closed")
            or (buff.remaining_minutes is not None and buff.remaining_minutes <= 0)
            or (buff.remaining_uses is not None and buff.remaining_uses <= 0)
        ):
            return
        spec = spec_of(buff)
        if "contract" in spec:
            _seal_contract(buff, spec, log, now)
            return
        if spec.get("break_under") and log.duration_minutes < spec["break_under"]:
            # FOCUS CHIP burns out on a short log, unless STARLIGHT covers it.
            if buff.expires_at <= now or not _spend_starlight(buff, "short-log", now):
                _close(buff, now)
            return
        moment = _window_moment(log, buff, spec, now, weather)
        if moment is None:
            return
        if spec.get("category") and (
            buff.category_id is None or log.category_id != buff.category_id
        ):
            return

        bonus = 0
        # What this log took from the buff, for return_buff_draw. A LUCKY BYTE
        # roll stays spent, so deleting a miss can't buy another roll.
        draw = {}
        state = dict(buff.state or {})
        if "per_hour" in spec:
            covered = min(
                log.duration_minutes,
                MAX_BONUS_MINUTES_PER_LOG,
                buff.remaining_minutes or 0,
            )
            rate = lunar_rate(spec, now) if spec.get("lunar") else spec["per_hour"]
            local = _local_now(log.user, moment)
            if "daily_cap" in spec:
                days = dict(state.get("days") or {})
                key = local.date().isoformat()
                covered = max(0, min(covered, spec["daily_cap"] - days.get(key, 0)))
                days[key] = days.get(key, 0) + covered
                state["days"] = days
            if "levels" in spec:
                nights = dict(state.get("nights") or {})
                key, level = _night_level(spec, nights, local)
                entry = dict(nights.get(key) or {"min": 0, "lvl": level})
                covered = max(0, min(covered, spec["nightly_cap"] - entry["min"]))
                entry["min"] += covered
                nights[key] = entry
                state["nights"] = nights
                rate = spec["levels"][entry["lvl"] - 1]
            bonus = covered * rate // 60
            buff.remaining_minutes -= covered
            draw["minutes"] = covered
            if "daily_cap" in spec:
                draw["day"] = key
            if "levels" in spec:
                draw["night"] = key
        elif "tiers" in spec:
            tier = next(
                (pay for mins, pay in spec["tiers"] if log.duration_minutes >= mins), 0
            )
            if not tier:
                return
            bonus = tier
            buff.remaining_uses -= 1
            draw["uses"] = 1
        elif "per_use" in spec:
            if log.duration_minutes < spec.get("min_minutes", 0):
                return
            bonus = spec["per_use"]
            buff.remaining_uses -= 1
            draw["uses"] = 1
        elif "chance" in spec:
            buff.remaining_uses -= 1
            if random.random() < spec["chance"]:
                counted = min(log.duration_minutes, MAX_BONUS_MINUTES_PER_LOG)
                bonus = bits_for_minutes(counted) * (spec["multiplier"] - 1)

        buff.bonus_earned += bonus
        state["draws"] = {
            **(state.get("draws") or {}),
            _draw_key(log.id): {**draw, "bonus": bonus},
        }
        if buff.remaining_minutes == 0 or buff.remaining_uses == 0:
            state["ended_at"] = now.isoformat()
        buff.state = state
        buff.save(
            update_fields=[
                "remaining_minutes",
                "remaining_uses",
                "bonus_earned",
                "state",
            ]
        )
        if bonus:
            log.bonus_bits = bonus
            log.bonus_item = buff.item_id
            log.save(update_fields=["bonus_bits", "bonus_item"])


def _seal_contract(buff, spec, log, now):
    """IRON CONTRACT on a new log (buff row locked by the caller): pays
    price * multiplier onto the log that completes the last day."""
    days = contract_days(buff, now)
    if any(d["state"] == "failed" for d in days):
        _close(buff, now)
        return
    if not all(d["state"] == "done" for d in days):
        return
    bonus = buff.price * spec["contract"]["multiplier"]
    buff.remaining_uses = 0
    buff.bonus_earned += bonus
    buff.state = {**(buff.state or {}), "ended_at": now.isoformat()}
    buff.save(update_fields=["remaining_uses", "bonus_earned", "state"])
    log.bonus_bits += bonus
    log.bonus_item = buff.item_id
    log.save(update_fields=["bonus_bits", "bonus_item"])


def seal_contract_on_edit(log, now=None):
    """A log lengthened while IRON CONTRACT runs can complete its last day:
    pays out onto that log, as a commit would have."""
    now = now or timezone.now()
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=log.user)
        buff = active_buff(log.user, now)
        if buff is None or "contract" not in spec_of(buff):
            return
        buff = (
            BitPurchase.objects.select_for_update()
            .filter(pk=buff.pk, remaining_uses__gt=0, expires_at__gt=now)
            .first()
        )
        if buff is not None:
            _seal_contract(buff, spec_of(buff), log, now)


def bits_summary(user):
    logs = user.study_logs.aggregate(
        minutes=Sum("duration_minutes"), bonus=Sum("bonus_bits")
    )
    purchases = user.bit_purchases.aggregate(
        total=Sum(F("price") - F("refunded") + F("struck")), payouts=Sum("payout")
    )
    spent = purchases["total"] or 0
    payouts = purchases["payouts"] or 0
    earned = bits_for_minutes(logs["minutes"] or 0) + (logs["bonus"] or 0) + payouts
    return {
        "balance": earned - spent,
        "earned": earned,
        "spent": spent,
        # Challenge payouts (part of earned): the client adds them to the
        # balance it derives from the logs.
        "payouts": payouts,
        "per_hour": BITS_PER_HOUR,
    }


def buff_status(purchase, spec, now):
    """A short live line for the running buff's card (reworked buffs)."""
    local = _local_now(purchase.user, now)
    state = purchase.state or {}
    if "mornings" in spec:
        first = _first_morning(purchase.user, purchase.created_at)
        n = min(spec["mornings"], max(1, (local.date() - first).days + 1))
        used = (state.get("days") or {}).get(local.date().isoformat(), 0)
        if local.date() < first or local.hour >= 9:
            return f'MORNING {n}/{spec["mornings"]} · NEXT FROM 05:00'
        return f'MORNING {n}/{spec["mornings"]} · {used}/{spec["daily_cap"]} MIN TODAY'
    if "levels" in spec:
        key, level = _night_level(spec, state.get("nights") or {}, local)
        used = ((state.get("nights") or {}).get(key) or {}).get("min", 0)
        return f'TONIGHT +{spec["levels"][level - 1]} BITS/H · {used}/{spec["nightly_cap"]} MIN'
    if "daily_min" in spec:
        if local.date() == _local_now(purchase.user, purchase.created_at).date():
            return f'FROM TOMORROW: {spec["daily_min"] // 60}H A DAY'
        done = _day_minutes(purchase.user, local.date(), local.tzinfo)
        return f'TODAY {min(done, spec["daily_min"])}/{spec["daily_min"]} MIN NEEDED'
    if "break_under" in spec:
        return f'A LOG UNDER {spec["break_under"]} MIN BURNS IT OUT'
    return None


def serialize_buff(purchase):
    if purchase is None:
        return None
    spec = spec_of(purchase)
    category = purchase.category
    return {
        "item_id": purchase.item_id,
        "name": spec["name"],
        "expires_at": purchase.expires_at,
        "remaining_minutes": purchase.remaining_minutes,
        "total_minutes": spec.get("minutes"),
        "remaining_uses": purchase.remaining_uses,
        "total_uses": spec.get("uses"),
        "bonus_earned": purchase.bonus_earned,
        "refund": refund_amount(purchase),
        "via": purchase.via,
        "category": (
            {
                "id": category.id,
                "code": category.code,
                "name": category.name,
                "color": category.color,
            }
            if category
            else None
        ),
        "contract": (
            {
                **spec["contract"],
                "payout": purchase.price * spec["contract"]["multiplier"],
                "days": contract_days(purchase, timezone.now()),
            }
            if "contract" in spec
            else None
        ),
        "rate_now": lunar_rate(spec, timezone.now()) if spec.get("lunar") else None,
        "status": buff_status(purchase, spec, timezone.now()),
        # STARLIGHT: whether a failure can be covered, and whether one was.
        "guardable": any(
            key in spec for key in ("contract", "mornings", "daily_min", "break_under")
        ),
        "guarded": bool((purchase.state or {}).get("covered")),
    }


def max_bonus(spec):
    """The most a buff can pay out, or None when it is down to luck."""
    if "contract" in spec:
        return spec["price"] * spec["contract"]["multiplier"]
    if "levels" in spec:
        return spec["nightly_cap"] * sum(spec["levels"]) // 60
    if "tiers" in spec:
        return spec["uses"] * max(pay for _, pay in spec["tiers"])
    if "per_hour" in spec:
        return spec["minutes"] * spec["per_hour"] // 60
    if "per_use" in spec:
        return spec["uses"] * spec["per_use"]
    return None


def crate_odds(spec):
    total = sum(spec["crate"].values())
    return [
        {"item_id": item_id, "name": BUFFS[item_id]["name"], "chance": weight / total}
        for item_id, weight in spec["crate"].items()
    ]


def serialize_buff_offer(item_id, spec):
    return {
        "item_id": item_id,
        **{
            k: spec[k]
            for k in ("name", "tagline", "detail", "price", "window", "expires")
        },
        # Card stats: lifetime, cap and the best case.
        "hours": spec.get("hours"),
        "minutes": spec.get("minutes"),
        "uses": spec.get("uses"),
        "max_bonus": max_bonus(spec),
        "needs_category": bool(spec.get("category")),
        "cooldown_hours": BUFF_COOLDOWN_HOURS.get(item_id),
        "odds": crate_odds(spec) if "crate" in spec else None,
        "contract": spec.get("contract"),
        "mornings": spec.get("mornings"),
        # LUNAR TIDE: what it would pay per hour if a log were committed now.
        "rate_now": lunar_rate(spec, timezone.now()) if spec.get("lunar") else None,
    }


def shop_state(user, now=None):
    now = now or timezone.now()
    challenge = challenges.active_challenge(user, now)  # settles finished ones first
    festival_pass.sync_current(user, now)  # before the balance: its steps pay BITS
    return {
        "bits": bits_summary(user),
        "active_buff": serialize_buff(active_buff(user, now)),
        "buff_cooldowns": buff_cooldowns(user, now),
        "starlight": serialize_starlight(user),
        "festival": festival_state(user, now),
        "buffs": [
            serialize_buff_offer(item_id, spec) for item_id, spec in BUFFS.items()
        ],
        "active_challenge": challenges.serialize_challenge(challenge, now),
        "challenges": challenges.offers(user, now),
        "last_challenge": challenges.last_result(user, now),
        "collection": collection_state(user),
    }


class PurchaseError(Exception):
    pass


# Cancelling a running buff hands back two thirds of the unused part of its
# price. Prorating by what is left (minutes or uses) matters: bonuses already
# paid onto logs stay, so a flat refund would let anyone use a buff almost
# to the end and then get most of the price back.
REFUND_NUMERATOR = 2
REFUND_DENOMINATOR = 3


def remaining_share(purchase):
    """(left, total) of the buff's capacity: minutes for minute-capped
    buffs, uses for use-capped ones."""
    spec = spec_of(purchase)
    if spec.get("minutes") and purchase.remaining_minutes is not None:
        return purchase.remaining_minutes, spec["minutes"]
    if spec.get("uses") and purchase.remaining_uses is not None:
        return purchase.remaining_uses, spec["uses"]
    return 0, 1


def refund_amount(purchase):
    left, total = remaining_share(purchase)
    return purchase.price * left * REFUND_NUMERATOR // (total * REFUND_DENOMINATOR)


def cancel_buff(user, now=None):
    """Ends the running buff now and refunds its unused share; returns the
    BITS refunded, or raises PurchaseError when no buff is running."""
    now = now or timezone.now()
    with transaction.atomic():
        # Same lock as a purchase: a cancel can't race a buy or a log commit.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        buff = active_buff(user, now)
        if buff is None:
            raise PurchaseError("No buff is running.")
        buff = BitPurchase.objects.select_for_update().get(pk=buff.pk)
        refund = refund_amount(buff)
        buff.refunded = refund
        buff.save(update_fields=["refunded"])
        # Bought by mistake: nothing was used, so nothing to wait out.
        if not (buff.state or {}).get("draws") and not buff.bonus_earned:
            buff.state = {**(buff.state or {}), "no_cooldown": True}
        _close(buff, now)
        return refund


def reset_economy(user):
    """Starts the BITS economy over while keeping every study log and
    category: all purchases (buffs and furniture, so a running buff too) are
    dropped, buff bonuses are taken off the logs and MY ROOM goes back to
    the starter room (all five rooms and their SAVEs, and the shop reserve).
    What was spent of STARLIGHT is forgotten, and the bonuses going means every
    day with a log lights again. The balance falls back to the base rate for the hours
    already logged, plus what the logs still earn: the FESTIVAL PASS steps.
    Returns (purchases deleted, logs whose bonus was cleared).
    """
    with transaction.atomic():
        # Same lock as a purchase or a log commit, so neither can land on
        # the far side of the reset.
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        deleted, _ = BitPurchase.objects.filter(user=user).delete()
        profile.star_spends = []
        profile.last_guard = {}
        profile.crate_omen = ""
        profile.save(update_fields=["star_spends", "last_guard", "crate_omen"])
        cleared = (
            StudyLog.objects.filter(user=user)
            .filter(Q(bonus_bits__gt=0) | ~Q(bonus_item=""))
            .update(bonus_bits=0, bonus_item="")
        )
        if (
            profile.room_layout
            or profile.room_slots
            or profile.room_active_slot
            or profile.shop_reserve
        ):
            # All five rooms and their SAVE checkpoints: they hold furniture
            # that is no longer owned.
            profile.room_layout = {}
            profile.room_slots = []
            profile.room_active_slot = 0
            profile.shop_reserve = ""
            profile.save(
                update_fields=[
                    "room_layout",
                    "room_slots",
                    "room_active_slot",
                    "shop_reserve",
                ]
            )
    festival_pass.sweep(user)
    return deleted, cleared


def roll_crate(spec):
    """The buff id a crate opens into (weighted draw)."""
    ids = list(spec["crate"])
    return random.choices(ids, weights=[spec["crate"][i] for i in ids])[0]


def buy(user, item_id, now=None, category_id=None, category_ids=None):
    """Debits the price and starts the buff (or adds the furniture piece to
    the inventory, or starts a challenge), or raises PurchaseError. CATEGORY
    LOCK needs `category_id`: one of the user's own in-progress categories.
    HYDRA takes `category_ids` (challenges.start)."""
    now = now or timezone.now()
    if item_id in FURNITURE:
        return _buy_furniture(user, item_id, now)
    if challenges.is_challenge(item_id):
        try:
            return challenges.start(user, item_id, now, category_ids)
        except challenges.ChallengeError as exc:
            raise PurchaseError(str(exc))
    spec = BUFFS.get(item_id)
    if spec is None:
        raise PurchaseError("Unknown item.")
    category = None
    if spec.get("category"):
        if category_id in (None, ""):
            raise PurchaseError("Pick a category for this buff.")
        try:
            category = Category.objects.get(
                pk=int(category_id), user=user, completed_at__isnull=True
            )
        except (Category.DoesNotExist, TypeError, ValueError):
            raise PurchaseError("Unknown category.")
    with transaction.atomic():
        # Serialize a user's purchases so two quick taps can't both spend
        # the same balance.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if active_buff(user, now) is not None:
            raise PurchaseError("A buff is already running — wait for it to finish.")
        if item_id in buff_cooldowns(user, now):
            raise PurchaseError("This buff isn't ready yet — it is cooling down.")
        if bits_summary(user)["balance"] < spec["price"]:
            raise PurchaseError("Not enough BITS.")
        via = ""
        runs, run_spec = item_id, spec
        if "crate" in spec:
            via = item_id
            # The stars may already have told what is inside.
            profile = UserProfile.objects.get(user=user)
            runs = profile.crate_omen or roll_crate(spec)
            if profile.crate_omen:
                profile.crate_omen = ""
                profile.save(update_fields=["crate_omen"])
            run_spec = BUFFS[runs]
        return BitPurchase.objects.create(
            user=user,
            item_id=runs,
            price=spec["price"],
            expires_at=_expiry(user, run_spec, now),
            remaining_minutes=run_spec.get("minutes"),
            # A contract is "used" once, when it pays out.
            remaining_uses=1 if "contract" in run_spec else run_spec.get("uses"),
            category=category,
            via=via,
            rules=CURRENT_RULES,
        )


def _buy_furniture(user, item_id, now):
    spec = FURNITURE[item_id]
    with transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        # One of each piece: owning it already (bought earlier, or a
        # double tap racing this one) blocks a second purchase.
        if BitPurchase.objects.filter(user=user, item_id=item_id).exists():
            raise PurchaseError("You already own this piece.")
        # On show now, or the piece the user reserved before it rotated out.
        shop = shop_lineup(user, now, profile)
        if item_id not in shop["items"] and item_id != shop["reserve"]:
            raise PurchaseError("That piece is not in the shop right now.")
        if bits_summary(user)["balance"] < spec["price"]:
            raise PurchaseError("Not enough BITS.")
        purchase = BitPurchase.objects.create(
            user=user, item_id=item_id, price=spec["price"]
        )
        if profile.shop_reserve == item_id:
            profile.shop_reserve = ""
            profile.save(update_fields=["shop_reserve"])
        return purchase
