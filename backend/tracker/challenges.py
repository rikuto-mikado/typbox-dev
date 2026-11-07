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
down. Down in time: the loot, the stake always among it. Out of time: nothing
back; the stake is what an escaped boss takes with it, and all it takes.

The boss hits back: every 6 hours from the moment the raid began it attacks,
and it COUNTERs every hit that lands. Its blows never touch the wallet: what
they would take is replayed by attacks.py into BitPurchase.struck and comes
off the BOUNTY (the loot above the stake) when the boss goes down
(_down_loot), never below the stake. So a slow win still gives the stake
back, and a SHIELD or a wish keeps the bounty whole. A log a buff paid on, a
NOVA SHIELD or ORION worn makes a hit land harder (_boost).

RIVAL: a 72-hour duel against an NPC whose day runs on a schedule drawn
from the date (rival_day), the same for everyone. Like a raid, it starts
the moment it is bought. Your side is the minutes of logs committed inside
those 72 hours; theirs is the part of their schedule that falls inside
them (a session they are in the middle of counts from the start). Win: the
prize; tie: the entry fee back; lose: nothing.

INVERTED: beat a regular boss or rival INVERT_AT times and its other side opens
(INVERTED_RAIDS / INVERTED_RIVALS, keyed '<base>_inverted'). The rule itself
turns over, so more study alone doesn't win it, and the first clear pays a bonus.
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

# ==========================================
# Catalog
# ==========================================
#   hp / days: minutes of damage needed, and how long the boss stays.
#   trait: armor (logs under 60 min do nothing) · night (heals 60 min at
#          every local midnight) · heads (one head per category; a log only
#          hits its category's head) · regen (heals 120 min after a day with
#          no log) · dodge (a hit misses one time in four) · nocturne (a log
#          committed in the daytime misses) · beans (short logs hit double)
#          · reverse_armor (logs of 60 min or more do nothing) · afterimage
#          (the same category as the last hit misses) · none.
#   attack: added below (RAID_ATTACKS): what it does back, and how often.
RAIDS = {
    "golem": {
        "name": "GOLEM",
        "title": "THE STONE WALL",
        "price": 800,
        "hp": 1200,
        "days": 5,
        "loot": 1500,
        "trait": "armor",
        "trait_line": "Logs under 60 minutes bounce off.",
    },
    "nightmare": {
        "name": "NIGHTMARE",
        "title": "WHAT WAKES AT 2 AM",
        "price": 800,
        "hp": 1200,
        "days": 5,
        "loot": 1800,
        "trait": "night",
        "trait_line": "Heals 1 hour at every midnight.",
    },
    "hydra": {
        "name": "HYDRA",
        "title": "THREE HEADS, THREE SUBJECTS",
        "price": 900,
        "hp": 1200,
        "days": 5,
        "loot": 1700,
        "trait": "heads",
        "trait_line": "One head per category: a log only hits its own.",
    },
    "warden": {
        "name": "WARDEN",
        "title": "KEEPER OF THE STREAK",
        "price": 800,
        "hp": 1200,
        "days": 5,
        "loot": 1600,
        "trait": "regen",
        "trait_line": "A full day without a log heals it 2 hours.",
    },
    "phantom": {
        "name": "PHANTOM",
        "title": "NOW YOU SEE IT",
        "price": 900,
        "hp": 1200,
        "days": 5,
        "loot": 1700,
        "trait": "dodge",
        "trait_line": "Dodges one hit in four.",
    },
    "titan": {
        "name": "TITAN",
        "title": "THE LONG WAR",
        "price": 1500,
        "hp": 2400,
        "days": 7,
        "loot": 3600,
        "trait": "none",
        "trait_line": "40 hours of HP and a week to bring it down.",
    },
    # Festival bosses (festivals.py): on sale only while their festival runs.
    "kagami": {
        "name": "KAGAMI",
        "title": "THE OFFERING WOKE UP",
        "price": 600,
        "hp": 900,
        "days": 4,
        "loot": 1250,
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
        "loot": 1700,
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
        "loot": 2500,
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
        "loot": 1500,
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
        "loot": 1650,
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
        "loot": 1050,
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
        "loot": 1200,
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
        "loot": 2300,
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
        "loot": 1500,
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
        "loot": 1850,
        "trait": "dodge",
        "trait_line": "Dodges one hit in four.",
        "event": "christmas",
    },
}

