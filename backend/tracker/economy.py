"""
BITS: the study currency. 1 hour of logged study = 100 BITS, whether it was
recorded with the stopwatch or entered manually.

Base earnings are derived from the StudyLog table rather than stored, so
every log ever written (including those that predate this feature) is paid
out with no backfill, and editing, deleting, clearing or importing logs
keeps the balance in step automatically. On top of that:

- a shop buff active when a log is committed adds that log's bonus_bits
  (stored on the log, so deleting it takes the bonus back too). IRON
  CONTRACT pays its whole payout onto the log that seals it, the same way;
- every BitPurchase debits its price, less anything refunded when a buff
  was cancelled early (cancel_buff);
- a settled CHALLENGE (challenges.py) credits its payout.

balance = floor(total minutes * 100 / 60) + sum(bonus_bits) + sum(payout) - sum(price - refunded)

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

from . import challenges
from .furniture import FURNITURE, shop_lineup
from .models import BitPurchase, Category, StudyLog, UserProfile
from .timezones import get_user_zone

BITS_PER_HOUR = 100

# A buff's minute-based bonus never counts more than this much of one log,
# so a single oversized entry can't drain (or max out) a buff in one go.
MAX_BONUS_MINUTES_PER_LOG = 180


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
        "detail": "For 72h, logs committed 22:00–02:00 earn +100 BITS/h the first night, +150 the next and +200 the third, up to 3 hours a night (+1,350 in all). Skip a night and the rate drops back to +100.",
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
        "detail": "The next 3 mornings: logs committed 05:00–09:00 earn +200 BITS/h, up to 2 hours each morning (+1,200 in all). A morning with no log ends the buff, and whatever is left of it is lost.",
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
        "price": 800,
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
        "price": 800,
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
        "price": 900,
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
        "detail": "Logs committed this Saturday and Sunday earn +50 BITS/h (up to 24 hours, +1,200). Buy it any day — it holds your buff slot until Sunday ends.",
        "price": 1000,
        "window": "weekend",
        "expires": "weekend",
        "minutes": 1440,
        "per_hour": 50,
    },
    "lucky_byte": {
        "name": "LUCKY BYTE",
        "tagline": "20% chance of ×3 on each log",
        "detail": "For 72h, each log has a 1-in-5 chance to pay triple (up to 3h of it counts; up to 20 logs).",
        "price": 1000,
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
        "detail": "For 96h, each single log pays by its length: 2h or more earns +250, 3h +450 and 4h +700 (up to 4 logs, +2,800). Shorter logs pay nothing extra and use nothing up.",
        "price": 1500,
        "window": "any",
        "expires": "hours",
        "hours": 96,
        "uses": 4,
        "min_minutes": 120,
        "tiers": [[240, 700], [180, 450], [120, 250]],
    },
    "iron_contract": {
        "name": "IRON CONTRACT",
        "tagline": "3 days × 5h: pays ×2 — or keeps the stake",
        "detail": "Starts at midnight and runs 3 calendar days. Commit 5 hours or more on every one of them and the log that completes day 3 pays twice the stake (+3,000). Miss a single day and the stake is gone. Cancelling refunds nothing.",
        "price": 1500,
        "window": "any",
        "expires": "contract",
        "contract": {"days": 3, "min_minutes": 300, "multiplier": 2},
    },
    "hyperdrive": {
        "name": "HYPERDRIVE",
        "tagline": "×2 on 25 hours — if you keep up 3h a day",
        "detail": "Every log you commit in the next 96h earns +100 BITS/h until 25 hours are covered (up to +2,500). Every full day it runs needs 3 hours of logs, or the drive shuts down.",
        "price": 1800,
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
    'failed' (over, short). Minutes are those of logs committed (created_at)
    within each local day, so hours can't be back-dated into a day."""
    spec = spec_of(purchase)["contract"]
    local = _local_now(purchase.user, purchase.created_at)
    zone = local.tzinfo
    today = _local_now(purchase.user, now).date()
    first = local.date() + timedelta(days=1)
    days = []
    for i in range(spec["days"]):
        day = first + timedelta(days=i)
        start, end = _local_midnight(day, zone), _local_midnight(
            day + timedelta(days=1), zone
        )
        minutes = (
            StudyLog.objects.filter(
                user=purchase.user, created_at__gte=start, created_at__lt=end
            ).aggregate(m=Sum("duration_minutes"))["m"]
            or 0
        )
        if minutes >= spec["min_minutes"]:
            state = "done"
        elif day < today:
            state = "failed"
        elif day == today:
            state = "live"
        else:
            state = "pending"
        days.append({"date": day.isoformat(), "minutes": minutes, "state": state})
    return days


