import re
from datetime import date, datetime, timedelta, timezone as dt_timezone
from pathlib import Path
from unittest import mock, skipUnless

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Category, StudyLog, UserProfile, monthly_to_weekly_hours
from .serializers import USER_STATUS_IDS

User = get_user_model()

# The status catalog lives in the frontend; the backend keeps a copy of its ids.
FRONTEND_USER_STATUS_TS = Path(settings.BASE_DIR).parent / 'frontend' / 'src' / 'userStatus.ts'


class SurfaceThemeSyncTests(APITestCase):
    """
    The selected Surface Theme is stored on the account (UserProfile) so it
    follows the user across devices via GET/PATCH /api/auth/me/.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_me_returns_blank_surface_theme_by_default(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['surface_theme'], '')

    def test_patch_surface_theme_persists_to_profile(self):
        res = self.client.patch('/api/auth/me/', {'surface_theme': 'cement-chalk-dust'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['surface_theme'], 'cement-chalk-dust')
        self.assertEqual(UserProfile.objects.get(user=self.user).surface_theme, 'cement-chalk-dust')

        # A second "device" (fresh request) sees the same value.
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.data['surface_theme'], 'cement-chalk-dust')

    def test_patch_surface_theme_does_not_touch_other_profile_fields(self):
        self.client.patch('/api/auth/me/', {'avatar_color': '#3b82f6'}, format='json')
        self.client.patch('/api/auth/me/', {'surface_theme': 'monolith'}, format='json')
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.avatar_color, '#3b82f6')
        self.assertEqual(profile.surface_theme, 'monolith')
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'operator')

    def test_patch_surface_theme_rejects_malformed_id(self):
        for bad in ('<script>', 'has space', '-leading-dash', 'x' * 65):
            res = self.client.patch('/api/auth/me/', {'surface_theme': bad}, format='json')
            self.assertEqual(res.status_code, 400, bad)
        self.assertFalse(UserProfile.objects.filter(user=self.user).exclude(surface_theme='').exists())

    def test_patch_surface_theme_normalizes_case(self):
        res = self.client.patch('/api/auth/me/', {'surface_theme': '  Monolith '}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['surface_theme'], 'monolith')

    def test_surface_theme_requires_authentication(self):
        self.client.force_authenticate(user=None)
        res = self.client.patch('/api/auth/me/', {'surface_theme': 'monolith'}, format='json')
        self.assertEqual(res.status_code, 401)


class LanguageTimezoneSettingsTests(APITestCase):
    """
    UI language and time zone live on the account (UserProfile) so they
    follow the user to every device and the next sign-in.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_are_blank(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['language'], '')
        self.assertEqual(res.data['timezone'], '')

    def test_patch_language_and_timezone_persist(self):
        res = self.client.patch(
            '/api/auth/me/', {'language': 'ja', 'timezone': 'Asia/Tokyo'}, format='json'
        )
        self.assertEqual(res.status_code, 200)
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.language, 'ja')
        self.assertEqual(profile.timezone, 'Asia/Tokyo')
        res = self.client.get('/api/auth/me/')
        self.assertEqual((res.data['language'], res.data['timezone']), ('ja', 'Asia/Tokyo'))

    def test_language_is_normalized_and_validated(self):
        res = self.client.patch('/api/auth/me/', {'language': ' JA '}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['language'], 'ja')
        res = self.client.patch('/api/auth/me/', {'language': 'fr'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(UserProfile.objects.get(user=self.user).language, 'ja')

    def test_unknown_timezone_is_rejected(self):
        for bad in ('Mars/Olympus_Mons', 'JST', '../../etc/passwd', 'x' * 65):
            res = self.client.patch('/api/auth/me/', {'timezone': bad}, format='json')
            self.assertEqual(res.status_code, 400, bad)
        self.assertFalse(UserProfile.objects.filter(user=self.user).exclude(timezone='').exists())

    def test_patching_region_keeps_other_profile_fields(self):
        self.client.patch('/api/auth/me/', {'surface_theme': 'monolith'}, format='json')
        self.client.patch('/api/auth/me/', {'timezone': 'Europe/London'}, format='json')
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.surface_theme, 'monolith')
        self.assertEqual(profile.timezone, 'Europe/London')


class StudyLogTimestampTests(APITestCase):
    """
    Log timestamps are stored and served in UTC; only the client converts
    them to the user's zone. Existing records are untouched by the setting.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)
        self.category = Category.objects.create(user=self.user, name='Dev', code='DEV')

    def test_created_at_is_serialized_as_utc(self):
        res = self.client.post(
            '/api/logs/',
            {'category': self.category.id, 'date': '2026-10-19', 'duration_minutes': 30},
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['created_at'].endswith('Z'), res.data['created_at'])

    def test_changing_timezone_does_not_alter_stored_logs(self):
        log = StudyLog.objects.create(
            user=self.user, category=self.category, date=date(2026, 1, 5), duration_minutes=45
        )
        before = StudyLog.objects.get(pk=log.pk).created_at
        self.client.patch('/api/auth/me/', {'timezone': 'Pacific/Kiritimati'}, format='json')
        after = StudyLog.objects.get(pk=log.pk)
        self.assertEqual(after.created_at, before)
        self.assertEqual(after.date, date(2026, 1, 5))

    def test_missing_date_defaults_to_users_local_day(self):
        # Kiritimati is UTC+14: around UTC midnight it is already "tomorrow".
        UserProfile.objects.create(user=self.user, timezone='Pacific/Kiritimati')
        fixed_now = datetime(2026, 10, 19, 12, 0, tzinfo=dt_timezone.utc)
        with mock.patch('django.utils.timezone.now', return_value=fixed_now):
            res = self.client.post(
                '/api/logs/', {'category': self.category.id, 'duration_minutes': 30}, format='json'
            )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['date'], '2026-10-20')

    def test_import_backup_preserves_original_created_at(self):
        res = self.client.post(
            '/api/logs/import-backup/',
            {
                'categories': [],
                'logs': [
                    {'categoryCode': 'DEV', 'date': '2025-03-01', 'durationMinutes': 60,
                     'createdAt': '2025-03-01T09:22:00Z'},
                    {'categoryCode': 'DEV', 'date': '2025-03-02', 'durationMinutes': 30},
                ],
            },
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        restored = StudyLog.objects.get(user=self.user, date=date(2025, 3, 1))
        self.assertEqual(restored.created_at, datetime(2025, 3, 1, 9, 22, tzinfo=dt_timezone.utc))
        self.assertIsNotNone(StudyLog.objects.get(user=self.user, date=date(2025, 3, 2)).created_at)


class ResetAndImportTests(APITestCase):
    """Reset wipes logs and categories; re-importing a backup never inflates totals."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)
        self.category = Category.objects.create(user=self.user, name='Dev', code='DEV', weekly_target_hours=9)
        StudyLog.objects.create(user=self.user, category=self.category, date=date(2026, 10, 1), duration_minutes=90)

    def _backup(self):
        return {
            'categories': [{'code': 'DEV', 'name': 'Dev', 'color': '#10b981', 'weeklyTargetHours': 12}],
            'logs': [
                {'categoryCode': 'DEV', 'date': '2026-10-01', 'durationMinutes': 60,
                 'createdAt': '2026-10-01T09:00:00.123456Z'},
                {'categoryCode': 'DEV', 'date': '2026-10-01', 'durationMinutes': 60,
                 'createdAt': '2026-10-01T11:00:00Z'},
            ],
        }

    def test_clear_all_removes_logs_and_categories_but_keeps_account(self):
        res = self.client.delete('/api/logs/clear-all/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {'deleted': 1, 'deleted_categories': 1})
        self.assertFalse(StudyLog.objects.filter(user=self.user).exists())
        self.assertFalse(Category.objects.filter(user=self.user).exists())
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_import_after_reset_restores_backup_categories_exactly(self):
        self.client.delete('/api/logs/clear-all/')
        res = self.client.post('/api/logs/import-backup/', self._backup(), format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['imported_logs'], 2)
        self.assertEqual(Category.objects.get(user=self.user, code='DEV').weekly_target_hours, 12)

    def test_reimporting_same_backup_adds_nothing(self):
        self.client.delete('/api/logs/clear-all/')
        self.client.post('/api/logs/import-backup/', self._backup(), format='json')
        res = self.client.post('/api/logs/import-backup/', self._backup(), format='json')
        self.assertEqual(res.data['imported_logs'], 0)
        self.assertEqual(res.data['skipped_logs'], 2)
        self.assertEqual(StudyLog.objects.filter(user=self.user).count(), 2)

    def test_unknown_category_code_is_not_credited_to_another_category(self):
        res = self.client.post(
            '/api/logs/import-backup/',
            {'categories': [], 'logs': [{'categoryCode': 'GONE', 'date': '2026-10-02', 'durationMinutes': 120}]},
            format='json',
        )
        self.assertEqual(res.data['imported_logs'], 1)
        self.assertIsNone(StudyLog.objects.get(user=self.user, date=date(2026, 10, 2)).category)
        self.assertEqual(StudyLog.objects.filter(category=self.category).count(), 1)


class CategoryWeeklyTargetTests(APITestCase):
    """Category targets are weekly; inactive categories are parked, not deleted."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_create_with_weekly_target_defaults_active(self):
        res = self.client.post(
            '/api/categories/', {'name': 'Math', 'code': 'MATH', 'weekly_target_hours': 6}, format='json'
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['weekly_target_hours'], 6)
        self.assertTrue(res.data['is_active'])

    def test_weekly_target_bounds(self):
        for bad in (0, 169):
            res = self.client.post(
                '/api/categories/', {'name': 'X', 'code': f'X{bad}', 'weekly_target_hours': bad}, format='json'
            )
            self.assertEqual(res.status_code, 400, bad)

    def test_deactivate_keeps_target_and_logs(self):
        cat = Category.objects.create(user=self.user, name='Dev', code='DEV', weekly_target_hours=8)
        StudyLog.objects.create(user=self.user, category=cat, date=date(2026, 10, 1), duration_minutes=30)
        res = self.client.patch(f'/api/categories/{cat.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 200)
        cat.refresh_from_db()
        self.assertFalse(cat.is_active)
        self.assertEqual(cat.weekly_target_hours, 8)
        self.assertEqual(StudyLog.objects.filter(category=cat).count(), 1)

    def test_import_keeps_legacy_monthly_target_value_as_is(self):
        res = self.client.post(
            '/api/logs/import-backup/',
            {
                'categories': [
                    {'code': 'OLD', 'name': 'Legacy', 'monthlyTargetHours': 40},
                    {'code': 'NEW', 'name': 'Current', 'weeklyTargetHours': 7, 'isActive': False},
                ],
                'logs': [],
            },
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Category.objects.get(user=self.user, code='OLD').weekly_target_hours, 40)
        new = Category.objects.get(user=self.user, code='NEW')
        self.assertEqual((new.weekly_target_hours, new.is_active), (7, False))

    def test_legacy_monthly_field_still_works_during_rollout(self):
        # An old frontend (deployed separately, or an open tab) sends/reads monthly.
        res = self.client.post(
            '/api/categories/', {'name': 'Old', 'code': 'OLD', 'monthly_target_hours': 40}, format='json'
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['weekly_target_hours'], 9)
        self.assertEqual(res.data['monthly_target_hours'], 39)
        res = self.client.patch(f"/api/categories/{res.data['id']}/", {'monthly_target_hours': 20}, format='json')
        self.assertEqual(res.data['weekly_target_hours'], 5)

    def test_weekly_wins_over_legacy_monthly(self):
        res = self.client.post(
            '/api/categories/',
            {'name': 'Both', 'code': 'BOTH', 'weekly_target_hours': 7, 'monthly_target_hours': 40},
            format='json',
        )
        self.assertEqual(res.data['weekly_target_hours'], 7)

    def test_monthly_to_weekly_conversion(self):
        self.assertEqual(
            [monthly_to_weekly_hours(m) for m in (1, 10, 20, 40, 744)], [1, 2, 5, 9, 168]
        )


class CategoryCompletionTests(APITestCase):
    """DONE categories: server-stamped completed_at, reversible, logs kept."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)
        self.dev = Category.objects.create(user=self.user, name='Dev', code='DEV', weekly_target_hours=8)
        self.lic = Category.objects.create(user=self.user, name='Licence', code='LIC', weekly_target_hours=4)
        StudyLog.objects.create(user=self.user, category=self.lic, date=date(2026, 10, 1), duration_minutes=90)

    def test_new_category_is_in_progress(self):
        res = self.client.get('/api/categories/')
        self.assertTrue(all(c['completed_at'] is None for c in res.data))

    def test_mark_done_stamps_server_time_and_keeps_logs(self):
        before = timezone.now()
        res = self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.lic.refresh_from_db()
        self.assertIsNotNone(self.lic.completed_at)
        self.assertGreaterEqual(self.lic.completed_at, before)
        self.assertTrue(res.data['completed_at'].endswith('Z'))
        self.assertEqual(StudyLog.objects.filter(category=self.lic).count(), 1)

    def test_marking_done_again_keeps_original_timestamp(self):
        self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': True}, format='json')
        self.lic.refresh_from_db()
        first = self.lic.completed_at
        self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': True}, format='json')
        self.lic.refresh_from_db()
        self.assertEqual(self.lic.completed_at, first)

    def test_restore_clears_completed_at(self):
        self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': True}, format='json')
        res = self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': False}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data['completed_at'])

    def test_completed_at_cannot_be_written_directly(self):
        res = self.client.patch(
            f'/api/categories/{self.lic.id}/', {'completed_at': '2020-01-01T00:00:00Z'}, format='json'
        )
        self.assertEqual(res.status_code, 200)
        self.lic.refresh_from_db()
        self.assertIsNone(self.lic.completed_at)

    def test_last_in_progress_category_cannot_be_done(self):
        self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': True}, format='json')
        res = self.client.patch(f'/api/categories/{self.dev.id}/', {'completed': True}, format='json')
        self.assertEqual(res.status_code, 400)
        self.dev.refresh_from_db()
        self.assertIsNone(self.dev.completed_at)

    def test_last_in_progress_category_cannot_be_deleted(self):
        self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': True}, format='json')
        res = self.client.delete(f'/api/categories/{self.dev.id}/')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Category.objects.filter(pk=self.dev.pk).exists())
        # A DONE category itself can still be deleted.
        res = self.client.delete(f'/api/categories/{self.lic.id}/')
        self.assertEqual(res.status_code, 204)

    def test_hub_keeps_done_hours_without_target(self):
        self.client.patch(f'/api/categories/{self.lic.id}/', {'completed': True}, format='json')
        res = self.client.get('/api/hub/telemetry/', {'username': 'operator'})
        lic = next(c for c in res.data['categories'] if c['code'] == 'LIC')
        self.assertTrue(lic['is_completed'])
        self.assertIsNone(lic['weekly_target_hours'])
        self.assertEqual(res.data['summary']['total_hours'], 1.5)

    def test_import_restores_completed_at(self):
        res = self.client.post(
            '/api/logs/import-backup/',
            {
                'categories': [{'code': 'CERT', 'name': 'Cert', 'completedAt': '2026-09-30T12:00:00Z'}],
                'logs': [],
            },
            format='json',
        )
        self.assertEqual(res.status_code, 201)
        cert = Category.objects.get(user=self.user, code='CERT')
        self.assertEqual(cert.completed_at, datetime(2026, 9, 30, 12, 0, tzinfo=dt_timezone.utc))


class WeekStartSettingTests(APITestCase):
    """
    Weekly totals follow the calendar week (not a rolling 7 days); the first
    day of that week is a per-account setting (Monday or Sunday).
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_to_monday(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.data['week_start'], 'mon')

    def test_patch_week_start_persists_and_validates(self):
        res = self.client.patch('/api/auth/me/', {'week_start': ' SUN '}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['week_start'], 'sun')
        self.assertEqual(UserProfile.objects.get(user=self.user).week_start, 'sun')
        for bad in ('tue', '', 'monday'):
            res = self.client.patch('/api/auth/me/', {'week_start': bad}, format='json')
            self.assertEqual(res.status_code, 400, bad)
        self.assertEqual(UserProfile.objects.get(user=self.user).week_start, 'sun')

    def test_week_start_date_helper(self):
        from .timezones import week_start_date

        wed = date(2026, 10, 21)
        self.assertEqual(week_start_date(wed, 'mon'), date(2026, 10, 19))
        self.assertEqual(week_start_date(wed, 'sun'), date(2026, 10, 18))
        mon = date(2026, 10, 19)
        self.assertEqual(week_start_date(mon, 'mon'), mon)
        self.assertEqual(week_start_date(mon, 'sun'), date(2026, 10, 18))
        sun = date(2026, 10, 25)
        self.assertEqual(week_start_date(sun, 'mon'), date(2026, 10, 19))
        self.assertEqual(week_start_date(sun, 'sun'), sun)

    def _hub_weekly_hours(self, today):
        with mock.patch('tracker.views.user_localdate', return_value=today):
            res = self.client.get('/api/hub/telemetry/', {'username': 'operator'})
        self.assertEqual(res.status_code, 200)
        return res.data['summary']['weekly_hours'], res.data['categories'][0]['weekly_hours']

    def test_hub_weekly_hours_use_calendar_week(self):
        cat = Category.objects.create(user=self.user, name='Backend', code='BACK', weekly_target_hours=5)
        # Sun 10/18 (60m), Mon 10/19 (120m), Wed 10/21 (30m)
        for d, m in ((date(2026, 10, 18), 60), (date(2026, 10, 19), 120), (date(2026, 10, 21), 30)):
            StudyLog.objects.create(user=self.user, category=cat, date=d, duration_minutes=m)

        # Monday-start week on Wed 10/21 = Mon 10/19..Sun 10/25 -> 150m
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 21)), (2.5, 2.5))
        # From Monday 00:00 the previous Sunday already belongs to last week.
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 19)), (2.5, 2.5))
        # The week before (Mon 10/12..Sun 10/18) only holds the Sunday log.
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 18)), (1.0, 1.0))

        UserProfile.objects.update_or_create(user=self.user, defaults={'week_start': 'sun'})
        # Sunday-start week on Wed 10/21 = Sun 10/18..Sat 10/24 -> 210m
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 21)), (3.5, 3.5))
        # Next Sunday a fresh week starts.
        self.assertEqual(self._hub_weekly_hours(date(2026, 10, 25)), (0.0, 0.0))


class UserStatusTests(APITestCase):
    """Self-declared status / market tags: multi-select, max 5, known ids only."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_to_empty(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.data['user_statuses'], [])

    def test_patch_statuses_keeps_order_and_dedupes(self):
        res = self.client.patch(
            '/api/auth/me/',
            {'user_statuses': ['student_cs', 'STARTUP_FOUNDER', 'student_cs']},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user_statuses'], ['student_cs', 'startup_founder'])
        self.assertEqual(
            UserProfile.objects.get(user=self.user).user_statuses, ['student_cs', 'startup_founder']
        )

    def test_rejects_more_than_five(self):
        six = ['student_cs', 'gap_year', 'tech_market', 'business_corporate', 'startup_founder', 'freelance']
        res = self.client.patch('/api/auth/me/', {'user_statuses': six}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.patch('/api/auth/me/', {'user_statuses': six[:5]}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['user_statuses']), 5)

    def test_rejects_unknown_ids(self):
        self.client.patch('/api/auth/me/', {'user_statuses': ['gap_year']}, format='json')
        res = self.client.patch('/api/auth/me/', {'user_statuses': ['gap_year', 'astronaut']}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(UserProfile.objects.get(user=self.user).user_statuses, ['gap_year'])

    def test_unknown_stored_ids_are_hidden(self):
        self.client.get('/api/auth/me/')
        UserProfile.objects.filter(user=self.user).update(user_statuses=['retired_id', 'gap_year'])
        self.assertEqual(self.client.get('/api/auth/me/').data['user_statuses'], ['gap_year'])

    def test_rejects_non_list(self):
        res = self.client.patch('/api/auth/me/', {'user_statuses': 'gap_year'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_accepts_hobby_exam_language_sport_and_style_ids(self):
        picks = ['hobby_shogi', 'exam_fe', 'lang_english', 'sport_running', 'style_night_owl']
        res = self.client.patch('/api/auth/me/', {'user_statuses': picks}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user_statuses'], picks)

    @skipUnless(FRONTEND_USER_STATUS_TS.exists(), 'frontend source not present')
    def test_ids_match_frontend_catalog(self):
        frontend_ids = re.findall(r"\['([a-z0-9_]+)', ", FRONTEND_USER_STATUS_TS.read_text(encoding='utf-8'))
        self.assertEqual(len(frontend_ids), len(set(frontend_ids)))
        self.assertEqual(set(frontend_ids), set(USER_STATUS_IDS))
        self.assertEqual(len(USER_STATUS_IDS), len(set(USER_STATUS_IDS)))

    def test_can_clear_statuses(self):
        self.client.patch('/api/auth/me/', {'user_statuses': ['gap_year']}, format='json')
        res = self.client.patch('/api/auth/me/', {'user_statuses': []}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user_statuses'], [])


class ChronoThemeSyncTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_patch_chrono_theme_persists_and_validates(self):
        self.assertEqual(self.client.get('/api/auth/me/').data['chrono_theme'], '')
        res = self.client.patch('/api/auth/me/', {'chrono_theme': 'Nixie-Tube'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['chrono_theme'], 'nixie-tube')
        res = self.client.patch('/api/auth/me/', {'chrono_theme': '<b>'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(UserProfile.objects.get(user=self.user).chrono_theme, 'nixie-tube')


class UiPrefsSyncTests(APITestCase):
    """Weather widget + motion FX preferences follow the account like the Surface Theme."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_mean_never_synced(self):
        data = self.client.get('/api/auth/me/').data
        self.assertEqual(data['weather_theme'], '')
        self.assertEqual(data['weather_unit'], '')
        self.assertIsNone(data['weather_hidden'])
        self.assertIsNone(data['surface_fx'])

    def test_patch_persists_and_other_fields_untouched(self):
        self.client.patch('/api/auth/me/', {'surface_theme': 'code-rain'}, format='json')
        res = self.client.patch(
            '/api/auth/me/',
            {'weather_theme': ' Pixel ', 'weather_unit': 'F', 'weather_hidden': True, 'surface_fx': False},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            (res.data['weather_theme'], res.data['weather_unit'], res.data['weather_hidden'], res.data['surface_fx']),
            ('pixel', 'f', True, False),
        )
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.surface_theme, 'code-rain')
        # A second "device" sees the same values.
        self.assertEqual(self.client.get('/api/auth/me/').data['weather_theme'], 'pixel')

    def test_false_and_blank_values_are_saved(self):
        self.client.patch('/api/auth/me/', {'weather_hidden': True, 'weather_unit': 'f'}, format='json')
        res = self.client.patch('/api/auth/me/', {'weather_hidden': False, 'weather_unit': ''}, format='json')
        self.assertEqual((res.data['weather_hidden'], res.data['weather_unit']), (False, ''))

    def test_validation(self):
        for payload in ({'weather_theme': '<b>'}, {'weather_unit': 'k'}, {'weather_theme': 'x' * 33}):
            res = self.client.patch('/api/auth/me/', payload, format='json')
            self.assertEqual(res.status_code, 400, payload)

    def test_precise_location_is_not_accepted(self):
        res = self.client.patch('/api/auth/me/', {'weather_precise': {'lat': 35.6, 'lon': 139.7}}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('weather_precise', res.data)


class FontAndAmbientPrefsSyncTests(APITestCase):
    """UI font + Ambient overlay prefs ride the same account sync as the weather widget."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_mean_never_synced(self):
        data = self.client.get('/api/auth/me/').data
        self.assertEqual((data['ui_font'], data['ambient_theme']), ('', ''))
        self.assertIsNone(data['ambient_clock'])

    def test_patch_persists_normalized(self):
        res = self.client.patch(
            '/api/auth/me/',
            {'ui_font': ' JetBrains-Mono ', 'ambient_theme': 'Rain', 'ambient_clock': False},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            (res.data['ui_font'], res.data['ambient_theme'], res.data['ambient_clock']),
            ('jetbrains-mono', 'rain', False),
        )
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual((profile.ui_font, profile.ambient_theme), ('jetbrains-mono', 'rain'))

    def test_validation(self):
        for payload in ({'ui_font': '<b>'}, {'ambient_theme': 'x' * 33}, {'ui_font': 'a b'}):
            res = self.client.patch('/api/auth/me/', payload, format='json')
            self.assertEqual(res.status_code, 400, payload)


@override_settings(PORTFOLIO_USERNAME='operator', PORTFOLIO_FEED_DAYS=30)
class PortfolioFeedTests(APITestCase):
    """
    GET /api/portfolio/feed/ is a public, read-only feed for rikutomikado.tech
    limited to PORTFOLIO_USERNAME's last 30 days, excluding logs opted out via
    is_public_to_portfolio.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='operator', email='operator@example.com', password='s3cure-pass-123'
        )
        self.category = Category.objects.create(user=self.user, name='Backend', code='BACK', color='#10b981')
        self.public_log = StudyLog.objects.create(
            user=self.user, category=self.category, duration_minutes=90, topic='DRF feed',
        )
        self.private_log = StudyLog.objects.create(
            user=self.user, category=self.category, duration_minutes=30,
            topic='secret', is_public_to_portfolio=False,
        )

    def test_new_logs_are_public_to_portfolio_by_default(self):
        self.assertTrue(self.public_log.is_public_to_portfolio)

    def test_feed_is_anonymous_and_returns_only_flagged_logs(self):
        res = self.client.get('/api/portfolio/feed/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([log['id'] for log in res.data], [self.public_log.id])
        self.assertEqual(res.data[0]['category'], {'code': 'BACK', 'name': 'Backend', 'color': '#10b981'})
        self.assertNotIn('user', res.data[0])

    def test_feed_ignores_invalid_bearer_token(self):
        res = self.client.get('/api/portfolio/feed/', HTTP_AUTHORIZATION='Bearer not-a-token')
        self.assertEqual(res.status_code, 200)

    def test_feed_is_read_only(self):
        res = self.client.post('/api/portfolio/feed/', {}, format='json')
        self.assertEqual(res.status_code, 405)

    def test_feed_allows_portfolio_origin(self):
        res = self.client.get('/api/portfolio/feed/', HTTP_ORIGIN='https://rikutomikado.tech')
        self.assertEqual(res['Access-Control-Allow-Origin'], 'https://rikutomikado.tech')

    def test_hub_flag_does_not_leak_into_portfolio_feed(self):
        self.assertTrue(self.private_log.is_public_to_hub)
        res = self.client.get('/api/portfolio/feed/')
        self.assertNotIn(self.private_log.id, [log['id'] for log in res.data])

    def test_feed_excludes_other_users_logs(self):
        other = User.objects.create_user(username='someone', email='someone@example.com', password='s3cure-pass-123')
        other_cat = Category.objects.create(user=other, name='Other', code='OTHR', color='#000000')
        other_log = StudyLog.objects.create(user=other, category=other_cat, duration_minutes=60, topic='not mine')
        res = self.client.get('/api/portfolio/feed/')
        self.assertNotIn(other_log.id, [log['id'] for log in res.data])

    def test_feed_covers_only_last_30_days(self):
        today = timezone.localdate()
        edge_log = StudyLog.objects.create(
            user=self.user, category=self.category, duration_minutes=45,
            topic='29 days ago', date=today - timedelta(days=29),
        )
        old_log = StudyLog.objects.create(
            user=self.user, category=self.category, duration_minutes=45,
            topic='30 days ago', date=today - timedelta(days=30),
        )
        ids = [log['id'] for log in self.client.get('/api/portfolio/feed/').data]
        self.assertIn(edge_log.id, ids)
        self.assertNotIn(old_log.id, ids)

    @override_settings(PORTFOLIO_USERNAME='missing-user')
    def test_feed_is_empty_when_portfolio_user_missing(self):
        res = self.client.get('/api/portfolio/feed/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])


class RegistrationGateTests(APITestCase):
    """POST /api/auth/register/ is closed unless ALLOW_REGISTRATION is on."""

    payload = {'username': 'newcomer', 'email': 'newcomer@example.com', 'password': 's3cure-pass-123'}

    @override_settings(ALLOW_REGISTRATION=False)
    def test_register_is_rejected_when_closed(self):
        res = self.client.post('/api/auth/register/', self.payload, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(User.objects.filter(username='newcomer').exists())

    @override_settings(ALLOW_REGISTRATION=True)
    def test_register_works_when_open(self):
        res = self.client.post('/api/auth/register/', self.payload, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(User.objects.filter(username='newcomer').exists())

    @override_settings(ALLOW_REGISTRATION=False)
    def test_existing_user_can_still_log_in_when_closed(self):
        User.objects.create_user(username='operator', email='operator@example.com', password='s3cure-pass-123')
        res = self.client.post(
            '/api/auth/login/', {'username': 'operator', 'password': 's3cure-pass-123'}, format='json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)


class PlanetarySignalTests(APITestCase):
    """GET /api/planetary/signal/ proxies USGS + NASA DONKI with per-source fallback."""

    usgs_payload = {
        'features': [
            {
                'id': 'us6000aaaa',
                'properties': {
                    'type': 'earthquake', 'mag': 5.84, 'time': 1792671777822, 'tsunami': 1,
                    'place': '200 km NW of Port-Olry,\n Vanuatu',
                    'url': 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000aaaa',
                },
            },
            {
                'id': 'evil',
                'properties': {
                    'type': 'earthquake', 'mag': 3.1, 'time': 1792671000000, 'tsunami': 0,
                    'place': 'Somewhere', 'url': 'https://evil-usgs.gov/phish',
                },
            },
            {'id': 'blast', 'properties': {'type': 'quarry blast', 'mag': 2.6, 'time': 1792670000000}},
            {'id': 'nomag', 'properties': {'type': 'earthquake', 'mag': None, 'time': 1792670000000}},
        ],
    }
    flr_payload = [
        {
            'flrID': '2026-10-20T06:27:00-FLR-001', 'beginTime': '2026-10-20T06:00Z', 'peakTime': '2026-10-20T06:27Z',
            'classType': 'm1.2', 'activeRegionNum': 13912,
            'link': 'https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/-1',
        },
        {'flrID': 'bad', 'peakTime': '2026-10-20T07:00Z', 'classType': 'Q9'},
    ]
    cme_payload = [
        {
            'activityID': '2026-10-19T12:00:00-CME-001', 'startTime': '2026-10-19T12:00Z',
            'link': 'https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/CME/1/-1',
            'cmeAnalyses': [
                {'isMostAccurate': False, 'speed': 300, 'enlilList': []},
                {
                    'isMostAccurate': True, 'speed': 812.4,
                    'enlilList': [
                        {'estimatedShockArrivalTime': '2026-10-22T14:00Z', 'isEarthGB': True},
                        {'estimatedShockArrivalTime': '2026-10-22T09:30Z', 'isEarthGB': False},
                        {'estimatedShockArrivalTime': None, 'isEarthGB': False},
                    ],
                },
            ],
        },
    ]
    gst_payload = [
        {
            'gstID': '2026-10-18T03:00:00-GST-001', 'startTime': '2026-10-18T03:00Z',
            'allKpIndex': [{'kpIndex': 5.33}, {'kpIndex': 6.67}],
            'link': 'https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/GST/1/-1',
        },
    ]

    def setUp(self):
        cache.clear()

    def _fake_get(self, donki_fails=False, usgs_fails=False):
        payloads = {'FLR': self.flr_payload, 'CME': self.cme_payload, 'GST': self.gst_payload}

        def fake_get(url, *args, **kwargs):
            response = mock.Mock()
            response.raise_for_status.return_value = None
            if 'usgs.gov' in url:
                if usgs_fails:
                    raise requests.ConnectionError('down')
                response.json.return_value = self.usgs_payload
                return response
            if donki_fails:
                raise requests.ConnectionError('down')
            data = payloads[url.rsplit('/', 1)[-1]]
            response.content = b'x'
            response.json.return_value = data
            return response

        return fake_get

    def test_parses_both_sources(self):
        with mock.patch('tracker.views.requests.get', side_effect=self._fake_get()):
            res = self.client.get('/api/planetary/signal/')
        self.assertEqual(res.status_code, 200)

        seismic = res.data['seismic']
        self.assertEqual(seismic['status'], 'ok')
        self.assertEqual([e['id'] for e in seismic['events']], ['us6000aaaa', 'evil'])
        quake = seismic['events'][0]
        self.assertEqual(quake['mag'], 5.8)
        self.assertEqual(quake['place'], '200 km NW of Port-Olry, Vanuatu')
        self.assertTrue(quake['tsunami'])
        self.assertTrue(quake['time'].endswith('Z'))
        self.assertIsNone(seismic['events'][1]['url'])

        solar = res.data['solar']
        self.assertEqual(solar['status'], 'ok')
        self.assertEqual(len(solar['flares']), 1)
        self.assertEqual(solar['flares'][0]['classType'], 'M1.2')
        self.assertEqual(solar['flares'][0]['time'], '2026-10-20T06:27:00Z')
        cme = solar['cmes'][0]
        self.assertEqual(cme['speed'], 812)
        self.assertEqual(cme['earthArrival'], '2026-10-22T09:30:00Z')
        self.assertTrue(cme['glancing'])
        self.assertEqual(solar['storms'][0]['maxKp'], 6.67)

    def test_donki_outage_does_not_break_seismic(self):
        with mock.patch('tracker.views.requests.get', side_effect=self._fake_get(donki_fails=True)):
            res = self.client.get('/api/planetary/signal/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['seismic']['status'], 'ok')
        self.assertEqual(res.data['solar'], {'status': 'unavailable', 'flares': [], 'cmes': [], 'storms': []})

    def test_outage_serves_last_good_copy_as_stale(self):
        with mock.patch('tracker.views.requests.get', side_effect=self._fake_get()):
            self.client.get('/api/planetary/signal/')
        cache.delete('planetary_usgs')
        with mock.patch('tracker.views.requests.get', side_effect=self._fake_get(usgs_fails=True)):
            res = self.client.get('/api/planetary/signal/')
        self.assertEqual(res.data['seismic']['status'], 'stale')
        self.assertEqual(len(res.data['seismic']['events']), 2)

    def test_failure_is_cached_briefly(self):
        with mock.patch('tracker.views.requests.get', side_effect=self._fake_get(donki_fails=True, usgs_fails=True)) as fake:
            self.client.get('/api/planetary/signal/')
            calls = fake.call_count
            self.client.get('/api/planetary/signal/')
        self.assertEqual(fake.call_count, calls)
