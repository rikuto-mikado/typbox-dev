import json
import re
from datetime import date, datetime, timedelta, timezone as dt_timezone
from importlib import import_module
from pathlib import Path
from unittest import mock, skipUnless
from zoneinfo import ZoneInfo

from django.apps import apps as django_apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Category, StudyLog, UserProfile, monthly_to_weekly_hours
from .furniture import (
    DEFAULT_LAYOUT,
    FURNITURE,
    SHOP_ROTATION,
    art_of,
    lineup_for,
    shop_lineup,
    shop_week,
)
from .models import BitPurchase
from .serializers import MAX_USER_STATUSES, USER_STATUS_IDS

User = get_user_model()

# The status catalog lives in the frontend; the backend keeps a copy of its ids.
FRONTEND_USER_STATUS_TS = (
    Path(settings.BASE_DIR).parent / "frontend" / "src" / "userStatus.ts"
)
# Pixel art for every furniture piece, keyed by catalog id: roomArt.ts and
# the themed packs (roomArt<Pack>.ts).
FRONTEND_ROOM_ART_TS = (
    Path(settings.BASE_DIR).parent / "frontend" / "src" / "roomArt.ts"
)


class SurfaceThemeSyncTests(APITestCase):
    """
    The selected Surface Theme is stored on the account (UserProfile) so it
    follows the user across devices via GET/PATCH /api/auth/me/.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_me_returns_blank_surface_theme_by_default(self):
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["surface_theme"], "")

    def test_patch_surface_theme_persists_to_profile(self):
        res = self.client.patch(
            "/api/auth/me/", {"surface_theme": "cement-chalk-dust"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["surface_theme"], "cement-chalk-dust")
        self.assertEqual(
            UserProfile.objects.get(user=self.user).surface_theme, "cement-chalk-dust"
        )

        # A second "device" (fresh request) sees the same value.
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.data["surface_theme"], "cement-chalk-dust")

    def test_patch_surface_theme_does_not_touch_other_profile_fields(self):
        self.client.patch("/api/auth/me/", {"avatar_color": "#3b82f6"}, format="json")
        self.client.patch("/api/auth/me/", {"surface_theme": "monolith"}, format="json")
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.avatar_color, "#3b82f6")
        self.assertEqual(profile.surface_theme, "monolith")
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "operator")

    def test_patch_surface_theme_rejects_malformed_id(self):
        for bad in ("<script>", "has space", "-leading-dash", "x" * 65):
            res = self.client.patch(
                "/api/auth/me/", {"surface_theme": bad}, format="json"
            )
            self.assertEqual(res.status_code, 400, bad)
        self.assertFalse(
            UserProfile.objects.filter(user=self.user)
            .exclude(surface_theme="")
            .exists()
        )

    def test_patch_surface_theme_normalizes_case(self):
        res = self.client.patch(
            "/api/auth/me/", {"surface_theme": "  Monolith "}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["surface_theme"], "monolith")

    def test_surface_theme_requires_authentication(self):
        self.client.force_authenticate(user=None)
        res = self.client.patch(
            "/api/auth/me/", {"surface_theme": "monolith"}, format="json"
        )
        self.assertEqual(res.status_code, 401)


class LanguageTimezoneSettingsTests(APITestCase):
    """
    UI language and time zone live on the account (UserProfile) so they
    follow the user to every device and the next sign-in.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_are_blank(self):
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["language"], "")
        self.assertEqual(res.data["timezone"], "")

    def test_patch_language_and_timezone_persist(self):
        res = self.client.patch(
            "/api/auth/me/", {"language": "ja", "timezone": "Asia/Tokyo"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.language, "ja")
        self.assertEqual(profile.timezone, "Asia/Tokyo")
        res = self.client.get("/api/auth/me/")
        self.assertEqual(
            (res.data["language"], res.data["timezone"]), ("ja", "Asia/Tokyo")
        )

    def test_language_is_normalized_and_validated(self):
        res = self.client.patch("/api/auth/me/", {"language": " JA "}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["language"], "ja")
        res = self.client.patch("/api/auth/me/", {"language": "fr"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(UserProfile.objects.get(user=self.user).language, "ja")

    def test_unknown_timezone_is_rejected(self):
        for bad in ("Mars/Olympus_Mons", "JST", "../../etc/passwd", "x" * 65):
            res = self.client.patch("/api/auth/me/", {"timezone": bad}, format="json")
            self.assertEqual(res.status_code, 400, bad)
        self.assertFalse(
            UserProfile.objects.filter(user=self.user).exclude(timezone="").exists()
        )

    def test_patching_region_keeps_other_profile_fields(self):
        self.client.patch("/api/auth/me/", {"surface_theme": "monolith"}, format="json")
        self.client.patch("/api/auth/me/", {"timezone": "Europe/London"}, format="json")
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.surface_theme, "monolith")
        self.assertEqual(profile.timezone, "Europe/London")


class StudyLogTimestampTests(APITestCase):
    """
    Log timestamps are stored and served in UTC; only the client converts
    them to the user's zone. Existing records are untouched by the setting.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        self.category = Category.objects.create(user=self.user, name="Dev", code="DEV")

    def test_created_at_is_serialized_as_utc(self):
        res = self.client.post(
            "/api/logs/",
            {
                "category": self.category.id,
                "date": "2026-10-19",
                "duration_minutes": 30,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["created_at"].endswith("Z"), res.data["created_at"])

    def test_changing_timezone_does_not_alter_stored_logs(self):
        log = StudyLog.objects.create(
            user=self.user,
            category=self.category,
            date=date(2026, 1, 5),
            duration_minutes=45,
        )
        before = StudyLog.objects.get(pk=log.pk).created_at
        self.client.patch(
            "/api/auth/me/", {"timezone": "Pacific/Kiritimati"}, format="json"
        )
        after = StudyLog.objects.get(pk=log.pk)
        self.assertEqual(after.created_at, before)
        self.assertEqual(after.date, date(2026, 1, 5))

    def test_missing_date_defaults_to_users_local_day(self):
        # Kiritimati is UTC+14: around UTC midnight it is already "tomorrow".
        UserProfile.objects.create(user=self.user, timezone="Pacific/Kiritimati")
        fixed_now = datetime(2026, 10, 19, 12, 0, tzinfo=dt_timezone.utc)
        with mock.patch("django.utils.timezone.now", return_value=fixed_now):
            res = self.client.post(
                "/api/logs/",
                {"category": self.category.id, "duration_minutes": 30},
                format="json",
            )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["date"], "2026-10-20")

    def test_import_backup_preserves_original_created_at(self):
        res = self.client.post(
            "/api/logs/import-backup/",
            {
                "categories": [],
                "logs": [
                    {
                        "categoryCode": "DEV",
                        "date": "2025-03-01",
                        "durationMinutes": 60,
                        "createdAt": "2025-03-01T09:22:00Z",
                    },
                    {
                        "categoryCode": "DEV",
                        "date": "2025-03-02",
                        "durationMinutes": 30,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        restored = StudyLog.objects.get(user=self.user, date=date(2025, 3, 1))
        self.assertEqual(
            restored.created_at, datetime(2025, 3, 1, 9, 22, tzinfo=dt_timezone.utc)
        )
        self.assertIsNotNone(
            StudyLog.objects.get(user=self.user, date=date(2025, 3, 2)).created_at
        )


class ResetAndImportTests(APITestCase):
    """Reset wipes logs and categories; re-importing a backup never inflates totals."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        self.category = Category.objects.create(
            user=self.user, name="Dev", code="DEV", weekly_target_hours=9
        )
        StudyLog.objects.create(
            user=self.user,
            category=self.category,
            date=date(2026, 10, 1),
            duration_minutes=90,
        )

    def _backup(self):
        return {
            "categories": [
                {
                    "code": "DEV",
                    "name": "Dev",
                    "color": "#10b981",
                    "weeklyTargetHours": 12,
                }
            ],
            "logs": [
                {
                    "categoryCode": "DEV",
                    "date": "2026-10-01",
                    "durationMinutes": 60,
                    "createdAt": "2026-10-01T09:00:00.123456Z",
                },
                {
                    "categoryCode": "DEV",
                    "date": "2026-10-01",
                    "durationMinutes": 60,
                    "createdAt": "2026-10-01T11:00:00Z",
                },
            ],
        }

    def test_clear_all_removes_logs_and_categories_but_keeps_account(self):
        res = self.client.delete("/api/logs/clear-all/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            res.data, {"deleted": 1, "deleted_categories": 1, "deleted_purchases": 0}
        )
        self.assertFalse(StudyLog.objects.filter(user=self.user).exists())
        self.assertFalse(Category.objects.filter(user=self.user).exists())
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_reset_starts_the_bits_economy_over(self):
        # 100h earned, a buff bought and paid out, a furniture piece owned
        # and placed: all of it goes with the reset.
        StudyLog.objects.filter(user=self.user).update(duration_minutes=6000)
        self.assertEqual(
            self.client.post(
                "/api/bits/buy/", {"item_id": "overclock"}, format="json"
            ).status_code,
            201,
        )
        self.client.post(
            "/api/logs/",
            {
                "category": None,
                "date": "2026-10-30",
                "duration_minutes": 120,
                "topic": "",
            },
            format="json",
        )
        self.assertTrue(
            StudyLog.objects.filter(user=self.user, bonus_bits__gt=0).exists()
        )
        piece = next(i for i, s in FURNITURE.items() if s["tier"] == 1)
        BitPurchase.objects.create(
            user=self.user, item_id=piece, price=FURNITURE[piece]["price"]
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.room_layout = {**DEFAULT_LAYOUT, "items": []}
        profile.save()

        res = self.client.delete("/api/logs/clear-all/")
        self.assertEqual(res.data["deleted_purchases"], 2)
        self.assertFalse(BitPurchase.objects.filter(user=self.user).exists())
        profile.refresh_from_db()
        self.assertEqual(profile.room_layout, {})
        state = self.client.get("/api/bits/").data
        self.assertEqual(
            state["bits"],
            {"balance": 0, "earned": 0, "spent": 0, "payouts": 0, "per_hour": 100},
        )
        self.assertIsNone(state["active_buff"])
        room = self.client.get("/api/room/").data
        self.assertEqual(room["layout"], DEFAULT_LAYOUT)
        self.assertNotIn(piece, room["inventory"])

    def test_bits_reset_keeps_logs_and_categories(self):
        # 100h + a buff paid out + a furniture piece placed: BITS and the
        # room start over, but every log and category stays.
        StudyLog.objects.filter(user=self.user).update(duration_minutes=6000)
        self.client.post("/api/bits/buy/", {"item_id": "overclock"}, format="json")
        self.client.post(
            "/api/logs/",
            {
                "category": self.category.pk,
                "date": "2026-10-30",
                "duration_minutes": 120,
                "topic": "",
            },
            format="json",
        )
        self.assertTrue(
            StudyLog.objects.filter(user=self.user, bonus_bits__gt=0).exists()
        )
        piece = next(i for i, s in FURNITURE.items() if s["tier"] == 1)
        BitPurchase.objects.create(
            user=self.user, item_id=piece, price=FURNITURE[piece]["price"]
        )
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.room_layout = {**DEFAULT_LAYOUT, "items": []}
        profile.save()

        res = self.client.post("/api/bits/reset/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["deleted_purchases"], 2)
        self.assertEqual(res.data["cleared_bonus_logs"], 1)
        # 6,120 min = 10,200 BITS at the base rate, nothing spent.
        self.assertEqual(
            res.data["bits"],
            {
                "balance": 10200,
                "earned": 10200,
                "spent": 0,
                "payouts": 0,
                "per_hour": 100,
            },
        )
        self.assertIsNone(res.data["active_buff"])
        self.assertEqual(StudyLog.objects.filter(user=self.user).count(), 2)
        self.assertFalse(
            StudyLog.objects.filter(user=self.user, bonus_bits__gt=0).exists()
        )
        self.assertFalse(
            StudyLog.objects.exclude(bonus_item="").filter(user=self.user).exists()
        )
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())
        profile.refresh_from_db()
        self.assertEqual(profile.room_layout, {})
        room = self.client.get("/api/room/").data
        self.assertEqual(room["layout"], DEFAULT_LAYOUT)
        self.assertNotIn(piece, room["inventory"])
        # The shop works again straight away.
        self.assertEqual(
            self.client.post(
                "/api/bits/buy/", {"item_id": "overclock"}, format="json"
            ).status_code,
            201,
        )

    def test_bits_reset_only_touches_the_caller(self):
        other = User.objects.create_user(
            username="other", email="o@example.com", password="s3cure-pass-123"
        )
        StudyLog.objects.create(
            user=other, duration_minutes=600, bonus_bits=50, bonus_item="overclock"
        )
        BitPurchase.objects.create(user=other, item_id="overclock", price=800)
        self.client.post("/api/bits/reset/")
        self.assertTrue(BitPurchase.objects.filter(user=other).exists())
        self.assertTrue(StudyLog.objects.filter(user=other, bonus_bits=50).exists())

    def test_bits_reset_needs_login(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post("/api/bits/reset/").status_code, 401)

    def test_import_after_reset_pays_base_bits_only(self):
        StudyLog.objects.filter(user=self.user).update(
            bonus_bits=500, bonus_item="overclock"
        )
        self.client.delete("/api/logs/clear-all/")
        backup = self._backup()
        backup["logs"][0]["bonusBits"] = 999  # never trusted from a file
        self.client.post("/api/logs/import-backup/", backup, format="json")
        # 2 x 60 min = 200 BITS, no bonus carried over.
        self.assertEqual(self.client.get("/api/bits/").data["bits"]["balance"], 200)

    def test_import_after_reset_restores_backup_categories_exactly(self):
        self.client.delete("/api/logs/clear-all/")
        res = self.client.post(
            "/api/logs/import-backup/", self._backup(), format="json"
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["imported_logs"], 2)
        self.assertEqual(
            Category.objects.get(user=self.user, code="DEV").weekly_target_hours, 12
        )

    def test_reimporting_same_backup_adds_nothing(self):
        self.client.delete("/api/logs/clear-all/")
        self.client.post("/api/logs/import-backup/", self._backup(), format="json")
        res = self.client.post(
            "/api/logs/import-backup/", self._backup(), format="json"
        )
        self.assertEqual(res.data["imported_logs"], 0)
        self.assertEqual(res.data["skipped_logs"], 2)
        self.assertEqual(StudyLog.objects.filter(user=self.user).count(), 2)

    def test_unknown_category_code_is_not_credited_to_another_category(self):
        res = self.client.post(
            "/api/logs/import-backup/",
            {
                "categories": [],
                "logs": [
                    {
                        "categoryCode": "GONE",
                        "date": "2026-10-02",
                        "durationMinutes": 120,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.data["imported_logs"], 1)
        self.assertIsNone(
            StudyLog.objects.get(user=self.user, date=date(2026, 10, 2)).category
        )
        self.assertEqual(StudyLog.objects.filter(category=self.category).count(), 1)


class CategoryWeeklyTargetTests(APITestCase):
    """Category targets are weekly; inactive categories are parked, not deleted."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_with_weekly_target_defaults_active(self):
        res = self.client.post(
            "/api/categories/",
            {"name": "Math", "code": "MATH", "weekly_target_hours": 6},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["weekly_target_hours"], 6)
        self.assertTrue(res.data["is_active"])

    def test_weekly_target_bounds(self):
        for bad in (0, 169):
            res = self.client.post(
                "/api/categories/",
                {"name": "X", "code": f"X{bad}", "weekly_target_hours": bad},
                format="json",
            )
            self.assertEqual(res.status_code, 400, bad)

    def test_deactivate_keeps_target_and_logs(self):
        cat = Category.objects.create(
            user=self.user, name="Dev", code="DEV", weekly_target_hours=8
        )
        StudyLog.objects.create(
            user=self.user, category=cat, date=date(2026, 10, 1), duration_minutes=30
        )
        res = self.client.patch(
            f"/api/categories/{cat.id}/", {"is_active": False}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        cat.refresh_from_db()
        self.assertFalse(cat.is_active)
        self.assertEqual(cat.weekly_target_hours, 8)
        self.assertEqual(StudyLog.objects.filter(category=cat).count(), 1)

    def test_import_keeps_legacy_monthly_target_value_as_is(self):
        res = self.client.post(
            "/api/logs/import-backup/",
            {
                "categories": [
                    {"code": "OLD", "name": "Legacy", "monthlyTargetHours": 40},
                    {
                        "code": "NEW",
                        "name": "Current",
                        "weeklyTargetHours": 7,
                        "isActive": False,
                    },
                ],
                "logs": [],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(
            Category.objects.get(user=self.user, code="OLD").weekly_target_hours, 40
        )
        new = Category.objects.get(user=self.user, code="NEW")
        self.assertEqual((new.weekly_target_hours, new.is_active), (7, False))

    def test_legacy_monthly_field_still_works_during_rollout(self):
        # An old frontend (deployed separately, or an open tab) sends/reads monthly.
        res = self.client.post(
            "/api/categories/",
            {"name": "Old", "code": "OLD", "monthly_target_hours": 40},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["weekly_target_hours"], 9)
        self.assertEqual(res.data["monthly_target_hours"], 39)
        res = self.client.patch(
            f"/api/categories/{res.data['id']}/",
            {"monthly_target_hours": 20},
            format="json",
        )
        self.assertEqual(res.data["weekly_target_hours"], 5)

    def test_weekly_wins_over_legacy_monthly(self):
        res = self.client.post(
            "/api/categories/",
            {
                "name": "Both",
                "code": "BOTH",
                "weekly_target_hours": 7,
                "monthly_target_hours": 40,
            },
            format="json",
        )
        self.assertEqual(res.data["weekly_target_hours"], 7)

    def test_monthly_to_weekly_conversion(self):
        self.assertEqual(
            [monthly_to_weekly_hours(m) for m in (1, 10, 20, 40, 744)],
            [1, 2, 5, 9, 168],
        )


class CategoryCompletionTests(APITestCase):
    """DONE categories: server-stamped completed_at, reversible, logs kept."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        self.dev = Category.objects.create(
            user=self.user, name="Dev", code="DEV", weekly_target_hours=8
        )
        self.lic = Category.objects.create(
            user=self.user, name="Licence", code="LIC", weekly_target_hours=4
        )
        StudyLog.objects.create(
            user=self.user,
            category=self.lic,
            date=date(2026, 10, 1),
            duration_minutes=90,
        )

    def test_new_category_is_in_progress(self):
        res = self.client.get("/api/categories/")
        self.assertTrue(all(c["completed_at"] is None for c in res.data))

    def test_mark_done_stamps_server_time_and_keeps_logs(self):
        before = timezone.now()
        res = self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": True}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.lic.refresh_from_db()
        self.assertIsNotNone(self.lic.completed_at)
        self.assertGreaterEqual(self.lic.completed_at, before)
        self.assertTrue(res.data["completed_at"].endswith("Z"))
        self.assertEqual(StudyLog.objects.filter(category=self.lic).count(), 1)

    def test_marking_done_again_keeps_original_timestamp(self):
        self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": True}, format="json"
        )
        self.lic.refresh_from_db()
        first = self.lic.completed_at
        self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": True}, format="json"
        )
        self.lic.refresh_from_db()
        self.assertEqual(self.lic.completed_at, first)

    def test_restore_clears_completed_at(self):
        self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": True}, format="json"
        )
        res = self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": False}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["completed_at"])

    def test_completed_at_cannot_be_written_directly(self):
        res = self.client.patch(
            f"/api/categories/{self.lic.id}/",
            {"completed_at": "2020-01-01T00:00:00Z"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.lic.refresh_from_db()
        self.assertIsNone(self.lic.completed_at)

    def test_last_in_progress_category_cannot_be_done(self):
        self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": True}, format="json"
        )
        res = self.client.patch(
            f"/api/categories/{self.dev.id}/", {"completed": True}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.dev.refresh_from_db()
        self.assertIsNone(self.dev.completed_at)

    def test_last_in_progress_category_cannot_be_deleted(self):
        self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": True}, format="json"
        )
        res = self.client.delete(f"/api/categories/{self.dev.id}/")
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Category.objects.filter(pk=self.dev.pk).exists())
        # A DONE category itself can still be deleted.
        res = self.client.delete(f"/api/categories/{self.lic.id}/")
        self.assertEqual(res.status_code, 204)

    def test_hub_keeps_done_hours_without_target(self):
        self.client.patch(
            f"/api/categories/{self.lic.id}/", {"completed": True}, format="json"
        )
        res = self.client.get("/api/hub/telemetry/", {"username": "operator"})
        lic = next(c for c in res.data["categories"] if c["code"] == "LIC")
        self.assertTrue(lic["is_completed"])
        self.assertIsNone(lic["weekly_target_hours"])
        self.assertEqual(res.data["summary"]["total_hours"], 1.5)

    def test_import_restores_completed_at(self):
        res = self.client.post(
            "/api/logs/import-backup/",
            {
                "categories": [
                    {
                        "code": "CERT",
                        "name": "Cert",
                        "completedAt": "2026-09-30T12:00:00Z",
                    }
                ],
                "logs": [],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        cert = Category.objects.get(user=self.user, code="CERT")
        self.assertEqual(
            cert.completed_at, datetime(2026, 9, 30, 12, 0, tzinfo=dt_timezone.utc)
        )


class WeekStartSettingTests(APITestCase):
    """
    Weekly totals follow the calendar week (not a rolling 7 days); the first
    day of that week is a per-account setting (Monday or Sunday).
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_to_monday(self):
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.data["week_start"], "mon")

    def test_patch_week_start_persists_and_validates(self):
        res = self.client.patch("/api/auth/me/", {"week_start": " SUN "}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["week_start"], "sun")
        self.assertEqual(UserProfile.objects.get(user=self.user).week_start, "sun")
        for bad in ("tue", "", "monday"):
            res = self.client.patch("/api/auth/me/", {"week_start": bad}, format="json")
            self.assertEqual(res.status_code, 400, bad)
        self.assertEqual(UserProfile.objects.get(user=self.user).week_start, "sun")

    def test_week_start_date_helper(self):
        from .timezones import week_start_date

        wed = date(2026, 10, 21)
        self.assertEqual(week_start_date(wed, "mon"), date(2026, 10, 19))
        self.assertEqual(week_start_date(wed, "sun"), date(2026, 10, 18))
        mon = date(2026, 10, 19)
        self.assertEqual(week_start_date(mon, "mon"), mon)
        self.assertEqual(week_start_date(mon, "sun"), date(2026, 10, 18))
        sun = date(2026, 10, 25)
        self.assertEqual(week_start_date(sun, "mon"), date(2026, 10, 19))
        self.assertEqual(week_start_date(sun, "sun"), sun)

    def _hub_weekly_hours(self, today):
        with mock.patch("tracker.views.user_localdate", return_value=today):
            res = self.client.get("/api/hub/telemetry/", {"username": "operator"})
        self.assertEqual(res.status_code, 200)
        return (
            res.data["summary"]["weekly_hours"],
            res.data["categories"][0]["weekly_hours"],
        )

    def test_hub_weekly_hours_use_calendar_week(self):
        cat = Category.objects.create(
            user=self.user, name="Backend", code="BACK", weekly_target_hours=5
        )
        # Sun 10/18 (60m), Mon 10/19 (120m), Wed 10/21 (30m)
        for d, m in (
            (date(2026, 10, 18), 60),
            (date(2026, 10, 19), 120),
            (date(2026, 10, 21), 30),
        ):
            StudyLog.objects.create(
                user=self.user, category=cat, date=d, duration_minutes=m
            )

        # Monday-start week on Wed 10/21 = Mon 10/19..Sun 10/25 -> 150m
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 21)), (2.5, 2.5))
        # From Monday 00:00 the previous Sunday already belongs to last week.
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 19)), (2.5, 2.5))
        # The week before (Mon 10/12..Sun 10/18) only holds the Sunday log.
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 18)), (1.0, 1.0))

        UserProfile.objects.update_or_create(
            user=self.user, defaults={"week_start": "sun"}
        )
        # Sunday-start week on Wed 10/21 = Sun 10/18..Sat 10/24 -> 210m
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 21)), (3.5, 3.5))
        # Next Sunday a fresh week starts.
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 25)), (0.0, 0.0))


class UserStatusTests(APITestCase):
    """Self-declared learner-profile tags: multi-select, max 4, known ids only."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_to_empty(self):
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.data["user_statuses"], [])

    def test_patch_statuses_keeps_order_and_dedupes(self):
        res = self.client.patch(
            "/api/auth/me/",
            {"user_statuses": ["fuel_coffee", "STYLE_NIGHT_OWL", "fuel_coffee"]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user_statuses"], ["fuel_coffee", "style_night_owl"])
        self.assertEqual(
            UserProfile.objects.get(user=self.user).user_statuses,
            ["fuel_coffee", "style_night_owl"],
        )

    def test_rejects_more_than_max(self):
        picks = list(USER_STATUS_IDS[: MAX_USER_STATUSES + 1])
        res = self.client.patch(
            "/api/auth/me/", {"user_statuses": picks}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        res = self.client.patch(
            "/api/auth/me/", {"user_statuses": picks[:MAX_USER_STATUSES]}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["user_statuses"]), MAX_USER_STATUSES)

    def test_rejects_unknown_ids(self):
        self.client.patch(
            "/api/auth/me/", {"user_statuses": ["arch_phoenix"]}, format="json"
        )
        res = self.client.patch(
            "/api/auth/me/",
            {"user_statuses": ["arch_phoenix", "astronaut"]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(
            UserProfile.objects.get(user=self.user).user_statuses, ["arch_phoenix"]
        )

    def test_retired_catalog_ids_are_hidden(self):
        # Ids removed from the catalog (e.g. the old major / hobby groups)
        # vanish from responses instead of breaking the profile.
        self.client.get("/api/auth/me/")
        UserProfile.objects.filter(user=self.user).update(
            user_statuses=["student_cs", "hobby_shogi", "style_night_owl"]
        )
        self.assertEqual(
            self.client.get("/api/auth/me/").data["user_statuses"], ["style_night_owl"]
        )

    def test_picks_saved_under_old_cap_are_trimmed(self):
        # Accounts saved when the cap was 12 show only their first picks.
        self.client.get("/api/auth/me/")
        stored = list(USER_STATUS_IDS[: MAX_USER_STATUSES + 2])
        UserProfile.objects.filter(user=self.user).update(user_statuses=stored)
        self.assertEqual(
            self.client.get("/api/auth/me/").data["user_statuses"],
            stored[:MAX_USER_STATUSES],
        )

    def test_unknown_stored_ids_are_hidden(self):
        self.client.get("/api/auth/me/")
        UserProfile.objects.filter(user=self.user).update(
            user_statuses=["retired_id", "arch_phoenix"]
        )
        self.assertEqual(
            self.client.get("/api/auth/me/").data["user_statuses"], ["arch_phoenix"]
        )

    def test_rejects_non_list(self):
        res = self.client.patch(
            "/api/auth/me/", {"user_statuses": "arch_phoenix"}, format="json"
        )
        self.assertEqual(res.status_code, 400)

    def test_accepts_ids_from_each_kind_of_group(self):
        picks = [
            "style_night_owl",
            "method_active_recall",
            "arch_phoenix",
            "fuel_coffee",
        ]
        res = self.client.patch(
            "/api/auth/me/", {"user_statuses": picks}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user_statuses"], picks)

    @skipUnless(FRONTEND_USER_STATUS_TS.exists(), "frontend source not present")
    def test_ids_match_frontend_catalog(self):
        frontend_ids = re.findall(
            r"\['([a-z0-9_]+)', ", FRONTEND_USER_STATUS_TS.read_text(encoding="utf-8")
        )
        self.assertEqual(len(frontend_ids), len(set(frontend_ids)))
        self.assertEqual(set(frontend_ids), set(USER_STATUS_IDS))
        self.assertEqual(len(USER_STATUS_IDS), len(set(USER_STATUS_IDS)))

    def test_can_clear_statuses(self):
        self.client.patch(
            "/api/auth/me/", {"user_statuses": ["arch_phoenix"]}, format="json"
        )
        res = self.client.patch("/api/auth/me/", {"user_statuses": []}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user_statuses"], [])


class BitsTests(APITestCase):
    """BITS are derived from logged study: 100 per hour, stopwatch or manual."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def _bits(self):
        return self.client.get("/api/auth/me/").data["bits"]

    def test_new_account_has_no_bits(self):
        self.assertEqual(
            self._bits(),
            {"balance": 0, "earned": 0, "spent": 0, "payouts": 0, "per_hour": 100},
        )

    def test_existing_logs_are_paid_without_a_backfill(self):
        # Logs written before BITS existed count straight away.
        StudyLog.objects.create(user=self.user, duration_minutes=90)
        StudyLog.objects.create(user=self.user, duration_minutes=60)
        self.assertEqual(self._bits()["balance"], 250)

    def test_rounds_once_over_the_total(self):
        # Two 20-minute logs earn what one 40-minute log does (66), not 33 + 33.
        for _ in range(2):
            self.client.post(
                "/api/logs/",
                {
                    "category": None,
                    "date": "2026-10-30",
                    "duration_minutes": 20,
                    "topic": "",
                },
                format="json",
            )
        self.assertEqual(self._bits()["earned"], 66)

    def test_editing_and_deleting_logs_moves_the_balance(self):
        log = StudyLog.objects.create(user=self.user, duration_minutes=60)
        self.client.patch(
            f"/api/logs/{log.id}/", {"duration_minutes": 120}, format="json"
        )
        self.assertEqual(self._bits()["balance"], 200)
        self.client.delete(f"/api/logs/{log.id}/")
        self.assertEqual(self._bits()["balance"], 0)

    def test_only_own_logs_count(self):
        other = User.objects.create_user(username="other", password="s3cure-pass-123")
        StudyLog.objects.create(user=other, duration_minutes=600)
        self.assertEqual(self._bits()["balance"], 0)


class BitsShopTests(APITestCase):
    """Buff shop: purchases debit BITS, an active buff pays bonus_bits onto new logs."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        # 100h logged = 10,000 BITS to spend.
        StudyLog.objects.create(user=self.user, duration_minutes=6000)

    def _buy(self, item_id):
        return self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json")

    def _log(self, minutes):
        res = self.client.post(
            "/api/logs/",
            {
                "category": None,
                "date": "2026-10-30",
                "duration_minutes": minutes,
                "topic": "",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        return res.data

    def _balance(self):
        return self.client.get("/api/bits/").data["bits"]["balance"]

    def test_catalog_and_balance(self):
        res = self.client.get("/api/bits/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["bits"]["balance"], 10000)
        self.assertIsNone(res.data["active_buff"])
        self.assertIn("hyperdrive", [b["item_id"] for b in res.data["buffs"]])

    def test_buying_debits_the_price(self):
        res = self._buy("overclock")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["bits"]["balance"], 9200)
        self.assertEqual(res.data["bits"]["spent"], 800)
        self.assertEqual(res.data["active_buff"]["item_id"], "overclock")

    def test_rejects_unknown_item_and_short_balance(self):
        self.assertEqual(self._buy("time_machine").status_code, 400)
        StudyLog.objects.filter(user=self.user).update(duration_minutes=60)  # 100 BITS
        self.assertEqual(self._buy("overclock").status_code, 400)
        self.assertEqual(self._balance(), 100)

    def test_one_buff_at_a_time(self):
        self._buy("overclock")
        res = self._buy("focus_chip")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self._balance(), 9200)

    def test_overclock_pays_and_drains_its_minutes(self):
        self._buy("overclock")  # ×2, 600 minutes, 24h
        log = self._log(180)
        self.assertEqual(log["bonus_bits"], 300)
        self.assertEqual(log["bonus_item"], "overclock")
        for _ in range(2):
            self._log(180)
        log = self._log(180)  # only 60 of its 600 minutes are left
        self.assertEqual(log["bonus_bits"], 100)
        self.assertEqual(self._log(60)["bonus_bits"], 0)
        # 10,000 - 800 price + 1,300 base (13h) + 1,000 bonus
        self.assertEqual(self._balance(), 11500)
        # Spent buff frees the slot.
        self.assertEqual(self._buy("focus_chip").status_code, 201)

    def test_focus_chip_needs_long_sessions(self):
        self._buy("focus_chip")
        self.assertEqual(self._log(30)["bonus_bits"], 0)
        self.assertEqual(self._log(50)["bonus_bits"], 100)

    def test_night_shift_only_pays_at_night(self):
        from zoneinfo import ZoneInfo

        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        tokyo = ZoneInfo("Asia/Tokyo")
        afternoon = datetime(2026, 10, 30, 15, 0, tzinfo=tokyo)
        late = datetime(2026, 10, 30, 23, 0, tzinfo=tokyo)
        with mock.patch("tracker.economy.timezone.now", return_value=afternoon):
            self._buy("night_shift")
            self.assertEqual(self._log(60)["bonus_bits"], 0)
        with mock.patch("tracker.economy.timezone.now", return_value=late):
            self.assertEqual(self._log(60)["bonus_bits"], 100)

    def test_weekend_surge_waits_for_the_weekend(self):
        from zoneinfo import ZoneInfo

        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        tokyo = ZoneInfo("Asia/Tokyo")
        friday = datetime(2026, 10, 30, 12, 0, tzinfo=tokyo)
        saturday = datetime(2026, 10, 31, 12, 0, tzinfo=tokyo)
        next_monday = datetime(2026, 11, 2, 0, 30, tzinfo=tokyo)
        with mock.patch("tracker.economy.timezone.now", return_value=friday):
            self._buy("weekend_surge")
            self.assertEqual(self._log(60)["bonus_bits"], 0)
        with mock.patch("tracker.economy.timezone.now", return_value=saturday):
            self.assertEqual(self._log(60)["bonus_bits"], 50)
        with mock.patch("tracker.economy.timezone.now", return_value=next_monday):
            self.assertIsNone(self.client.get("/api/bits/").data["active_buff"])

    def test_lucky_byte_triples_on_a_hit(self):
        self._buy("lucky_byte")
        with mock.patch("tracker.economy.random.random", return_value=0.5):
            self.assertEqual(self._log(60)["bonus_bits"], 0)
        with mock.patch("tracker.economy.random.random", return_value=0.1):
            self.assertEqual(self._log(60)["bonus_bits"], 200)

    def test_warm_up_is_a_short_double(self):
        self._buy("warm_up")
        self.assertEqual(self._log(240)["bonus_bits"], 300)  # capped at 180 min per log
        self.assertEqual(self._log(240)["bonus_bits"], 200)  # 2h of its 5h left
        self.assertIsNone(self.client.get("/api/bits/").data["active_buff"])

    def test_early_bird_only_pays_in_the_morning(self):
        from zoneinfo import ZoneInfo

        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        tokyo = ZoneInfo("Asia/Tokyo")
        with mock.patch(
            "tracker.economy.timezone.now",
            return_value=datetime(2026, 10, 30, 4, 30, tzinfo=tokyo),
        ):
            self._buy("early_bird")
            self.assertEqual(self._log(60)["bonus_bits"], 0)
        with mock.patch(
            "tracker.economy.timezone.now",
            return_value=datetime(2026, 10, 30, 7, 0, tzinfo=tokyo),
        ):
            self.assertEqual(self._log(60)["bonus_bits"], 200)
        with mock.patch(
            "tracker.economy.timezone.now",
            return_value=datetime(2026, 10, 30, 10, 30, tzinfo=tokyo),
        ):
            self.assertEqual(self._log(60)["bonus_bits"], 0)

    def test_deep_dive_needs_two_hour_sessions(self):
        self._buy("deep_dive")
        self.assertEqual(self._log(119)["bonus_bits"], 0)
        self.assertEqual(self._log(120)["bonus_bits"], 250)
        self.assertEqual(
            self.client.get("/api/bits/").data["active_buff"]["remaining_uses"], 3
        )

    def test_category_lock_pays_only_on_its_category(self):
        math = Category.objects.create(user=self.user, name="Math", code="MATH")
        other = Category.objects.create(user=self.user, name="Art", code="ART")
        self.assertEqual(
            self._buy("category_lock").status_code, 400
        )  # no category picked
        res = self.client.post(
            "/api/bits/buy/",
            {"item_id": "category_lock", "category": math.id},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["active_buff"]["category"]["code"], "MATH")

        def log(cat):
            return self.client.post(
                "/api/logs/",
                {
                    "category": cat.id,
                    "date": "2026-10-30",
                    "duration_minutes": 60,
                    "topic": "",
                },
                format="json",
            ).data["bonus_bits"]

        self.assertEqual(log(other), 0)
        self.assertEqual(log(math), 100)
        self.assertEqual(self._log(60)["bonus_bits"], 0)  # uncategorized

    def test_category_lock_rejects_foreign_or_done_categories(self):
        stranger = User.objects.create_user(
            username="x", email="x@example.com", password="s3cure-pass-123"
        )
        foreign = Category.objects.create(user=stranger, name="X", code="X")
        done = Category.objects.create(
            user=self.user, name="Old", code="OLD", completed_at=timezone.now()
        )
        for cat in (foreign, done):
            res = self.client.post(
                "/api/bits/buy/",
                {"item_id": "category_lock", "category": cat.id},
                format="json",
            )
            self.assertEqual(res.status_code, 400)
        self.assertEqual(self._balance(), 10000)

    def test_mystery_crate_starts_a_rolled_buff(self):
        with mock.patch("tracker.economy.random.choices", return_value=["hyperdrive"]):
            res = self._buy("mystery_crate")
        self.assertEqual(res.status_code, 201)
        buff = res.data["active_buff"]
        self.assertEqual(
            (buff["item_id"], buff["via"], buff["total_minutes"]),
            ("hyperdrive", "mystery_crate", 1500),
        )
        self.assertEqual(res.data["bits"]["spent"], 700)
        self.assertEqual(self._log(60)["bonus_bits"], 100)
        # A running crate buff holds the slot like any other.
        self.assertEqual(self._buy("warm_up").status_code, 400)

    def test_mystery_crate_odds_cover_only_runnable_buffs(self):
        from .economy import BUFFS

        offer = next(
            b
            for b in self.client.get("/api/bits/").data["buffs"]
            if b["item_id"] == "mystery_crate"
        )
        ids = {o["item_id"] for o in offer["odds"]}
        self.assertNotIn("mystery_crate", ids)
        self.assertNotIn("category_lock", ids)
        self.assertTrue(ids <= set(BUFFS))
        self.assertAlmostEqual(sum(o["chance"] for o in offer["odds"]), 1.0)

    def _cancel(self):
        return self.client.post("/api/bits/cancel/", {}, format="json")

    def test_cancelling_an_unused_buff_returns_two_thirds(self):
        self._buy("overclock")  # 800
        self.assertEqual(
            self.client.get("/api/bits/").data["active_buff"]["refund"], 533
        )
        res = self._cancel()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["refunded"], 533)
        self.assertIsNone(res.data["active_buff"])
        self.assertEqual(res.data["bits"]["spent"], 267)
        self.assertEqual(self._balance(), 10000 - 267)
        # The slot is free again.
        self.assertEqual(self._buy("focus_chip").status_code, 201)

    def test_refund_is_prorated_by_what_is_left(self):
        self._buy("overclock")  # 600 min
        self._log(180)
        self._log(120)  # 300 of 600 minutes used
        self.assertEqual(
            self._cancel().data["refunded"], 800 * 300 * 2 // (600 * 3)
        )  # 266

    def test_use_capped_buffs_refund_by_uses_left(self):
        self._buy("focus_chip")  # 800, 12 uses
        for _ in range(3):
            self._log(60)
        self.assertEqual(
            self._cancel().data["refunded"], 800 * 9 * 2 // (12 * 3)
        )  # 400

    def test_bonuses_already_paid_stay_after_cancelling(self):
        self._buy("overclock")
        log = self._log(120)
        self.assertEqual(log["bonus_bits"], 200)
        self._cancel()
        self.assertEqual(StudyLog.objects.get(pk=log["id"]).bonus_bits, 200)
        self.assertEqual(self._log(60)["bonus_bits"], 0)

    def test_crate_refund_is_based_on_the_crate_price(self):
        with mock.patch("tracker.economy.random.choices", return_value=["hyperdrive"]):
            self._buy("mystery_crate")
        self.assertEqual(self._cancel().data["refunded"], 466)

    def test_a_buff_cancelled_mid_commit_pays_nothing(self):
        # The log looked the buff up just before a cancel landed: the
        # re-check under the row lock must see it has ended.
        from .economy import active_buff, apply_buff_to_new_log

        self._buy("overclock")
        buff = active_buff(self.user)
        log = StudyLog.objects.create(user=self.user, duration_minutes=60)
        self._cancel()
        with mock.patch("tracker.economy.active_buff", return_value=buff):
            apply_buff_to_new_log(log)
        log.refresh_from_db()
        self.assertEqual(log.bonus_bits, 0)

    def test_a_used_up_buff_is_not_drawn_below_zero(self):
        from .economy import active_buff, apply_buff_to_new_log

        self._buy("focus_chip")
        buff = active_buff(self.user)
        BitPurchase.objects.filter(pk=buff.pk).update(remaining_uses=0)
        log = StudyLog.objects.create(user=self.user, duration_minutes=60)
        with mock.patch("tracker.economy.active_buff", return_value=buff):
            apply_buff_to_new_log(log)
        self.assertEqual(BitPurchase.objects.get(pk=buff.pk).remaining_uses, 0)

    def test_cancel_without_a_buff_is_rejected(self):
        self.assertEqual(self._cancel().status_code, 400)
        self._buy("overclock")
        self._cancel()
        self.assertEqual(self._cancel().status_code, 400)

    def test_hyperdrive_doubles(self):
        self._buy("hyperdrive")
        self.assertEqual(self._log(120)["bonus_bits"], 200)

    def test_buff_expires(self):
        self._buy("overclock")
        later = timezone.now() + timedelta(hours=73)
        with mock.patch("tracker.economy.timezone.now", return_value=later):
            self.assertEqual(self._log(60)["bonus_bits"], 0)

    def test_shortening_a_log_keeps_its_bonus(self):
        self._buy("overclock")
        log = self._log(120)  # +200 base, +200 bonus
        self.assertEqual(self._balance(), 9600)
        res = self.client.patch(
            f"/api/logs/{log['id']}/", {"duration_minutes": 60}, format="json"
        )
        self.assertEqual(res.data["bonus_bits"], 200)
        # Only the base rate follows the new length (-100).
        self.assertEqual(self._balance(), 9500)

    def test_deleting_a_log_takes_its_bonus_back(self):
        self._buy("overclock")
        log = self._log(120)
        self.client.delete(f"/api/logs/{log['id']}/")
        self.assertEqual(self._balance(), 9200)

    def _restore_trimmed_bonuses(self):
        migration = import_module("tracker.migrations.0025_restore_trimmed_bonuses")
        migration.restore_trimmed_bonuses(django_apps, None)

    def _mark_edited(self, log_id):
        StudyLog.objects.filter(pk=log_id).update(
            updated_at=timezone.now() + timedelta(minutes=5)
        )

    def test_migration_restores_a_trimmed_bonus(self):
        self._buy("overclock")
        log = self._log(120)
        untouched = self._log(60)
        StudyLog.objects.filter(pk=log["id"]).update(bonus_bits=100)
        self._mark_edited(log["id"])
        self._restore_trimmed_bonuses()
        self.assertEqual(StudyLog.objects.get(pk=log["id"]).bonus_bits, 200)
        self.assertEqual(StudyLog.objects.get(pk=untouched["id"]).bonus_bits, 100)
        self._restore_trimmed_bonuses()  # nothing left to restore
        self.assertEqual(StudyLog.objects.get(pk=log["id"]).bonus_bits, 200)

    def test_migration_skips_a_gap_it_cannot_pin_on_one_log(self):
        self._buy("overclock")
        first = self._log(60)
        second = self._log(60)
        StudyLog.objects.filter(pk=first["id"]).update(bonus_bits=50)
        self._mark_edited(first["id"])
        self._mark_edited(second["id"])
        self._restore_trimmed_bonuses()
        self.assertEqual(StudyLog.objects.get(pk=first["id"]).bonus_bits, 50)

    def test_migration_ignores_a_gap_with_no_edited_log(self):
        self._buy("overclock")
        kept = self._log(60)
        deleted = self._log(60)
        self.client.delete(f"/api/logs/{deleted['id']}/")
        self._restore_trimmed_bonuses()
        self.assertEqual(StudyLog.objects.get(pk=kept["id"]).bonus_bits, 100)

    def test_me_reports_spending(self):
        self._buy("overclock")
        bits = self.client.get("/api/auth/me/").data["bits"]
        self.assertEqual((bits["spent"], bits["balance"]), (800, 9200))


class RoomTests(APITestCase):
    """MY ROOM: weekly furniture shop, inventory and layout validation."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        StudyLog.objects.create(
            user=self.user, duration_minutes=60 * 1000
        )  # 100,000 BITS

    def _room(self):
        return self.client.get("/api/room/").data

    def _save(self, layout):
        return self.client.put("/api/room/", {"layout": layout}, format="json")

    def test_new_room_is_the_default_with_starters(self):
        room = self._room()
        self.assertEqual(room["layout"], DEFAULT_LAYOUT)
        self.assertEqual(room["inventory"]["starter_desk"], 1)
        self.assertEqual(len(room["weekly"]["items"]), 12)

    def _tokyo(self):
        from zoneinfo import ZoneInfo

        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        self.user.refresh_from_db()
        return ZoneInfo("Asia/Tokyo")

    def test_lineup_is_stable_within_a_period_and_rotates(self):
        for tier, count, _ in SHOP_ROTATION:
            self.assertEqual(
                lineup_for(tier, count, 3000), lineup_for(tier, count, 3000)
            )
            self.assertNotEqual(
                lineup_for(tier, count, 3000), lineup_for(tier, count, 3001)
            )
            self.assertEqual(
                [FURNITURE[i]["tier"] for i in lineup_for(tier, count, 3000)],
                [tier] * count,
            )

    def test_a_design_comes_back_only_after_the_whole_tier_was_shown(self):
        for tier, count, _ in SHOP_ROTATION:
            designs = {art_of(i) for i in FURNITURE if FURNITURE[i]["tier"] == tier}
            per_deck = len(designs) // count
            start = 40 * per_deck  # the first period of a deck
            seen = [
                art_of(i)
                for p in range(start, start + per_deck)
                for i in lineup_for(tier, count, p)
            ]
            self.assertEqual(len(seen), len(set(seen)), tier)
            self.assertEqual(len(seen), per_deck * count)

    def test_small_turns_over_daily_medium_every_two_days_large_weekly(self):
        tokyo = self._tokyo()

        def groups(*day):
            shop = shop_lineup(self.user, datetime(*day, tzinfo=tokyo))
            return {g["tier"]: g for g in shop["groups"]}, shop

        mon, shop = groups(2026, 11, 2, 12, 0)
        self.assertEqual(len(shop["items"]), 12)
        self.assertEqual(
            sorted(FURNITURE[i]["tier"] for i in shop["items"]),
            [1] * 5 + [2] * 4 + [3] * 2 + [4],
        )
        self.assertEqual(len({art_of(i) for i in shop["items"]}), 12)
        late = groups(2026, 11, 2, 23, 59)[0]
        self.assertEqual(
            {t: g["items"] for t, g in mon.items()},
            {t: g["items"] for t, g in late.items()},
        )
        tue = groups(2026, 11, 3, 0, 1)[0]
        wed = groups(2026, 11, 4, 0, 1)[0]
        self.assertNotEqual(mon[1]["items"], tue[1]["items"])  # small: daily
        self.assertNotEqual(tue[1]["items"], wed[1]["items"])
        # Medium: two-day blocks, so exactly one of these two midnights turns it over.
        self.assertEqual(
            (mon[2]["items"] != tue[2]["items"]) + (tue[2]["items"] != wed[2]["items"]),
            1,
        )
        self.assertEqual(mon[3]["items"], wed[3]["items"])  # large and featured: weekly
        self.assertEqual(mon[4]["items"], wed[4]["items"])
        self.assertEqual(mon[1]["resets_at"], datetime(2026, 11, 3, 0, 0, tzinfo=tokyo))
        self.assertEqual(shop["resets_at"], mon[1]["resets_at"])
        self.assertEqual(mon[4]["resets_at"], datetime(2026, 11, 9, 0, 0, tzinfo=tokyo))
        nxt = groups(2026, 11, 9, 0, 1)[0]
        self.assertNotEqual(mon[4]["items"], nxt[4]["items"])

    def _reserve(self, item_id):
        return self.client.post(
            "/api/room/reserve/", {"item_id": item_id}, format="json"
        )

    def _buy_piece(self, item_id):
        return self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json")

    def test_a_reserved_piece_stays_buyable_after_it_rotates_out(self):
        tokyo = self._tokyo()
        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime(2026, 11, 2, 12, 0, tzinfo=tokyo),
        ):
            piece = next(g for g in self._room()["weekly"]["groups"] if g["tier"] == 1)[
                "items"
            ][0]
            res = self._reserve(piece)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.data["weekly"]["reserve"], piece)
        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime(2026, 11, 5, 12, 0, tzinfo=tokyo),
        ):
            room = self._room()
            self.assertNotIn(piece, room["weekly"]["items"])
            self.assertEqual(room["weekly"]["reserve"], piece)
            self.assertEqual(self._buy_piece(piece).status_code, 201)
            self.assertIsNone(
                self._room()["weekly"]["reserve"]
            )  # bought: the hold is free again
            self.assertEqual(UserProfile.objects.get(user=self.user).shop_reserve, "")

    def test_only_one_piece_on_hold_and_only_from_the_lineup(self):
        items = self._room()["weekly"]["items"]
        self.assertEqual(self._reserve(items[0]).status_code, 200)
        self.assertEqual(
            self._reserve(items[1]).data["weekly"]["reserve"], items[1]
        )  # replaces it
        off = next(
            i for i, spec in FURNITURE.items() if spec["tier"] and i not in items
        )
        for bad in (off, "starter_desk", "no_such_piece", 7, ["x"]):
            self.assertEqual(self._reserve(bad).status_code, 400, bad)
        self.assertEqual(
            self.client.post(
                "/api/room/reserve/", [items[0]], format="json"
            ).status_code,
            400,
        )
        self.assertEqual(self._reserve(None).data["weekly"]["reserve"], None)
        self._buy_piece(items[2])
        self.assertEqual(self._reserve(items[2]).status_code, 400)  # owned already

    def test_an_unreserved_piece_cannot_be_bought_after_it_rotates_out(self):
        tokyo = self._tokyo()
        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime(2026, 11, 2, 12, 0, tzinfo=tokyo),
        ):
            piece = next(g for g in self._room()["weekly"]["groups"] if g["tier"] == 1)[
                "items"
            ][0]
        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime(2026, 11, 5, 12, 0, tzinfo=tokyo),
        ):
            self.assertEqual(self._buy_piece(piece).status_code, 400)

    def test_bits_reset_clears_the_reserve(self):
        piece = self._room()["weekly"]["items"][0]
        self._reserve(piece)
        self.client.post("/api/bits/reset/", {}, format="json")
        self.assertIsNone(self._room()["weekly"]["reserve"])

    def test_each_piece_can_be_bought_only_once(self):
        piece = self._room()["weekly"]["items"][0]
        self.assertEqual(
            self.client.post(
                "/api/bits/buy/", {"item_id": piece}, format="json"
            ).status_code,
            201,
        )
        res = self.client.post("/api/bits/buy/", {"item_id": piece}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self._room()["inventory"][piece], 1)

    def test_monday_and_sunday_weeks_share_a_lineup(self):
        from zoneinfo import ZoneInfo

        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        wednesday = datetime(2026, 10, 28, 12, 0, tzinfo=ZoneInfo("Asia/Tokyo"))
        mon_index, _ = shop_week(self.user, wednesday)
        UserProfile.objects.filter(user=self.user).update(week_start="sun")
        self.user.refresh_from_db()
        sun_index, _ = shop_week(self.user, wednesday)
        self.assertEqual(mon_index, sun_index)

    def test_buying_a_weekly_piece_adds_it_to_the_inventory(self):
        piece = self._room()["weekly"]["items"][-1]
        res = self.client.post("/api/bits/buy/", {"item_id": piece}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["bits"]["spent"], FURNITURE[piece]["price"])
        self.assertEqual(self._room()["inventory"][piece], 1)
        # Furniture never takes the buff slot.
        self.assertEqual(
            self.client.post(
                "/api/bits/buy/", {"item_id": "overclock"}, format="json"
            ).status_code,
            201,
        )

    def test_cannot_buy_pieces_outside_the_lineup_or_starters(self):
        weekly = self._room()["weekly"]["items"]
        off_week = next(
            i for i, spec in FURNITURE.items() if spec["tier"] and i not in weekly
        )
        self.assertEqual(
            self.client.post(
                "/api/bits/buy/", {"item_id": off_week}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/bits/buy/", {"item_id": "starter_desk"}, format="json"
            ).status_code,
            400,
        )

    def test_saves_a_valid_layout(self):
        layout = {
            "wall": "wall_plain",
            "floor": "floor_wood",
            "items": [
                {"id": "starter_desk", "x": 0, "y": 9},
                {"id": "starter_chair", "x": 3, "y": 10},
            ],
        }
        res = self._save(layout)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self._room()["layout"], layout)

    def test_rejects_bad_layouts(self):
        base = {"wall": "wall_plain", "floor": "floor_wood"}
        bad = [
            {**base, "items": [{"id": "plant_pot", "x": 0, "y": 10}]},  # not owned
            {
                **base,
                "items": [{"id": "starter_desk", "x": 14, "y": 9}],
            },  # off the right edge
            {
                **base,
                "items": [{"id": "starter_desk", "x": 0, "y": 2}],
            },  # floating on the wall
            {
                **base,
                "items": [
                    {"id": "starter_desk", "x": 0, "y": 9},
                    {"id": "starter_chair", "x": 2, "y": 8},
                ],
            },  # overlap, not tucked (other row)
            {
                **base,
                "items": [
                    {"id": "starter_desk", "x": 0, "y": 9},
                    {"id": "starter_desk", "x": 5, "y": 9},
                ],
            },  # one copy only
            {"wall": "wall_brick", "floor": "floor_wood", "items": []},  # unowned paint
            {**base, "items": [{"id": "starter_desk", "x": "0", "y": 9}]},  # bad type
        ]
        for layout in bad:
            self.assertEqual(self._save(layout).status_code, 400, layout)

    def test_malformed_payloads_are_rejected_not_crashing(self):
        base = {"wall": "wall_plain", "floor": "floor_wood"}
        for body in (
            [1],
            {"layout": {**base, "wall": ["x"], "items": []}},
            {"layout": {**base, "floor": {"a": 1}, "items": []}},
            {"layout": {**base, "items": [{"id": ["x"], "x": 1, "y": 9}]}},
        ):
            self.assertEqual(
                self.client.put("/api/room/", body, format="json").status_code,
                400,
                body,
            )
        for body in ([1, 2], "overclock"):
            self.assertEqual(
                self.client.post("/api/bits/buy/", body, format="json").status_code,
                400,
                body,
            )

    def test_new_endpoints_need_a_login(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/room/").status_code, 401)
        self.assertEqual(self.client.get("/api/bits/").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/bits/buy/", {"item_id": "overclock"}, format="json"
            ).status_code,
            401,
        )

    def test_clients_cannot_set_a_logs_bonus(self):
        res = self.client.post(
            "/api/logs/",
            {
                "category": None,
                "date": "2026-10-30",
                "duration_minutes": 10,
                "topic": "",
                "bonus_bits": 99999,
                "bonus_item": "x",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(StudyLog.objects.get(pk=res.data["id"]).bonus_bits, 0)

    def test_wall_pieces_must_hang_on_the_wall(self):
        BitPurchase.objects.create(user=self.user, item_id="wall_clock", price=450)
        base = {"wall": "wall_plain", "floor": "floor_wood"}
        self.assertEqual(
            self._save(
                {**base, "items": [{"id": "wall_clock", "x": 4, "y": 1}]}
            ).status_code,
            200,
        )
        self.assertEqual(
            self._save(
                {**base, "items": [{"id": "wall_clock", "x": 4, "y": 8}]}
            ).status_code,
            400,
        )

    def test_copies_from_before_the_one_each_rule_can_both_be_placed(self):
        for _ in range(2):
            BitPurchase.objects.create(user=self.user, item_id="plant_pot", price=300)
        layout = {
            "wall": "wall_plain",
            "floor": "floor_wood",
            "items": [
                {"id": "plant_pot", "x": 0, "y": 11},
                {"id": "plant_pot", "x": 15, "y": 11},
            ],
        }
        self.assertEqual(self._save(layout).status_code, 200)

    @skipUnless(FRONTEND_ROOM_ART_TS.exists(), "frontend source not present")
    def test_every_piece_has_pixel_art(self):
        art_ids = []
        for path in sorted(FRONTEND_ROOM_ART_TS.parent.glob("roomArt*.ts")):
            art_ids += re.findall(
                r"^  ([a-z0-9_]+): ", path.read_text(encoding="utf-8"), re.M
            )
        self.assertEqual(len(art_ids), len(set(art_ids)), "an art id is defined twice")
        self.assertEqual(
            {spec.get("base", item_id) for item_id, spec in FURNITURE.items()},
            set(art_ids),
        )

    def test_catalog_is_sent_only_when_the_client_lacks_it(self):
        full = self.client.get("/api/room/").data
        self.assertIn("catalog", full)
        version = full["catalog_version"]
        cached = self.client.get(f"/api/room/?catalog={version}").data
        self.assertNotIn("catalog", cached)
        self.assertEqual(cached["layout"], full["layout"])
        self.assertIn("catalog", self.client.get("/api/room/?catalog=stale").data)
        saved = self.client.put(
            f"/api/room/?catalog={version}", {"layout": full["layout"]}, format="json"
        )
        self.assertEqual(saved.status_code, 200)
        self.assertNotIn("catalog", saved.data)
        # Older clients send no version and still get the catalog back.
        legacy = self.client.put(
            "/api/room/", {"layout": full["layout"]}, format="json"
        )
        self.assertIn("catalog", legacy.data)

    def test_catalog_is_well_formed(self):
        self.assertGreaterEqual(len(FURNITURE), 1000)
        with open(
            Path(__file__).with_name("furniture_catalog.json"), encoding="utf-8"
        ) as fh:
            ids = [row["id"] for row in json.load(fh)]
        self.assertEqual(len(ids), len(set(ids)), "duplicate catalog id")
        for item_id, spec in FURNITURE.items():
            self.assertIn(
                spec["layer"], ("wall", "floor", "wall_paint", "floor_paint"), item_id
            )
            self.assertEqual(spec["price"] == 0, spec["tier"] == 0, item_id)
            if "base" in spec:
                base = FURNITURE[spec["base"]]
                self.assertEqual(
                    (spec["w"], spec["h"], spec["layer"]),
                    (base["w"], base["h"], base["layer"]),
                    item_id,
                )
                for old, new in spec["recolor"].items():
                    self.assertRegex(old, r"^#[0-9a-f]{6}$")
                    self.assertRegex(new, r"^#[0-9a-f]{6}$")


class ProfileEmailTests(APITestCase):
    """Saving the profile must not trip over the account's own, unchanged email."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="Operator@Example.com",
            password="s3cure-pass-123",
        )
        # auth.User.email is not unique, so a legacy duplicate can exist.
        User.objects.create_user(
            username="legacy", email="operator@example.com", password="s3cure-pass-123"
        )
        self.client.force_authenticate(user=self.user)

    def test_resubmitting_own_email_succeeds_despite_duplicate(self):
        res = self.client.patch(
            "/api/auth/me/",
            {"email": "operator@example.com", "username": "operator2"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["username"], "operator2")

    def test_changing_to_taken_email_is_rejected(self):
        User.objects.create_user(
            username="other", email="other@example.com", password="s3cure-pass-123"
        )
        res = self.client.patch(
            "/api/auth/me/", {"email": "OTHER@example.com"}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data)


class ChronoThemeSyncTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_patch_chrono_theme_persists_and_validates(self):
        self.assertEqual(self.client.get("/api/auth/me/").data["chrono_theme"], "")
        res = self.client.patch(
            "/api/auth/me/", {"chrono_theme": "Nixie-Tube"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["chrono_theme"], "nixie-tube")
        res = self.client.patch("/api/auth/me/", {"chrono_theme": "<b>"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(
            UserProfile.objects.get(user=self.user).chrono_theme, "nixie-tube"
        )


class UiPrefsSyncTests(APITestCase):
    """Weather widget + motion FX preferences follow the account like the Surface Theme."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_mean_never_synced(self):
        data = self.client.get("/api/auth/me/").data
        self.assertEqual(data["weather_theme"], "")
        self.assertEqual(data["weather_unit"], "")
        self.assertIsNone(data["weather_hidden"])
        self.assertIsNone(data["surface_fx"])

    def test_patch_persists_and_other_fields_untouched(self):
        self.client.patch(
            "/api/auth/me/", {"surface_theme": "code-rain"}, format="json"
        )
        res = self.client.patch(
            "/api/auth/me/",
            {
                "weather_theme": " Pixel ",
                "weather_unit": "F",
                "weather_hidden": True,
                "surface_fx": False,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            (
                res.data["weather_theme"],
                res.data["weather_unit"],
                res.data["weather_hidden"],
                res.data["surface_fx"],
            ),
            ("pixel", "f", True, False),
        )
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.surface_theme, "code-rain")
        # A second "device" sees the same values.
        self.assertEqual(
            self.client.get("/api/auth/me/").data["weather_theme"], "pixel"
        )

    def test_false_and_blank_values_are_saved(self):
        self.client.patch(
            "/api/auth/me/",
            {"weather_hidden": True, "weather_unit": "f"},
            format="json",
        )
        res = self.client.patch(
            "/api/auth/me/",
            {"weather_hidden": False, "weather_unit": ""},
            format="json",
        )
        self.assertEqual(
            (res.data["weather_hidden"], res.data["weather_unit"]), (False, "")
        )

    def test_validation(self):
        for payload in (
            {"weather_theme": "<b>"},
            {"weather_unit": "k"},
            {"weather_theme": "x" * 33},
        ):
            res = self.client.patch("/api/auth/me/", payload, format="json")
            self.assertEqual(res.status_code, 400, payload)

    def test_precise_location_is_not_accepted(self):
        res = self.client.patch(
            "/api/auth/me/",
            {"weather_precise": {"lat": 35.6, "lon": 139.7}},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("weather_precise", res.data)


class FontAndAmbientPrefsSyncTests(APITestCase):
    """UI font, Ambient overlay and cursor prefs ride the same account sync as the weather widget."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_mean_never_synced(self):
        data = self.client.get("/api/auth/me/").data
        self.assertEqual(
            (data["ui_font"], data["ambient_theme"], data["cursor_theme"]), ("", "", "")
        )
        self.assertIsNone(data["ambient_clock"])

    def test_patch_persists_normalized(self):
        res = self.client.patch(
            "/api/auth/me/",
            {
                "ui_font": " JetBrains-Mono ",
                "ambient_theme": "Rain",
                "ambient_clock": False,
                "cursor_theme": " Knight ",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            (
                res.data["ui_font"],
                res.data["ambient_theme"],
                res.data["ambient_clock"],
                res.data["cursor_theme"],
            ),
            ("jetbrains-mono", "rain", False, "knight"),
        )
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(
            (profile.ui_font, profile.ambient_theme, profile.cursor_theme),
            ("jetbrains-mono", "rain", "knight"),
        )

    def test_validation(self):
        for payload in (
            {"ui_font": "<b>"},
            {"ambient_theme": "x" * 33},
            {"ui_font": "a b"},
            {"cursor_theme": "<rook>"},
            {"cursor_theme": "x" * 33},
        ):
            res = self.client.patch("/api/auth/me/", payload, format="json")
            self.assertEqual(res.status_code, 400, payload)


@override_settings(PORTFOLIO_USERNAME="operator", PORTFOLIO_FEED_DAYS=30)
class PortfolioFeedTests(APITestCase):
    """
    GET /api/portfolio/feed/ is a public, read-only feed for rikutomikado.tech
    limited to PORTFOLIO_USERNAME's last 30 days, excluding logs opted out via
    is_public_to_portfolio.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.category = Category.objects.create(
            user=self.user, name="Backend", code="BACK", color="#10b981"
        )
        self.public_log = StudyLog.objects.create(
            user=self.user,
            category=self.category,
            duration_minutes=90,
            topic="DRF feed",
        )
        self.private_log = StudyLog.objects.create(
            user=self.user,
            category=self.category,
            duration_minutes=30,
            topic="secret",
            is_public_to_portfolio=False,
        )

    def test_new_logs_are_public_to_portfolio_by_default(self):
        self.assertTrue(self.public_log.is_public_to_portfolio)

    def test_feed_is_anonymous_and_returns_only_flagged_logs(self):
        res = self.client.get("/api/portfolio/feed/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual([log["id"] for log in res.data], [self.public_log.id])
        self.assertEqual(
            res.data[0]["category"],
            {"code": "BACK", "name": "Backend", "color": "#10b981"},
        )
        self.assertNotIn("user", res.data[0])

    def test_feed_ignores_invalid_bearer_token(self):
        res = self.client.get(
            "/api/portfolio/feed/", HTTP_AUTHORIZATION="Bearer not-a-token"
        )
        self.assertEqual(res.status_code, 200)

    def test_feed_is_read_only(self):
        res = self.client.post("/api/portfolio/feed/", {}, format="json")
        self.assertEqual(res.status_code, 405)

    def test_feed_allows_portfolio_origin(self):
        res = self.client.get(
            "/api/portfolio/feed/", HTTP_ORIGIN="https://rikutomikado.tech"
        )
        self.assertEqual(
            res["Access-Control-Allow-Origin"], "https://rikutomikado.tech"
        )

    def test_hub_flag_does_not_leak_into_portfolio_feed(self):
        self.assertTrue(self.private_log.is_public_to_hub)
        res = self.client.get("/api/portfolio/feed/")
        self.assertNotIn(self.private_log.id, [log["id"] for log in res.data])

    def test_feed_excludes_other_users_logs(self):
        other = User.objects.create_user(
            username="someone", email="someone@example.com", password="s3cure-pass-123"
        )
        other_cat = Category.objects.create(
            user=other, name="Other", code="OTHR", color="#000000"
        )
        other_log = StudyLog.objects.create(
            user=other, category=other_cat, duration_minutes=60, topic="not mine"
        )
        res = self.client.get("/api/portfolio/feed/")
        self.assertNotIn(other_log.id, [log["id"] for log in res.data])

    def test_feed_covers_only_last_30_days(self):
        today = timezone.localdate()
        edge_log = StudyLog.objects.create(
            user=self.user,
            category=self.category,
            duration_minutes=45,
            topic="29 days ago",
            date=today - timedelta(days=29),
        )
        old_log = StudyLog.objects.create(
            user=self.user,
            category=self.category,
            duration_minutes=45,
            topic="30 days ago",
            date=today - timedelta(days=30),
        )
        ids = [log["id"] for log in self.client.get("/api/portfolio/feed/").data]
        self.assertIn(edge_log.id, ids)
        self.assertNotIn(old_log.id, ids)

    @override_settings(PORTFOLIO_USERNAME="missing-user")
    def test_feed_is_empty_when_portfolio_user_missing(self):
        res = self.client.get("/api/portfolio/feed/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])


class RegistrationGateTests(APITestCase):
    """POST /api/auth/register/ is closed unless ALLOW_REGISTRATION is on."""

    payload = {
        "username": "newcomer",
        "email": "newcomer@example.com",
        "password": "s3cure-pass-123",
    }

    @override_settings(ALLOW_REGISTRATION=False)
    def test_register_is_rejected_when_closed(self):
        res = self.client.post("/api/auth/register/", self.payload, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertFalse(User.objects.filter(username="newcomer").exists())

    @override_settings(ALLOW_REGISTRATION=True)
    def test_register_works_when_open(self):
        res = self.client.post("/api/auth/register/", self.payload, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(User.objects.filter(username="newcomer").exists())

    @override_settings(ALLOW_REGISTRATION=False)
    def test_existing_user_can_still_log_in_when_closed(self):
        User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        res = self.client.post(
            "/api/auth/login/",
            {"username": "operator", "password": "s3cure-pass-123"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)


@override_settings(PORTFOLIO_USERNAME="owner")
class HubTelemetryAccessTests(APITestCase):
    """The public hub only ever reports the portfolio account to anonymous callers."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner", password="s3cure-pass-123"
        )
        self.other = User.objects.create_user(
            username="other", password="s3cure-pass-123"
        )
        Category.objects.create(user=self.other, name="Private Plan", code="PRIV")
        StudyLog.objects.create(
            user=self.other, date=date(2026, 10, 1), duration_minutes=120
        )

    def test_anonymous_gets_portfolio_account(self):
        res = self.client.get("/api/hub/telemetry/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"], "owner")

    def test_username_parameter_cannot_read_another_account(self):
        res = self.client.get("/api/hub/telemetry/", {"username": "other"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"], "owner")
        self.assertEqual(res.data["categories"], [])
        self.assertEqual(res.data["summary"]["total_hours"], 0)

    def test_unknown_username_looks_the_same_as_a_real_one(self):
        real = self.client.get("/api/hub/telemetry/", {"username": "other"})
        fake = self.client.get("/api/hub/telemetry/", {"username": "nobody-here"})
        self.assertEqual(set(real.data), set(fake.data))
        self.assertEqual(real.data["user"], fake.data["user"])

    def test_signed_in_user_gets_own_account(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.get("/api/hub/telemetry/", {"username": "owner"})
        self.assertEqual(res.data["user"], "other")
        self.assertEqual(res.data["summary"]["total_hours"], 2.0)

    @override_settings(PORTFOLIO_USERNAME="missing-user")
    def test_missing_portfolio_account_returns_empty_payload(self):
        res = self.client.get("/api/hub/telemetry/", {"username": "other"})
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("user", res.data)
        self.assertEqual(res.data["categories"], [])


class CorsCredentialsTests(APITestCase):
    """Cross-origin requests are allowed where needed, but never with cookies."""

    def test_portfolio_origin_still_allowed(self):
        res = self.client.get(
            "/api/portfolio/feed/", HTTP_ORIGIN="https://rikutomikado.tech"
        )
        self.assertEqual(
            res["Access-Control-Allow-Origin"], "https://rikutomikado.tech"
        )
        self.assertNotIn("Access-Control-Allow-Credentials", res)

    def test_frontend_origin_preflight_allows_bearer_header(self):
        res = self.client.options(
            "/api/auth/me/",
            HTTP_ORIGIN="https://typbox.me",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="PATCH",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization, content-type",
        )
        self.assertEqual(res["Access-Control-Allow-Origin"], "https://typbox.me")
        self.assertIn("authorization", res["Access-Control-Allow-Headers"].lower())

    def test_shared_paas_origin_gets_no_credentials(self):
        res = self.client.get(
            "/api/portfolio/feed/", HTTP_ORIGIN="https://someone-else.onrender.com"
        )
        self.assertNotIn("Access-Control-Allow-Credentials", res)


class PasswordResetConfirmThrottleTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()

    def test_confirm_is_rate_limited(self):
        payload = {"uid": "bad", "token": "bad", "new_password": "s3cure-pass-123"}
        codes = [
            self.client.post(
                "/api/auth/password-reset/confirm/", payload, format="json"
            ).status_code
            for _ in range(11)
        ]
        self.assertTrue(all(code == 400 for code in codes[:10]), codes)
        self.assertEqual(codes[10], 429)


class NewBuffTests(APITestCase):
    """STORM RUNNER, LUNAR TIDE and IRON CONTRACT, plus reset edge cases."""

    def setUp(self):
        from zoneinfo import ZoneInfo

        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        StudyLog.objects.create(user=self.user, duration_minutes=6000)  # 10,000 BITS
        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        self.tokyo = ZoneInfo("Asia/Tokyo")

    def _at(self, *args):
        return mock.patch(
            "django.utils.timezone.now", return_value=datetime(*args, tzinfo=self.tokyo)
        )

    def _buy(self, item_id):
        return self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json")

    def _log(self, minutes, **extra):
        res = self.client.post(
            "/api/logs/",
            {
                "category": None,
                "date": "2026-11-02",
                "duration_minutes": minutes,
                "topic": "",
                **extra,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        return res.data

    def _balance(self):
        return self.client.get("/api/bits/").data["bits"]["balance"]

    # ---- STORM RUNNER
    def _reading(self, when, code=61, temp=12.0):
        return {"code": code, "temp_c": temp, "at": int(when.timestamp() * 1000)}

    def test_storm_runner_pays_only_in_rough_weather(self):
        now = datetime(2026, 11, 2, 15, 0, tzinfo=self.tokyo)
        with self._at(2026, 11, 2, 15, 0):
            self.assertEqual(self._buy("storm_runner").status_code, 201)
            self.assertEqual(self._log(60)["bonus_bits"], 0)  # no reading
            self.assertEqual(
                self._log(60, weather=self._reading(now, code=0))["bonus_bits"], 0
            )  # clear sky
            self.assertEqual(
                self._log(60, weather=self._reading(now, code=61))["bonus_bits"], 100
            )  # rain
            self.assertEqual(
                self._log(60, weather=self._reading(now, code=1, temp=-3))[
                    "bonus_bits"
                ],
                100,
            )  # frost
            stale = now - timedelta(hours=5)
            self.assertEqual(
                self._log(60, weather=self._reading(stale))["bonus_bits"], 0
            )
            for junk in (
                "rain",
                {"code": "61"},
                {"code": True, "temp_c": 1, "at": 1},
                [61],
            ):
                self.assertEqual(self._log(60, weather=junk)["bonus_bits"], 0)

    # ---- LUNAR TIDE
    def test_lunar_tide_follows_the_moon(self):
        from .economy import BUFFS, moon_light

        full = datetime(2026, 10, 26, 13, 0, tzinfo=self.tokyo)  # near full moon
        new = datetime(2026, 11, 9, 13, 0, tzinfo=self.tokyo)  # near new moon
        self.assertGreater(moon_light(full), 0.95)
        self.assertLess(moon_light(new), 0.05)
        with self._at(2026, 10, 26, 13, 0):
            self._buy("lunar_tide")
            offer = next(
                b
                for b in self.client.get("/api/bits/").data["buffs"]
                if b["item_id"] == "lunar_tide"
            )
            self.assertGreaterEqual(offer["rate_now"], 95)
            self.assertEqual(self._log(60)["bonus_bits"], round(100 * moon_light(full)))
        self.assertEqual(BUFFS["lunar_tide"]["per_hour"], 100)
        with self._at(2026, 10, 29, 13, 0):
            bonus = self._log(60)["bonus_bits"]
            self.assertLess(bonus, round(100 * moon_light(full)))

    # ---- IRON CONTRACT
    def test_iron_contract_pays_double_after_three_full_days(self):
        with self._at(2026, 11, 1, 20, 0):
            self.assertEqual(self._buy("iron_contract").status_code, 201)
            self.assertEqual(
                self._log(300)["bonus_bits"], 0
            )  # signing day doesn't count
            buff = self.client.get("/api/bits/").data["active_buff"]
            self.assertEqual(
                [d["state"] for d in buff["contract"]["days"]], ["pending"] * 3
            )
            self.assertEqual(buff["refund"], 0)
        for day in (2, 3):
            with self._at(2026, 11, day, 10, 0):
                self.assertEqual(self._log(180)["bonus_bits"], 0)
            with self._at(2026, 11, day, 21, 0):
                self.assertEqual(self._log(120)["bonus_bits"], 0)
        with self._at(2026, 11, 4, 9, 0):
            self.assertEqual(self._log(200)["bonus_bits"], 0)
            buff = self.client.get("/api/bits/").data["active_buff"]
            self.assertEqual(
                [d["state"] for d in buff["contract"]["days"]], ["done", "done", "live"]
            )
            sealed = self._log(100)
            self.assertEqual(sealed["bonus_bits"], 3000)
            self.assertEqual(sealed["bonus_item"], "iron_contract")
            self.assertIsNone(self.client.get("/api/bits/").data["active_buff"])
            # 10,000 - 1,500 stake + 3,000 payout + base for 5h + 15h
            self.assertEqual(self._balance(), 10000 - 1500 + 3000 + 2000)
            self.assertEqual(self._buy("warm_up").status_code, 201)

    def test_iron_contract_missed_day_keeps_the_stake(self):
        with self._at(2026, 11, 1, 20, 0):
            self._buy("iron_contract")
        with self._at(2026, 11, 2, 12, 0):
            self._log(200)  # short of 5h
        with self._at(2026, 11, 3, 8, 0):
            self.assertIsNone(self.client.get("/api/bits/").data["active_buff"])
            self.assertEqual(self._log(400)["bonus_bits"], 0)
            self.assertEqual(self._balance(), 10000 - 1500 + 1000)
            # The slot is free again.
            self.assertEqual(self._buy("warm_up").status_code, 201)

    def test_iron_contract_cancel_refunds_nothing(self):
        with self._at(2026, 11, 1, 20, 0):
            self._buy("iron_contract")
            res = self.client.post("/api/bits/cancel/", {}, format="json")
            self.assertEqual(res.data["refunded"], 0)
            self.assertEqual(res.data["bits"]["balance"], 8500)

    def test_crate_never_rolls_the_new_buffs(self):
        from .economy import BUFFS

        for item in ("iron_contract", "storm_runner", "lunar_tide"):
            self.assertNotIn(item, BUFFS["mystery_crate"]["crate"])

    # ---- reset edge cases
    def test_buff_removed_under_a_commit_does_not_fail_the_log(self):
        from . import economy

        self._buy("overclock")
        stale = economy.active_buff(self.user)
        BitPurchase.objects.filter(
            user=self.user
        ).delete()  # a BITS reset lands in between
        with mock.patch("tracker.economy.active_buff", return_value=stale):
            log = self._log(60)
        self.assertEqual(log["bonus_bits"], 0)
        self.assertEqual(StudyLog.objects.filter(user=self.user).count(), 2)

    def test_reset_clears_bonuses_and_import_never_restores_them(self):
        self._buy("hyperdrive")
        self._log(120)
        self.assertGreater(
            StudyLog.objects.filter(user=self.user, bonus_bits__gt=0).count(), 0
        )
        res = self.client.post("/api/bits/reset/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["bits"]["balance"], 10000 + 200)
        self.assertFalse(
            StudyLog.objects.filter(user=self.user, bonus_bits__gt=0).exists()
        )
        # A backup that carries bonuses (CSV / JSON exports do) adds hours only.
        backup = {
            "categories": [],
            "logs": [
                {
                    "date": "2026-01-01",
                    "durationMinutes": 60,
                    "createdAt": "2026-01-01T00:00:00Z",
                    "bonusBits": 99999,
                    "bonusItem": "hyperdrive",
                }
            ],
        }
        self.assertEqual(
            self.client.post(
                "/api/logs/import-backup/", backup, format="json"
            ).status_code,
            201,
        )
        self.assertEqual(self._balance(), 10000 + 200 + 100)
        self.assertFalse(
            StudyLog.objects.filter(user=self.user, bonus_bits__gt=0).exists()
        )

    def test_edit_after_reset_keeps_bonus_at_zero(self):
        self._buy("hyperdrive")
        log = self._log(120)
        self.client.post("/api/bits/reset/", {}, format="json")
        res = self.client.patch(
            f"/api/logs/{log['id']}/", {"duration_minutes": 30}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["bonus_bits"], 0)
        self.client.delete(f"/api/logs/{log['id']}/")
        self.assertEqual(self._balance(), 10000)


class RoomSlotTests(APITestCase):
    """MY ROOM's five rooms: SAVE checkpoints, switching and renaming."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        StudyLog.objects.create(user=self.user, duration_minutes=60 * 1000)

    def _rooms(self, body):
        return self.client.post("/api/room/rooms/", body, format="json")

    def _room(self):
        return self.client.get("/api/room/").data

    def _with(self, *items):
        return {
            **DEFAULT_LAYOUT,
            "items": [{"id": i, "x": x, "y": y} for i, x, y in items],
        }

    def test_five_rooms_by_default(self):
        room = self._room()
        self.assertEqual(room["active_room"], 0)
        self.assertEqual(
            [r["name"] for r in room["rooms"]], [f"ROOM {i}" for i in range(1, 6)]
        )
        self.assertTrue(all(r["saved"] is None for r in room["rooms"]))
        self.assertEqual(room["rooms"][3]["layout"], DEFAULT_LAYOUT)

    def test_save_survives_a_clear(self):
        res = self._rooms({"action": "save"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["rooms"][0]["saved"], DEFAULT_LAYOUT)
        self.assertIsNotNone(res.data["rooms"][0]["saved_at"])
        self.client.put("/api/room/", {"layout": self._with()}, format="json")  # CLEAR
        room = self._room()
        self.assertEqual(room["layout"]["items"], [])
        self.assertEqual(room["rooms"][0]["saved"], DEFAULT_LAYOUT)

    def test_switching_keeps_each_room_and_shares_the_inventory(self):
        empty = self._with()
        res = self._rooms({"action": "switch", "slot": 2, "layout": empty})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["active_room"], 2)
        # The same starter desk stands in room 3 while room 1 is parked empty.
        self.assertEqual(res.data["layout"], DEFAULT_LAYOUT)
        self.assertEqual(res.data["rooms"][0]["layout"], empty)
        desk_moved = self._with(("starter_desk", 1, 7))
        self.assertEqual(
            self.client.put(
                "/api/room/", {"layout": desk_moved}, format="json"
            ).status_code,
            200,
        )
        back = self._rooms({"action": "switch", "slot": 0})
        self.assertEqual(back.data["layout"], empty)
        self.assertEqual(back.data["rooms"][2]["layout"], desk_moved)

    def test_rename_and_validation(self):
        res = self._rooms(
            {
                "action": "rename",
                "slot": 1,
                "name": "  Focus den with a long long name  ",
            }
        )
        self.assertEqual(res.data["rooms"][1]["name"], "Focus den with a lon")
        self.assertEqual(
            self._rooms({"action": "rename", "slot": 1, "name": ""}).data["rooms"][1][
                "name"
            ],
            "ROOM 2",
        )
        for bad in (
            {"action": "switch", "slot": 5},
            {"action": "switch", "slot": True},
            {"action": "rename", "slot": 0, "name": 3},
            {"action": "fly"},
            {"action": "save", "layout": {"wall": "nope"}},
        ):
            self.assertEqual(self._rooms(bad).status_code, 400, bad)

    def test_parked_rooms_drop_pieces_no_longer_owned(self):
        piece = self._room()["weekly"]["items"]
        floor_piece = next(
            i
            for i in piece
            if FURNITURE[i]["layer"] == "floor" and FURNITURE[i]["h"] <= 3
        )
        self.client.post("/api/bits/buy/", {"item_id": floor_piece}, format="json")
        spec = FURNITURE[floor_piece]
        layout = self._with((floor_piece, 0, 11 - spec["h"] + 1))
        self.assertEqual(
            self.client.put(
                "/api/room/", {"layout": layout}, format="json"
            ).status_code,
            200,
        )
        self._rooms({"action": "save"})
        self._rooms({"action": "switch", "slot": 1})
        BitPurchase.objects.filter(user=self.user, item_id=floor_piece).delete()
        room = self._room()
        self.assertEqual(room["rooms"][0]["layout"]["items"], [])
        self.assertEqual(room["rooms"][0]["saved"]["items"], [])
        # Switching back brings in the cleaned room, which validates again.
        res = self._rooms({"action": "switch", "slot": 0})
        self.assertEqual(res.data["layout"]["items"], [])

    def test_resets_clear_every_room(self):
        self._rooms({"action": "rename", "slot": 0, "name": "Den"})
        self._rooms({"action": "save"})
        self._rooms({"action": "switch", "slot": 3})
        self.client.post("/api/bits/reset/", {}, format="json")
        room = self._room()
        self.assertEqual(room["active_room"], 0)
        self.assertEqual(room["rooms"][0]["name"], "ROOM 1")
        self.assertIsNone(room["rooms"][0]["saved"])
        self._rooms({"action": "save"})
        self.client.delete("/api/logs/clear-all/")
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual((profile.room_slots, profile.room_active_slot), ([], 0))

    def test_needs_login(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self._rooms({"action": "save"}).status_code, 401)


class BuffReworkTests(APITestCase):
    """The November rework: each buff has its own risk; old purchases keep old rules."""

    def setUp(self):
        from zoneinfo import ZoneInfo

        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        StudyLog.objects.create(
            user=self.user, duration_minutes=60 * 100
        )  # 10,000 BITS
        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        self.tokyo = ZoneInfo("Asia/Tokyo")

    def _at(self, *args):
        return mock.patch(
            "django.utils.timezone.now", return_value=datetime(*args, tzinfo=self.tokyo)
        )

    def _buy(self, item_id):
        return self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json")

    def _log(self, minutes):
        res = self.client.post(
            "/api/logs/",
            {
                "category": None,
                "date": "2026-11-02",
                "duration_minutes": minutes,
                "topic": "",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        return res.data["bonus_bits"]

    def _active(self):
        return self.client.get("/api/bits/").data["active_buff"]

    def test_running_legacy_purchase_keeps_its_old_rules(self):
        from .economy import LEGACY_BUFFS

        with self._at(2026, 11, 2, 12, 0):
            self._buy("overclock")
            BitPurchase.objects.filter(user=self.user).update(
                rules=1, remaining_minutes=LEGACY_BUFFS["overclock"]["minutes"]
            )
            self.assertEqual(self._log(60), 50)  # the old ×1.5
            self.assertEqual(self._active()["total_minutes"], 1200)

    def test_new_purchases_use_the_new_rules(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("overclock")
        self.assertEqual(BitPurchase.objects.get(user=self.user).rules, 2)

    def test_overclock_lasts_one_day(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("overclock")
            self.assertEqual(self._log(60), 100)
        with self._at(2026, 11, 3, 13, 1):
            self.assertIsNone(self._active())
            self.assertEqual(self._log(60), 0)

    def test_early_bird_caps_each_morning_and_ends_on_a_missed_one(self):
        with self._at(2026, 11, 2, 20, 0):
            self._buy("early_bird")  # first morning: tomorrow
            self.assertIn("NEXT FROM 05:00", self._active()["status"])
        with self._at(2026, 11, 3, 6, 0):
            self.assertEqual(self._log(90), 300)
            self.assertEqual(
                self._log(90), 100
            )  # only 30 of the morning's 120 minutes left
            self.assertEqual(self._log(60), 0)
        with self._at(2026, 11, 4, 11, 59):  # a late commit could still save it
            self.assertIsNotNone(self._active())
        with self._at(2026, 11, 4, 12, 0):  # the 4th's morning passed with no log
            self.assertIsNone(self._active())
            self.assertEqual(self._buy("warm_up").status_code, 201)

    def test_early_bird_runs_three_mornings(self):
        with self._at(2026, 11, 2, 6, 0):
            self._buy("early_bird")  # bought in the morning: today counts
            self.assertEqual(self._log(120), 400)
        with self._at(2026, 11, 3, 7, 0):
            self.assertEqual(self._log(120), 400)
        with self._at(2026, 11, 4, 8, 0):
            self.assertEqual(self._log(120), 400)
        with self._at(2026, 11, 4, 9, 30):
            self.assertIsNone(self._active())

    def test_night_shift_climbs_on_back_to_back_nights_and_resets(self):
        with self._at(2026, 11, 2, 21, 0):
            self._buy("night_shift")
        with self._at(2026, 11, 2, 23, 0):
            self.assertEqual(self._log(60), 100)
        with self._at(2026, 11, 4, 0, 30):  # the night of the 3rd (after midnight)
            self.assertEqual(self._log(60), 150)
            self.assertIn("+150", self._active()["status"])
        with self._at(2026, 11, 4, 1, 0):
            self.assertEqual(
                self._log(180), 300
            )  # 120 left of the night's 180 minutes at +150

    def test_night_shift_skipped_night_resets_the_rate(self):
        with self._at(2026, 11, 2, 21, 0):
            self._buy("night_shift")
        with self._at(2026, 11, 2, 23, 0):
            self.assertEqual(self._log(60), 100)
        with self._at(2026, 11, 4, 23, 0):  # no log on the night of the 3rd
            self.assertEqual(self._log(60), 100)

    def test_night_shift_third_night_pays_triple(self):
        with self._at(2026, 11, 2, 21, 0):
            self._buy("night_shift")
        for day, expected in ((2, 100), (3, 150), (4, 200)):
            with self._at(2026, 11, day, 23, 0):
                self.assertEqual(self._log(60), expected)

    def test_hyperdrive_shuts_down_after_a_short_day(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("hyperdrive")
            self.assertEqual(self._log(60), 100)  # the purchase day is free
            self.assertIn("FROM TOMORROW", self._active()["status"])
        with self._at(2026, 11, 3, 10, 0):
            self._log(200)
            self.assertIn("180/180", self._active()["status"])
        with self._at(2026, 11, 4, 10, 0):
            self.assertIsNotNone(self._active())  # the 3rd had 3h+
            self._log(60)  # the 4th ends short
        with self._at(2026, 11, 5, 9, 0):
            self.assertIsNone(self._active())

    def test_focus_chip_burns_out_on_a_short_log(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("focus_chip")
            self.assertEqual(self._log(50), 100)
            self.assertEqual(self._log(30), 0)  # between 25 and 50: nothing, no harm
            self.assertIsNotNone(self._active())
            self.assertEqual(self._log(20), 0)
            self.assertIsNone(self._active())

    def test_deep_dive_pays_by_length(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("deep_dive")
            self.assertEqual(self._log(100), 0)
            self.assertEqual(self._log(120), 250)
            self.assertEqual(self._log(180), 450)
            self.assertEqual(self._log(300), 700)
            self.assertEqual(self._active()["remaining_uses"], 1)

    def test_offers_show_the_best_case(self):
        offers = {b["item_id"]: b for b in self.client.get("/api/bits/").data["buffs"]}
        self.assertEqual(offers["night_shift"]["max_bonus"], 1350)
        self.assertEqual(offers["deep_dive"]["max_bonus"], 2800)
        self.assertEqual(offers["early_bird"]["max_bonus"], 1200)
        self.assertEqual(offers["early_bird"]["mornings"], 3)
        self.assertEqual(offers["warm_up"]["price"], 400)


class TuckTests(APITestCase):
    """MY ROOM: chairs tuck into desks on the same floor row."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)

    def _save(self, *items):
        layout = {
            **DEFAULT_LAYOUT,
            "items": [{"id": i, "x": x, "y": y} for i, x, y in items],
        }
        return self.client.put(
            "/api/room/", {"layout": layout}, format="json"
        ).status_code

    def test_chair_tucks_into_desk(self):
        self.assertEqual(
            self._save(("starter_desk", 4, 9), ("starter_chair", 5, 9)), 200
        )
        self.assertEqual(
            self._save(("starter_chair", 5, 9), ("starter_desk", 4, 9)), 200
        )  # either order

    def test_tucking_needs_the_same_floor_row_and_one_chair(self):
        self.assertEqual(
            self._save(("starter_desk", 4, 9), ("starter_chair", 5, 8)), 400
        )
        from .furniture import validate_layout

        owned = {
            "starter_desk": 2,
            "starter_chair": 2,
            "wall_plain": 1,
            "floor_wood": 1,
        }
        two_chairs = {
            **DEFAULT_LAYOUT,
            "items": [
                {"id": "starter_desk", "x": 4, "y": 9},
                {"id": "starter_chair", "x": 5, "y": 9},
                {"id": "starter_chair", "x": 5, "y": 9},
            ],
        }
        two_desks = {
            **DEFAULT_LAYOUT,
            "items": [
                {"id": "starter_desk", "x": 4, "y": 9},
                {"id": "starter_chair", "x": 6, "y": 9},
                {"id": "starter_desk", "x": 6, "y": 9},
            ],
        }
        from .furniture import LayoutError

        for layout in (two_chairs, two_desks):
            with self.assertRaises(LayoutError):
                validate_layout(layout, owned)

    def test_catalog_marks_fits(self):
        catalog = {r["id"]: r for r in self.client.get("/api/room/").data["catalog"]}
        self.assertEqual(catalog["starter_chair"].get("fit"), "chair")
        self.assertEqual(catalog["starter_desk"].get("fit"), "desk")
        self.assertNotIn("fit", catalog["wall_plain"])


class ChallengeTests(APITestCase):
    """CHALLENGES: BOSS RAID and RIVAL (challenges.py)."""

    def setUp(self):
        from zoneinfo import ZoneInfo

        self.user = User.objects.create_user(
            username="raider", email="raider@example.com", password="s3cure-pass-123"
        )
        self.client.force_authenticate(user=self.user)
        StudyLog.objects.create(
            user=self.user, duration_minutes=60 * 100
        )  # 10,000 BITS
        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        self.tokyo = ZoneInfo("Asia/Tokyo")

    def _at(self, *args):
        return mock.patch(
            "django.utils.timezone.now", return_value=datetime(*args, tzinfo=self.tokyo)
        )

    def _buy(self, item_id):
        return self.client.post("/api/bits/buy/", {"item_id": item_id}, format="json")

    def _log(self, minutes, category=None):
        res = self.client.post(
            "/api/logs/",
            {"category": category, "duration_minutes": minutes, "topic": ""},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def _state(self):
        return self.client.get("/api/bits/").data

    # ---- BOSS RAID
    def test_hits_crits_and_the_per_log_cap(self):
        with self._at(2026, 11, 2, 12, 0):
            res = self._buy("raid_titan")
            self.assertEqual(res.status_code, 201)
            self.assertEqual(res.data["bits"]["balance"], 10000 - 1500)
            self.assertEqual(res.data["active_challenge"]["hp"], 1800)
            self.assertEqual(self._log(60)["challenge_hit"]["damage"], 60)
            hit = self._log(120)["challenge_hit"]
            self.assertEqual((hit["hit"], hit["damage"]), ("crit", 180))
            self.assertEqual(
                self._log(400)["challenge_hit"]["damage"], 270
            )  # 180 min counted, ×1.5
            self.assertEqual(self._state()["active_challenge"]["hp"], 1800 - 510)

    def test_golem_shrugs_off_short_logs(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_golem")
            hit = self._log(59)["challenge_hit"]
            self.assertEqual((hit["hit"], hit["damage"]), ("block", 0))
            self.assertEqual(self._log(60)["challenge_hit"]["damage"], 60)

    def test_bringing_the_boss_down_pays_the_loot(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_golem")  # 1,200 HP, loot 1,300
            for _ in range(4):
                self.assertFalse(self._log(180)["challenge_hit"]["down"])  # 270 each
            hit = self._log(180)["challenge_hit"]
            self.assertTrue(hit["down"])
            self.assertEqual(hit["payout"], 1300)
            state = self._state()
            self.assertIsNone(state["active_challenge"])
            self.assertEqual(state["last_challenge"]["outcome"], "down")
            # 10,000 - 800 entry + 15h base + 1,300 loot
            self.assertEqual(state["bits"]["balance"], 10000 - 800 + 1500 + 1300)
            self.assertEqual(state["bits"]["payouts"], 1300)
            self.assertIsNone(self._log(60).get("challenge_hit"))

    def test_an_escaped_boss_pays_a_share_for_the_damage_dealt(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_golem")
            self._log(400)  # 270
            self._log(400)  # 270
            self._log(60)  # 60 → 600 of 1,200
        with self._at(2026, 11, 8, 12, 0):
            state = self._state()
            self.assertIsNone(state["active_challenge"])
            self.assertEqual(state["last_challenge"]["outcome"], "escaped")
            self.assertEqual(state["last_challenge"]["payout"], int(1300 * 0.4 * 0.5))

    def test_nightmare_heals_at_midnight(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_nightmare")
            self._log(120)  # 180
        with self._at(2026, 11, 3, 12, 0):
            self.assertEqual(self._state()["active_challenge"]["hp"], 1200 - 180 + 60)

    def test_warden_heals_after_a_day_with_no_log(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_warden")
            self._log(150)  # 225
        with self._at(2026, 11, 3, 23, 0):
            self.assertEqual(
                self._state()["active_challenge"]["hp"], 975
            )  # the 3rd is not over yet
        with self._at(2026, 11, 4, 10, 0):
            self.assertEqual(self._state()["active_challenge"]["hp"], 975 + 120)
            self._log(60)
        with self._at(2026, 11, 5, 10, 0):
            self.assertEqual(
                self._state()["active_challenge"]["hp"], 975 + 120 - 60
            )  # the 4th had a log

    def test_phantom_dodges(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_phantom")
            with mock.patch("tracker.challenges.random.random", return_value=0.1):
                self.assertEqual(self._log(60)["challenge_hit"]["hit"], "miss")
            with mock.patch("tracker.challenges.random.random", return_value=0.9):
                self.assertEqual(self._log(60)["challenge_hit"]["damage"], 60)

    def test_hydra_needs_categories_and_each_head_takes_its_own(self):
        with self._at(2026, 11, 2, 12, 0):
            self.assertEqual(self._buy("raid_hydra").status_code, 400)  # no categories
            cats = [
                Category.objects.create(user=self.user, name=c, code=c)
                for c in ("DEV", "MATH", "ENG", "ART")
            ]
            for minutes, cat in ((300, cats[0]), (200, cats[1]), (100, cats[2])):
                StudyLog.objects.create(
                    user=self.user, category=cat, duration_minutes=minutes
                )
            res = self._buy("raid_hydra")
            self.assertEqual(res.status_code, 201)
            heads = res.data["active_challenge"]["heads"]
            self.assertEqual([h["code"] for h in heads], ["DEV", "MATH", "ENG"])
            self.assertEqual(self._log(60, cats[0].id)["challenge_hit"]["damage"], 60)
            self.assertEqual(
                self._log(60, cats[3].id)["challenge_hit"]["hit"], "nohead"
            )
            self.assertEqual(self._log(60)["challenge_hit"]["hit"], "nohead")
            heads = self._state()["active_challenge"]["heads"]
            self.assertEqual([h["hp"] for h in heads], [340, 400, 400])

    def test_a_deleted_log_takes_its_hit_back(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_golem")
            log = self._log(120)
            self.assertEqual(self._state()["active_challenge"]["hp"], 1020)
            self.client.patch(
                f"/api/logs/{log['id']}/", {"duration_minutes": 60}, format="json"
            )
            self.assertEqual(
                self._state()["active_challenge"]["hp"], 1140
            )  # no longer a crit
            self.client.delete(f"/api/logs/{log['id']}/")
            self.assertEqual(self._state()["active_challenge"]["hp"], 1200)

    def test_one_challenge_at_a_time_next_to_a_buff(self):
        with self._at(2026, 11, 2, 12, 0):
            self.assertEqual(self._buy("raid_golem").status_code, 201)
            self.assertEqual(self._buy("rival_nova").status_code, 400)
            self.assertEqual(self._buy("warm_up").status_code, 201)
            log = self._log(60)
            self.assertEqual(log["bonus_bits"], 100)  # the buff still pays
            self.assertEqual(log["challenge_hit"]["damage"], 60)

    def test_forfeit_ends_it_with_nothing_back(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_golem")
            res = self.client.post("/api/bits/challenge/forfeit/", {}, format="json")
            self.assertEqual(res.status_code, 200)
            self.assertIsNone(res.data["active_challenge"])
            self.assertEqual(res.data["last_challenge"]["outcome"], "forfeit")
            self.assertEqual(res.data["bits"]["balance"], 10000 - 800)
            self.assertEqual(
                self.client.post(
                    "/api/bits/challenge/forfeit/", {}, format="json"
                ).status_code,
                400,
            )
            self.assertEqual(self._buy("raid_golem").status_code, 201)

    def test_bits_reset_drops_challenges_and_payouts(self):
        with self._at(2026, 11, 2, 12, 0):
            self._buy("raid_golem")
            for _ in range(5):
                self._log(180)
            self.client.post("/api/bits/reset/", {}, format="json")
            state = self._state()
            self.assertEqual(state["bits"]["payouts"], 0)
            self.assertIsNone(state["last_challenge"])

    # ---- RIVAL
    def test_rival_schedule_is_fixed_per_date(self):
        from .challenges import rival_day

        day = date(2026, 11, 3)
        self.assertEqual(rival_day("orion", day), rival_day("orion", day))
        self.assertNotEqual(
            rival_day("orion", day), rival_day("orion", day + timedelta(days=1))
        )
        for start, length, _ in rival_day("nova", day):
            self.assertTrue(0 <= start < 1440 and start + length <= 1440)
        self.assertEqual(rival_day("rush", date(2026, 11, 6)), [])  # Friday: RUSH rests

    def test_winning_a_duel_pays_the_prize(self):
        from .challenges import rival_sessions

        with self._at(2026, 11, 2, 19, 0):
            self._log(600)  # before the duel: does not count
        with self._at(2026, 11, 2, 20, 0):
            res = self._buy("rival_orion")
            self.assertEqual(res.status_code, 201)
            duel = res.data["active_challenge"]
            self.assertEqual(duel["prize"], 1600)
            self.assertEqual(
                duel["starts_at"], datetime(2026, 11, 2, 20, 0, tzinfo=self.tokyo)
            )
            self.assertEqual(
                duel["ends_at"], datetime(2026, 11, 5, 20, 0, tzinfo=self.tokyo)
            )
            self.assertEqual(duel["mine"], 0)
            self.assertEqual(
                self._log(600)["challenge_hit"]["mine"], 600
            )  # counts from the moment it is bought
        for day in (3, 4):
            with self._at(2026, 11, day, 10, 0):
                self.assertEqual(self._log(600)["challenge_hit"]["kind"], "rival")
        with self._at(2026, 11, 5, 19, 59):
            duel = self._state()["active_challenge"]
            self.assertEqual(duel["mine"], 1800)
            self.assertEqual(
                [d["state"] for d in duel["days"]], ["done", "done", "live"]
            )
            start = datetime(2026, 11, 2, 20, 0, tzinfo=self.tokyo)
            end = datetime(2026, 11, 5, 19, 59, tzinfo=self.tokyo)
            theirs = sum(
                int((min(f, end) - max(b, start)).total_seconds() // 60)
                for b, f, _ in rival_sessions(self.user, "orion", start, end)
            )
            self.assertEqual(duel["theirs"], theirs)
        with self._at(2026, 11, 5, 20, 1):
            state = self._state()
            self.assertIsNone(state["active_challenge"])
            self.assertEqual(
                (state["last_challenge"]["outcome"], state["last_challenge"]["payout"]),
                ("won", 1600),
            )

    def test_losing_a_duel_pays_nothing(self):
        with self._at(2026, 11, 2, 20, 0):
            self._buy("rival_nova")
        with self._at(2026, 11, 4, 12, 0):
            duel = self._state()["active_challenge"]
            self.assertEqual(
                [d["state"] for d in duel["days"]], ["done", "live", "pending"]
            )
            self.assertGreater(duel["theirs"], 0)
        with self._at(2026, 11, 6, 0, 1):
            last = self._state()["last_challenge"]
            self.assertEqual((last["outcome"], last["payout"]), ("lost", 0))

    def test_rush_prize_follows_the_projected_hours(self):
        with self._at(
            2026, 11, 2, 12, 0
        ):  # Mon: the duel runs Tue-Thu, RUSH's light days
            light = next(
                r for r in self._state()["challenges"]["rivals"] if r["key"] == "rush"
            )
        with self._at(2026, 11, 5, 12, 0):  # Thu: Fri-Sun, the big weekend
            heavy = next(
                r for r in self._state()["challenges"]["rivals"] if r["key"] == "rush"
            )
        self.assertLess(light["prize"], heavy["prize"])
        self.assertGreater(light["prize"], light["price"])
        self.assertLessEqual(heavy["prize"], 2400)

    def test_hydra_takes_the_categories_picked(self):
        with self._at(2026, 11, 2, 12, 0):
            cats = [
                Category.objects.create(user=self.user, name=c, code=c)
                for c in ("DEV", "MATH", "ENG")
            ]
            done = Category.objects.create(
                user=self.user, name="OLD", code="OLD", completed_at=timezone.now()
            )
            other = User.objects.create_user(
                username="x", email="x@example.com", password="s3cure-pass-123"
            )
            foreign = Category.objects.create(user=other, name="F", code="F")
            buy = lambda ids: self.client.post(
                "/api/bits/buy/",
                {"item_id": "raid_hydra", "categories": ids},
                format="json",
            )
            for bad in (
                [cats[0].id],
                [cats[0].id, cats[0].id],
                [cats[0].id, done.id],
                [cats[0].id, foreign.id],
                [c.id for c in cats] + [done.id],
                "x",
            ):
                self.assertEqual(buy(bad).status_code, 400, bad)
            self.assertEqual(
                self._state()["bits"]["balance"], 10000
            )  # nothing spent on a refusal
            res = buy([cats[2].id, cats[0].id])
            self.assertEqual(res.status_code, 201)
            self.assertEqual(
                [h["code"] for h in res.data["active_challenge"]["heads"]],
                ["ENG", "DEV"],
            )
            self.assertEqual(
                [h["max"] for h in res.data["active_challenge"]["heads"]], [600, 600]
            )
            self.assertEqual(
                self._log(60, cats[1].id)["challenge_hit"]["hit"], "nohead"
            )

    def test_hydra_offer_says_how_many_heads_and_suggests_some(self):
        with self._at(2026, 11, 2, 12, 0):
            hydra = next(
                r for r in self._state()["challenges"]["raids"] if r["key"] == "hydra"
            )
            self.assertFalse(hydra["available"])
            Category.objects.create(user=self.user, name="A", code="A")
            Category.objects.create(user=self.user, name="B", code="B")
            hydra = next(
                r for r in self._state()["challenges"]["raids"] if r["key"] == "hydra"
            )
            self.assertTrue(hydra["available"])
            self.assertEqual(hydra["heads"], [2, 3])
            self.assertEqual(len(hydra["suggested"]), 2)

    def test_a_duel_bought_at_night_starts_right_away(self):
        with self._at(2026, 11, 3, 0, 20):
            self._log(30)  # before buying: not part of the duel
        with self._at(2026, 11, 3, 1, 0):
            duel = self._buy("rival_nova").data["active_challenge"]
            self.assertEqual(
                duel["starts_at"], datetime(2026, 11, 3, 1, 0, tzinfo=self.tokyo)
            )
            self.assertEqual(duel["mine"], 0)
            self.assertEqual(self._log(45)["challenge_hit"]["mine"], 45)
        with self._at(2026, 11, 6, 0, 59):
            self.assertIsNotNone(self._state()["active_challenge"])
        with self._at(2026, 11, 6, 1, 1):
            self.assertIsNone(self._state()["active_challenge"])  # 72 hours later

    def test_a_session_under_way_counts_from_the_start_of_the_duel(self):
        from .challenges import rival_day

        day = date(2026, 11, 3)
        start, length, _ = rival_day("orion", day)[0]  # the first morning session
        mid = datetime(2026, 11, 3, 0, 0, tzinfo=self.tokyo) + timedelta(
            minutes=start + 10
        )
        with mock.patch("django.utils.timezone.now", return_value=mid):
            duel = self._buy("rival_orion").data["active_challenge"]
        with mock.patch(
            "django.utils.timezone.now",
            return_value=mid + timedelta(minutes=length - 10),
        ):  # as it ends
            self.assertEqual(
                self._state()["active_challenge"]["days"][0]["theirs"], length - 10
            )

    def test_rival_sessions_never_overlap(self):
        from .challenges import RIVALS, rival_day

        for rival in RIVALS:
            for offset in range(60):
                sessions = rival_day(rival, date(2026, 11, 1) + timedelta(days=offset))
                for (s1, l1, _), (s2, _, _) in zip(sessions, sessions[1:]):
                    self.assertLess(s1 + l1, s2, (rival, offset))
                for s, l, _ in sessions:
                    self.assertLessEqual(s + l, 1440)

    def test_every_rival_can_be_bought(self):
        with self._at(2026, 11, 2, 12, 0):
            rivals = self._state()["challenges"]["rivals"]
            self.assertEqual(
                [r["key"] for r in rivals],
                ["mika", "rush", "nova", "kai", "orion", "ace"],
            )
            raids = self._state()["challenges"]["raids"]
            self.assertEqual(
                [r["key"] for r in raids],
                ["golem", "nightmare", "warden", "hydra", "phantom", "titan"],
            )
            for r in rivals:
                self.assertGreater(r["prize"], r["price"])
                self.assertGreater(r["projected"], 0)
                self.assertEqual(self._buy(r["item_id"]).status_code, 201, r["key"])
                self.client.post("/api/bits/challenge/forfeit/", {}, format="json")


class SessionTimingAndEditTests(APITestCase):
    """A session belongs to the time it started in; edits can restore what a
    log did but never add to it."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="operator",
            email="operator@example.com",
            password="s3cure-pass-123",
        )
        self.client.force_authenticate(user=self.user)
        UserProfile.objects.update_or_create(
            user=self.user, defaults={"timezone": "Asia/Tokyo"}
        )
        self.math = Category.objects.create(user=self.user, code="MATH", name="Math")
        self.code = Category.objects.create(user=self.user, code="CODE", name="Code")
        self.spare = Category.objects.create(user=self.user, code="ART", name="Art")
        with self._at(2026, 1, 1):
            StudyLog.objects.create(user=self.user, duration_minutes=60000)

    def _at(self, month_or_year, *rest):
        parts = (month_or_year, *rest)
        moment = datetime(*parts, tzinfo=ZoneInfo("Asia/Tokyo"))
        return mock.patch("django.utils.timezone.now", return_value=moment)

    def _buy(self, item_id, **extra):
        res = self.client.post(
            "/api/bits/buy/", {"item_id": item_id, **extra}, format="json"
        )
        self.assertEqual(res.status_code, 201, res.data)

    def _log(self, minutes, category=None):
        return self.client.post(
            "/api/logs/",
            {"duration_minutes": minutes, "category": (category or self.math).id},
            format="json",
        ).data

    def _edit(self, log, minutes):
        return self.client.patch(
            f"/api/logs/{log['id']}/", {"duration_minutes": minutes}, format="json"
        ).data

    def _shop(self):
        return self.client.get("/api/bits/").data

    def _hp(self):
        return self._shop()["active_challenge"]["hp"]

    # Windows

    def test_session_past_the_morning_still_pays_and_keeps_early_bird(self):
        with self._at(2026, 3, 1, 20):
            self._buy("early_bird")
        with self._at(2026, 3, 2, 9, 1):  # studied 07:00-09:01
            self.assertEqual(self._log(121)["bonus_bits"], 400)
            self.assertIsNotNone(self._shop()["active_buff"])

    def test_session_after_the_morning_pays_nothing(self):
        with self._at(2026, 3, 1, 20):
            self._buy("early_bird")
        with self._at(2026, 3, 2, 10, 0):  # studied 09:30-10:00
            self.assertEqual(self._log(30)["bonus_bits"], 0)

    def test_session_past_two_am_stays_on_its_night_rate(self):
        with self._at(2026, 3, 2, 12):
            self._buy("night_shift")
        with self._at(2026, 3, 3, 2, 10):  # studied 23:10-02:10
            self.assertEqual(self._log(180)["bonus_bits"], 300)

    def test_session_started_before_the_purchase_does_not_reach_the_window(self):
        with self._at(2026, 3, 2, 9, 30):
            self._buy("early_bird")
        with self._at(2026, 3, 2, 10, 0):  # 150 min back is 07:30, before buying
            self.assertEqual(self._log(150)["bonus_bits"], 0)

    def test_session_past_the_last_morning_still_pays(self):
        with self._at(2026, 3, 2, 6):
            self._buy("early_bird")
            self._log(60)
        with self._at(2026, 3, 3, 6):
            self._log(60)
        with self._at(2026, 3, 4, 9, 5):  # expired at 09:00
            self.assertEqual(self._log(120)["bonus_bits"], 400)

    # Days

    def test_session_past_midnight_counts_for_the_day_it_started(self):
        with self._at(2026, 3, 2, 10):
            self._buy("hyperdrive")
        with self._at(2026, 3, 4, 0, 30):  # studied 21:30-00:30 on the 3rd
            self._log(180)
        with self._at(2026, 3, 4, 12):
            self.assertIsNotNone(self._shop()["active_buff"])

    def test_log_committed_later_in_the_morning_stays_on_that_day(self):
        with self._at(2026, 3, 2, 10):
            self._buy("hyperdrive")
        with self._at(2026, 3, 3, 12):
            self._log(180)
        with self._at(2026, 3, 4, 9):  # 10h back is yesterday, but it's past 03:00
            self._log(600)
        with self._at(2026, 3, 5, 12):
            self.assertIsNotNone(self._shop()["active_buff"])

    def test_hyperdrive_still_shuts_down_after_the_grace(self):
        with self._at(2026, 3, 2, 10):
            self._buy("hyperdrive")
        with self._at(2026, 3, 4, 2, 59):
            self.assertIsNotNone(self._shop()["active_buff"])
        with self._at(2026, 3, 4, 3, 0):
            self.assertIsNone(self._shop()["active_buff"])

    def test_contract_last_day_can_be_sealed_after_midnight(self):
        with self._at(2026, 3, 2, 10):
            self._buy("iron_contract")
        for day in (3, 4):
            with self._at(2026, 3, day, 12):
                self._log(300)
        with self._at(2026, 3, 6, 0, 30):  # studied 19:30-00:30 on the 5th
            self.assertEqual(self._log(300)["bonus_bits"], 3000)

    # Buffs that were ended on purpose

    def test_cancelled_buff_pays_nothing_to_a_session_under_way(self):
        with self._at(2026, 3, 2, 12):
            self._buy("overclock")
            self.client.post("/api/bits/cancel/", {}, format="json")
        with self._at(2026, 3, 2, 12, 30):
            self.assertEqual(self._log(60)["bonus_bits"], 0)

    def test_burnt_focus_chip_pays_nothing_to_a_session_under_way(self):
        with self._at(2026, 3, 2, 12):
            self._buy("focus_chip")
            self._log(5)
        with self._at(2026, 3, 2, 12, 30):
            self.assertEqual(self._log(60)["bonus_bits"], 0)

    def test_expired_buff_pays_only_a_session_started_before_the_expiry(self):
        with self._at(2026, 3, 2, 12):
            self._buy("overclock")
        with self._at(2026, 3, 3, 12, 30):
            self.assertEqual(self._log(60)["bonus_bits"], 100)
        with self._at(2026, 3, 3, 12, 40):
            self.assertEqual(self._log(30)["bonus_bits"], 0)

    def test_expired_buff_is_out_of_reach_after_the_grace(self):
        with self._at(2026, 3, 2, 12):
            self._buy("overclock")
        with self._at(2026, 3, 3, 15, 1):
            self.assertEqual(self._log(600)["bonus_bits"], 0)

    # Raid edits

    def test_fixing_a_typo_restores_the_raid_hit(self):
        with self._at(2026, 3, 2, 12):
            self._buy("raid_titan")
            log = self._log(120)
            self.assertEqual(self._hp(), 1620)
            self._edit(log, 12)
            self.assertEqual(self._hp(), 1788)
            self._edit(log, 120)
            self.assertEqual(self._hp(), 1620)

    def test_padding_a_log_adds_no_damage(self):
        with self._at(2026, 3, 2, 12):
            self._buy("raid_titan")
            log = self._log(60)
            self._edit(log, 180)
            self.assertEqual(self._hp(), 1740)

    def test_a_block_comes_back_only_as_far_as_the_commit(self):
        with self._at(2026, 3, 2, 12):
            self._buy("raid_golem")
            short = self._log(30)
            self._edit(short, 120)
            self.assertEqual(self._hp(), 1200)  # it bounced off when committed
            long = self._log(120)
            self._edit(long, 30)
            self.assertEqual(self._hp(), 1200)
            self._edit(long, 120)
            self.assertEqual(self._hp(), 1020)

    def test_a_restored_hit_can_bring_the_boss_down(self):
        with self._at(2026, 3, 2, 12):
            self._buy("raid_golem")
            before = self.client.get("/api/auth/me/").data["bits"]["earned"]
            logs = [self._log(180) for _ in range(4)]  # 270 each: 1,080
            first = logs[0]
            self._edit(first, 60)
            self.assertEqual(self._log(180)["challenge_hit"]["down"], False)
            self._edit(first, 180)
            shop = self._shop()
            self.assertIsNone(shop["active_challenge"])
            self.assertEqual(shop["last_challenge"]["outcome"], "down")
            self.assertEqual(shop["bits"]["payouts"], 1300)
            self.assertGreater(shop["bits"]["earned"], before)

    # Contract edits

    def test_editing_up_to_the_goal_on_the_last_day_pays_once(self):
        with self._at(2026, 3, 2, 10):
            self._buy("iron_contract")
        for day in (3, 4):
            with self._at(2026, 3, day, 12):
                self._log(300)
        with self._at(2026, 3, 5, 12):
            log = self._log(200)
            self.assertEqual(self._edit(log, 300)["bonus_bits"], 3000)
            self.assertEqual(self._edit(log, 320)["bonus_bits"], 3000)
        self.assertEqual(
            BitPurchase.objects.get(user=self.user, item_id="iron_contract").bonus_earned,
            3000,
        )

    def test_editing_up_before_the_last_day_pays_nothing(self):
        with self._at(2026, 3, 2, 10):
            self._buy("iron_contract")
        with self._at(2026, 3, 3, 12):
            log = self._log(200)
            self.assertEqual(self._edit(log, 300)["bonus_bits"], 0)

    def test_shortening_a_done_day_still_breaks_the_contract(self):
        with self._at(2026, 3, 2, 10):
            self._buy("iron_contract")
        with self._at(2026, 3, 3, 12):
            log = self._log(300)
        with self._at(2026, 3, 4, 12):
            self._edit(log, 299)
            self.assertIsNone(self._shop()["active_buff"])

    # HYDRA

    def _hydra(self):
        self._buy("raid_hydra", categories=[self.math.id, self.code.id])

    def test_a_head_without_its_category_counts_as_slain(self):
        with self._at(2026, 3, 2, 12):
            self._hydra()
            self.assertEqual(self._hp(), 1200)
            self.client.delete(f"/api/categories/{self.code.id}/")
            self.assertEqual(self._hp(), 600)
            for _ in range(2):
                self._log(180, self.math)
            res = self._log(60, self.math)
            self.assertTrue(res["challenge_hit"]["down"])
            self.assertEqual(self._shop()["bits"]["payouts"], 1500)

    def test_losing_the_last_standing_head_brings_hydra_down(self):
        with self._at(2026, 3, 2, 12):
            self._hydra()
            for _ in range(2):
                self._log(180, self.math)
            self._log(60, self.math)
            self.client.delete(f"/api/categories/{self.code.id}/")
            shop = self._shop()
            self.assertIsNone(shop["active_challenge"])
            self.assertEqual(shop["last_challenge"]["outcome"], "down")
            self.assertEqual(shop["bits"]["payouts"], 1500)

    def test_a_head_marked_done_comes_back_with_its_category(self):
        with self._at(2026, 3, 2, 12):
            self._hydra()
            self.client.patch(
                f"/api/categories/{self.code.id}/", {"completed": True}, format="json"
            )
            self.assertEqual(self._hp(), 600)
            self.client.patch(
                f"/api/categories/{self.code.id}/", {"completed": False}, format="json"
            )
            self.assertEqual(self._hp(), 1200)