# How a boss fights back (attacks.py). It attacks every ATTACK_EVERY hours
# from the start of the raid, whatever you do: nothing parries it, only a
# charm's SHIELD or a wish stops a blow. It also COUNTERs every log that lands
# on it (COUNTER_SHARE of its attack). Blows come off the bounty, not the
# wallet: brought down a fifth of the way from the end (with a counter for
# each day's hit), the bounty is about spent and the win gives back the
# stake; sooner keeps more of it.
# An attack marked "hp" is replayed by attacks.py (the name is from when
# blows took HP first); a raid started before that took BITS once a day,
# parried by the study since the last attack, never below a zero balance
# (_sync_attacks).
ATTACK_EVERY = 6
COUNTER_SHARE = 0.5


def _attack_bits(spec, every):
    """BITS a blow takes: a raid won at 80% of its time just about pays off."""
    blows = spec["days"] * 0.8 * (24 / every + COUNTER_SHARE)
    return max(10, int(round((spec["loot"] - spec["price"]) / blows / 5)) * 5)


RAID_ATTACKS = {
    "golem": "BOULDER THROW",
    "nightmare": "NIGHT TERROR",
    "hydra": "VENOM SPIT",
    "warden": "CHAIN LASH",
    "phantom": "COLD TOUCH",
    "titan": "EARTHQUAKE",
    "kagami": "MOCHI SLAM",
    "river": "STARFALL",
    "august": "HEATSTROKE",
    "jack": "TRICK",
    "fubuki": "PETAL STORM",
    "oni": "IRON CLUB",
    "bitter": "AFTERTASTE",
    "tsukuyomi": "MOONBEAM",
    "stagefright": "BLANK MIND",
    "krampus": "BIRCH SWITCH",
}
for _boss, _name in RAID_ATTACKS.items():
    _dmg = _attack_bits(RAIDS[_boss], ATTACK_EVERY)
    RAIDS[_boss]["attack"] = {
        "name": _name,
        "every": ATTACK_EVERY,
        "parry": 0,
        "dmg": _dmg,
        "counter": int(_dmg * COUNTER_SHARE),
        "hp": True,
    }
# A log a buff paid on hits harder by half the buff's share of its BITS
# (a buff doubling a log adds x1.5), at most BUFF_HIT_CAP times.
BUFF_HIT_SHARE = 0.5
BUFF_HIT_CAP = 2.0

# The other side of each regular boss: 2.5 times the HP, attacks every 4
# hours and counters harder. Keys on top of the plain ones:
#   inverted_of: the boss it is the other side of · first_bonus: extra loot on
#   the first clear · heal / heal_noon: NIGHT heals this much, at noon as well ·
#   regen_below / regen_heal: REGEN counts a day under these minutes as empty,
#   and heals this much · regrow: when a head falls, this share of each other
#   head's HP comes back · no_crit: long logs hit for their length only.
INVERT_AT = 3


def _inverted_attack(name, dmg):
    """The other side: every 4 hours and a heavier counter. `dmg` is
    replaced once the raid is defined (_attack_bits)."""
    return {"name": name, "every": 4, "parry": 0, "dmg": dmg, "counter": int(dmg * 0.6), "hp": True}


