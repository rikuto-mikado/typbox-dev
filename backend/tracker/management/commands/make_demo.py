"""
Writes the sample account behind the guest demo to frontend/public/demo/snapshot.json.

Three months of someone's study are played through the real API on a mocked
clock, so every number in the demo comes from the real rules. Run it again when
the rules or the serialized data change; nothing is kept in the database (it
all happens inside a transaction that is rolled back). Dev only.

    python manage.py make_demo
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.test import override_settings
from rest_framework.test import APIClient

from tracker.festivals import active_on
from tracker.furniture import FURNITURE, LayoutError, validate_layout
from tracker.models import Category, UserProfile

ZONE = ZoneInfo("Asia/Tokyo")
# A morning off-season: no festival to go stale, one short session already logged.
NOW = datetime(2026, 10, 14, 8, 0, tzinfo=ZONE)
DAYS = 92
OUT = Path(settings.BASE_DIR).parent / "frontend" / "public" / "demo" / "snapshot.json"
ENDPOINTS = ["/auth/me/", "/categories/", "/logs/", "/bits/", "/bits/trade/", "/room/"]

SUBJECTS = {
    "MATH": ("Mathematics", "#38bdf8", 40, ["Linear algebra", "Calculus problems", "Probability", "Past exam"]),
    "ENGL": ("English", "#f472b6", 25, ["Vocabulary", "Reading practice", "Listening", "Essay draft"]),
    "CODE": ("Programming", "#34d399", 25, ["Algorithms", "Web app project", "Data structures", "Code review"]),
    "PHYS": ("Physics", "#fbbf24", 10, ["Mechanics", "Thermodynamics", "Problem set"]),
}
BUFF_ROTATION = ["warm_up", "deep_dive", "overclock", "focus_chip", "lucky_byte", "night_shift", "hyperdrive"]
FIGHT_ROTATION = ["raid_golem", "rival_mika", "raid_warden", "rival_orion", "raid_nightmare", "rival_kai"]


class Command(BaseCommand):
    help = "Writes the guest demo's sample data to frontend/public/demo/snapshot.json."

    def add_arguments(self, parser):
        parser.add_argument("--out", default="", help="Write here instead of the demo's usual file.")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Dev only: this plays out a whole account, then rolls it back.")
        if active_on(NOW.date()):
            raise CommandError("NOW falls inside a festival: pick another date.")
        with (
            override_settings(ALLOWED_HOSTS=["*"]),
            mock.patch("rest_framework.throttling.SimpleRateThrottle.allow_request", return_value=True),
            transaction.atomic(),
        ):
            data = self._play()
            transaction.set_rollback(True)
        out = Path(options["out"]) if options["out"] else OUT
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        hours = sum(log["duration_minutes"] for log in data["/logs/"]) / 60
        self.stdout.write(
            f"{out}: {out.stat().st_size // 1024} KB, {len(data['/logs/'])} logs, {hours:.0f}h, "
            f"{data['/bits/']['bits']['balance']} BITS, {len(data['/room/']['layout']['items'])} pieces in the room"
        )

    def _at(self, moment):
        return mock.patch("django.utils.timezone.now", return_value=moment)

    def _play(self):
        self.rng = random.Random(7)
        user = get_user_model().objects.create_user(username="aoi", email="demo@typbox.invalid")
        UserProfile.objects.update_or_create(user=user, defaults={"timezone": "Asia/Tokyo"})
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        self.user = user
        self.categories = {}
        start = NOW - timedelta(days=DAYS)
        with self._at(start):
            for code, (name, color, _, _topics) in SUBJECTS.items():
                category = Category.objects.create(user=user, code=code, name=name, color=color)
                self.categories[code] = category

        self.buffs = iter(BUFF_ROTATION * 20)
        self.fights = iter(FIGHT_ROTATION * 6)
        for offset in range(DAYS):
            day = (start + timedelta(days=offset)).date()
            self._morning_shopping(day, offset)
            self._study(day, offset)

        self._invest()
        with self._at(NOW.replace(hour=7, minute=30)):
            self._log(NOW.date(), 45, NOW.replace(hour=7, minute=30))
        with self._at(NOW):
            # Physics finished its course work a while ago.
            done = self.categories["PHYS"]
            done.completed_at = NOW - timedelta(days=9)
            done.save(update_fields=["completed_at"])
            self._keep_something_running()
            data = {}
            for endpoint in ENDPOINTS:
                res = self.client.get(f"/api{endpoint}")
                if res.status_code != 200:
                    raise CommandError(f"{endpoint}: {res.status_code}")
                data[endpoint] = json.loads(json.dumps(res.data, default=str))
        data["taken_on"] = NOW.date().isoformat()
        return data

    def _clock(self, day, hour, minute=0):
        return datetime(day.year, day.month, day.day, hour, minute, tzinfo=ZONE)

    def _study(self, day, offset):
        rng = self.rng
        weekend = day.weekday() >= 5
        # A slow patch every so often, and the odd day off: nobody is a machine.
        slow = 40 <= offset < 46
        if rng.random() < (0.3 if slow else 0.06):
            return
        goal = rng.randint(90, 180) if slow else rng.randint(300, 480) if weekend else rng.randint(180, 360)
        clock = self._clock(day, rng.choice([9, 10, 19, 20]) if weekend else rng.choice([19, 20]))
        while goal > 20:
            minutes = min(goal, rng.choice([50, 60, 75, 90, 120, 150, 240 if weekend else 120]))
            clock += timedelta(minutes=minutes)
            if clock.date() != day:
                break
            with self._at(clock):
                self._log(day, minutes, clock)
            clock += timedelta(minutes=rng.choice([15, 25, 40]))
            goal -= minutes

    def _log(self, day, minutes, _clock):
        code = self.rng.choices(list(SUBJECTS), weights=[s[2] for s in SUBJECTS.values()])[0]
        if code == "PHYS" and day >= (NOW - timedelta(days=9)).date():
            code = "MATH"
        res = self.client.post(
            "/api/logs/",
            {
                "category": self.categories[code].id,
                "date": day.isoformat(),
                "duration_minutes": minutes,
                "topic": self.rng.choice(SUBJECTS[code][3]),
            },
            format="json",
        )
        if res.status_code != 201:
            raise CommandError(f"Log refused on {day}: {res.data}")

    def _balance(self):
        return self.client.get("/api/bits/").data["bits"]["balance"]

    def _morning_shopping(self, day, offset):
        with self._at(self._clock(day, 8)):
            room = self.client.get("/api/room/").data
            balance = self._balance()
            if room["starter_required"]:
                if balance >= 2500:
                    self.client.post("/api/bits/buy/", {"item_id": "pack_study"}, format="json")
                return
            shop = self.client.get("/api/bits/").data
            left = DAYS - offset
            # Clear the decks near the end, so the demo opens on a fight and a buff
            # that have been going for a couple of days, not ones just bought.
            if not shop["active_buff"] and balance > 1500 and not 2 < left <= 7:
                self.client.post("/api/bits/buy/", {"item_id": "warm_up" if left <= 2 else next(self.buffs)}, format="json")
            if not shop.get("active_challenge") and balance > 2500 and not 3 < left <= 9:
                self.client.post("/api/bits/buy/", {"item_id": "raid_warden" if left <= 3 else next(self.fights)}, format="json")
            if offset % 4 == 0:
                self._buy_a_piece(room, self._balance())

    def _buy_a_piece(self, room, balance):
        affordable = [
            item_id
            for item_id in room["weekly"]["items"]
            if FURNITURE[item_id]["tier"] in (1, 2)
            and FURNITURE[item_id]["layer"] in ("wall", "floor")
            and FURNITURE[item_id]["price"] <= balance * 0.5
            and not room["inventory"].get(item_id)
        ]
        if not affordable:
            return
        item_id = self.rng.choice(affordable)
        if self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json").status_code != 201:
            return
        fresh = self.client.get("/api/room/").data
        layout = fresh["layout"]
        spec = FURNITURE[item_id]
        spots = [
            (x, y)
            for x in range(0, 17 - spec["w"])
            for y in (range(0, 5 - spec["h"] + 1) if spec["layer"] == "wall" else [9 - spec["h"], 11 - spec["h"]])
            if y >= 0
        ]
        self.rng.shuffle(spots)
        for x, y in spots:
            trial = {**layout, "items": layout["items"] + [{"id": item_id, "x": x, "y": y}]}
            try:
                validate_layout(trial, fresh["inventory"])
            except LayoutError:
                continue
            self.client.put("/api/room/", {"layout": trial}, format="json")
            return

    def _invest(self):
        """A few small positions, after the shopping so they don't change it."""
        for days_ago, asset, amount in (
            (21, "global_index", 800),
            (12, "tech_titans", 2000),
            (5, "bio_venture", 200),
        ):
            with self._at(NOW - timedelta(days=days_ago)):
                self.client.post(
                    "/api/bits/trade/",
                    {"asset": asset, "side": "buy", "amount": amount},
                    format="json",
                )

    def _keep_something_running(self):
        """The demo shows a buff at work and a fight under way."""
        shop = self.client.get("/api/bits/").data
        if not shop["active_buff"]:
            for item_id in BUFF_ROTATION:
                if self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json").status_code == 201:
                    break
        if not shop.get("active_challenge"):
            for item_id in FIGHT_ROTATION:
                if self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json").status_code == 201:
                    break
