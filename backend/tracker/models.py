from django.conf import settings
from django.db import models
from django.utils import timezone


class Category(models.Model):
    """
    Study category model, linked to a specific user.
    Example: [BACK] Backend & Architecture (#10b981) - Target: 40 hrs/month
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='categories'
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)  # e.g., 'BACK', 'ELEC', 'NET'
    color = models.CharField(max_length=20, default='#10b981')  # Hex color string
    monthly_target_hours = models.PositiveIntegerField(default=10)
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
    date = models.DateField(default=timezone.now)
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
