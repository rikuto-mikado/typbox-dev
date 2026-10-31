from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    BitsBuyView,
    BitsCancelView,
    BitsResetView,
    BitsShopView,
    CategoryViewSet,
    ChangePasswordView,
    CurrentUserView,
    HubTelemetryView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PortfolioFeedView,
    RoomView,
    RegisterView,
    StudyLogViewSet,
    ThrottledTokenObtainPairView,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"logs", StudyLogViewSet, basename="studylog")

urlpatterns = [
    # Authentication & Account endpoints
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path(
        "auth/login/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"
    ),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("bits/", BitsShopView.as_view(), name="bits_shop"),
    path("bits/buy/", BitsBuyView.as_view(), name="bits_buy"),
    path("bits/cancel/", BitsCancelView.as_view(), name="bits_cancel"),
    path("bits/reset/", BitsResetView.as_view(), name="bits_reset"),
    path("room/", RoomView.as_view(), name="room"),
    path("auth/password-change/", ChangePasswordView.as_view(), name="password_change"),
    path(
        "auth/password-reset/",
        PasswordResetRequestView.as_view(),
        name="password_reset",
    ),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    # Portfolio / Hub Aggregator Telemetry
    path("hub/telemetry/", HubTelemetryView.as_view(), name="hub_telemetry"),
    # rikutomikado.tech read-only portfolio feed
    path("portfolio/feed/", PortfolioFeedView.as_view(), name="portfolio_feed"),
    # CRUD Router for categories and logs
    path("", include(router.urls)),
]