INVERTED_RAIDS = {
    "golem_inverted": {
        "name": "GOLEM // INVERTED",
        "title": "THE WALL THAT WALKS",
        "price": 1200,
        "hp": 3000,
        "days": 5,
        "loot": 2600,
        "first_bonus": 2000,
        "trait": "reverse_armor",
        "trait_line": "Logs of 60 minutes or more bounce off. Chip away at it.",
        "attack": _inverted_attack("AVALANCHE", 120),
        "inverted_of": "golem",
    },
    "nightmare_inverted": {
        "name": "NIGHTMARE // INVERTED",
        "title": "IT NO LONGER NEEDS THE DARK",
        "price": 1200,
        "hp": 3000,
        "days": 5,
        "loot": 2800,
        "first_bonus": 2000,
        "trait": "night",
        "trait_line": "Heals 2 hours at midnight, and again at noon.",
        "heal": 120,
        "heal_noon": True,
        "attack": _inverted_attack("SLEEP PARALYSIS", 120),
        "inverted_of": "nightmare",
    },
    "hydra_inverted": {
        "name": "HYDRA // INVERTED",
        "title": "CUT ONE, THE REST GROW BACK",
        "price": 1400,
        "hp": 3000,
        "days": 5,
        "loot": 3000,
        "first_bonus": 2000,
        "trait": "heads",
        "trait_line": "One head per category. When a head falls, the others heal a quarter.",
        "regrow": 0.25,
        "attack": _inverted_attack("ACID BREATH", 130),
        "inverted_of": "hydra",
    },
    "warden_inverted": {
        "name": "WARDEN // INVERTED",
        "title": "THE STREAK KEEPS YOU",
        "price": 1200,
        "hp": 3600,
        "days": 5,
        "loot": 2800,
        "first_bonus": 2000,
        "trait": "regen",
        "trait_line": "A day under 2 hours of logs heals it 4 hours.",
        "regen_below": 120,
        "regen_heal": 240,
        "attack": _inverted_attack("LOCKDOWN", 120),
        "inverted_of": "warden",
    },
    "phantom_inverted": {
        "name": "PHANTOM // INVERTED",
        "title": "NEVER THE SAME WAY TWICE",
        "price": 1400,
        "hp": 3000,
        "days": 5,
        "loot": 3000,
        "first_bonus": 2000,
        "trait": "afterimage",
        "trait_line": "The same category twice in a row misses. Keep switching.",
        "attack": _inverted_attack("POSSESSION", 130),
        "inverted_of": "phantom",
    },
    "titan_inverted": {
        "name": "TITAN // INVERTED",
        "title": "THE WAR NEVER ENDED",
        "price": 2200,
        "hp": 4500,
        "days": 7,
        "loot": 5600,
        "first_bonus": 4000,
        "trait": "none",
        "trait_line": "Critical hits do nothing. 75 hours of HP, one week.",
        "no_crit": True,
        "attack": _inverted_attack("WORLD BREAKER", 220),
        "inverted_of": "titan",
    },
}
for _spec in INVERTED_RAIDS.values():
    _dmg = _attack_bits(_spec, _spec["attack"]["every"])
    _spec["attack"]["dmg"], _spec["attack"]["counter"] = _dmg, int(_dmg * 0.6)
RAIDS.update(INVERTED_RAIDS)

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

# The other side of each regular rival: their own ground. `rule` decides which
# of your logs count (a session counts by when it began):
#   hours: (from, until) local hours, may wrap midnight · max_log: only logs of
#   at most this long · last_round: only the last 24 hours · sweep: every round
#   must be won.


def _inverted_rival(base, **over):
    plan = {k: v for k, v in RIVALS[base].items() if k not in ("week", "sessions")}
    return {
        **plan,
        "name": f"{RIVALS[base]['name']} // INVERTED",
        "inverted_of": base,
        **over,
    }


