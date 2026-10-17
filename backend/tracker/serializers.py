from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Category, StudyLog

User = get_user_model()


# ==========================================
# Authentication & User Serializers
# ==========================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the current authenticated user profile.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        read_only_fields = ('id',)


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for new user registration.
    """
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_email(self, value):
        cleaned = value.strip().lower()
        if not cleaned:
            raise serializers.ValidationError('Email address is required.')
        if User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return cleaned

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        # Create default categories for convenience upon signup
        Category.objects.bulk_create([
            Category(user=user, name='Backend & Architecture', code='BACK', color='#10b981', monthly_target_hours=40),
            Category(user=user, name='Electrical & Facility Eng', code='ELEC', color='#3b82f6', monthly_target_hours=35),
            Category(user=user, name='Network & Infrastructure', code='NET', color='#f59e0b', monthly_target_hours=25),
            Category(user=user, name='English / Academic Writing', code='LANG', color='#a855f7', monthly_target_hours=20),
        ])
        return user


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
