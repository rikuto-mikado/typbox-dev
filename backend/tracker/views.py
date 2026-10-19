import re
from datetime import date as date_cls, timedelta, timezone as dt_timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Category, StudyLog, monthly_to_weekly_hours
from .serializers import (
    CategorySerializer,
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    StudyLogSerializer,
    UserSerializer,
)
from .timezones import get_user_zone, user_localdate

User = get_user_model()


def _is_trusted_frontend_origin(origin: str) -> bool:
    """
    True only if `origin` matches the same allowlist CORS already trusts
    (settings.CORS_ALLOWED_ORIGINS / CORS_ALLOWED_ORIGIN_REGEXES).

    The `Origin` request header is attacker-controlled on any direct HTTP
    call (CORS is a browser-side policy, not a server-side access check), so
    it must never be trusted blindly for security-sensitive output such as
    the link embedded in a password-reset email — otherwise a caller could
    set `Origin: https://evil.example` and have TYPBOX's own mailer send the
    victim a legitimate-looking reset email pointing at a phishing site.
    """
    if not origin:
        return False
    if origin in getattr(settings, 'CORS_ALLOWED_ORIGINS', []):
        return True
    for pattern in getattr(settings, 'CORS_ALLOWED_ORIGIN_REGEXES', []):
        if re.match(pattern, origin):
            return True
    return False


# ==========================================
# Authentication & Account Management Views
# ==========================================

class RegisterThrottle(ScopedRateThrottle):
    scope = 'register'


class LoginThrottle(ScopedRateThrottle):
    scope = 'login'


class PasswordResetThrottle(ScopedRateThrottle):
    scope = 'password_reset'


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Register a new user and initialize default categories.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (RegisterThrottle,)
    throttle_scope = 'register'


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Same as SimpleJWT's TokenObtainPairView, with a dedicated per-IP rate
    limit — the default anon throttle (120/min) is far too loose for a
    credential-stuffing / brute-force surface.
    """
    throttle_classes = (LoginThrottle,)
    throttle_scope = 'login'


class CurrentUserView(APIView):
    """
    GET /api/auth/me/    - Retrieve current user profile & avatar settings
    PATCH /api/auth/me/  - Update username, email, and avatar settings
    DELETE /api/auth/me/ - Permanently delete account and all data
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)

    def delete(self, request):
        """
        DELETE /api/auth/me/
        Permanently delete the authenticated user account and all associated data.
        """
        user = request.user
        user.delete()
        return Response(
            {'detail': 'Account successfully deleted.'},
            status=status.HTTP_204_NO_CONTENT
        )


