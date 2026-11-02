"""
The FESTIVAL PASS: what you study during a festival fills a bar, and steps along
it pay BITS and a cursor, with the biggest BITS at the very end. The goal follows the festival's length
(FESTIVAL_GOAL_PER_DAY for each of its days), so a short festival asks for less.

Everything is worked out from the logs: a reward is a BitPurchase row (price 0;
BITS in `payout`, which the ledger counts as earned) that only records the step
was reached, so a BITS reset or a backup of logs alone brings them all back
(sweep). While the festival runs a step can still be lost again: delete the logs
that reached it and it goes.

Like the Christmas present, only what is committed in the festival counts: no
back-dating into it from before, and none from after (beyond a session that ran
past the last midnight, LATE_COMMIT). Festivals from before the bar existed don't
count at all (FIRST_BAR_DAY), so a BITS reset pays no more than was already paid.
"""

from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db.models import Min, Sum
from django.utils import timezone

from . import festivals
from .models import BitPurchase, StudyLog, UserProfile
from .timezones import get_user_zone

PREFIX = "fest_"
FESTIVAL_GOAL_PER_DAY = 300  # minutes
# The five steps along the bar, evenly spaced.
STEP_KINDS = ("bits", "cursor", "bits", "bits", "bits")
# BITS a BITS step pays, per hour of the goal; finishing the bar pays this many times over.
BITS_PER_GOAL_HOUR = 8
# A log may still be committed this long after the last midnight.
LATE_COMMIT = timedelta(hours=3)
# The first festival with a bar began on this day.
FIRST_BAR_DAY = date(2026, 11, 1)
FINAL_STEP_MULTIPLIER = 3


def cursor_id(festival_id):
    return f"fest-{festival_id}"


def _zone(user):
    return get_user_zone(user) or timezone.get_current_timezone()


def _span(festival, year):
    """(first day, last day) of the festival that starts in `year`."""
    start = date(year, *festival["start"])
    wraps = festival["start"] > festival["end"]
    return start, date(year + 1 if wraps else year, *festival["end"])


def _year_of(festival, day):
    """The year the festival running on `day` started in."""
    wraps = festival["start"] > festival["end"]
    return day.year - 1 if wraps and (day.month, day.day) <= festival["end"] else day.year


def steps(festival, year):
    """The bar's steps: [{'at' minutes, 'kind', ...what it gives}]."""
    first, last = _span(festival, year)
    goal = ((last - first).days + 1) * FESTIVAL_GOAL_PER_DAY
    bits = round(goal / 60 * BITS_PER_GOAL_HOUR, -1)
    out = []
    for i, kind in enumerate(STEP_KINDS):
        step = {"at": goal * (i + 1) // len(STEP_KINDS), "kind": kind}
        if kind == "bits":
            step["bits"] = int(bits) * (FINAL_STEP_MULTIPLIER if i == len(STEP_KINDS) - 1 else 1)
        else:
            step["cursor"] = cursor_id(festival["id"])
        out.append(step)
    return out


def _minutes(user, festival, year):
    first, last = _span(festival, year)
    zone = _zone(user)
    opens = timezone.make_aware(datetime.combine(first, time.min), zone)
    closes = timezone.make_aware(datetime.combine(last + timedelta(days=1), time.min), zone) + LATE_COMMIT
    return (
        StudyLog.objects.filter(
            user=user, date__gte=first, date__lte=last, created_at__gte=opens, created_at__lt=closes
        ).aggregate(m=Sum("duration_minutes"))["m"]
        or 0
    )


def _item(festival, year, index):
    return f"{PREFIX}{festival['id']}_{year}_{index}"


def _sync(user, festival, year, live, now):
    """Makes the reward rows match the logs. Past festivals only gain: what was
    earned stays earned once it is over."""
    if _span(festival, year)[0] < FIRST_BAR_DAY:
        return 0
    minutes = _minutes(user, festival, year)
    plan = steps(festival, year)
    reached = {i for i, step in enumerate(plan) if minutes >= step["at"]}
    held = set(
        BitPurchase.objects.filter(
            user=user, item_id__startswith=f"{PREFIX}{festival['id']}_{year}_"
        ).values_list("item_id", flat=True)
    )
    wanted = {_item(festival, year, i) for i in reached}
    if wanted <= held and (not live or held <= wanted):
        return minutes
    with transaction.atomic():
        # Same lock as a purchase: two reads at once can't pay a step twice.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        held = set(
            BitPurchase.objects.filter(
                user=user, item_id__startswith=f"{PREFIX}{festival['id']}_{year}_"
            ).values_list("item_id", flat=True)
        )
        for i in sorted(reached):
            item_id = _item(festival, year, i)
            if item_id not in held:
                BitPurchase.objects.create(
                    user=user,
                    item_id=item_id,
                    price=0,
                    payout=plan[i].get("bits", 0),
                    expires_at=now,
                    remaining_uses=0,
                    state={"festival": festival["id"], "step": i},
                )
        if live:
            BitPurchase.objects.filter(user=user, item_id__in=held - wanted).delete()
    return minutes


def _last_ended(today):
    """(festival, year) of the festival that ended most recently."""
    best = None
    for festival in festivals.FESTIVALS:
        for year in (today.year - 1, today.year):
            _, last = _span(festival, year)
            if last < today and (best is None or last > best[0]):
                best = (last, festival, year)
    return best[1], best[2]


def sync_current(user, now=None):
    """On every read of the shop: the festival running now, and the one just over
    (its last logs may have come after the last visit)."""
    now = now or timezone.now()
    today = timezone.localtime(now, _zone(user)).date()
    festival, year = _last_ended(today)
    _sync(user, festival, year, False, now)
    current = festivals.active_on(today)
    if current:
        _sync(user, current, _year_of(current, today), True, now)


def sweep(user, now=None):
    """Works every festival out from the logs again, for when the rows were lost
    (a BITS reset) or the logs just arrived (an import)."""
    now = now or timezone.now()
    first = StudyLog.objects.filter(user=user).aggregate(d=Min("date"))["d"]
    if first is None:
        return
    today = timezone.localtime(now, _zone(user)).date()
    for festival in festivals.FESTIVALS:
        for year in range(first.year - 1, today.year + 1):
            start, _ = _span(festival, year)
            if start <= today:
                live = festivals.active_on(today) is festival and year == _year_of(festival, today)
                _sync(user, festival, year, live, now)


def unlocks(user):
    """What the passes have opened, for good: {'cursors': [...]}."""
    cursors = set()
    for item_id in BitPurchase.objects.filter(
        user=user, item_id__startswith=PREFIX
    ).values_list("item_id", flat=True):
        festival_id, _, index = item_id[len(PREFIX):].split("_")
        if STEP_KINDS[int(index)] == "cursor":
            cursors.add(cursor_id(festival_id))
    return {"cursors": sorted(cursors)}


def pass_state(user, festival, day):
    """The bar for the running festival."""
    year = _year_of(festival, day)
    plan = steps(festival, year)
    minutes = _minutes(user, festival, year)
    return {
        "minutes": minutes,
        "goal": plan[-1]["at"],
        "steps": [{**step, "reached": minutes >= step["at"]} for step in plan],
    }
