import re
from datetime import timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from .models import Category, StudyLog, UserProfile, monthly_to_weekly_hours
from .timezones import is_valid_timezone

User = get_user_model()

VALID_AVATAR_PRESETS = {
    'initial',
    'terminal',
    'cpu',
    'code',
    'zap',
    'shield',
    'globe',
    'sparkles',
    'flame',
    'compass',
    'layers',
    'database',
}

# Surface Theme ids are slug-like keys defined in the frontend catalog
# (e.g. 'monolith', 'cement-chalk-dust'). The backend doesn't mirror that
# catalog, so it only enforces the shape; unknown ids fall back to the
# default theme on the client.
SURFACE_THEME_ID_RE = re.compile(r'^[a-z0-9][a-z0-9-]{0,63}$')

SUPPORTED_LANGUAGES = {'en', 'ja'}

SUPPORTED_WEEK_STARTS = {'mon', 'sun'}

# Weather widget theme ids are slugs from frontend/src/weatherThemes.ts.
WEATHER_THEME_ID_RE = re.compile(r'^[a-z0-9][a-z0-9-]{0,31}$')
SUPPORTED_WEATHER_UNITS = {'', 'c', 'f'}

# UI font / Ambient overlay ids are slugs from frontend/src/uiFonts.ts and
# frontend/src/ambientThemes.ts.
UI_FONT_ID_RE = WEATHER_THEME_ID_RE
AMBIENT_THEME_ID_RE = WEATHER_THEME_ID_RE

# Chronometer Theme ids follow the same slug shape as Surface Themes; the
# catalog (and its unlock rules) lives in the frontend.
CHRONO_THEME_ID_RE = SURFACE_THEME_ID_RE

# User status / market tags. Must stay in sync with USER_STATUS_OPTIONS in
# frontend/src/userStatus.ts (labels and grouping live there). Ids are stored
# on accounts: never rename one. A removed id is dropped from responses (see
# UserSerializer.to_representation), clearing that pick on every account.
USER_STATUS_IDS = (
    'student_cs',
    'student_data_science',
    'student_information_systems',
    'student_engineering',
    'student_electrical',
    'student_mechanical',
    'student_civil',
    'student_science',
    'student_mathematics',
    'student_physics',
    'student_chemistry',
    'student_biology',
    'student_business',
    'student_law',
    'student_international',
    'student_medicine',
    'student_nursing',
    'student_pharmacy',
    'student_dentistry',
    'student_veterinary',
    'student_psychology',
    'student_education',
    'student_humanities',
    'student_languages',
    'student_media',
    'student_design_arts',
    'student_music',
    'student_architecture',
    'student_agriculture',
    'student_other',
    'exam_prep',
    'ronin',
    'middle_school_student',
    'high_school_student',
    'college_of_technology',
    'junior_college',
    'vocational_student',
    'university_freshman',
    'university_senior',
    'masters_student',
    'mba_student',
    'law_school',
    'medical_school',
    'online_degree',
    'night_school',
    'mature_student',
    'bootcamp_self_taught',
    'homeschool',
    'international_student',
    'exchange_student',
    'certification_prep',
    'mission_grad_school',
    'mission_study_abroad',
    'job_seeking',
    'reskilling',
    'studying_while_working',
    'mission_portfolio',
    'mission_ship_project',
    'mission_fluency',
    'mission_fundamentals',
    'building_habits',
    'gap_year',
    'hobbyist',
    'lifelong_learner',
    'style_early_bird',
    'rhythm_daytime',
    'style_night_owl',
    'rhythm_routine',
    'style_weekend',
    'style_commute',
    'rhythm_long_range',
    'rhythm_backward',
    'rhythm_weekly',
    'rhythm_daily_list',
    'rhythm_flow',
    'rhythm_deadline',
    'style_streak',
    'style_pomodoro',
    'style_deep_work',
    'style_short_bursts',
    'method_spaced_repetition',
    'method_active_recall',
    'method_past_papers',
    'method_handwritten',
    'method_second_brain',
    'method_teach',
    'method_build',
    'method_video',
    'style_study_group',
    'style_library',
    'style_cafe_studier',
    'method_home_desk',
    'arch_generalist',
    'arch_specialist',
    'arch_t_shaped',
    'arch_completionist',
    'arch_rabbit_holer',
    'arch_tinkerer',
    'arch_questioner',
    'arch_archivist',
    'arch_marathoner',
    'arch_perfectionist',
    'arch_course_collector',
    'arch_phoenix',
    'fuel_coffee',
    'fuel_tea',
    'fuel_energy_drink',
    'fuel_snacks',
    'style_lofi',
    'fuel_instrumental',
    'fuel_soundtracks',
    'fuel_noise',
    'fuel_nature',
    'fuel_study_with_me',
    'style_silence',
    'fuel_desk_ritual',
    'hobby_reading',
    'hobby_writing',
    'hobby_journaling',
    'hobby_drawing',
    'hobby_painting',
    'hobby_calligraphy',
    'hobby_photography',
    'hobby_film',
    'hobby_anime_manga',
    'hobby_gaming',
    'hobby_board_games',
    'hobby_tcg',
    'hobby_chess',
    'hobby_shogi',
    'hobby_go',
    'hobby_puzzles',
    'hobby_speedcubing',
    'hobby_math_for_fun',
    'hobby_history',
    'hobby_philosophy',
    'hobby_astronomy',
    'hobby_music_listening',
    'hobby_instrument',
    'hobby_singing',
    'hobby_djing',
    'hobby_live_music',
    'hobby_theater',
    'hobby_podcasts',
    'hobby_idols',
    'hobby_cosplay',
    'hobby_fashion',
    'hobby_cooking',
    'hobby_baking',
    'hobby_coffee',
    'hobby_tea',
    'hobby_wine_sake',
    'hobby_cafe_hopping',
    'hobby_gardening',
    'hobby_crafts',
    'hobby_origami',
    'hobby_models',
    'hobby_collecting',
    'hobby_diy',
    'hobby_electronics',
    'hobby_3d_printing',
    'hobby_keyboards',
    'hobby_homelab',
    'hobby_retro_computing',
    'hobby_ham_radio',
    'hobby_cars',
    'hobby_trains',
    'hobby_travel',
    'hobby_camping',
    'hobby_fishing',
    'hobby_birdwatching',
    'hobby_museums',
    'hobby_pets',
    'hobby_meditation',
    'hobby_investing',
    'hobby_volunteering',
    'sport_running',
    'sport_marathon',
    'sport_walking',
    'sport_mountaineering',
    'sport_climbing',
    'sport_gym',
    'sport_calisthenics',
    'sport_yoga',
    'sport_cycling',
    'sport_swimming',
    'sport_triathlon',
    'sport_soccer',
    'sport_baseball',
    'sport_basketball',
    'sport_volleyball',
    'sport_rugby',
    'sport_tennis',
    'sport_table_tennis',
    'sport_badminton',
    'sport_golf',
    'sport_martial_arts',
    'sport_kendo_judo',
    'sport_boxing',
    'sport_skiing',
    'sport_surfing',
    'sport_skateboarding',
    'sport_dance',
    'sport_esports',
    'sport_coach',
    'sport_watching',
)
MAX_USER_STATUSES = 12