class ChangePasswordView(APIView):
    """
    POST /api/auth/password-change/
    Allow an authenticated user to change their password using current_password & new_password.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/
    Generate a one-time password reset token and send a reset link to the user's email.
    """
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (PasswordResetThrottle,)
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        debug_reset_url = None

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            origin = request.headers.get('Origin', '').rstrip('/')
            frontend_base = origin if _is_trusted_frontend_origin(origin) else settings.FRONTEND_URL
            reset_url = f"{frontend_base}/?reset_uid={uid}&reset_token={token}"

            subject = '[TYPBOX] Password Reset Request / パスワード再設定のご案内'
            message = (
                f"Hello {user.username},\n\n"
                f"A password reset was requested for your TYPBOX account ({user.email}).\n"
                f"Click the link below to set a new password (valid for 1 hour):\n\n"
                f"{reset_url}\n\n"
                f"--------------------------------------------------\n"
                f"{user.username} 様\n\n"
                f"TYPBOX アカウントのパスワード再設定リクエストを受け付けました。\n"
                f"以下のURLを開いて新しいパスワードを設定してください（有効期限：1時間）：\n\n"
                f"{reset_url}\n\n"
                f"※心当たりがない場合は、このメールを破棄してください。\n"
                f"--------------------------------------------------\n"
                f"TYPBOX // Quantified Study & Telemetry Archive"
            )

            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as exc:
                print(f"Warning: Failed to send password reset email to {user.email}: {exc}")
                if not settings.DEBUG:
                    return Response(
                        {'detail': 'Unable to dispatch email at this time. Please check server SMTP configuration.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )

            if settings.DEBUG and not getattr(settings, 'EMAIL_HOST_USER', ''):
                debug_reset_url = reset_url

        response_payload = {
            'detail': 'If an account with that email exists, a password reset link has been sent.'
        }
        if debug_reset_url:
            response_payload['debug_reset_url'] = debug_reset_url

        return Response(response_payload, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Verify uid and token from the password reset email and set the user's new password.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password has been reset successfully. You may now sign in.'}, status=status.HTTP_200_OK)


# ==========================================
# Category ViewSet
# ==========================================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD API for study categories of the authenticated user.
    """
    serializer_class = CategorySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        # Prevent deleting the last remaining category
        user_categories_count = Category.objects.filter(user=request.user).count()
        if user_categories_count <= 1:
            return Response(
                {'detail': 'At least one category is required for study tracking.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


# ==========================================
# Study Log ViewSet
# ==========================================

class StudyLogViewSet(viewsets.ModelViewSet):
    """
    CRUD API for study logs of the authenticated user.
    """
    serializer_class = StudyLogSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = StudyLog.objects.filter(user=self.request.user).select_related('category')
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        is_public = self.request.query_params.get('is_public')
        if is_public is not None:
            is_public_bool = is_public.lower() in ('true', '1')
            queryset = queryset.filter(is_public_to_hub=is_public_bool)

        return queryset

    def perform_create(self, serializer):
        extra = {}
        if 'date' not in serializer.validated_data:
            # No explicit study date: use "today" in the user's own zone
            # rather than the server's UTC date.
            extra['date'] = user_localdate(self.request.user)
        serializer.save(user=self.request.user, **extra)

    @action(detail=False, methods=['delete'], url_path='clear-all')
    def clear_all(self, request):
        """
        DELETE /api/logs/clear-all/
        Delete all study logs for the authenticated user while preserving categories and account.
        """
        deleted_count, _ = StudyLog.objects.filter(user=request.user).delete()
        return Response({'deleted': deleted_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-backup')
    def import_backup(self, request):
        """
        POST /api/logs/import-backup/
        Restore categories and study logs from an exported TYPBOX JSON backup file.
        """
        raw_categories = request.data.get('categories', [])
        raw_logs = request.data.get('logs', [])

        if not isinstance(raw_logs, list):
            return Response({'detail': 'Invalid backup format: logs must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            existing_cats = {c.code.upper(): c for c in Category.objects.filter(user=request.user)}
            created_cats = 0

            if isinstance(raw_categories, list):
                for item in raw_categories:
                    if not isinstance(item, dict):
                        continue
                    code = str(item.get('code', '')).strip().upper()[:10]
                    name = str(item.get('name', '')).strip()[:100]
                    if not code or not name or code in existing_cats:
                        continue
                    color = str(item.get('color', '#10b981')).strip()[:20] or '#10b981'
                    weekly = item.get('weeklyTargetHours') or item.get('weekly_target_hours')
                    monthly = item.get('monthlyTargetHours') or item.get('monthly_target_hours')
                    try:
                        if weekly:
                            target_int = int(weekly)
                        elif monthly:
                            # Backups from before the weekly switch: monthly -> weekly.
                            target_int = monthly_to_weekly_hours(int(monthly))
                        else:
                            target_int = 5
                        target_int = max(1, min(168, target_int))
                    except (ValueError, TypeError):
                        target_int = 5
                    raw_active = item.get('isActive', item.get('is_active', True))
                    is_active = raw_active if isinstance(raw_active, bool) else True

                    new_cat = Category.objects.create(
                        user=request.user,
                        code=code,
                        name=name,
                        color=color,
                        weekly_target_hours=target_int,
                        is_active=is_active,
                    )
                    existing_cats[code] = new_cat
                    created_cats += 1

            default_cat = next(iter(existing_cats.values()), None)
            logs_to_create = []
            original_created_at = []
            fallback_date = user_localdate(request.user)

            for entry in raw_logs[:5000]:
                if not isinstance(entry, dict):
                    continue
                cat_code = str(entry.get('categoryCode') or entry.get('category_code') or '').strip().upper()
                cat_obj = existing_cats.get(cat_code) or default_cat

                date_str = str(entry.get('date', '')).strip()
                try:
                    parsed_date = date_cls.fromisoformat(date_str)
                except ValueError:
                    parsed_date = fallback_date

                raw_dur = entry.get('durationMinutes') or entry.get('duration_minutes') or 60
                try:
                    dur_int = max(1, min(1440, int(raw_dur)))
                except (ValueError, TypeError):
                    dur_int = 60

                topic_str = ''

                # Keep the original commit timestamp from the backup (UTC
                # ISO-8601; naive values are treated as UTC).
                raw_created = entry.get('createdAt') or entry.get('created_at')
                created_dt = parse_datetime(str(raw_created)) if raw_created else None
                if created_dt is not None and timezone.is_naive(created_dt):
                    created_dt = timezone.make_aware(created_dt, dt_timezone.utc)
                original_created_at.append(created_dt)

                logs_to_create.append(
                    StudyLog(
                        user=request.user,
                        category=cat_obj,
                        date=parsed_date,
                        duration_minutes=dur_int,
                        topic=topic_str,
                        is_public_to_hub=True,
                    )
                )

            if logs_to_create:
                created = StudyLog.objects.bulk_create(logs_to_create)
                # created_at is auto_now_add (overwritten on insert), so the
                # original timestamps are restored in a second pass.
                restored = []
                for obj, original in zip(created, original_created_at):
                    if original is not None and obj.pk is not None:
                        obj.created_at = original
                        restored.append(obj)
                if restored:
                    StudyLog.objects.bulk_update(restored, ['created_at'])

        return Response(
            {
                'imported_logs': len(logs_to_create),
                'created_categories': created_cats,
            },
            status=status.HTTP_201_CREATED
        )



# ==========================================
# Portfolio / Django Hub Telemetry View
# ==========================================

class HubTelemetryView(APIView):
    """
    GET /api/hub/telemetry/
    Public aggregate telemetry endpoint matching typbox.me React payload format.
    Accepts optional ?username=<username> query parameter (defaults to first superuser or active user).
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        username = request.query_params.get('username')
        if username:
            user = User.objects.filter(username=username).first()
        elif request.user.is_authenticated:
            user = request.user
        else:
            user = User.objects.filter(is_superuser=True).first() or User.objects.first()

        if not user:
            return Response(
                {
                    'source': 'typbox.me',
                    'timestamp': timezone.now().isoformat(),
                    'summary': {'total_hours': 0, 'weekly_hours': 0, 'monthly_hours': 0},
                    'categories': [],
                    'recent_public_logs': [],
                }
            )

        user_zone = get_user_zone(user)
        now = user_localdate(user)
        # Inclusive 7-day window (today + 6 previous days = 7 days total, matching frontend)
        seven_days_ago = now - timedelta(days=6)
        first_day_of_month = now.replace(day=1)
        first_day_of_week = now - timedelta(days=now.weekday())  # Monday

        public_logs = StudyLog.objects.filter(user=user, is_public_to_hub=True).select_related('category')

        aggregates = public_logs.aggregate(
            total_min=Coalesce(Sum('duration_minutes'), 0),
            weekly_min=Coalesce(Sum('duration_minutes', filter=Q(date__gte=seven_days_ago)), 0),
            monthly_min=Coalesce(Sum('duration_minutes', filter=Q(date__gte=first_day_of_month)), 0),
        )
        total_min = aggregates['total_min']
        weekly_min = aggregates['weekly_min']
        monthly_min = aggregates['monthly_min']

        # Category hours for this month and this week in a single annotated query
        categories = Category.objects.filter(user=user).annotate(
            month_min=Coalesce(
                Sum(
                    'logs__duration_minutes',
                    filter=Q(logs__is_public_to_hub=True, logs__date__gte=first_day_of_month)
                ),
                0
            ),
            week_min=Coalesce(
                Sum(
                    'logs__duration_minutes',
                    filter=Q(logs__is_public_to_hub=True, logs__date__gte=first_day_of_week)
                ),
                0
            ),
        )
        cat_data = [
            {
                'code': cat.code,
                'name': cat.name,
                'is_active': cat.is_active,
                'monthly_hours': round(cat.month_min / 60, 1),
                'weekly_hours': round(cat.week_min / 60, 1),
                'weekly_target_hours': cat.weekly_target_hours if cat.is_active else None,
                # Kept for existing consumers; now the weekly target.
                'target_hours': cat.weekly_target_hours if cat.is_active else None,
            }
            for cat in categories
        ]

        recent_public = public_logs.order_by('-date', '-created_at')[:5]
        recent_logs_data = [
            {
                'id': log.id,
                'date': log.date.isoformat(),
                'category_code': log.category.code if log.category else 'MISC',
                'duration_minutes': log.duration_minutes,
                'topic': log.topic,
                'created_at': log.created_at.astimezone(dt_timezone.utc).isoformat().replace('+00:00', 'Z'),
            }
            for log in recent_public
        ]

        payload = {
            'source': 'typbox.me',
            'timestamp': timezone.now().isoformat(),
            'user': user.username,
            'timezone': user_zone.key if user_zone else 'UTC',
            'summary': {
                'total_hours': round(total_min / 60, 1),
                'weekly_hours': round(weekly_min / 60, 1),
                'monthly_hours': round(monthly_min / 60, 1),
            },
            'categories': cat_data,
            'recent_public_logs': recent_logs_data,
        }
        return Response(payload)