INVERTED_RIVALS = {
    "orion_inverted": _inverted_rival(
        "orion",
        tag="UP BEFORE THE SUN",
        motto="By noon, it is already over.",
        price=1200,
        prize=2400,
        first_bonus=2000,
        rule={"hours": (4, 12)},
        rule_line="Only sessions you start between 04:00 and 11:59 count.",
        sessions=[
            (270, 150, "LINEAR ALGEBRA"),
            (435, 120, "ENGLISH"),
            (570, 90, "ANALYSIS"),
        ],
        sleep=(1290, 255),
    ),
    "nova_inverted": _inverted_rival(
        "nova",
        tag="THE SUN NEVER CAME UP",
        motto="Come and find me where I live.",
        price=1100,
        prize=2200,
        first_bonus=2000,
        rule={"hours": (20, 4)},
        rule_line="Only sessions you start between 20:00 and 03:59 count.",
        sessions=[
            (0, 120, "READING"),
            (1230, 90, "ALGORITHMS"),
            (1330, 90, "SYSTEMS"),
        ],
    ),
    "rush_inverted": _inverted_rival(
        "rush",
        tag="THE DEADLINE IS NOW",
        motto="Three days of mine against one of yours.",
        price=1000,
        prize=2000,
        first_bonus=2000,
        rule={"last_round": True},
        rule_line="Only your logs in the last 24 hours count against all 72 of theirs.",
        sessions=[
            (600, 120, "PAST PAPERS"),
            (900, 90, "MOCK EXAM"),
            (1230, 90, "REVIEW"),
        ],
    ),
    "kai_inverted": _inverted_rival(
        "kai",
        tag="THE TIMER NEVER STOPS",
        motto="Anything longer than thirty minutes is daydreaming.",
        price=1100,
        prize=2200,
        first_bonus=2000,
        rule={"max_log": 30},
        rule_line="Only logs of 30 minutes or less count.",
        sessions=[
            (m, 25, topic)
            for m, topic in (
                (510, "CHEMISTRY"), (540, "CHEMISTRY"), (570, "CHEMISTRY"), (600, "CHEMISTRY"),
                (630, "CHEMISTRY"), (660, "CHEMISTRY"), (810, "HISTORY"), (840, "HISTORY"),
                (870, "HISTORY"), (900, "HISTORY"), (930, "HISTORY"), (960, "HISTORY"),
            )
        ],
        life=[(420, 505, "SHARPENING PENCILS"), (690, 805, "AT THE LIBRARY"), (990, 1410, "RESETTING THE TIMER")],
    ),
    "mika_inverted": _inverted_rival(
        "mika",
        tag="MISSED THE LAST TRAIN ON PURPOSE",
        motto="Every stop. Every day. No days off.",
        price=1000,
        prize=2000,
        first_bonus=2000,
        rule={"sweep": True},
        rule_line="Win all three rounds, or you lose the duel.",
        sessions=[
            (320, 135, "VOCAB ON THE TRAIN"),
            (470, 135, "NOTES AT THE DESK"),
            (620, 135, "THE LONG WAY ROUND"),
            (1000, 135, "PODCAST NOTES"),
            (1180, 135, "REVIEW"),
        ],
        sleep=(1340, 300),
        life=[(770, 995, "AT WORK"), (1140, 1175, "COOKING DINNER")],
    ),
    "ace_inverted": _inverted_rival(
        "ace",
        tag="NOTHING LEFT BUT FIRST PLACE",
        motto="I no longer remember what second place felt like.",
        price=2000,
        prize=4500,
        first_bonus=3500,
        stretch=0.05,
        rule={},
        rule_line="Fourteen hours a day, every day. No tricks.",
        sessions=[
            (270, 240, "PROOFS"),
            (525, 240, "PAST EXAMS"),
            (780, 240, "LAB REPORT"),
            (1035, 120, "REVIEW"),
        ],
        sleep=(1320, 255),
        life=[(1160, 1320, "FLASHCARDS, IN BED")],
    ),
}
RIVALS.update(INVERTED_RIVALS)

DUEL_DAYS = 3  # shown as three 24-hour rounds
DUEL_LENGTH = timedelta(days=DUEL_DAYS)

RAID_PREFIX = "raid_"
RIVAL_PREFIX = "rival_"
CHALLENGE_IDS = [RAID_PREFIX + b for b in RAIDS] + [RIVAL_PREFIX + r for r in RIVALS]
HEADED_RAID_IDS = [RAID_PREFIX + b for b, s in RAIDS.items() if s["trait"] == "heads"]
# How a challenge counts as beaten.
BEATEN = ("down", "won")


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


def _in_hours(hour, window):
    begin, until = window
    return begin <= hour < until if begin < until else hour >= begin or hour < until


def _duel_minutes(user, rule, start, end):
    """Your minutes for a stretch of the duel, as an INVERTED rival's rule counts
    them. A session counts by when it began."""
    if not rule or not ("hours" in rule or "max_log" in rule):
        return _logged_minutes(user, start, end)
    total = 0
    for created, minutes in StudyLog.objects.filter(
        user=user, created_at__gte=start, created_at__lt=end
    ).values_list("created_at", "duration_minutes"):
        if "max_log" in rule and minutes > rule["max_log"]:
            continue
        if "hours" in rule and not _in_hours(
            _local(user, created - timedelta(minutes=minutes)).hour, rule["hours"]
        ):
            continue
        total += minutes
    return total


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
    rule = RIVALS[rival_id].get("rule")
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
                "mine": (
                    0
                    if state == "pending"
                    or (rule and rule.get("last_round") and i < DUEL_DAYS - 1)
                    else _duel_minutes(user, rule, start, end)
                ),
                "theirs": (
                    _rival_minutes(user, rival_id, start, end, now)
                    if state != "pending"
                    else 0
                ),
                "state": state,
            }
        )
    return rounds


def duel_outcome(rival_id, rounds):
    """'won' | 'tie' | 'lost' for a finished duel's rounds."""
    if (RIVALS[rival_id].get("rule") or {}).get("sweep"):
        if all(r["mine"] > r["theirs"] for r in rounds):
            return "won"
        return "tie" if all(r["mine"] >= r["theirs"] for r in rounds) else "lost"
    mine = sum(r["mine"] for r in rounds)
    theirs = sum(r["theirs"] for r in rounds)
    return "won" if mine > theirs else "tie" if mine == theirs else "lost"


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
    if spec.get("no_crit"):
        return counted
    return int(round(counted * CRIT_MULTIPLIER)) if minutes >= CRIT_MINUTES else counted