# ==========================================
# Authentication & User Serializers
# ==========================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the current authenticated user profile, including hybrid avatar settings.
    Supports GET and PATCH on /api/auth/me/.
    """
    avatar_color = serializers.CharField(required=False, max_length=20)
    avatar_preset = serializers.CharField(required=False, max_length=30)
    avatar_image = serializers.CharField(required=False, allow_blank=True)
    surface_theme = serializers.CharField(required=False, allow_blank=True, max_length=64)
    language = serializers.CharField(required=False, allow_blank=True, max_length=8)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=64)
    week_start = serializers.CharField(required=False, max_length=3)
    chrono_theme = serializers.CharField(required=False, allow_blank=True, max_length=64)
    user_statuses = serializers.ListField(
        child=serializers.CharField(max_length=40), required=False, allow_empty=True
    )
    weather_theme = serializers.CharField(required=False, allow_blank=True, max_length=32)
    weather_unit = serializers.CharField(required=False, allow_blank=True, max_length=1)
    weather_hidden = serializers.BooleanField(required=False, allow_null=True)
    surface_fx = serializers.BooleanField(required=False, allow_null=True)
    ui_font = serializers.CharField(required=False, allow_blank=True, max_length=32)
    ambient_theme = serializers.CharField(required=False, allow_blank=True, max_length=32)
    ambient_clock = serializers.BooleanField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'avatar_color',
            'avatar_preset',
            'avatar_image',
            'surface_theme',
            'language',
            'timezone',
            'week_start',
            'chrono_theme',
            'user_statuses',
            'weather_theme',
            'weather_unit',
            'weather_hidden',
            'surface_fx',
            'ui_font',
            'ambient_theme',
            'ambient_clock',
        )
        read_only_fields = ('id',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        data['avatar_color'] = profile.avatar_color
        data['avatar_preset'] = profile.avatar_preset
        data['avatar_image'] = profile.avatar_image
        data['surface_theme'] = profile.surface_theme
        data['language'] = profile.language
        data['timezone'] = profile.timezone
        data['week_start'] = profile.week_start or UserProfile.WEEK_START_MONDAY
        data['chrono_theme'] = profile.chrono_theme
        data['user_statuses'] = [s for s in (profile.user_statuses or []) if s in USER_STATUS_IDS]
        data['weather_theme'] = profile.weather_theme
        data['weather_unit'] = profile.weather_unit
        data['weather_hidden'] = profile.weather_hidden
        data['surface_fx'] = profile.surface_fx
        data['ui_font'] = profile.ui_font
        data['ambient_theme'] = profile.ambient_theme
        data['ambient_clock'] = profile.ambient_clock
        return data

    def validate_username(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Username cannot be empty.')
        if len(cleaned) < 2 or len(cleaned) > 30:
            raise serializers.ValidationError('Username must be between 2 and 30 characters.')
        qs = User.objects.filter(username__iexact=cleaned)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return cleaned

    def validate_email(self, value):
        cleaned = value.strip().lower()
        if not cleaned:
            raise serializers.ValidationError('Email address is required.')
        # Re-submitting the address already on the account is not a change.
        # auth.User.email has no unique constraint, so legacy rows (e.g. a
        # createsuperuser account sharing the address) can collide here and
        # would otherwise block every profile save.
        if self.instance and cleaned == (self.instance.email or '').strip().lower():
            return cleaned
        qs = User.objects.filter(email__iexact=cleaned)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return cleaned

    def validate_avatar_preset(self, value):
        cleaned = value.strip().lower()
        if cleaned not in VALID_AVATAR_PRESETS:
            return 'initial'
        return cleaned

    def validate_avatar_image(self, value):
        if not value:
            return ''
        cleaned = value.strip()
        # Restrict to raster subtypes only (the frontend always re-encodes
        # uploads to webp/jpeg via <canvas> before sending). Explicitly
        # reject svg+xml and any other subtype: an SVG data URL can embed
        # <script>/event-handler payloads, and while <img> does not execute
        # them today, allowing only known-safe raster types removes that
        # class of risk entirely rather than relying on the current render
        # path never changing.
        allowed_subtypes = ('png', 'jpeg', 'jpg', 'webp', 'gif')
        if not any(cleaned.startswith(f'data:image/{t};base64,') for t in allowed_subtypes):
            raise serializers.ValidationError(
                'Avatar image must be a base64 PNG, JPEG, WEBP, or GIF Data URL.'
            )
        if len(cleaned) > 180_000:
            raise serializers.ValidationError('Avatar image data exceeds maximum size limit (~130KB).')
        return cleaned

    def validate_surface_theme(self, value):
        cleaned = value.strip().lower()
        if cleaned and not SURFACE_THEME_ID_RE.match(cleaned):
            raise serializers.ValidationError('Invalid surface theme id.')
        return cleaned

    def validate_language(self, value):
        cleaned = value.strip().lower()
        if cleaned and cleaned not in SUPPORTED_LANGUAGES:
            raise serializers.ValidationError('Unsupported language.')
        return cleaned

    def validate_timezone(self, value):
        cleaned = value.strip()
        if cleaned and not is_valid_timezone(cleaned):
            raise serializers.ValidationError('Unknown time zone. Use an IANA name such as "Asia/Tokyo".')
        return cleaned

    def validate_week_start(self, value):
        cleaned = value.strip().lower()
        if cleaned not in SUPPORTED_WEEK_STARTS:
            raise serializers.ValidationError('Week start must be "mon" or "sun".')
        return cleaned

    def validate_chrono_theme(self, value):
        cleaned = value.strip().lower()
        if cleaned and not CHRONO_THEME_ID_RE.match(cleaned):
            raise serializers.ValidationError('Invalid chronometer theme id.')
        return cleaned

    def validate_user_statuses(self, value):
        cleaned = []
        for item in value:
            key = item.strip().lower()
            if key not in USER_STATUS_IDS:
                raise serializers.ValidationError(f'Unknown status "{item}".')
            if key not in cleaned:
                cleaned.append(key)
        if len(cleaned) > MAX_USER_STATUSES:
            raise serializers.ValidationError(f'Select at most {MAX_USER_STATUSES} statuses.')
        return cleaned

    def validate_weather_theme(self, value):
        cleaned = value.strip().lower()
        if cleaned and not WEATHER_THEME_ID_RE.match(cleaned):
            raise serializers.ValidationError('Invalid weather theme id.')
        return cleaned

    def validate_ui_font(self, value):
        cleaned = value.strip().lower()
        if cleaned and not UI_FONT_ID_RE.match(cleaned):
            raise serializers.ValidationError('Invalid UI font id.')
        return cleaned

    def validate_ambient_theme(self, value):
        cleaned = value.strip().lower()
        if cleaned and not AMBIENT_THEME_ID_RE.match(cleaned):
            raise serializers.ValidationError('Invalid ambient theme id.')
        return cleaned

    def validate_weather_unit(self, value):
        cleaned = value.strip().lower()
        if cleaned not in SUPPORTED_WEATHER_UNITS:
            raise serializers.ValidationError('Weather unit must be "c", "f" or blank.')
        return cleaned

    def update(self, instance, validated_data):
        avatar_color = validated_data.pop('avatar_color', None)
        avatar_preset = validated_data.pop('avatar_preset', None)
        avatar_image = validated_data.pop('avatar_image', None)
        surface_theme = validated_data.pop('surface_theme', None)
        language = validated_data.pop('language', None)
        tz_name = validated_data.pop('timezone', None)
        week_start = validated_data.pop('week_start', None)
        chrono_theme = validated_data.pop('chrono_theme', None)
        user_statuses = validated_data.pop('user_statuses', None)
        # Nullable booleans: "key present" matters, not just the value.
        ui_prefs = {
            key: validated_data.pop(key)
            for key in (
                'weather_theme', 'weather_unit', 'weather_hidden', 'surface_fx',
                'ui_font', 'ambient_theme', 'ambient_clock',
            )
            if key in validated_data
        }

        if 'username' in validated_data or 'email' in validated_data:
            if 'username' in validated_data:
                instance.username = validated_data['username']
            if 'email' in validated_data:
                instance.email = validated_data['email']
            instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        profile_updated = False
        if avatar_color is not None:
            profile.avatar_color = avatar_color
            profile_updated = True
        if avatar_preset is not None:
            profile.avatar_preset = avatar_preset
            profile_updated = True
        if avatar_image is not None:
            profile.avatar_image = avatar_image
            profile_updated = True
        if surface_theme is not None:
            profile.surface_theme = surface_theme
            profile_updated = True
        if language is not None:
            profile.language = language
            profile_updated = True
        if tz_name is not None:
            profile.timezone = tz_name
            profile_updated = True
        if week_start is not None:
            profile.week_start = week_start
            profile_updated = True
        if chrono_theme is not None:
            profile.chrono_theme = chrono_theme
            profile_updated = True
        if user_statuses is not None:
            profile.user_statuses = user_statuses
            profile_updated = True
        for key, value in ui_prefs.items():
            setattr(profile, key, value)
            profile_updated = True
        if profile_updated:
            profile.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for new user registration.
    """
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_username(self, value):
        cleaned = value.strip()
        if len(cleaned) < 2 or len(cleaned) > 30:
            raise serializers.ValidationError('Username must be between 2 and 30 characters.')
        if User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return cleaned

    def validate_email(self, value):
        cleaned = value.strip().lower()
        if not cleaned:
            raise serializers.ValidationError('Email address is required.')
        if User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return cleaned

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        UserProfile.objects.get_or_create(user=user)
        # Create default categories for convenience upon signup
        Category.objects.bulk_create([
            Category(user=user, name='Backend & Architecture', code='BACK', color='#10b981', weekly_target_hours=9),
            Category(user=user, name='Electrical & Facility Eng', code='ELEC', color='#3b82f6', weekly_target_hours=8),
            Category(user=user, name='Network & Infrastructure', code='NET', color='#f59e0b', weekly_target_hours=6),
            Category(user=user, name='English / Academic Writing', code='LANG', color='#a855f7', weekly_target_hours=5),
        ])
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password when already authenticated.
    """
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate_new_password(self, value):
        user = self.context['request'].user
        try:
            validate_password(value, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset email.
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming a password reset using uid and token from email link.
    """
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate(self, attrs):
        try:
            uid_str = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=uid_str)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'detail': 'Invalid or expired password reset link.'})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'detail': 'Password reset token is invalid or has expired.'})

        try:
            validate_password(attrs['new_password'], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)})

        attrs['user'] = user
        return attrs



