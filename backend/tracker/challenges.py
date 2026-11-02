"""
CHALLENGES: BOSS RAID and RIVAL. A second slot next to the buff slot: one
challenge runs at a time, alongside (not instead of) a buff.

Both are BitPurchase rows (item_id 'raid_<boss>' / 'rival_<rival>'): the
entry fee is the purchase price, and what a challenge pays back lands in
BitPurchase.payout, which the ledger counts as earned (economy.bits_summary).
A BITS reset or a clear-all deletes the rows, payouts and all.

Lifecycle: a challenge is live while remaining_uses == 1 and expires_at is
in the future. It is settled exactly once (remaining_uses -> 0, the outcome
and payout written) when a raid boss goes down, when the user forfeits, or
lazily on the first read after it runs out of time (settle_expired).

BOSS RAID: every log committed while the raid is live strikes the boss for
its minutes (at most MAX_HIT_MINUTES of one log; 90 min+ is a critical,
x1.5). Each boss has a trait that changes how to fight it. Hits are kept in
state['events'] and HP is replayed from them (plus the trait's heals), so a
log deleted mid-raid takes its hit back and an edited one hits for its new
length, up to what it hit for when committed. A HYDRA head whose category is
deleted or marked DONE counts as slain once another head has really been cut
down. Down in time: the full loot. Out of time: a share of the loot in step
with the damage dealt.

RIVAL: a 72-hour duel against an NPC whose day runs on a schedule drawn
from the date (rival_day), the same for everyone. Like a raid, it starts
the moment it is bought. Your side is the minutes of logs committed inside
those 72 hours; theirs is the part of their schedule that falls inside
them (a session they are in the middle of counts from the start). Win: the
prize; tie: the entry fee back; lose: nothing.
"""

import random
from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from . import festivals
from .models import BitPurchase, Category, StudyLog, UserProfile
from .timezones import get_user_zone

MAX_HIT_MINUTES = 180
CRIT_MINUTES = 90
CRIT_MULTIPLIER = 1.5
# Out of time: this share of the loot, scaled by the fraction of HP dealt.
ESCAPE_SHARE = 0.4

# ==========================================
# Catalog
# ==========================================
#   hp / days: minutes of damage needed, and how long the boss stays.
#   trait: armor (logs under 60 min do nothing) · night (heals 60 min at
#          every local midnight) · heads (one head per category; a log only
#          hits its category's head) · regen (heals 120 min after a day with
#          no log) · dodge (a hit misses one time in four) · nocturne (a log
#          committed in the daytime misses) · beans (short logs hit double)
#          · none.
RAIDS = {
    "golem": {
        "name": "GOLEM",
        "title": "THE STONE WALL",
        "price": 800,
        "hp": 1200,
        "days": 5,
        "loot": 1300,
        "trait": "armor",
        "trait_line": "Logs under 60 minutes bounce off.",
    },
    "nightmare": {
        "name": "NIGHTMARE",
        "title": "WHAT WAKES AT 2 AM",
        "price": 800,
        "hp": 1200,
        "days": 5,
        "loot": 1400,
        "trait": "night",
        "trait_line": "Heals 1 hour at every midnight.",
    },
    "hydra": {
        "name": "HYDRA",
        "title": "THREE HEADS, THREE SUBJECTS",
        "price": 900,
        "hp": 1200,
        "days": 5,
        "loot": 1500,
        "trait": "heads",
        "trait_line": "One head per category: a log only hits its own.",
    },
    "warden": {
        "name": "WARDEN",
        "title": "KEEPER OF THE STREAK",
        "price": 800,
        "hp": 1200,
        "days": 5,
        "loot": 1400,
        "trait": "regen",
        "trait_line": "A full day without a log heals it 2 hours.",
    },
    "phantom": {
        "name": "PHANTOM",
        "title": "NOW YOU SEE IT",
        "price": 900,
        "hp": 1200,
        "days": 5,
        "loot": 1500,
        "trait": "dodge",
        "trait_line": "Dodges one hit in four.",
    },
    "titan": {
        "name": "TITAN",
        "title": "THE LONG WAR",
        "price": 1500,
        "hp": 1800,
        "days": 7,
        "loot": 3000,
        "trait": "none",
        "trait_line": "30 hours of HP and a week to bring it down.",
    },
    # Festival bosses (festivals.py): on sale only while their festival runs.
    "kagami": {
        "name": "KAGAMI",
        "title": "THE OFFERING WOKE UP",
        "price": 600,
        "hp": 900,
        "days": 4,
        "loot": 1100,
        "trait": "armor",
        "trait_line": "Logs under 60 minutes bounce off.",
        "event": "newyear",
    },
    "river": {
        "name": "RIVER OF HEAVEN",
        "title": "THE DRAGON IN THE STARS",
        "price": 800,
        "hp": 1000,
        "days": 6,
        "loot": 1500,
        "trait": "heads",
        "trait_line": "One head per subject: a log only reaches its own.",
        "event": "tanabata",
    },
    "august": {
        "name": "AUGUST 31",
        "title": "THE DEADLINE ITSELF",
        "price": 1000,
        "hp": 1500,
        "days": 7,
        "loot": 2200,
        "trait": "regen",
        "trait_line": "A full day without a log heals it 2 hours.",
        "event": "summer",
    },
    "jack": {
        "name": "JACK",
        "title": "ONLY AFTER DARK",
        "price": 700,
        "hp": 1000,
        "days": 6,
        "loot": 1300,
        "trait": "nocturne",
        "trait_line": "Logs committed 05:00-17:59 pass right through.",
        "event": "halloween",
    },
    "fubuki": {
        "name": "FUBUKI",
        "title": "THE STORM THAT STRIPS THE TREES",
        "price": 800,
        "hp": 1100,
        "days": 6,
        "loot": 1450,
        "trait": "regen",
        "trait_line": "A full day without a log heals it 2 hours.",
        "event": "hanami",
    },
    "oni": {
        "name": "ONI",
        "title": "OUT WITH THE DEMONS",
        "price": 500,
        "hp": 700,
        "days": 3,
        "loot": 900,
        "trait": "beans",
        "trait_line": "Logs of 30 minutes or less hit for double.",
        "event": "setsubun",
    },
    "bitter": {
        "name": "BITTER",
        "title": "WHAT WAS LEFT IN THE BOX",
        "price": 600,
        "hp": 800,
        "days": 5,
        "loot": 1050,
        "trait": "dodge",
        "trait_line": "Dodges one hit in four.",
        "event": "valentine",
    },
    "tsukuyomi": {
        "name": "TSUKUYOMI",
        "title": "RULER OF THE NIGHT",
        "price": 1000,
        "hp": 1400,
        "days": 8,
        "loot": 2000,
        "trait": "night",
        "trait_line": "Heals 1 hour at every midnight.",
        "event": "tsukimi",
    },
    "stagefright": {
        "name": "STAGE FRIGHT",
        "title": "THE NIGHT BEFORE YOU GO ON",
        "price": 700,
        "hp": 1000,
        "days": 6,
        "loot": 1300,
        "trait": "nocturne",
        "trait_line": "Logs committed 05:00-17:59 pass right through.",
        "event": "culture",
    },
    "krampus": {
        "name": "KRAMPUS",
        "title": "THE OTHER LIST",
        "price": 900,
        "hp": 1200,
        "days": 5,
        "loot": 1600,
        "trait": "dodge",
        "trait_line": "Dodges one hit in four.",
        "event": "christmas",
    },
}
NIGHT_HEAL = 60
REGEN_HEAL = 120
DODGE_CHANCE = 0.25
# ONI: logs this short hit for double.
BEAN_MINUTES = 30
# JACK: logs committed in these local hours pass right through.
DAYLIGHT_HOURS = range(5, 18)
HYDRA_MIN_HEADS = 2
HYDRA_MAX_HEADS = 3

