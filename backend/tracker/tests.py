from datetime import date, datetime, timezone as dt_timezone
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Category, StudyLog, UserProfile, monthly_to_weekly_hours

User = get_user_model()


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

    def test_import_converts_legacy_monthly_targets(self):
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
        self.assertEqual(Category.objects.get(user=self.user, code='OLD').weekly_target_hours, 9)
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