def _landed_kind(spec, minutes):
    return "crit" if minutes >= CRIT_MINUTES and not spec.get("no_crit") else "hit"


def _heals(purchase, spec, upto):
    """[(moment, minutes)] the boss's trait heals it by, up to `upto`."""
    user = purchase.user
    start_day = _local(user, purchase.created_at).date()
    end = min(upto, purchase.expires_at)
    out = []
    day = start_day
    night_heal = spec.get("heal", NIGHT_HEAL)
    while True:
        if spec["trait"] == "night" and spec.get("heal_noon"):
            noon = _at(user, day, 720)
            if purchase.created_at < noon <= end:
                out.append((noon, night_heal))
        midnight = _midnight(user, day + timedelta(days=1))
        if midnight > end:
            break
        if spec["trait"] == "night":
            out.append((midnight, night_heal))
        elif spec["trait"] == "regen" and day > start_day:
            begin = _midnight(user, day)
            logged = sum(
                e.get("min", 0)
                for e in purchase.state.get("events", [])
                if begin <= datetime.fromisoformat(e["at"]) < midnight
            )
            if (logged < spec["regen_below"]) if "regen_below" in spec else not logged:
                out.append((midnight, spec.get("regen_heal", REGEN_HEAL)))
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
        regrow = spec.get("regrow")
        for e in events:
            if e.get("head") is not None and e["dmg"]:
                standing = left[e["head"]] > 0
                left[e["head"]] = max(0, left[e["head"]] - e["dmg"])
                if regrow and standing and left[e["head"]] == 0:
                    left = [
                        min(h["max"], hp + int(h["max"] * regrow)) if hp else 0
                        for hp, h in zip(left, heads)
                    ]
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


def raid_attacks(purchase, upto):
    """[{'at', 'dealt', 'parried', 'dmg'}]: the attacks due by `upto`, replayed
    from the hits. A hit counts for the attack after its session BEGAN, so a
    session running across the moment parries it once it is committed."""
    state = purchase.state or {}
    attack = state.get("attack")
    if not attack:
        return []
    hits = sorted(
        (
            datetime.fromisoformat(e["at"]) - timedelta(minutes=e.get("min", 0)),
            e["dmg"],
        )
        for e in state.get("events", [])
        if e.get("dmg")
    )
    out = []
    every = timedelta(hours=attack["every"])
    moment = purchase.created_at + every
    previous = None
    while moment <= upto and moment < purchase.expires_at:
        dealt = sum(
            dmg for began, dmg in hits if (previous is None or began > previous) and began <= moment
        )
        # Only a raid from before the blows took BITS every few hours parries.
        parried = not attack.get("hp") and dealt >= attack["parry"]
        out.append(
            {
                "at": moment,
                "dealt": dealt,
                "parried": parried,
                "dmg": 0 if parried else attack["dmg"],
            }
        )
        previous, moment = moment, moment + every
    return out


def _sync_attacks(purchase, now):
    """Brings what the boss has taken up to date. An attack never takes the
    balance below zero: what it couldn't take stays due."""
    from .economy import bits_summary  # economy imports this module

    attack = (purchase.state or {}).get("attack")
    if not attack or attack.get("hp"):
        return  # replayed by attacks.sync
    total = sum(a["dmg"] for a in raid_attacks(purchase, min(now, purchase.expires_at)))
    if total > purchase.struck:
        total = min(total, purchase.struck + max(0, bits_summary(purchase.user)["balance"]))
    if total != purchase.struck:
        purchase.struck = total
        purchase.save(update_fields=["struck"])


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
    _sync_attacks(purchase, now)
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
                # Escaped: the stake goes with it, and nothing else is taken.
                _settle(locked, "escaped", 0, now)
            else:
                outcome = duel_outcome(
                    _key(locked.item_id), duel_score(locked, locked.expires_at)
                )
                payout = {
                    "won": (locked.state or {}).get("prize", 0),
                    "tie": locked.price,
                    "lost": 0,
                }[outcome]
                _settle(locked, outcome, payout, now)
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
                _settle(locked, "down", _down_loot(locked, now, final=True), now)
    for purchase in _live(user).filter(
        item_id__startswith=RAID_PREFIX, expires_at__gt=now
    ):
        with transaction.atomic():
            locked = (
                BitPurchase.objects.select_for_update()
                .filter(pk=purchase.pk, remaining_uses=1)
                .select_related("user")
                .first()
            )
            if locked is not None:
                _sync_attacks(locked, now)
    # ATTACKS: what the raids' blows took, and the bank covering it.
    from . import attacks

    attacks.sync(user, now)