# sessions: [(start minute of the day, length, topic)], drawn each day with
# a little jitter (rival_day; 'jitter' minutes and 'stretch' share of the
# length, 15 and 0.15 unless set). week: per-weekday sessions (Monday = 0).
# sleep: asleep from / until (minutes of the day; may wrap midnight).
# life: what they do away from the desk, [(from, until, what)] in minutes of
# the day, or {'week': [...], 'end': [...]} to differ on Saturday and Sunday.
# prize: fixed, or for RUSH (whose week swings) the entry fee plus the base
# rate for the hours the schedule projects for the duel.
RIVALS = {
    "orion": {
        "name": "ORION",
        "tag": "EARLY RISER",
        "motto": "Four hours a day. Every day.",
        "price": 800,
        "prize": 1600,
        "sessions": [
            (360, 90, "LINEAR ALGEBRA"),
            (480, 60, "ENGLISH"),
            (780, 45, "FLASHCARDS"),
            (1140, 75, "PHYSICS"),
        ],
        "sleep": (1350, 330),
        "life": {
            "week": [(435, 480, "RUNNING"), (545, 770, "AT SCHOOL"), (830, 1130, "AT SCHOOL"), (1220, 1350, "WITH FAMILY")],
            "end": [(435, 480, "RUNNING"), (545, 770, "SWIM PRACTICE"), (830, 1130, "OUT WITH FRIENDS"), (1220, 1350, "WITH FAMILY")],
        },
    },
    "nova": {
        "name": "NOVA",
        "tag": "NIGHT OWL",
        "motto": "The night is where the work is.",
        "price": 700,
        "prize": 1400,
        "sessions": [
            (30, 90, "READING"),
            (1290, 90, "ALGORITHMS"),
            (1395, 40, "SYSTEMS"),
        ],
        "sleep": (180, 660),
        "life": {
            "week": [(660, 750, "ASLEEP-ISH"), (780, 1020, "AT THE RECORD STORE"), (1050, 1280, "PLAYING BASS")],
            "end": [(660, 840, "BRUNCH, SLOWLY"), (870, 1140, "AT THE RECORD STORE"), (1170, 1280, "PLAYING BASS")],
        },
    },
    "rush": {
        "name": "RUSH",
        "tag": "CRAMMER",
        "motto": "Deadline? Perfect.",
        "price": 600,
        "prize": None,
        "prize_cap": 2400,
        "week": {
            0: [(1230, 75, "REVIEW")],
            1: [(1230, 75, "REVIEW")],
            2: [(1230, 75, "REVIEW")],
            3: [(1230, 75, "REVIEW")],
            4: [],
            5: [
                (600, 150, "PAST PAPERS"),
                (900, 180, "MOCK EXAM"),
                (1230, 90, "REVIEW"),
            ],
            6: [
                (600, 120, "PAST PAPERS"),
                (900, 150, "MOCK EXAM"),
                (1230, 90, "REVIEW"),
            ],
        },
        "sleep": (90, 540),
        "life": {
            "week": [(540, 780, "AT THE PART-TIME JOB"), (810, 1110, "PLAYING GAMES"), (1110, 1225, "OUT WITH FRIENDS")],
            "end": [(540, 595, "PANICKING"), (750, 895, "PANICKING"), (1080, 1225, "ENERGY DRINK RUN")],
        },
    },
    "kai": {
        "name": "KAI",
        "tag": "POMODORO",
        "motto": "Twenty-five on, five off. All day.",
        "price": 700,
        "prize": 1400,
        "jitter": 2,
        "stretch": 0,
        "sessions": [
            (540, 25, "CHEMISTRY"),
            (570, 25, "CHEMISTRY"),
            (600, 25, "CHEMISTRY"),
            (630, 25, "CHEMISTRY"),
            (810, 25, "HISTORY"),
            (840, 25, "HISTORY"),
            (870, 25, "HISTORY"),
            (900, 25, "HISTORY"),
            (1200, 25, "FLASHCARDS"),
            (1230, 25, "FLASHCARDS"),
        ],
        "sleep": (1410, 420),
        "life": {
            "week": [(420, 535, "MORNING ROUTINE"), (660, 805, "AT THE LIBRARY"), (930, 1195, "AT THE LIBRARY"), (1260, 1410, "MEAL PREP")],
            "end": [(420, 535, "YOGA"), (660, 805, "AT THE LIBRARY"), (930, 1195, "CLEANING THE DESK"), (1260, 1410, "MEAL PREP")],
        },
    },
    "mika": {
        "name": "MIKA",
        "tag": "COMMUTER",
        "motto": "Every stop on the train is a page.",
        "price": 400,
        "prize": 800,
        "week": {
            **{
                d: [
                    (450, 40, "VOCAB ON THE TRAIN"),
                    (1110, 40, "PODCAST NOTES"),
                    (1320, 30, "REVIEW"),
                ]
                for d in range(5)
            },
            5: [(600, 120, "MOCK TEST")],
            6: [(900, 90, "NEXT WEEK PLAN")],
        },
        "sleep": (1410, 390),
        "life": {
            "week": [(490, 1105, "AT WORK"), (1150, 1315, "COOKING DINNER")],
            "end": [(420, 595, "SLEEPING IN"), (730, 890, "GROCERIES"), (990, 1400, "WITH THE KIDS")],
        },
    },
    "ace": {
        "name": "ACE",
        "tag": "TOP OF THE CLASS",
        "motto": "Second place is just the first to lose.",
        "price": 1200,
        "prize": 3000,
        "sessions": [
            (330, 120, "PROOFS"),
            (540, 150, "PAST EXAMS"),
            (840, 120, "LAB REPORT"),
            (1200, 90, "REVIEW"),
        ],
        "sleep": (1350, 300),
        "life": {
            "week": [(450, 535, "TUTORING"), (695, 835, "LAB"), (960, 1195, "STUDENT COUNCIL"), (1290, 1350, "FLASHCARDS, IN BED")],
            "end": [(450, 535, "VIOLIN"), (695, 835, "TUTORING"), (960, 1195, "MOCK INTERVIEW"), (1290, 1350, "FLASHCARDS, IN BED")],
        },
    },
    # Festival rivals. `dates` replaces the plan on those days ('MM-DD').
    "santa": {
        "name": "SANTA",
        "tag": "ONE NIGHT A YEAR",
        "motto": "Ho ho. I start on the 24th.",
        "price": 500,
        "prize": 1100,
        "sessions": [(690, 30, "MAIL")],
        "dates": {
            "12-24": [
                (900, 180, "ROUTE OPTIMIZATION"),
                (1110, 120, "WORLD GEOGRAPHY"),
                (1240, 195, "REINDEER HUSBANDRY"),
            ],
        },
        "sleep": (60, 480),
        "life": [(540, 685, "AT THE WORKSHOP"), (725, 1020, "CHECKING THE LIST"), (1020, 1440, "CHECKING IT TWICE")],
        "event": "christmas",
    },
    "rudolph": {
        "name": "RUDOLPH",
        "tag": "HIDDEN · THE NIGHT SHIFT",
        "motto": "Someone has to read the map.",
        "price": 600,
        "prize": 1400,
        "sessions": [(1200, 90, "NAVIGATION"), (1320, 90, "LOAD BALANCING")],
        "sleep": (120, 540),
        "life": [(540, 1195, "AT THE STABLES"), (1410, 1440, "POLISHING THE NOSE")],
        "event": "christmas",
        "hidden": "beat_santa",
    },
    "miko": {
        "name": "MIKO",
        "tag": "KEEPER OF THE SHRINE",
        "motto": "The first hours of the year are the ones that count.",
        "price": 500,
        "prize": 1050,
        "sessions": [(330, 90, "CLASSICAL TEXTS"), (600, 60, "CALLIGRAPHY"), (1200, 90, "HISTORY")],
        "sleep": (1380, 300),
        "life": [(435, 595, "SWEEPING THE SHRINE"), (660, 1195, "SELLING OMAMORI")],
        "event": "newyear",
    },
    "choco": {
        "name": "CHOCO",
        "tag": "HAS A REASON",
        "motto": "I'm going to the same university as them. Somehow.",
        "price": 600,
        "prize": 1300,
        "sessions": [(420, 60, "ENGLISH"), (960, 120, "MATH"), (1290, 90, "MATH, AGAIN")],
        "sleep": (1410, 390),
        "life": [(485, 955, "AT SCHOOL"), (1085, 1285, "TEMPERING CHOCOLATE")],
        "event": "valentine",
    },
    "usagi": {
        "name": "USAGI",
        "tag": "FROM THE MOON",
        "motto": "You can see my house from there.",
        "price": 600,
        "prize": 1300,
        "sessions": [(1140, 120, "ORBITAL MECHANICS"), (1290, 90, "EARTH STUDIES")],
        "sleep": (240, 720),
        "life": [(720, 1135, "POUNDING RICE CAKES"), (60, 240, "WATCHING THE EARTH")],
        "event": "tsukimi",
    },
    "iincho": {
        "name": "IINCHO",
        "tag": "CLASS PRESIDENT",
        "motto": "The schedule is laminated. Please read the schedule.",
        "price": 700,
        "prize": 1500,
        "sessions": [(360, 90, "BOOKKEEPING"), (750, 45, "ENGLISH"), (1230, 120, "EVERYTHING ELSE")],
        "sleep": (1400, 320),
        "life": [(455, 745, "AT SCHOOL"), (800, 1225, "RUNNING THE FESTIVAL")],
        "event": "culture",
    },
    "sakura": {
        "name": "SAKURA",
        "tag": "TRANSFER STUDENT",
        "motto": "I'm only here until they fall.",
        "price": 600,
        "prize": 1300,
        "sessions": [
            (420, 60, "HAIKU"),
            (780, 75, "BOTANY"),
            (1200, 75, "CLASSICAL JAPANESE"),
        ],
        "sleep": (1380, 390),
        "life": [(480, 775, "AT THE NEW SCHOOL"), (860, 1195, "UNDER THE TREES")],
        "event": "hanami",
    },
    "orihime": {
        "name": "ORIHIME",
        "tag": "THE WEAVER",
        "motto": "A whole year of work, for one night off.",
        "price": 700,
        "prize": 1500,
        "sessions": [(480, 120, "TEXTILES"), (720, 120, "ASTRONOMY"), (1020, 60, "LETTERS")],
        "sleep": (1320, 360),
        "life": [(360, 475, "AT THE LOOM"), (605, 715, "AT THE LOOM"), (845, 1015, "AT THE LOOM"), (1085, 1320, "LOOKING AT THE RIVER")],
        "event": "tanabata",
    },
    "copycat": {
        "name": "COPYCAT",
        "tag": "HIDDEN · HAS NOT STARTED",
        "motto": "Can I just see yours real quick?",
        "price": 400,
        "prize": 900,
        "sessions": [(1320, 45, "COPYING HOMEWORK")],
        "sleep": (120, 660),
        "life": [(660, 900, "AT THE POOL"), (900, 1200, "PLAYING GAMES"), (1200, 1320, "ASKING FOR ANSWERS")],
        "event": "summer",
        "hidden": "late_august",
    },
    "ghost": {
        "name": "GHOST",
        "tag": "HIDDEN · UP AT 3 AM",
        "motto": "I never did finish that exam.",
        "price": 500,
        "prize": 1200,
        "sessions": [(60, 180, "THE EXAM"), (1380, 60, "THE EXAM")],
        "sleep": (300, 780),
        "life": [(240, 300, "FADING"), (1080, 1380, "IN THE OLD EXAM HALL")],
        "event": "halloween",
        "hidden": "small_hours",
    },
}
DUEL_DAYS = 3  # shown as three 24-hour rounds
DUEL_LENGTH = timedelta(days=DUEL_DAYS)

