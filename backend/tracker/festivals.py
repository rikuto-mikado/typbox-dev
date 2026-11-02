"""
FESTIVALS: the seasons of the year in TYPBOX, the same dates every year. Each
one has its own limited furniture, its own challengers (some hidden until you
meet their condition) and one rule of its own. Limited pieces come back the
next year, so missing one is never final. Dates are the user's local dates.
"""

from datetime import date

FESTIVALS = [
    {
        "id": "newyear",
        "name": "NEW YEAR",
        "tagline": "Start the year with a clean page.",
        "rule": "KAGAMI, the offering come to life, only feels one long sitting: logs under an hour bounce off. MIKO keeps the shrine, and the hours.",
        "start": (12, 31),
        "end": (1, 3),
        "accent": "#ef4444",
        "challengers": ["KAGAMI", "MIKO"],
    },
    {
        "id": "hanami",
        "name": "HANAMI",
        "tagline": "The blossoms only stay a little while.",
        "rule": "FUBUKI is the storm that strips the trees: it grows back after every empty day. SAKURA, the transfer student, stays until the last petal.",
        "start": (3, 25),
        "end": (4, 10),
        "accent": "#f9a8d4",
        "challengers": ["FUBUKI", "SAKURA"],
    },
    {
        "id": "tanabata",
        "name": "TANABATA",
        "tagline": "Two stars, one night a year.",
        "rule": "The RIVER OF HEAVEN is a dragon of stars with one head per subject: each log only reaches its own.",
        "start": (7, 1),
        "end": (7, 7),
        "accent": "#818cf8",
        "challengers": ["RIVER OF HEAVEN", "ORIHIME"],
    },
    {
        "id": "summer",
        "name": "SUMMER BREAK",
        "tagline": "There is plenty of time. There was.",
        "rule": "AUGUST 31 is the deadline itself: every empty day it grows back two hours.",
        "start": (8, 1),
        "end": (8, 31),
        "accent": "#22d3ee",
        "challengers": ["AUGUST 31"],
    },
    {
        "id": "halloween",
        "name": "HALLOWEEN",
        "tagline": "Some things only come out after dark.",
        "rule": "JACK can only be hit at night: logs committed from 05:00 to 17:59 pass right through.",
        "start": (10, 25),
        "end": (10, 31),
        "accent": "#f97316",
        "challengers": ["JACK"],
    },
    {
        "id": "christmas",
        "name": "CHRISTMAS",
        "tagline": "He has one night, and he has not started.",
        "rule": "Log 5 hours from Dec 20 to 24 and a present opens on the 25th: a limited piece, free.",
        "start": (12, 20),
        "end": (12, 25),
        "accent": "#22c55e",
        "challengers": ["SANTA", "KRAMPUS"],
    },
]

FESTIVALS += [
    {
        "id": "setsubun",
        "name": "SETSUBUN",
        "tagline": "Out with the demons. Handful by handful.",
        "rule": "ONI hates small things thrown often: logs of 30 minutes or less hit for double.",
        "start": (2, 1),
        "end": (2, 3),
        "accent": "#dc2626",
        "challengers": ["ONI"],
    },
    {
        "id": "valentine",
        "name": "VALENTINE",
        "tagline": "Someone has been studying very hard, for someone.",
        "rule": "CHOCO is studying to impress one person and will not lose. BITTER, the boss, dodges every fourth hit.",
        "start": (2, 10),
        "end": (2, 14),
        "accent": "#fb7185",
        "challengers": ["BITTER", "CHOCO"],
    },
    {
        "id": "tsukimi",
        "name": "TSUKIMI",
        "tagline": "Look up. Someone up there is keeping count.",
        "rule": "TSUKUYOMI rules the night and heals an hour at every midnight. USAGI pounds rice on the moon between lessons.",
        "start": (9, 15),
        "end": (9, 25),
        "accent": "#fde68a",
        "challengers": ["TSUKUYOMI", "USAGI"],
    },
    {
        "id": "culture",
        "name": "CULTURE FESTIVAL",
        "tagline": "The whole school is awake and nothing is ready.",
        "rule": "STAGE FRIGHT only shows itself after dark, the night before you go on. The class president, IINCHO, is running everything.",
        "start": (11, 1),
        "end": (11, 7),
        "accent": "#c084fc",
        "challengers": ["STAGE FRIGHT", "IINCHO"],
    },
]
FESTIVALS.sort(key=lambda f: f["start"])

BY_ID = {f["id"]: f for f in FESTIVALS}


def _in_span(festival, day):
    key = (day.month, day.day)
    start, end = festival["start"], festival["end"]
    if start <= end:
        return start <= key <= end
    return key >= start or key <= end


def active_on(day):
    """The festival running on a local date, or None."""
    return next((f for f in FESTIVALS if _in_span(f, day)), None)


def is_active(festival_id, day):
    festival = BY_ID.get(festival_id)
    return bool(festival) and _in_span(festival, day)


def last_day(festival, day):
    """The final date of the run that contains `day`."""
    month, dom = festival["end"]
    year = day.year + 1 if festival["start"] > festival["end"] and day.month == 12 else day.year
    return date(year, month, dom)


def serialize(festival):
    return {
        "id": festival["id"],
        "name": festival["name"],
        "tagline": festival["tagline"],
        "rule": festival["rule"],
        "accent": festival["accent"],
        "challengers": festival["challengers"],
        "start": "%02d-%02d" % festival["start"],
        "end": "%02d-%02d" % festival["end"],
    }
