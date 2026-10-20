from django.conf import settings
from django.db import models
from django.utils import timezone


def monthly_to_weekly_hours(monthly_hours):
    """Monthly target -> equivalent weekly target (12 months / 52 weeks), clamped to 1..168."""
    return max(1, min(168, round(monthly_hours * 12 / 52)))


class UserProfile(models.Model):
    """
    Extended profile settings for a User, including hybrid avatar customization
    (color accent, preset icon, or compressed base64 Data URL image stored in DB),
    the account-wide Surface Theme preference, UI language / time zone, the
    first day of the user's calendar week, Chronometer Theme and self-declared
    user statuses (role / market tags).
    """
    WEEK_START_MONDAY = 'mon'
    WEEK_START_SUNDAY = 'sun'
    WEEK_START_CHOICES = [
        (WEEK_START_MONDAY, 'Monday'),
        (WEEK_START_SUNDAY, 'Sunday'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    avatar_color = models.CharField(max_length=20, default='#10b981')
    avatar_preset = models.CharField(max_length=30, default='initial')
    avatar_image = models.TextField(blank=True, default='')
    # Selected Surface Theme Pair id (e.g. 'monolith'), synced across devices.
    # Blank means the user has never picked one on any device yet.
    surface_theme = models.CharField(max_length=64, blank=True, default='')
    # UI language ('en' / 'ja'). Blank = never chosen; the client default applies.
    language = models.CharField(max_length=8, blank=True, default='')
    # IANA time zone name (e.g. 'Asia/Tokyo') used to render the user's UTC
    # timestamps and to decide their "today". Blank = not set yet.
    timezone = models.CharField(max_length=64, blank=True, default='')
    # First day of the calendar week that weekly totals / targets reset on.
    week_start = models.CharField(max_length=3, choices=WEEK_START_CHOICES, default=WEEK_START_MONDAY)
    # Selected Chronometer Theme id (frontend catalog). Blank = default face.
    chrono_theme = models.CharField(max_length=64, blank=True, default='')
    # Up to 5 status ids (e.g. ['student_cs', 'startup_founder']), ordered as picked.
    user_statuses = models.JSONField(default=list, blank=True)
    # Chronometer weather widget, synced like the Surface Theme. Blank theme
    # = never synced from any device yet; blank unit = pick from time zone.
    # (Precise location coordinates are deliberately NOT stored here.)
    weather_theme = models.CharField(max_length=32, blank=True, default='')
    weather_unit = models.CharField(max_length=1, blank=True, default='')
    # null = never chosen on any device (first sync adopts the device's value).
    weather_hidden = models.BooleanField(null=True, blank=True, default=None)
    surface_fx = models.BooleanField(null=True, blank=True, default=None)
    # Surface Theme ids granted as EXPLORE MAP clear rewards. Unlike
    # user_statuses, this is NOT client-writable: it has an attached economy
    # (earned by spending DATA CREDITS to fully unlock a map), so it is only
    # ever set server-side inside the unlock-cell transaction.
    unlocked_map_theme_ids = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"Profile ({self.user.username})"


class CreditWallet(models.Model):
    """
    DATA CREDITS balance for a user. Kept as its own row (rather than fields
    on UserProfile) so a credit spend can `select_for_update()` this table
    without lock-contending with unrelated profile preference PATCHes.

    `balance` is spendable now; `lifetime_earned` / `lifetime_spent` only
    ever increase and should satisfy `balance == lifetime_earned -
    lifetime_spent` at all times (an auditable integrity invariant, not
    enforced at the DB level).
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='credit_wallet'
    )
    balance = models.BigIntegerField(default=0)
    lifetime_earned = models.BigIntegerField(default=0)
    lifetime_spent = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Credit Wallet'
        verbose_name_plural = 'Credit Wallets'

    def __str__(self):
        return f"Wallet ({self.user.username}): {self.balance}"


class MapProgress(models.Model):
    """
    Per-user progress on one EXPLORE MAP (see tracker/maps_catalog.py for the
    grid size, cost formula and per-map clear rewards). `unlocked_cells` is a
    JSON list of [x, y] pairs (0-indexed), always including the pre-unlocked
    center cell. Lazily created per user+map on first access rather than
    pre-populated for every user.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='map_progress'
    )
    map_id = models.CharField(max_length=32)
    unlocked_cells = models.JSONField(default=list, blank=True)
    is_cleared = models.BooleanField(default=False)
    cleared_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Map Progress'
        verbose_name_plural = 'Map Progress'
        constraints = [
            models.UniqueConstraint(fields=['user', 'map_id'], name='unique_user_map_progress')
        ]
        indexes = [models.Index(fields=['user', 'map_id'])]

    def __str__(self):
        return f"{self.map_id} ({self.user.username}): {len(self.unlocked_cells)} cells"


class Category(models.Model):
    """
    Study category model, linked to a specific user.
    Example: [BACK] Backend & Architecture (#10b981) - Target: 9 hrs/week

    Inactive categories keep their history (logs, analytics) but no longer
    carry a weekly target; they're parked rather than deleted.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='categories'
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)  # e.g., 'BACK', 'ELEC', 'NET'
    color = models.CharField(max_length=20, default='#10b981')  # Hex color string
    # Target per calendar week (starting on the user's week_start day, in
    # their time zone); resets at 00:00 on that day.
    weekly_target_hours = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['code', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'code'],
                name='unique_user_category_code'
            )
        ]

    def __str__(self):
        return f"[{self.code}] {self.name} ({self.user.username})"


class StudyLog(models.Model):
    """
    Individual study session log recorded either manually or via stopwatch.
    Linked to a user and optionally to a Category.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='study_logs'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )
    date = models.DateField(default=timezone.localdate)
    duration_minutes = models.PositiveIntegerField(default=60)
    topic = models.CharField(max_length=255, blank=True)
    is_public_to_hub = models.BooleanField(
        default=True,
        help_text='Flag to indicate if this log is public to the portfolio/hub aggregator'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Study Log'
        verbose_name_plural = 'Study Logs'
        ordering = ['-date', '-created_at']

    def __str__(self):
        cat_code = self.category.code if self.category else 'N/A'
        return f"{self.date} [{cat_code}] {self.duration_minutes}m - {self.topic[:30]}"

    @property
    def duration_hours(self):
        return round(self.duration_minutes / 60, 2)