RAID_PREFIX = "raid_"
RIVAL_PREFIX = "rival_"
CHALLENGE_IDS = [RAID_PREFIX + b for b in RAIDS] + [RIVAL_PREFIX + r for r in RIVALS]
HEADED_RAID_IDS = [RAID_PREFIX + b for b, s in RAIDS.items() if s["trait"] == "heads"]


class ChallengeError(Exception):
    pass


def is_challenge(item_id):
    return item_id in CHALLENGE_IDS


def _kind(item_id):
    return "raid" if item_id.startswith(RAID_PREFIX) else "rival"


def _key(item_id):
    return item_id.split("_", 1)[1]


# ==========================================
# Time helpers (the user's own zone)
# ==========================================


def _zone(user):
    return get_user_zone(user) or timezone.get_current_timezone()


def _local(user, moment):
    return timezone.localtime(moment, _zone(user))


def _midnight(user, day):
    return timezone.make_aware(datetime.combine(day, time.min), _zone(user))


def _at(user, day, minute):
    return _midnight(user, day) + timedelta(minutes=minute)


# ==========================================
# Rival schedules
# ==========================================


def rival_day(rival_id, day):
    """The rival's sessions on one calendar day: [(start minute, length,
    topic)], the same for everyone, jittered by the date."""
    spec = RIVALS[rival_id]
    base = spec.get("dates", {}).get(day.strftime("%m-%d"))
    if base is None:
        base = spec["week"][day.weekday()] if "week" in spec else spec["sessions"]
    rng = random.Random(f"typbox-rival-{rival_id}-{day.isoformat()}")
    jitter = spec.get("jitter", 15)
    stretch = spec.get("stretch", 0.15)
    out = []
    for start, length, topic in base:
        s = max(0, min(1435, start + rng.randint(-jitter, jitter)))
        n = max(5, int(round(length * rng.uniform(1 - stretch, 1 + stretch) / 5)) * 5)
        out.append((s, n, topic))
    # Jitter must never make two sessions overlap (that would count the
    # same minutes twice): a session starts at least 5 minutes after the
    # one before ends, and nothing runs past midnight.
    fixed, free = [], 0
    for s, n, topic in sorted(out):
        s = max(s, free)
        n = min(n, 1440 - s)
        if n >= 5:
            fixed.append((s, n, topic))
            free = s + n + 5
    return fixed


