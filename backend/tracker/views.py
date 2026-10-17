from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, StudyLog
from .serializers import (
    CategorySerializer,
    RegisterSerializer,
    StudyLogSerializer,
    UserSerializer,
)

User = get_user_model()


# ==========================================
# Authentication Views
# ==========================================

class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Register a new user and initialize default categories.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Retrieve details of the currently authenticated user.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

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


# ==========================================
# Category ViewSet
# ==========================================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD API for study categories of the authenticated user.
    Endpoints:
      - GET /api/categories/
      - POST /api/categories/
      - GET /api/categories/<id>/
      - PUT /api/categories/<id>/
      - DELETE /api/categories/<id>/
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
    Endpoints:
      - GET /api/logs/
      - POST /api/logs/
      - GET /api/logs/<id>/
      - PUT /api/logs/<id>/
      - DELETE /api/logs/<id>/
    """
    serializer_class = StudyLogSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = StudyLog.objects.filter(user=self.request.user)
        # Optional query param filters
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        is_public = self.request.query_params.get('is_public')
        if is_public is not None:
            is_public_bool = is_public.lower() in ('true', '1')
            queryset = queryset.filter(is_public_to_hub=is_public_bool)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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

        now = timezone.now().date()
        seven_days_ago = now - timedelta(days=7)
        first_day_of_month = now.replace(day=1)

        user_logs = StudyLog.objects.filter(user=user)
        public_logs = user_logs.filter(is_public_to_hub=True)

        total_min = user_logs.aggregate(total=Sum('duration_minutes'))['total'] or 0
        weekly_min = user_logs.filter(date__gte=seven_days_ago).aggregate(total=Sum('duration_minutes'))['total'] or 0
        monthly_min = user_logs.filter(date__gte=first_day_of_month).aggregate(total=Sum('duration_minutes'))['total'] or 0

        # Calculate category hours for this month
        categories = Category.objects.filter(user=user)
        cat_data = []
        for cat in categories:
            cat_month_min = user_logs.filter(
                category=cat,
                date__gte=first_day_of_month
            ).aggregate(total=Sum('duration_minutes'))['total'] or 0
            cat_data.append({
                'code': cat.code,
                'name': cat.name,
                'monthly_hours': round(cat_month_min / 60, 1),
                'target_hours': cat.monthly_target_hours,
            })

        recent_public = public_logs.order_by('-date', '-created_at')[:5]
        recent_logs_data = [
            {
                'id': log.id,
                'date': log.date.isoformat(),
                'category_code': log.category.code if log.category else 'MISC',
                'duration_minutes': log.duration_minutes,
                'topic': log.topic,
            }
            for log in recent_public
        ]

        payload = {
            'source': 'typbox.me',
            'timestamp': timezone.now().isoformat(),
            'user': user.username,
            'summary': {
                'total_hours': round(total_min / 60, 1),
                'weekly_hours': round(weekly_min / 60, 1),
                'monthly_hours': round(monthly_min / 60, 1),
            },
            'categories': cat_data,
            'recent_public_logs': recent_logs_data,
        }
        return Response(payload)
