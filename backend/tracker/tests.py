from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import UserProfile

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