def _down_loot(purchase, now=None, final=False):
    """What a boss brought down pays: its loot (and a first clear's bonus),
    less what its blows took off the bounty, never below the stake. `final`:
    the last hit brought it down, and that one draws no counter."""
    full = RAIDS[_key(purchase.item_id)]["loot"] + (purchase.state or {}).get("bonus", 0)
    return max(purchase.price, full - _struck(purchase, now, final))


def _struck(purchase, now=None, final=False):
    """What the boss's blows have taken off the bounty so far."""
    if not ((purchase.state or {}).get("attack") or {}).get("hp"):
        return 0  # an older raid's blows were settled the old way
    from . import attacks

    now = now or timezone.now()
    upto = min(now, purchase.expires_at) if purchase.expires_at else now
    result = attacks.replay(purchase.user, upto)
    struck = result["struck"].get(purchase.pk, 0)
    if final:
        landed = [e for e in (purchase.state or {}).get("events", []) if e.get("dmg")]
        if landed and (purchase.state or {}).get("outcome") != "down":
            struck -= result["landed"].get(f"{purchase.pk}:c{landed[-1].get('log')}", 0)
    return max(0, struck)


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
        "struck": p.struck,
        "first_clear": (p.state or {}).get("outcome") in BEATEN
        and bool((p.state or {}).get("bonus")),
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


def defeats(user):
    """{item_id: times beaten} from the settled challenges."""
    beaten = {}
    for item_id in BitPurchase.objects.filter(
        user=user,
        item_id__in=CHALLENGE_IDS,
        remaining_uses=0,
        state__outcome__in=BEATEN,
    ).values_list("item_id", flat=True):
        beaten[item_id] = beaten.get(item_id, 0) + 1
    return beaten


def _on_offer(spec, user, now, beaten=None):
    """Whether a challenger can be taken on now: always, for the regulars. A
    festival's only while it runs, a hidden one once it shows itself, and an
    INVERTED one once its other side has been beaten INVERT_AT times."""
    if spec.get("inverted_of"):
        beaten = defeats(user) if beaten is None else beaten
        kind_prefix = RAID_PREFIX if spec.get("hp") else RIVAL_PREFIX
        return beaten.get(kind_prefix + spec["inverted_of"], 0) >= INVERT_AT
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


def _first_bonus(spec, item_id, beaten):
    return 0 if beaten.get(item_id) else spec.get("first_bonus", 0)


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
    if kind == "raid" and spec["trait"] == "afterimage" and (
        Category.objects.filter(user=user, completed_at__isnull=True).count()
        < HYDRA_MIN_HEADS
    ):
        raise ChallengeError("It needs at least two categories in progress.")
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
        first_bonus = _first_bonus(spec, item_id, defeats(user))
        if kind == "raid":
            expires = now + timedelta(days=spec["days"])
            state["events"] = []
            state["attack"] = dict(spec["attack"])
            if first_bonus:
                state["bonus"] = first_bonus
        else:
            expires = now + DUEL_LENGTH
            state["prize"] = rival_prize(key, user, now) + first_bonus
            state["ends"] = expires.isoformat()
            if first_bonus:
                state["bonus"] = first_bonus
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
        elif spec["trait"] == "reverse_armor" and minutes >= 60:
            kind = "block"
        elif spec["trait"] == "dodge" and random.random() < DODGE_CHANCE:
            kind = "miss"
        elif spec["trait"] == "afterimage" and _same_as_last_hit(state, log):
            kind = "miss"
        else:
            kind = _landed_kind(spec, minutes)
        boost, wished = _boost(log, kind, now) if (state.get("attack") or {}).get("hp") else (1.0, [])
        damage = int(round(_hit(spec, minutes, kind) * boost))
        events = list(state.get("events", []))
        events.append(
            {
                "at": now.isoformat(),
                "log": log.id,
                "min": minutes,
                "dmg": damage,
                "kind": kind,
                "head": head,
                "cat": log.category_id,
                "boost": boost,
                **({"wishes": wished} if wished else {}),
            }
        )
        state["events"] = events
        purchase.state = state
        purchase.save(update_fields=["state"])
        hp, heads, max_hp = raid_hp(purchase, now)
        down = hp <= 0
        loot = _down_loot(purchase, now, final=True)
        if down:
            _settle(purchase, "down", loot, now)
        return {
            "kind": "raid",
            "name": spec["name"],
            "boss": _key(purchase.item_id),
            "hit": kind,
            "damage": damage,
            "hp": hp,
            "max_hp": max_hp,
            "down": down,
            "payout": loot if down else 0,
            "wishes": wished,
            # The boss strikes back at a hit that landed (attacks.py), unless
            # a SHIELD or a VEIL stops it; inside a BLAZE it lands double.
            "counter": (
                _counter_landed(log, purchase, now)
                if (state.get("attack") or {}).get("hp") and damage > 0 and not down
                else 0
            ),
        }


