from django.contrib import admin
from .models import Category, StudyLog, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'avatar_preset', 'avatar_color', 'surface_theme', 'language', 'timezone', 'updated_at')
    search_fields = ('user__username', 'user__email')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'user', 'color', 'weekly_target_hours', 'is_active', 'created_at')
    list_filter = ('user', 'is_active')
    search_fields = ('name', 'code', 'user__username')


@admin.register(StudyLog)
class StudyLogAdmin(admin.ModelAdmin):
    list_display = ('date', 'category', 'user', 'duration_minutes', 'is_public_to_hub', 'topic', 'created_at')
    list_filter = ('is_public_to_hub', 'date', 'user', 'category')
    search_fields = ('topic', 'user__username', 'category__name')
    date_hierarchy = 'date'