def _life_of(rival_id, day):
    """What a rival does away from the desk on a day."""
    life = RIVALS[rival_id].get("life") or []
    if isinstance(life, dict):
        return life["end" if day.weekday() >= 5 else "week"]
    return life


def rival_sessions(user, rival_id, start, end):
    """The rival's sessions that overlap [start, end): [(begin, finish,
    topic)] as moments, in the user's zone."""
    out = []
    day = _local(user, start).date() - timedelta(days=1)
    last = _local(user, end).date()
    while day <= last:
        for s, length, topic in rival_day(rival_id, day):
            begin = _at(user, day, s)
            finish = begin + timedelta(minutes=length)
            if finish > start and begin < end:
                out.append((begin, finish, topic))
        day += timedelta(days=1)
    return out


def _rival_minutes(user, rival_id, start, end, upto):
    """Minutes of the rival's schedule inside [start, end) done by `upto`."""
    total = 0
    for begin, finish, _ in rival_sessions(user, rival_id, start, end):
        lo, hi = max(begin, start), min(finish, end, upto)
        if hi > lo:
            total += int((hi - lo).total_seconds() // 60)
    return total


def duel_window(purchase):
    """(start, end) of a duel: the 72 hours up to its end. The end is kept
    in state (expires_at moves to the settling moment on a forfeit); duels
    started before it was kept end at expires_at."""
    ends = (purchase.state or {}).get("ends")
    end = datetime.fromisoformat(ends) if ends else purchase.expires_at
    return end - DUEL_LENGTH, end


def _logged_minutes(user, start, end):
    return (
        StudyLog.objects.filter(
            user=user, created_at__gte=start, created_at__lt=end
        ).aggregate(m=Sum("duration_minutes"))["m"]
        or 0
    )


def rival_prize(rival_id, user, now):
    """What winning pays for a duel bought now."""
    spec = RIVALS[rival_id]
    if spec["prize"] is not None:
        return spec["prize"]
    projected = _rival_minutes(
        user, rival_id, now, now + DUEL_LENGTH, now + DUEL_LENGTH
    )
    return min(spec["prize_cap"], spec["price"] + projected * 100 // 60)


def duel_score(purchase, now):
    """The duel's three 24-hour rounds as of now: [{'start', 'end', 'mine',
    'theirs', 'state'}] (state: done · live · pending)."""
    user = purchase.user
    rival_id = _key(purchase.item_id)
    first, _ = duel_window(purchase)
    rounds = []
    for i in range(DUEL_DAYS):
        start = first + timedelta(days=i)
        end = start + timedelta(days=1)
        state = "done" if now >= end else "live" if now >= start else "pending"
        rounds.append(
            {
                "start": start,
                "end": end,
                # Logs can't be committed in the future: the whole round
                # counts (so a log committed this very instant is never cut off).
                "mine": _logged_minutes(user, start, end) if state != "pending" else 0,
                "theirs": (
                    _rival_minutes(user, rival_id, start, end, now)
                    if state != "pending"
                    else 0
                ),
                "state": state,
            }
        )
    return rounds


# ==========================================
# Raid state
# ==========================================


def _hit(spec, minutes, kind):
    """Damage of one log for the kinds that land."""
    if kind not in ("hit", "crit"):
        return 0
    counted = min(minutes, MAX_HIT_MINUTES)
    if spec["trait"] == "beans" and minutes <= BEAN_MINUTES:
        return counted * 2
    return int(round(counted * CRIT_MULTIPLIER)) if minutes >= CRIT_MINUTES else counted


def _heals(purchase, spec, upto):
    """[(moment, minutes)] the boss's trait heals it by, up to `upto`."""
    user = purchase.user
    start_day = _local(user, purchase.created_at).date()
    end = min(upto, purchase.expires_at)
    out = []
    day = start_day
    while True:
        midnight = _midnight(user, day + timedelta(days=1))
        if midnight > end:
            break
        if spec["trait"] == "night":
            out.append((midnight, NIGHT_HEAL))
        elif spec["trait"] == "regen" and day > start_day:
            begin = _midnight(user, day)
            logged = any(
                begin <= datetime.fromisoformat(e["at"]) < midnight
                for e in purchase.state.get("events", [])
            )
            if not logged:
                out.append((midnight, REGEN_HEAL))
        day += timedelta(days=1)
    return out


def raid_hp(purchase, now):
    """(total hp, [per-head hp] or None, max hp) replayed from the hits."""
    spec = RAIDS[_key(purchase.item_id)]
    state = purchase.state or {}
    events = sorted(state.get("events", []), key=lambda e: e["at"])
    heads = state.get("heads")
    if heads:
        left = [h["max"] for h in heads]
        for e in events:
            if e.get("head") is not None and e["dmg"]:
                left[e["head"]] = max(0, left[e["head"]] - e["dmg"])
        # No log can hit a head without its in-progress category any more, so
        # it stops standing in the way, but only once a head has been cut down
        # by real hits: dropping categories alone slays nothing.
        cut_down = any(hp == 0 for hp in left)
        open_cats = set(
            Category.objects.filter(
                pk__in=[h["cat"] for h in heads], completed_at__isnull=True
            ).values_list("pk", flat=True)
        )
        left = [
            hp if h["cat"] in open_cats or not cut_down else 0
            for hp, h in zip(left, heads)
        ]
        return sum(left), left, spec["hp"]
    timeline = [
        (datetime.fromisoformat(e["at"]), -e["dmg"]) for e in events if e["dmg"]
    ]
    timeline += [(moment, heal) for moment, heal in _heals(purchase, spec, now)]
    hp = spec["hp"]
    for _, change in sorted(timeline, key=lambda t: (t[0], t[1] > 0)):
        hp = max(0, min(spec["hp"], hp + change))
        if hp == 0:
            break
    return hp, None, spec["hp"]


def _hydra_heads(user):
    """The categories HYDRA's heads stand for: the user's in-progress ones
    with the most minutes over the last 30 days (up to three)."""
    since = timezone.now() - timedelta(days=30)
    cats = list(Category.objects.filter(user=user, completed_at__isnull=True))
    minutes = {
        row["category_id"]: row["m"]
        for row in StudyLog.objects.filter(
            user=user, created_at__gte=since, category__in=cats
        )
        .values("category_id")
        .annotate(m=Sum("duration_minutes"))
    }
    cats.sort(key=lambda c: (-(minutes.get(c.id) or 0), c.code))
    return cats[:HYDRA_MAX_HEADS]


# ==========================================
# Lookup, settling
# ==========================================


def _live(user):
    return BitPurchase.objects.filter(
        user=user, item_id__in=CHALLENGE_IDS, remaining_uses=1
    )


def _settle(purchase, outcome, payout, now):
    state = dict(purchase.state or {})
    state["outcome"] = outcome
    purchase.state = state
    purchase.payout = payout
    purchase.remaining_uses = 0
    if purchase.expires_at > now:
        purchase.expires_at = now
    purchase.save(update_fields=["state", "payout", "remaining_uses", "expires_at"])


def settle_expired(user, now=None):
    """Closes challenges whose time ran out (once): an escaped boss pays a
    share of its loot, a finished duel pays by its result. A HYDRA left with
    no head standing (its last open categories went away after a head was cut
    down) goes down here."""
    now = now or timezone.now()
    for purchase in _live(user).filter(expires_at__lte=now):
        with transaction.atomic():
            locked = (
                BitPurchase.objects.select_for_update()
                .filter(pk=purchase.pk, remaining_uses=1)
                .first()
            )
            if locked is None:
                continue
            if _kind(locked.item_id) == "raid":
                spec = RAIDS[_key(locked.item_id)]
                hp, _, max_hp = raid_hp(locked, locked.expires_at)
                share = int(spec["loot"] * ESCAPE_SHARE * (max_hp - hp) / max_hp)
                _settle(locked, "escaped", share, now)
            else:
                days = duel_score(locked, locked.expires_at)
                mine = sum(d["mine"] for d in days)
                theirs = sum(d["theirs"] for d in days)
                prize = (locked.state or {}).get("prize", 0)
                if mine > theirs:
                    _settle(locked, "won", prize, now)
                elif mine == theirs:
                    _settle(locked, "tie", locked.price, now)
                else:
                    _settle(locked, "lost", 0, now)
    for purchase in _live(user).filter(
        item_id__in=HEADED_RAID_IDS, expires_at__gt=now
    ):
        with transaction.atomic():
            locked = (
                BitPurchase.objects.select_for_update()
                .filter(pk=purchase.pk, remaining_uses=1)
                .first()
            )
            if locked is not None and raid_hp(locked, now)[0] <= 0:
                _settle(locked, "down", RAIDS[_key(locked.item_id)]["loot"], now)


def active_challenge(user, now=None):
    now = now or timezone.now()
    settle_expired(user, now)
    return (
        _live(user)
        .filter(expires_at__gt=now)
        .select_related("user")
        .order_by("-created_at")
        .first()
    )


def last_result(user, now=None):
    """The most recently settled challenge of the last three days, for the
    result card (the client remembers which ones it has shown)."""
    now = now or timezone.now()
    p = (
        BitPurchase.objects.filter(
            user=user,
            item_id__in=CHALLENGE_IDS,
            remaining_uses=0,
            expires_at__gte=now - timedelta(days=3),
        )
        .order_by("-expires_at")
        .first()
    )
    if p is None:
        return None
    return {
        "id": p.id,
        "item_id": p.item_id,
        "kind": _kind(p.item_id),
        "key": _key(p.item_id),
        "name": (RAIDS if _kind(p.item_id) == "raid" else RIVALS)[_key(p.item_id)][
            "name"
        ],
        "outcome": (p.state or {}).get("outcome"),
        "payout": p.payout,
        "price": p.price,
        "finished_at": p.expires_at,
    }


# ==========================================
# Start, forfeit
# ==========================================


def _picked_heads(user, category_ids):
    """HYDRA's heads from the categories the user picked: 2-3 distinct
    in-progress categories of their own, in the order picked."""
    if (
        not isinstance(category_ids, list)
        or not HYDRA_MIN_HEADS <= len(category_ids) <= HYDRA_MAX_HEADS
    ):
        raise ChallengeError(
            f"Pick {HYDRA_MIN_HEADS} or {HYDRA_MAX_HEADS} categories for its heads."
        )
    try:
        ids = [int(c) for c in category_ids]
    except (TypeError, ValueError):
        raise ChallengeError("Unknown category.")
    if len(set(ids)) != len(ids):
        raise ChallengeError("Pick different categories.")
    found = {
        c.id: c
        for c in Category.objects.filter(
            user=user, completed_at__isnull=True, pk__in=ids
        )
    }
    if len(found) != len(ids):
        raise ChallengeError("Unknown category.")
    return [found[i] for i in ids]


def _on_offer(spec, user, now):
    """Whether a challenger can be taken on now: always, for the regulars. A
    festival's only while it runs, and a hidden one once it shows itself."""
    event = spec.get("event")
    if not event:
        return True
    local = _local(user, now)
    if not festivals.is_active(event, local.date()):
        return False
    hidden = spec.get("hidden")
    if hidden == "beat_santa":
        return any(
            (p.state or {}).get("outcome") == "won"
            for p in BitPurchase.objects.filter(user=user, item_id=RIVAL_PREFIX + "santa")
        )
    if hidden == "late_august":
        return local.day >= 25
    if hidden == "small_hours":
        return local.hour < 4
    return True


def start(user, item_id, now=None, category_ids=None):
    """Debits the entry fee and starts a challenge, or raises ChallengeError.
    HYDRA takes `category_ids` (2-3 of the user's in-progress categories);
    without them it picks the most studied ones."""
    from .economy import bits_summary  # economy imports this module

    now = now or timezone.now()
    if not is_challenge(item_id):
        raise ChallengeError("Unknown challenge.")
    kind, key = _kind(item_id), _key(item_id)
    spec = RAIDS[key] if kind == "raid" else RIVALS[key]
    if not _on_offer(spec, user, now):
        raise ChallengeError("That challenger isn't here right now.")
    state = {}
    if kind == "raid" and spec["trait"] == "heads":
        cats = (
            _picked_heads(user, category_ids)
            if category_ids is not None
            else _hydra_heads(user)
        )
        if len(cats) < HYDRA_MIN_HEADS:
            raise ChallengeError("It needs at least two categories in progress.")
        per = spec["hp"] // len(cats)
        spare = spec["hp"] - per * len(cats)
        state["heads"] = [
            {"cat": c.id, "code": c.code, "color": c.color, "max": per + (spare if i == 0 else 0)}
            for i, c in enumerate(cats)
        ]
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if active_challenge(user, now) is not None:
            raise ChallengeError("A challenge is already running.")
        if bits_summary(user)["balance"] < spec["price"]:
            raise ChallengeError("Not enough BITS.")
        if kind == "raid":
            expires = now + timedelta(days=spec["days"])
            state["events"] = []
        else:
            expires = now + DUEL_LENGTH
            state["prize"] = rival_prize(key, user, now)
            state["ends"] = expires.isoformat()
        return BitPurchase.objects.create(
            user=user,
            item_id=item_id,
            price=spec["price"],
            expires_at=expires,
            remaining_uses=1,
            state=state,
        )


def forfeit(user, now=None):
    """Gives up the running challenge: it ends now and pays nothing."""
    now = now or timezone.now()
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=user)
        purchase = active_challenge(user, now)
        if purchase is None:
            raise ChallengeError("No challenge is running.")
        purchase = BitPurchase.objects.select_for_update().get(pk=purchase.pk)
        _settle(purchase, "forfeit", 0, now)


# ==========================================
# Logs
# ==========================================


def apply_to_new_log(log, now=None):
    """Strikes the raid boss with a just-committed log (or, in a duel,
    reports the score). Returns what happened for the client, or None."""
    now = now or timezone.now()
    purchase = active_challenge(log.user, now)
    if purchase is None:
        return None
    if _kind(purchase.item_id) == "rival":
        days = duel_score(purchase, now)
        return {
            "kind": "rival",
            "name": RIVALS[_key(purchase.item_id)]["name"],
            "mine": sum(d["mine"] for d in days),
            "theirs": sum(d["theirs"] for d in days),
        }
    with transaction.atomic():
        purchase = (
            BitPurchase.objects.select_for_update()
            .filter(pk=purchase.pk, remaining_uses=1)
            .first()
        )
        if purchase is None or purchase.expires_at <= now:
            return None
        spec = RAIDS[_key(purchase.item_id)]
        state = dict(purchase.state or {})
        minutes = log.duration_minutes
        head = None
        hp_before, heads_before, _ = raid_hp(purchase, now)
        if spec["trait"] == "heads":
            head = next(
                (
                    i
                    for i, h in enumerate(state.get("heads", []))
                    if h["cat"] == log.category_id
                ),
                None,
            )
        if spec["trait"] == "armor" and minutes < 60:
            kind = "block"
        elif spec["trait"] == "nocturne" and _local(log.user, now).hour in DAYLIGHT_HOURS:
            kind = "miss"
        elif spec["trait"] == "heads" and (head is None or heads_before[head] == 0):
            kind = "nohead"
        elif spec["trait"] == "dodge" and random.random() < DODGE_CHANCE:
            kind = "miss"
        else:
            kind = "crit" if minutes >= CRIT_MINUTES else "hit"
        damage = _hit(spec, minutes, kind)
        events = list(state.get("events", []))
        events.append(
            {
                "at": now.isoformat(),
                "log": log.id,
                "min": minutes,
                "dmg": damage,
                "kind": kind,
                "head": head,
            }
        )
        state["events"] = events
        purchase.state = state
        purchase.save(update_fields=["state"])
        hp, heads, max_hp = raid_hp(purchase, now)
        down = hp <= 0
        if down:
            _settle(purchase, "down", spec["loot"], now)
        return {
            "kind": "raid",
            "name": spec["name"],
            "boss": _key(purchase.item_id),
            "hit": kind,
            "damage": damage,
            "hp": hp,
            "max_hp": max_hp,
            "down": down,
            "payout": spec["loot"] if down else 0,
        }


def _raid_events_for_log(log):
    purchase = _live(log.user).filter(item_id__startswith=RAID_PREFIX).first()
    if purchase is None:
        return None, None
    events = (purchase.state or {}).get("events", [])
    index = next((i for i, e in enumerate(events) if e.get("log") == log.id), None)
    return purchase, index


def on_log_deleted(log):
    """A log deleted mid-raid takes its hit back."""
    purchase, index = _raid_events_for_log(log)
    if index is None:
        return
    state = dict(purchase.state)
    state["events"] = [e for i, e in enumerate(state["events"]) if i != index]
    purchase.state = state
    purchase.save(update_fields=["state"])


def on_log_edited(log, now=None):
    """A log edited mid-raid hits for its new length, up to what it hit for
    when committed: fixing a typo restores the hit, padding a log adds nothing.
    A restored hit can bring the boss down."""
    now = now or timezone.now()
    settle_expired(log.user, now)
    with transaction.atomic():
        purchase = (
            _live(log.user)
            .select_for_update()
            .filter(item_id__startswith=RAID_PREFIX)
            .first()
        )
        if purchase is None:
            return
        state = dict(purchase.state or {})
        events = [dict(e) for e in state.get("events", [])]
        e = next((e for e in events if e.get("log") == log.id), None)
        if e is None:
            return
        spec = RAIDS[_key(purchase.item_id)]
        e.setdefault("orig_min", e["min"])
        e.setdefault("orig_kind", e["kind"])
        minutes = min(log.duration_minutes, e["orig_min"])
        if e["orig_kind"] not in ("hit", "crit"):
            e["kind"] = e["orig_kind"]
        elif spec["trait"] == "armor" and minutes < 60:
            e["kind"] = "block"
        else:
            e["kind"] = "crit" if minutes >= CRIT_MINUTES else "hit"
        e["min"] = log.duration_minutes
        e["dmg"] = _hit(spec, minutes, e["kind"])
        state["events"] = events
        purchase.state = state
        purchase.save(update_fields=["state"])
        if raid_hp(purchase, now)[0] <= 0:
            _settle(purchase, "down", spec["loot"], now)


# ==========================================
# Serialization
# ==========================================


def _interval(user, day, start, length):
    begin = _at(user, day, start)
    return begin, begin + timedelta(minutes=length)


def serialize_challenge(purchase, now=None):
    if purchase is None:
        return None
    now = now or timezone.now()
    user = purchase.user
    key = _key(purchase.item_id)
    base = {
        "id": purchase.id,
        "item_id": purchase.item_id,
        "key": key,
        "price": purchase.price,
        "started_at": purchase.created_at,
        "expires_at": purchase.expires_at,
    }
    if _kind(purchase.item_id) == "raid":
        spec = RAIDS[key]
        hp, heads, max_hp = raid_hp(purchase, now)
        state = purchase.state or {}
        codes = {i: h["code"] for i, h in enumerate(state.get("heads") or [])}
        events = sorted(state.get("events", []), key=lambda e: e["at"], reverse=True)[
            :8
        ]
        return {
            **base,
            "kind": "raid",
            "name": spec["name"],
            "title": spec["title"],
            "trait": spec["trait"],
            "trait_line": spec["trait_line"],
            "hp": hp,
            "max_hp": max_hp,
            "days": spec["days"],
            "loot": spec["loot"],
            "heads": (
                [
                    {
                        "code": h["code"],
                        "color": h["color"],
                        "hp": heads[i],
                        "max": h["max"],
                    }
                    for i, h in enumerate(state["heads"])
                ]
                if heads is not None
                else None
            ),
            "events": [
                {
                    "at": e["at"],
                    "minutes": e["min"],
                    "damage": e["dmg"],
                    "hit": e["kind"],
                    "head": codes.get(e.get("head")),
                }
                for e in events
            ],
            "heals": [
                {"at": m.isoformat(), "minutes": h}
                for m, h in _heals(purchase, spec, now)
            ][-3:],
        }
    spec = RIVALS[key]
    start, end = duel_window(purchase)
    days = duel_score(purchase, now)
    # Every local day the duel touches (and the one before), for the
    # rival's live status and timeline.
    first_day = _local(user, start).date() - timedelta(days=1)
    shown = [
        first_day + timedelta(days=i)
        for i in range((_local(user, end).date() - first_day).days + 1)
    ]
    plan, sleep, life = [], [], []
    for day in shown:
        for begin, until, what in _life_of(key, day):
            b, e = _interval(user, day, begin, until - begin)
            life.append({"start": b, "end": e, "label": what})
        for minute, length, topic in rival_day(key, day):
            b, e = _interval(user, day, minute, length)
            plan.append({"start": b, "end": e, "topic": topic})
        s_from, s_to = spec["sleep"]
        if s_from < s_to:
            b, e = _interval(user, day, s_from, s_to - s_from)
            sleep.append({"start": b, "end": e})
        else:
            sleep.append({"start": _at(user, day, 0), "end": _at(user, day, s_to)})
            sleep.append(
                {
                    "start": _at(user, day, s_from),
                    "end": _midnight(user, day + timedelta(days=1)),
                }
            )
    return {
        **base,
        "kind": "rival",
        "name": spec["name"],
        "tag": spec["tag"],
        "motto": spec["motto"],
        "prize": (purchase.state or {}).get("prize", 0),
        "starts_at": start,
        "ends_at": end,
        "days": days,
        "mine": sum(d["mine"] for d in days),
        "theirs": sum(d["theirs"] for d in days),
        "plan": plan,
        "sleep": sleep,
        "life": life,
    }


def offers(user, now=None):
    """The challenge catalog, cheapest first like the buffs (ties keep the
    catalog order)."""
    now = now or timezone.now()
    suggested = _hydra_heads(user)
    hydra_ok = len(suggested) >= HYDRA_MIN_HEADS
    return {
        "raids": [
            {
                "item_id": RAID_PREFIX + key,
                "key": key,
                **{
                    k: spec[k]
                    for k in (
                        "name",
                        "title",
                        "price",
                        "hp",
                        "days",
                        "loot",
                        "trait",
                        "trait_line",
                    )
                },
                "event": spec.get("event"),
                "available": hydra_ok if spec["trait"] == "heads" else True,
                # HYDRA: how many heads to pick, and the ones suggested.
                **(
                    {
                        "heads": [HYDRA_MIN_HEADS, HYDRA_MAX_HEADS],
                        "suggested": [c.id for c in suggested],
                    }
                    if spec["trait"] == "heads"
                    else {}
                ),
            }
            for key, spec in sorted(RAIDS.items(), key=lambda kv: kv[1]["price"])
            if _on_offer(spec, user, now)
        ],
        "rivals": [
            {
                "item_id": RIVAL_PREFIX + key,
                "key": key,
                **{k: spec[k] for k in ("name", "tag", "motto", "price")},
                "event": spec.get("event"),
                "prize": rival_prize(key, user, now),
                # Minutes their schedule puts into a duel bought now.
                "projected": _rival_minutes(
                    user, key, now, now + DUEL_LENGTH, now + DUEL_LENGTH
                ),
                "ends_at": now + DUEL_LENGTH,
            }
            for key, spec in sorted(RIVALS.items(), key=lambda kv: kv[1]["price"])
            if _on_offer(spec, user, now)
        ],
    }