def _counter_landed(log, purchase, now):
    from . import attacks

    return attacks.counter_landed(log.user, purchase, log.id, now)


def _boost(log, kind, now):
    """(multiplier, [wishes]) for how much harder this log hits a raid: half
    its buff's share of its BITS, a NOVA SHIELD up (attacks.py), ORION worn
    (charms.hit_bonus), and the wishes (wishes.hit_power)."""
    from .economy import bits_for_minutes
    from . import attacks, charms, wishes

    if kind not in ("hit", "crit"):
        return 1.0, []
    base = bits_for_minutes(log.duration_minutes)
    boost = 1.0
    if base and log.bonus_bits:
        boost = min(BUFF_HIT_CAP, 1 + BUFF_HIT_SHARE * log.bonus_bits / base)
    boost *= attacks.power_at(log.user, now)
    boost *= charms.hit_bonus(log.user, now)
    power, wished = wishes.hit_power(log, now, kind)
    return round(boost * power, 3), wished


def _same_as_last_hit(state, log):
    """PHANTOM // INVERTED: whether this log is in the category of the last hit
    that landed. The first hit always lands."""
    landed = [
        e for e in state.get("events", []) if e.get("kind") in ("hit", "crit")
    ]
    return bool(landed) and landed[-1].get("cat") == log.category_id


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
            e["kind"] = _landed_kind(spec, minutes)
        e["min"] = log.duration_minutes
        e["dmg"] = int(round(_hit(spec, minutes, e["kind"]) * e.get("boost", 1.0)))
        state["events"] = events
        purchase.state = state
        purchase.save(update_fields=["state"])
        if raid_hp(purchase, now)[0] <= 0:
            _settle(purchase, "down", _down_loot(purchase, now, final=True), now)


# ==========================================
# Serialization
# ==========================================


def _interval(user, day, start, length):
    begin = _at(user, day, start)
    return begin, begin + timedelta(minutes=length)


def _serialize_attack(purchase, now):
    """The boss's next move and the last ones it made, or None for a raid
    started before bosses hit back."""
    attack = (purchase.state or {}).get("attack")
    if not attack:
        return None
    done = raid_attacks(purchase, now)
    landed = {}
    if attack.get("hp"):
        # What each blow really took: a SHIELD, a QUIET SKY or a BLAZE has a say
        # (attacks.py). `parried` is true for a blow stopped any way.
        from . import attacks

        prefix = f"{purchase.pk}:"
        landed = {
            key[len(prefix):]: bits
            for key, bits in attacks.replay(purchase.user, now)["landed"].items()
            if key.startswith(prefix)
        }
    every = timedelta(hours=attack["every"])
    previous = done[-1]["at"] if done else None
    following = (previous or purchase.created_at) + every
    dealt = sum(
        e["dmg"]
        for e in (purchase.state or {}).get("events", [])
        if e.get("dmg")
        and (
            previous is None
            or datetime.fromisoformat(e["at"]) - timedelta(minutes=e.get("min", 0)) > previous
        )
    )
    return {
        "name": attack["name"],
        "dmg": attack["dmg"],
        "hp": bool(attack.get("hp")),
        "counter": attack.get("counter", 0),
        "every": attack["every"],
        "parry": attack["parry"],
        "next_at": following if following < purchase.expires_at else None,
        "dealt": dealt,
        "log": [
            {"at": a["at"].isoformat(), "parried": landed.get(a["at"].isoformat(), a["dmg"]) == 0, "dmg": landed.get(a["at"].isoformat(), a["dmg"])}
            for a in done[-4:]
        ],
    }


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
            "loot": _down_loot(purchase, now),
            "full_loot": spec["loot"] + state.get("bonus", 0),
            "first_bonus": state.get("bonus", 0),
            "inverted_of": spec.get("inverted_of"),
            "struck": purchase.struck,
            "attack": _serialize_attack(purchase, now),
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
        "first_bonus": (purchase.state or {}).get("bonus", 0),
        "inverted_of": spec.get("inverted_of"),
        "rule_line": spec.get("rule_line"),
        "sweep": bool((spec.get("rule") or {}).get("sweep")),
        "starts_at": start,
        "ends_at": end,
        "days": days,
        "mine": sum(d["mine"] for d in days),
        "theirs": sum(d["theirs"] for d in days),
        "plan": plan,
        "sleep": sleep,
        "life": life,
    }


