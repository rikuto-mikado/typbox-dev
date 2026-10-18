from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from .models import Category, StudyLog, UserProfile

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

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'avatar_color',
            'avatar_preset',
            'avatar_image',
        )
        read_only_fields = ('id',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        data['avatar_color'] = profile.avatar_color
        data['avatar_preset'] = profile.avatar_preset
        data['avatar_image'] = profile.avatar_image
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

    def update(self, instance, validated_data):
        avatar_color = validated_data.pop('avatar_color', None)
        avatar_preset = validated_data.pop('avatar_preset', None)
        avatar_image = validated_data.pop('avatar_image', None)

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
            Category(user=user, name='Backend & Architecture', code='BACK', color='#10b981', monthly_target_hours=40),
            Category(user=user, name='Electrical & Facility Eng', code='ELEC', color='#3b82f6', monthly_target_hours=35),
            Category(user=user, name='Network & Infrastructure', code='NET', color='#f59e0b', monthly_target_hours=25),
            Category(user=user, name='English / Academic Writing', code='LANG', color='#a855f7', monthly_target_hours=20),
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
    """
    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'code',
            'color',
            'monthly_target_hours',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

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

    def validate_monthly_target_hours(self, value):
        if value < 1 or value > 744:
            raise serializers.ValidationError('Monthly target hours must be between 1 and 744.')
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