def _minutes_between(user, start, end):
    """Minutes of the logs committed (created_at) in [start, end)."""
    return (
        StudyLog.objects.filter(
            user=user, created_at__gte=start, created_at__lt=end
        ).aggregate(m=Sum("duration_minutes"))["m"]
        or 0
    )


def _missed_morning(purchase, spec, now):
    """EARLY BIRD: a morning (05:00-09:00) that has ended with no log."""
    zone = _local_now(purchase.user, now).tzinfo
    day = _first_morning(purchase.user, purchase.created_at)
    for _ in range(spec["mornings"]):
        start = timezone.make_aware(datetime.combine(day, time(5)), zone)
        end = timezone.make_aware(datetime.combine(day, time(9)), zone)
        if end > now:
            break
        if not StudyLog.objects.filter(
            user=purchase.user, created_at__gte=start, created_at__lt=end
        ).exists():
            return True
        day += timedelta(days=1)
    return False


def _short_day(purchase, spec, now):
    """HYPERDRIVE: a full day (after the purchase day, before today) with
    fewer than daily_min minutes committed."""
    local = _local_now(purchase.user, now)
    zone = local.tzinfo
    day = _local_now(purchase.user, purchase.created_at).date() + timedelta(days=1)
    while day < local.date():
        start = _local_midnight(day, zone)
        if (
            _minutes_between(purchase.user, start, start + timedelta(days=1))
            < spec["daily_min"]
        ):
            return True
        day += timedelta(days=1)
    return False


def _broken(purchase, now):
    """Whether a running buff has failed its condition and must end now."""
    spec = spec_of(purchase)
    if "contract" in spec:
        return any(d["state"] == "failed" for d in contract_days(purchase, now))
    if "mornings" in spec:
        return _missed_morning(purchase, spec, now)
    if "daily_min" in spec:
        return _short_day(purchase, spec, now)
    return False


def active_buff(user, now=None):
    """The user's live buff purchase, or None. A buff whose condition has
    failed (IRON CONTRACT's missed day, EARLY BIRD's missed morning,
    HYPERDRIVE's short day) is closed here: it ends, what is left of it is
    lost, and the buff slot is free again."""
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
    if buff is not None and _broken(buff, now):
        BitPurchase.objects.filter(pk=buff.pk, expires_at__gt=now).update(
            expires_at=now
        )
        return None
    return buff


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