# ==========================================
# Category Serializer
# ==========================================

class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for study categories.

    `monthly_target_hours` is a transitional alias from before the switch to
    weekly targets, so a frontend build (or an already-open browser tab) that
    still speaks the old field keeps working while frontend and backend are
    deployed separately. Reads return the monthly equivalent; writes are
    converted to weekly unless `weekly_target_hours` is also sent.
    TODO: drop once every client uses weekly_target_hours.

    DONE state: clients send `completed: true/false`; the server stamps
    `completed_at` itself so the completion time can't be forged or skewed
    by a client clock.
    """
    monthly_target_hours = serializers.IntegerField(
        required=False, min_value=1, max_value=744, write_only=True
    )
    completed = serializers.BooleanField(required=False, write_only=True)
    completed_at = serializers.DateTimeField(read_only=True, default_timezone=dt_timezone.utc)

    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'code',
            'color',
            'weekly_target_hours',
            'is_active',
            'completed',
            'completed_at',
            'monthly_target_hours',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'completed_at', 'created_at', 'updated_at')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['monthly_target_hours'] = max(1, round(instance.weekly_target_hours * 52 / 12))
        return data

    def validate(self, attrs):
        monthly = attrs.pop('monthly_target_hours', None)
        if monthly is not None and 'weekly_target_hours' not in attrs:
            attrs['weekly_target_hours'] = monthly_to_weekly_hours(monthly)

        completed = attrs.pop('completed', None)
        already_done = self.instance is not None and self.instance.completed_at is not None
        if completed and not already_done:
            # Keep at least one in-progress category, otherwise the log form
            # would have nothing to record against.
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                others_open = Category.objects.filter(user=request.user, completed_at__isnull=True)
                if self.instance is not None:
                    others_open = others_open.exclude(pk=self.instance.pk)
                if not others_open.exists():
                    raise serializers.ValidationError(
                        {'completed': 'At least one in-progress category is required.'}
                    )
            attrs['completed_at'] = timezone.now()
        elif completed is False:
            attrs['completed_at'] = None
        return attrs

    def validate_code(self, value):
        cleaned = value.strip().upper()
        if not cleaned:
            raise serializers.ValidationError('Category code cannot be empty.')
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            qs = Category.objects.filter(user=request.user, code__iexact=cleaned)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(f'Category with code [{cleaned}] already exists.')
        return cleaned

    def validate_weekly_target_hours(self, value):
        if value < 1 or value > 168:
            raise serializers.ValidationError('Weekly target hours must be between 1 and 168.')
        return value


# ==========================================
# Study Log Serializer
# ==========================================

class StudyLogSerializer(serializers.ModelSerializer):
    """
    Serializer for individual study logs.
    Includes flattened category metadata for easy consumption by React UI.
    """
    category_code = serializers.CharField(source='category.code', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    # Always serialized as UTC ISO-8601 (e.g. 2026-10-19T09:22:00Z) no matter
    # what settings.TIME_ZONE is; the client converts to the user's zone.
    created_at = serializers.DateTimeField(read_only=True, default_timezone=dt_timezone.utc)
    updated_at = serializers.DateTimeField(read_only=True, default_timezone=dt_timezone.utc)

    class Meta:
        model = StudyLog
        fields = (
            'id',
            'category',
            'category_code',
            'category_name',
            'category_color',
            'date',
            'duration_minutes',
            'duration_hours',
            'topic',
            'is_public_to_hub',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'duration_hours',
            'category_code',
            'category_name',
            'category_color',
            'created_at',
            'updated_at',
        )

    def validate_duration_minutes(self, value):
        if value < 1 or value > 1440:
            raise serializers.ValidationError('Duration must be between 1 and 1440 minutes (24 hours).')
        return value

    def validate_category(self, category):
        # Ensure user can only link logs to their own categories
        user = self.context['request'].user
        if category and category.user != user:
            raise serializers.ValidationError('Selected category does not belong to you.')
        return category


# ==========================================
# Portfolio Feed Serializer (read-only)
# ==========================================

class PortfolioFeedCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('code', 'name', 'color')
        read_only_fields = fields


class PortfolioFeedLogSerializer(serializers.ModelSerializer):
    """
    Public, read-only shape for GET /api/portfolio/feed/.
    Deliberately omits user / account fields.
    """
    category = PortfolioFeedCategorySerializer(read_only=True)
    created_at = serializers.DateTimeField(read_only=True, default_timezone=dt_timezone.utc)

    class Meta:
        model = StudyLog
        fields = (
            'id',
            'date',
            'duration_minutes',
            'duration_hours',
            'topic',
            'category',
            'created_at',
        )
        read_only_fields = fields