def _raid_offer(key, spec, beaten, hydra_ok, suggested):
    item_id = RAID_PREFIX + key
    bonus = _first_bonus(spec, item_id, beaten)
    return {
        "item_id": item_id,
        "key": key,
        **{
            k: spec[k]
            for k in ("name", "title", "price", "hp", "days", "trait", "trait_line")
        },
        "loot": spec["loot"] + bonus,
        "first_bonus": bonus,
        "attack": {k: spec["attack"].get(k) for k in ("name", "dmg", "every", "parry", "hp", "counter")},
        "event": spec.get("event"),
        "available": hydra_ok if spec["trait"] in ("heads", "afterimage") else True,
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


def _rival_offer(key, spec, beaten, user, now):
    item_id = RIVAL_PREFIX + key
    bonus = _first_bonus(spec, item_id, beaten)
    return {
        "item_id": item_id,
        "key": key,
        **{k: spec[k] for k in ("name", "tag", "motto", "price")},
        "event": spec.get("event"),
        "prize": rival_prize(key, user, now) + bonus,
        "first_bonus": bonus,
        "rule_line": spec.get("rule_line"),
        # Minutes their schedule puts into a duel bought now.
        "projected": _rival_minutes(
            user, key, now, now + DUEL_LENGTH, now + DUEL_LENGTH
        ),
        "ends_at": now + DUEL_LENGTH,
    }


def _inversion(item_id, inverted_key, beaten, offer):
    """Where a regular challenger's other side stands: nothing until it has
    been beaten once, then the count, then the offer itself."""
    wins = beaten.get(item_id, 0)
    if not wins or inverted_key not in {**INVERTED_RAIDS, **INVERTED_RIVALS}:
        return None
    return {
        "wins": wins,
        "need": INVERT_AT,
        "offer": offer() if wins >= INVERT_AT else None,
    }


def offers(user, now=None):
    """The challenge catalog, cheapest first like the buffs (ties keep the
    catalog order). INVERTED challengers ride on their other side's row."""
    now = now or timezone.now()
    suggested = _hydra_heads(user)
    hydra_ok = len(suggested) >= HYDRA_MIN_HEADS
    beaten = defeats(user)
    return {
        "raids": [
            {
                **_raid_offer(key, spec, beaten, hydra_ok, suggested),
                "wins": beaten.get(RAID_PREFIX + key, 0),
                "inversion": _inversion(
                    RAID_PREFIX + key,
                    f"{key}_inverted",
                    beaten,
                    lambda key=key: _raid_offer(
                        f"{key}_inverted",
                        RAIDS[f"{key}_inverted"],
                        beaten,
                        hydra_ok,
                        suggested,
                    ),
                ),
            }
            for key, spec in sorted(RAIDS.items(), key=lambda kv: kv[1]["price"])
            if not spec.get("inverted_of") and _on_offer(spec, user, now, beaten)
        ],
        "rivals": [
            {
                **_rival_offer(key, spec, beaten, user, now),
                "wins": beaten.get(RIVAL_PREFIX + key, 0),
                "inversion": _inversion(
                    RIVAL_PREFIX + key,
                    f"{key}_inverted",
                    beaten,
                    lambda key=key: _rival_offer(
                        f"{key}_inverted", RIVALS[f"{key}_inverted"], beaten, user, now
                    ),
                ),
            }
            for key, spec in sorted(RIVALS.items(), key=lambda kv: kv[1]["price"])
            if not spec.get("inverted_of") and _on_offer(spec, user, now, beaten)
        ],
    }