def apply_buff_to_new_log(log, now=None, weather=None):
    """
    Pays the active buff's bonus onto a just-created log and draws the buff
    down. Called once per log from StudyLogViewSet.perform_create (never for
    backup imports or edits). `weather`: the CHRONOMETER reading sent with
    the commit (STORM RUNNER only).
    """
    now = now or timezone.now()
    with transaction.atomic():
        buff = active_buff(log.user, now)
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
            or buff.expires_at <= timezone.now()
            or (buff.remaining_minutes is not None and buff.remaining_minutes <= 0)
            or (buff.remaining_uses is not None and buff.remaining_uses <= 0)
        ):
            return
        spec = spec_of(buff)
        if "contract" in spec:
            _seal_contract(buff, spec, log, now)
            return
        if spec.get("break_under") and log.duration_minutes < spec["break_under"]:
            # FOCUS CHIP burns out on a short log.
            buff.expires_at = now
            buff.save(update_fields=["expires_at"])
            return
        if not _in_window(log.user, spec, now, weather):
            return
        if spec.get("category") and (
            buff.category_id is None or log.category_id != buff.category_id
        ):
            return

        bonus = 0
        state = dict(buff.state or {})
        if "per_hour" in spec:
            covered = min(
                log.duration_minutes,
                MAX_BONUS_MINUTES_PER_LOG,
                buff.remaining_minutes or 0,
            )
            rate = lunar_rate(spec, now) if spec.get("lunar") else spec["per_hour"]
            local = _local_now(log.user, now)
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
        elif "tiers" in spec:
            tier = next(
                (pay for mins, pay in spec["tiers"] if log.duration_minutes >= mins), 0
            )
            if not tier:
                return
            bonus = tier
            buff.remaining_uses -= 1
        elif "per_use" in spec:
            if log.duration_minutes < spec.get("min_minutes", 0):
                return
            bonus = spec["per_use"]
            buff.remaining_uses -= 1
        elif "chance" in spec:
            buff.remaining_uses -= 1
            if random.random() < spec["chance"]:
                counted = min(log.duration_minutes, MAX_BONUS_MINUTES_PER_LOG)
                bonus = bits_for_minutes(counted) * (spec["multiplier"] - 1)

        buff.bonus_earned += bonus
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
        buff.expires_at = now
        buff.save(update_fields=["expires_at"])
        return
    if not all(d["state"] == "done" for d in days):
        return
    bonus = buff.price * spec["contract"]["multiplier"]
    buff.remaining_uses = 0
    buff.bonus_earned += bonus
    buff.save(update_fields=["remaining_uses", "bonus_earned"])
    log.bonus_bits = bonus
    log.bonus_item = buff.item_id
    log.save(update_fields=["bonus_bits", "bonus_item"])


def scale_bonus_on_edit(log, old_minutes):
    """A log shortened after the fact keeps only its share of the bonus."""
    if log.bonus_bits and log.duration_minutes < old_minutes:
        log.bonus_bits = log.bonus_bits * log.duration_minutes // old_minutes
        log.save(update_fields=["bonus_bits"])


def bits_summary(user):
    logs = user.study_logs.aggregate(
        minutes=Sum("duration_minutes"), bonus=Sum("bonus_bits")
    )
    purchases = user.bit_purchases.aggregate(
        total=Sum(F("price") - F("refunded")), payouts=Sum("payout")
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
        start = _local_midnight(local.date(), local.tzinfo)
        if local.date() == _local_now(purchase.user, purchase.created_at).date():
            return f'FROM TOMORROW: {spec["daily_min"] // 60}H A DAY'
        done = _minutes_between(purchase.user, start, start + timedelta(days=1))
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
        "odds": crate_odds(spec) if "crate" in spec else None,
        "contract": spec.get("contract"),
        "mornings": spec.get("mornings"),
        # LUNAR TIDE: what it would pay per hour if a log were committed now.
        "rate_now": lunar_rate(spec, timezone.now()) if spec.get("lunar") else None,
    }


def shop_state(user, now=None):
    now = now or timezone.now()
    challenge = challenges.active_challenge(user, now)  # settles finished ones first
    return {
        "bits": bits_summary(user),
        "active_buff": serialize_buff(active_buff(user, now)),
        "buffs": [
            serialize_buff_offer(item_id, spec) for item_id, spec in BUFFS.items()
        ],
        "active_challenge": challenges.serialize_challenge(challenge, now),
        "challenges": challenges.offers(user, now),
        "last_challenge": challenges.last_result(user, now),
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
        buff.expires_at = now
        buff.save(update_fields=["refunded", "expires_at"])
        return refund


def reset_economy(user):
    """Starts the BITS economy over while keeping every study log and
    category: all purchases (buffs and furniture, so a running buff too) are
    dropped, buff bonuses are taken off the logs and MY ROOM goes back to
    the starter room (all five rooms and their SAVEs, and the shop reserve). The balance falls back to the base rate for the hours
    already logged. Returns (purchases deleted, logs whose bonus was cleared).
    """
    with transaction.atomic():
        # Same lock as a purchase or a log commit, so neither can land on
        # the far side of the reset.
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        deleted, _ = BitPurchase.objects.filter(user=user).delete()
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
        if bits_summary(user)["balance"] < spec["price"]:
            raise PurchaseError("Not enough BITS.")
        via = ""
        runs, run_spec = item_id, spec
        if "crate" in spec:
            via = item_id
            runs = roll_crate(spec)
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
