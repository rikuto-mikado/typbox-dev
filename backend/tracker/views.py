from collections import Counter
from datetime import (
    date as date_cls,
    timedelta,
    timezone as dt_timezone,
)

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
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from . import bank, blessings, challenges, charms, festival_pass, trade
from .backup import (
    MAX_IMPORTED_PURCHASES,
    MAX_IMPORTED_TRADES,
    export_economy,
    log_blessing,
    log_bonus,
    restore_economy,
)
from .economy import (
    BUFFS,
    PurchaseError,
    apply_buff_to_new_log,
    buy,
    cancel_buff,
    log_is_locked,
    reset_economy,
    return_buff_draw,
    seal_contract_on_edit,
    shop_state,
    star_lit_by,
    StarlightError,
    use_starlight,
)
from .furniture import (
    owns_furniture,
    FURNITURE,
    CATALOG_VERSION,
    ROOM_NAME_MAX,
    ROOM_SLOTS,
    LayoutError,
    active_slot,
    inventory,
    room_slots,
    room_state,
    sanitize_layout,
    shop_lineup,
    stored_layout,
    validate_layout,
)
from .models import BitPurchase, Category, StudyLog, TradeOrder, UserProfile
from .serializers import (
    CategorySerializer,
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PortfolioFeedLogSerializer,
    RegisterSerializer,
    StudyLogSerializer,
    UserSerializer,
)
from .timezones import get_user_zone, user_localdate, user_week_start, week_start_date

User = get_user_model()


# ==========================================
# Authentication & Account Management Views
# ==========================================


class RegisterThrottle(ScopedRateThrottle):
    scope = "register"


class LoginThrottle(ScopedRateThrottle):
    scope = "login"


class PasswordResetThrottle(ScopedRateThrottle):
    scope = "password_reset"


class PasswordResetConfirmThrottle(ScopedRateThrottle):
    scope = "password_reset_confirm"


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Register a new user and initialize default categories.
    Closed (403) unless settings.ALLOW_REGISTRATION is enabled.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (RegisterThrottle,)
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        if not settings.ALLOW_REGISTRATION:
            return Response(
                {"detail": "Registration is currently closed."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Same as SimpleJWT's TokenObtainPairView, with a dedicated per-IP rate
    limit — the default anon throttle (120/min) is far too loose for a
    credential-stuffing / brute-force surface.
    """

    throttle_classes = (LoginThrottle,)
    throttle_scope = "login"


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
            request.user, data=request.data, partial=True, context={"request": request}
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
            {"detail": "Account successfully deleted."},
            status=status.HTTP_204_NO_CONTENT,
        )


class ChangePasswordView(APIView):
    """
    POST /api/auth/password-change/
    Allow an authenticated user to change their password using current_password & new_password.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response(
            {"detail": "Password updated successfully."}, status=status.HTTP_200_OK
        )


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/
    Generate a one-time password reset token and send a reset link to the user's email.
    """

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (PasswordResetThrottle,)
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        debug_reset_url = None

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # Always the configured frontend, never the request's Origin header:
            # it's attacker-controlled on direct HTTP calls, and the wildcard
            # CORS regexes (e.g. any *.onrender.com) would let a caller point
            # TYPBOX's own reset email at a phishing site.
            reset_url = f"{settings.FRONTEND_URL}/?reset_uid={uid}&reset_token={token}"

            subject = "[TYPBOX] Password Reset Request / パスワード再設定のご案内"
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
                print(
                    f"Warning: Failed to send password reset email to {user.email}: {exc}"
                )
                if not settings.DEBUG:
                    return Response(
                        {
                            "detail": "Unable to dispatch email at this time. Please check server SMTP configuration."
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

            if settings.DEBUG and not getattr(settings, "EMAIL_HOST_USER", ""):
                debug_reset_url = reset_url

        response_payload = {
            "detail": "If an account with that email exists, a password reset link has been sent."
        }
        if debug_reset_url:
            response_payload["debug_reset_url"] = debug_reset_url

        return Response(response_payload, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Verify uid and token from the password reset email and set the user's new password.
    """

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (PasswordResetConfirmThrottle,)
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response(
            {"detail": "Password has been reset successfully. You may now sign in."},
            status=status.HTTP_200_OK,
        )


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
                {"detail": "At least one category is required for study tracking."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # DONE categories can't be logged against, so the last in-progress
        # one must stay too (same rule as marking it DONE).
        instance = self.get_object()
        if (
            instance.completed_at is None
            and not Category.objects.filter(
                user=request.user, completed_at__isnull=True
            )
            .exclude(pk=instance.pk)
            .exists()
        ):
            return Response(
                {"detail": "At least one in-progress category is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


# ==========================================
# Study Log ViewSet
# ==========================================


MAX_IMPORTED_LOGS = 20000
MAX_IMPORTED_CATEGORIES = 1000


def _log_import_key(category_code, log_date, duration_minutes, created_at):
    """Identity of a log for duplicate detection on backup import."""
    created = (
        created_at.astimezone(dt_timezone.utc).replace(microsecond=0).isoformat()
        if created_at
        else ""
    )
    return (category_code.upper(), log_date, duration_minutes, created)


class StudyLogViewSet(viewsets.ModelViewSet):
    """
    CRUD API for study logs of the authenticated user.
    """

    serializer_class = StudyLogSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = StudyLog.objects.filter(user=self.request.user).select_related(
            "category"
        )
        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        is_public = self.request.query_params.get("is_public")
        if is_public is not None:
            is_public_bool = is_public.lower() in ("true", "1")
            queryset = queryset.filter(is_public_to_hub=is_public_bool)

        return queryset

    def perform_create(self, serializer):
        extra = {}
        if "date" not in serializer.validated_data:
            # No explicit study date: use "today" in the user's own zone
            # rather than the server's UTC date.
            extra["date"] = user_localdate(self.request.user)
        log = serializer.save(user=self.request.user, **extra)
        # STORM RUNNER reads the CHRONOMETER weather the client sends along
        # (optional; older clients send none and simply don't qualify).
        data = self.request.data
        apply_buff_to_new_log(
            log, weather=data.get("weather") if hasattr(data, "get") else None
        )
        # BLESSINGS: the worn one's bonus, beside the buff's.
        blessings.apply_to_new_log(log)
        # TYPBOX BANK: half of what it earns goes to an emergency loan.
        bank.auto_repay(log)
        self._star_lit = star_lit_by(log)
        # BOSS RAID / RIVAL: what the log did, sent back with it.
        self._challenge_hit = challenges.apply_to_new_log(log)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        hit = getattr(self, "_challenge_hit", None)
        if hit is not None:
            response.data["challenge_hit"] = hit
        stars = getattr(self, "_star_lit", None)
        if stars is not None:
            response.data["star_lit"] = stars
        return response

    def _refuse_if_locked(self, log):
        if log_is_locked(log):
            raise PermissionDenied(
                "This log is locked: logs can be changed for 3 days after their commit."
            )

    def perform_update(self, serializer):
        self._refuse_if_locked(serializer.instance)
        old_minutes = serializer.instance.duration_minutes
        log = serializer.save()
        if log.duration_minutes != old_minutes:
            challenges.on_log_edited(log)
            blessings.on_log_edited(log)
        if log.duration_minutes > old_minutes:
            seal_contract_on_edit(log)

    def perform_destroy(self, instance):
        self._refuse_if_locked(instance)
        with transaction.atomic():
            return_buff_draw(instance)
            challenges.on_log_deleted(instance)
            instance.delete()

    @action(detail=False, methods=["delete"], url_path="clear-all")
    def clear_all(self, request):
        """
        DELETE /api/logs/clear-all/
        Delete all study logs AND categories for the authenticated user; only
        the account itself is kept.

        Categories are deliberately not carried over: the usual next step is
        importing a backup, and leftover categories would shadow the backup's
        own (same code -> its targets/status are skipped).

        The BITS economy starts over with them: every purchase (buffs and
        furniture, so any running buff too) and TRADE order is dropped and MY ROOM goes back
        to an empty room (all five rooms and their SAVEs). Earnings are
        derived from logs, so a backup imported afterwards pays its hours out
        again; one with an `economy` section brings back the rest (backup.py).
        Without this, the old purchases would outlive the logs that paid for
        them and leave the balance negative.
        """
        with transaction.atomic():
            # Same lock as a purchase, so a buy racing the reset can't land
            # on the far side of it.
            profile, _ = UserProfile.objects.select_for_update().get_or_create(
                user=request.user
            )
            deleted_count, _ = StudyLog.objects.filter(user=request.user).delete()
            deleted_cats, _ = Category.objects.filter(user=request.user).delete()
            deleted_purchases, _ = BitPurchase.objects.filter(
                user=request.user
            ).delete()
            TradeOrder.objects.filter(user=request.user).delete()
            profile.star_spends = []
            profile.last_guard = {}
            profile.crate_omen = ""
            profile.save(update_fields=["star_spends", "last_guard", "crate_omen"])
            if (
                profile.room_layout
                or profile.room_slots
                or profile.room_active_slot
                or profile.shop_reserve
            ):
                profile.room_layout = {}
                profile.room_slots = []
                profile.room_active_slot = 0
                profile.shop_reserve = ""
                profile.save(
                    update_fields=[
                        "room_layout",
                        "room_slots",
                        "room_active_slot",
                        "shop_reserve",
                    ]
                )
        return Response(
            {
                "deleted": deleted_count,
                "deleted_categories": deleted_cats,
                "deleted_purchases": deleted_purchases,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="export-economy")
    def export_economy_section(self, request):
        """GET /api/logs/export-economy/: the BITS side of a backup (backup.py)."""
        return Response(export_economy(request.user))

    @action(detail=False, methods=["post"], url_path="import-backup")
    def import_backup(self, request):
        """
        POST /api/logs/import-backup/
        Restore categories and study logs from an exported TYPBOX JSON backup file.

        Importing never inflates totals: a backup log that already exists on
        the account (same category, date, duration and commit timestamp) is
        skipped, so re-importing the same file adds nothing. Logs whose
        category isn't in the account or the backup are kept uncategorized
        rather than credited to some other category. A backup's `economy`
        section brings purchases, the room and more back (backup.py).
        """
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Invalid backup format: expected a backup object."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        raw_categories = request.data.get("categories", [])
        raw_logs = request.data.get("logs", [])
        economy = request.data.get("economy")
        if not isinstance(economy, dict):
            economy = None

        if not isinstance(raw_logs, list):
            return Response(
                {"detail": "Invalid backup format: logs must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # All or nothing: quietly importing only part of a backup would lose logs.
        if len(raw_logs) > MAX_IMPORTED_LOGS or (
            isinstance(raw_categories, list) and len(raw_categories) > MAX_IMPORTED_CATEGORIES
        ):
            return Response(
                {"detail": f"This backup is too large: at most {MAX_IMPORTED_LOGS} logs and {MAX_IMPORTED_CATEGORIES} categories."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchases = economy.get("purchases") if economy else None
        if isinstance(purchases, list) and len(purchases) > MAX_IMPORTED_PURCHASES:
            return Response(
                {"detail": f"This backup is too large: at most {MAX_IMPORTED_PURCHASES} purchases."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        trades = economy.get("trades") if economy else None
        if isinstance(trades, list) and len(trades) > MAX_IMPORTED_TRADES:
            return Response(
                {"detail": f"This backup is too large: at most {MAX_IMPORTED_TRADES} trade orders."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            existing_cats = {
                c.code.upper(): c for c in Category.objects.filter(user=request.user)
            }
            created_cats = 0

            if isinstance(raw_categories, list):
                for item in raw_categories:
                    if not isinstance(item, dict):
                        continue
                    code = str(item.get("code", "")).replace("\x00", "").strip().upper()[:10]
                    name = str(item.get("name", "")).replace("\x00", "").strip()[:100]
                    if not code or not name or code in existing_cats:
                        continue
                    color = str(item.get("color", "#10b981")).replace("\x00", "").strip()[:20] or "#10b981"
                    # Backups from before the weekly switch only carry
                    # monthlyTargetHours; the number is taken as-is as the
                    # weekly target (no monthly -> weekly scaling), so a
                    # restore never shrinks the user's targets.
                    target = (
                        item.get("weeklyTargetHours")
                        or item.get("weekly_target_hours")
                        or item.get("monthlyTargetHours")
                        or item.get("monthly_target_hours")
                        or 5
                    )
                    try:
                        target_int = max(1, min(168, int(target)))
                    except (ValueError, TypeError, OverflowError):
                        target_int = 5
                    raw_active = item.get("isActive", item.get("is_active", True))
                    is_active = raw_active if isinstance(raw_active, bool) else True
                    raw_completed = item.get("completedAt") or item.get("completed_at")
                    try:
                        completed_at = (
                            parse_datetime(str(raw_completed))
                            if raw_completed
                            else None
                        )
                    except ValueError:
                        completed_at = None
                    if completed_at is not None and timezone.is_naive(completed_at):
                        completed_at = timezone.make_aware(
                            completed_at, dt_timezone.utc
                        )

                    new_cat = Category.objects.create(
                        user=request.user,
                        code=code,
                        name=name,
                        color=color,
                        weekly_target_hours=target_int,
                        is_active=is_active,
                        completed_at=completed_at,
                    )
                    existing_cats[code] = new_cat
                    created_cats += 1

            logs_to_create = []
            original_created_at = []
            skipped_logs = 0
            fallback_date = user_localdate(request.user)

            # Multiset of logs already on the account, so legit repeats inside
            # one backup (two 60m sessions on the same day) still import.
            existing_keys = Counter(
                _log_import_key(
                    log.category.code if log.category else "",
                    log.date,
                    log.duration_minutes,
                    log.created_at,
                )
                for log in StudyLog.objects.filter(user=request.user).select_related(
                    "category"
                )
            )

            loose_keys = Counter(
                ((code or "").upper(), day, minutes)
                for code, day, minutes in StudyLog.objects.filter(user=request.user).values_list(
                    "category__code", "date", "duration_minutes"
                )
            )

            for entry in raw_logs:
                if not isinstance(entry, dict):
                    continue
                cat_code = (
                    str(entry.get("categoryCode") or entry.get("category_code") or "")
                    .strip()
                    .upper()
                )
                cat_obj = existing_cats.get(cat_code)

                date_str = str(entry.get("date", "")).strip()
                try:
                    parsed_date = date_cls.fromisoformat(date_str)
                except ValueError:
                    parsed_date = fallback_date

                raw_dur = (
                    entry.get("durationMinutes") or entry.get("duration_minutes") or 60
                )
                try:
                    dur_int = max(1, min(1440, int(raw_dur)))
                except (ValueError, TypeError, OverflowError):
                    dur_int = 60

                topic_str = ""

                # Keep the original commit timestamp from the backup (UTC
                # ISO-8601; naive values are treated as UTC).
                raw_created = entry.get("createdAt") or entry.get("created_at")
                try:
                    created_dt = parse_datetime(str(raw_created)) if raw_created else None
                    if created_dt is not None and timezone.is_naive(created_dt):
                        created_dt = timezone.make_aware(created_dt, dt_timezone.utc)
                    if created_dt is not None:
                        created_dt = created_dt.astimezone(dt_timezone.utc)
                except (ValueError, OverflowError):  # no such moment
                    created_dt = None
                # A commit can't lie ahead: it would stay editable until then.
                # It lands on the import's own time, so a second import of the
                # same file has to recognise it without the timestamp.
                if created_dt is not None and created_dt > timezone.now():
                    created_dt = None
                    loose = (cat_obj.code.upper() if cat_obj else "", parsed_date, dur_int)
                    if loose_keys[loose] > 0:
                        loose_keys[loose] -= 1
                        skipped_logs += 1
                        continue

                # The buff that paid survives so a buffed day stays unlit. Its
                # BITS come back with a backup that carries its economy (so the
                # purchases they paid for are back too), not from an older file.
                raw_item = entry.get("bonusItem") or entry.get("bonus_item")
                bonus_item = raw_item if isinstance(raw_item, str) and raw_item in BUFFS else ""

                key = _log_import_key(
                    cat_obj.code if cat_obj else "", parsed_date, dur_int, created_dt
                )
                if existing_keys[key] > 0:
                    existing_keys[key] -= 1
                    skipped_logs += 1
                    continue

                original_created_at.append(created_dt)

                logs_to_create.append(
                    StudyLog(
                        user=request.user,
                        category=cat_obj,
                        date=parsed_date,
                        duration_minutes=dur_int,
                        topic=topic_str,
                        is_public_to_hub=True,
                        bonus_item=bonus_item,
                        bonus_bits=log_bonus(entry) if economy is not None else 0,
                        blessing=log_blessing(entry)[0] if economy is not None else "",
                        blessing_bits=log_blessing(entry)[1] if economy is not None else 0,
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
                    StudyLog.objects.bulk_update(restored, ["created_at"], batch_size=1000)

            restored_purchases = (
                restore_economy(request.user, economy, existing_cats) if economy else 0
            )
            # What the logs earned at the festivals comes with them.
            festival_pass.sweep(request.user)

        return Response(
            {
                "imported_logs": len(logs_to_create),
                "skipped_logs": skipped_logs,
                "created_categories": created_cats,
                "restored_purchases": restored_purchases,
            },
            status=status.HTTP_201_CREATED,
        )


# ==========================================
# Portfolio / Django Hub Telemetry View
# ==========================================


class BitsShopView(APIView):
    """
    GET  /api/bits/      - Balance, the running buff and the buff catalog, the
                           running challenge, the challenge catalog and the
                           last settled challenge
    POST /api/bits/buy/  - {"item_id": "...", "category": id?, "categories": [id]?}:
                       spend BITS on a buff or a challenge (category: CATEGORY
                       LOCK; categories: HYDRA's 2-3 heads)
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(shop_state(request.user))


class BitsBuyView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        item_id = (
            request.data.get("item_id") if isinstance(request.data, dict) else None
        )
        if not isinstance(item_id, str):
            return Response(
                {"detail": "item_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            buy(
                request.user,
                item_id,
                category_id=request.data.get("category"),
                category_ids=request.data.get("categories"),
            )
        except PurchaseError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(shop_state(request.user), status=status.HTTP_201_CREATED)


class BitsCancelView(APIView):
    """
    POST /api/bits/cancel/ - End the running buff early. Two thirds of its
    unused share comes back; bonuses already paid onto logs stay.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refunded = cancel_buff(request.user)
        except PurchaseError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({**shop_state(request.user), "refunded": refunded})


class BitsStarlightView(APIView):
    """POST /api/bits/starlight/ - {"use": "reroll"|"omen"|"festival"}: spend stars."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        use, item_id = data.get("use"), data.get("item_id")
        if not isinstance(use, str) or not (item_id is None or isinstance(item_id, str)):
            return Response({"detail": "Unknown wish."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            use_starlight(request.user, use, item_id=item_id)
        except StarlightError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(shop_state(request.user))


class BitsBlessingView(APIView):
    """POST /api/bits/blessing/ - {"id": "<blessing>" | null}: wear one (null takes it off);
    {"buy": "<blessing>"}: buy one whose seal is broken."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        buying = "buy" in data
        blessing_id = (data.get("buy") if buying else data.get("id")) or ""
        if not isinstance(blessing_id, str) or (buying and not blessing_id):
            return Response({"detail": "Unknown blessing."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            if buying:
                blessings.buy(request.user, blessing_id)
            else:
                blessings.wear(request.user, blessing_id)
        except blessings.BlessingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(shop_state(request.user))


class BitsCharmView(APIView):
    """POST /api/bits/charm/ - {"wear": "<charm>" | null}: put a STARLIGHT charm
    on (null takes it off); {"buy": "<charm>"}: buy one that has opened."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        try:
            if "buy" in data:
                charm = data.get("buy")
                if not isinstance(charm, str):
                    raise charms.CharmError("Unknown charm.")
                charms.buy(request.user, charm)
            elif "wear" in data:
                charm = data.get("wear")
                if charm is not None and not isinstance(charm, str):
                    raise charms.CharmError("Unknown charm.")
                charms.wear(request.user, charm)
            else:
                raise charms.CharmError("Choose a charm.")
        except charms.CharmError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(shop_state(request.user))


class BitsBankView(APIView):
    """POST /api/bits/bank/ - TYPBOX BANK: {"action": "borrow", "plan", "amount"},
    {"action": "repay", "loan", "amount"}, {"action": "deposit" | "withdraw", "amount"}."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        action = data.get("action")
        try:
            if action == "borrow":
                bank.borrow(request.user, data.get("plan"), data.get("amount"))
            elif action == "repay":
                bank.repay(request.user, data.get("loan"), data.get("amount"))
            elif action == "deposit":
                bank.deposit(request.user, data.get("amount"))
            elif action == "withdraw":
                bank.withdraw(request.user, data.get("amount"))
            else:
                raise bank.BankError("Unknown action.")
        except bank.BankError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(shop_state(request.user))


class BitsTradeView(APIView):
    """
    GET  /api/bits/trade/ - The market, the account's positions and its orders.
    POST /api/bits/trade/ - {"asset", "side": "buy", "amount": BITS} or
                            {"asset", "side": "sell", "units": n | "all"}: fills at
                            the current tick. The answer also carries `shop`, the
                            /bits/ state, so the header balance follows at once.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        try:
            return Response(trade.trade_state(request.user))
        except trade.TradeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        asset, side = data.get("asset"), data.get("side")
        if not isinstance(asset, str) or not isinstance(side, str):
            return Response({"detail": "Choose a package and a side."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = trade.place_order(
                request.user, asset, side, amount=data.get("amount"), units=data.get("units")
            )
            state = trade.trade_state(request.user)
        except trade.TradeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {**state, "order": trade.serialize_order(order), "shop": shop_state(request.user)},
            status=status.HTTP_201_CREATED,
        )


class BitsChallengeForfeitView(APIView):
    """
    POST /api/bits/challenge/forfeit/ - Give up the running BOSS RAID or
    RIVAL duel. It ends now and pays nothing back.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            challenges.forfeit(request.user)
        except challenges.ChallengeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(shop_state(request.user))


class BitsResetView(APIView):
    """
    POST /api/bits/reset/ - Start BITS and MY ROOM over but keep the study
    logs and categories: every purchase is dropped, buff bonuses come off
    the logs and the room goes back to the starter layout. The balance is
    then the base rate for the hours already logged.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        deleted, cleared = reset_economy(request.user)
        return Response(
            {
                **shop_state(request.user),
                "deleted_purchases": deleted,
                "cleared_bonus_logs": cleared,
            }
        )


class RoomView(APIView):
    """
    GET /api/room/ - Layout, owned furniture, the catalog and the shop lineup.
                     ?catalog=<version> skips the catalog when the client
                     already holds that version.
    PUT /api/room/ - {"layout": {...}}: save an arrangement of owned pieces.
                     Takes the same ?catalog=<version>: clients that send it
                     get the answer without the catalog. Older clients send
                     nothing and keep getting the catalog they expect.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        held = request.query_params.get("catalog")
        return Response(
            room_state(request.user, profile, with_catalog=held != CATALOG_VERSION)
        )

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        payload = request.data if isinstance(request.data, dict) else {}
        try:
            layout = validate_layout(payload.get("layout"), inventory(request.user))
        except LayoutError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        profile.room_layout = layout
        profile.save(update_fields=["room_layout"])
        held = request.query_params.get("catalog")
        return Response(
            room_state(request.user, profile, with_catalog=held != CATALOG_VERSION)
        )


class RoomReserveView(APIView):
    """
    POST /api/room/reserve/ - {"item_id": "<piece>"} puts one piece from the
    current lineup on hold: it stays buyable after it rotates out, until it
    is bought. One at a time, so reserving another replaces it;
    {"item_id": null} clears it. Takes ?catalog=<version> like /api/room/.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response(
                {"detail": 'Send {"item_id": ...}.'}, status=status.HTTP_400_BAD_REQUEST
            )
        item_id = request.data.get("item_id")
        with transaction.atomic():
            profile, _ = UserProfile.objects.select_for_update().get_or_create(
                user=request.user
            )
            if item_id in (None, ""):
                profile.shop_reserve = ""
            elif not owns_furniture(request.user):
                return Response(
                    {"detail": "Choose a starter pack first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                if (
                    not isinstance(item_id, str)
                    or item_id
                    not in shop_lineup(request.user, profile=profile)["items"]
                    # A limited piece ends with its festival: no holding it past that.
                    or FURNITURE[item_id].get("event")
                ):
                    return Response(
                        {
                            "detail": "Only a piece in the current lineup can be reserved."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if BitPurchase.objects.filter(
                    user=request.user, item_id=item_id
                ).exists():
                    return Response(
                        {"detail": "You already own this piece."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                profile.shop_reserve = item_id
            profile.save(update_fields=["shop_reserve"])
        held = request.query_params.get("catalog")
        return Response(
            room_state(request.user, profile, with_catalog=held != CATALOG_VERSION)
        )


class RoomSlotsView(APIView):
    """
    POST /api/room/rooms/ - MY ROOM's five rooms (see furniture.py):
      {"action": "save", "layout"?}            SAVE checkpoint of the active room
      {"action": "switch", "slot": n, "layout"?} park the active room, open room n
      {"action": "rename", "slot": n, "name"}  rename a room (blank = default)
    "layout" is the editor's current arrangement, stored first (validated
    like PUT /api/room/) so nothing waiting in the autosave is lost. Loading
    a checkpoint back happens in the editor (undoable) and saves as a
    normal layout. Takes ?catalog=<version> like /api/room/.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        action = payload.get("action")
        if action not in ("save", "switch", "rename"):
            return Response(
                {"detail": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST
            )
        slot = payload.get("slot")
        if action != "save" and (
            isinstance(slot, bool)
            or not isinstance(slot, int)
            or not 0 <= slot < ROOM_SLOTS
        ):
            return Response(
                {"detail": "Unknown room."}, status=status.HTTP_400_BAD_REQUEST
            )
        owned = inventory(request.user)
        with transaction.atomic():
            profile, _ = UserProfile.objects.select_for_update().get_or_create(
                user=request.user
            )
            slots = room_slots(profile)
            current = active_slot(profile)
            if action == "rename":
                name = payload.get("name")
                if not isinstance(name, str):
                    return Response(
                        {"detail": "Name must be text."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                slots[slot]["name"] = name.strip()[:ROOM_NAME_MAX] or f"ROOM {slot + 1}"
            else:
                if "layout" in payload:
                    try:
                        profile.room_layout = validate_layout(
                            payload.get("layout"), owned
                        )
                    except LayoutError as exc:
                        return Response(
                            {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
                        )
                if action == "save":
                    slots[current]["saved"] = stored_layout(profile)
                    slots[current]["saved_at"] = timezone.now().isoformat()
                elif slot != current:
                    slots[current]["layout"] = stored_layout(profile)
                    profile.room_layout = sanitize_layout(slots[slot]["layout"], owned)
                    slots[slot]["layout"] = {}
                    profile.room_active_slot = slot
            profile.room_slots = slots
            profile.save(
                update_fields=["room_layout", "room_slots", "room_active_slot"]
            )
        held = request.query_params.get("catalog")
        return Response(
            room_state(request.user, profile, with_catalog=held != CATALOG_VERSION)
        )


class HubTelemetryView(APIView):
    """
    GET /api/hub/telemetry/
    Public aggregate telemetry endpoint matching typbox.me React payload format.
    Signed in, it reports the caller's own account; otherwise only
    settings.PORTFOLIO_USERNAME's, the one account meant to be public (like
    /api/portfolio/feed/). A ?username= parameter is ignored: honoring it let
    anyone read any account's categories and recent logs, and tell which
    usernames exist.
    """

    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        if request.user.is_authenticated:
            user = request.user
        else:
            user = User.objects.filter(username=settings.PORTFOLIO_USERNAME).first()

        if not user:
            return Response(
                {
                    "source": "typbox.me",
                    "timestamp": timezone.now().isoformat(),
                    "summary": {
                        "total_hours": 0,
                        "weekly_hours": 0,
                        "monthly_hours": 0,
                    },
                    "categories": [],
                    "recent_public_logs": [],
                }
            )

        user_zone = get_user_zone(user)
        now = user_localdate(user)
        # Current calendar week (7 days from the user's week-start day,
        # matching the frontend); resets at 00:00 on that day.
        week_start = user_week_start(user)
        week_start_day = week_start_date(now, week_start)
        week_end_day = week_start_day + timedelta(days=6)
        first_day_of_month = now.replace(day=1)

        public_logs = StudyLog.objects.filter(
            user=user, is_public_to_hub=True
        ).select_related("category")

        aggregates = public_logs.aggregate(
            total_min=Coalesce(Sum("duration_minutes"), 0),
            weekly_min=Coalesce(
                Sum(
                    "duration_minutes",
                    filter=Q(date__gte=week_start_day, date__lte=week_end_day),
                ),
                0,
            ),
            monthly_min=Coalesce(
                Sum("duration_minutes", filter=Q(date__gte=first_day_of_month)), 0
            ),
        )
        total_min = aggregates["total_min"]
        weekly_min = aggregates["weekly_min"]
        monthly_min = aggregates["monthly_min"]

        # Category hours for this month and this week in a single annotated query
        categories = Category.objects.filter(user=user).annotate(
            month_min=Coalesce(
                Sum(
                    "logs__duration_minutes",
                    filter=Q(
                        logs__is_public_to_hub=True, logs__date__gte=first_day_of_month
                    ),
                ),
                0,
            ),
            week_min=Coalesce(
                Sum(
                    "logs__duration_minutes",
                    filter=Q(
                        logs__is_public_to_hub=True,
                        logs__date__gte=week_start_day,
                        logs__date__lte=week_end_day,
                    ),
                ),
                0,
            ),
        )
        cat_data = []
        for cat in categories:
            # Parked and DONE categories keep their hours but have no target.
            has_target = cat.is_active and cat.completed_at is None
            cat_data.append(
                {
                    "code": cat.code,
                    "name": cat.name,
                    "is_active": cat.is_active,
                    "is_completed": cat.completed_at is not None,
                    "monthly_hours": round(cat.month_min / 60, 1),
                    "weekly_hours": round(cat.week_min / 60, 1),
                    "weekly_target_hours": (
                        cat.weekly_target_hours if has_target else None
                    ),
                    # Kept for existing consumers; now the weekly target.
                    "target_hours": cat.weekly_target_hours if has_target else None,
                }
            )

        recent_public = public_logs.order_by("-date", "-created_at")[:5]
        recent_logs_data = [
            {
                "id": log.id,
                "date": log.date.isoformat(),
                "category_code": log.category.code if log.category else "MISC",
                "duration_minutes": log.duration_minutes,
                "topic": log.topic,
                "created_at": log.created_at.astimezone(dt_timezone.utc)
                .isoformat()
                .replace("+00:00", "Z"),
            }
            for log in recent_public
        ]

        payload = {
            "source": "typbox.me",
            "timestamp": timezone.now().isoformat(),
            "user": user.username,
            "timezone": user_zone.key if user_zone else "UTC",
            "week_start": week_start,
            "week_start_date": week_start_day.isoformat(),
            "summary": {
                "total_hours": round(total_min / 60, 1),
                "weekly_hours": round(weekly_min / 60, 1),
                "monthly_hours": round(monthly_min / 60, 1),
            },
            "categories": cat_data,
            "recent_public_logs": recent_logs_data,
        }
        return Response(payload)


class PortfolioFeedView(generics.ListAPIView):
    """
    GET /api/portfolio/feed/
    Public read-only feed pulled by rikutomikado.tech. Returns
    settings.PORTFOLIO_USERNAME's logs from the last PORTFOLIO_FEED_DAYS days
    with is_public_to_portfolio=True (the default; opt out from Django Admin).
    """

    serializer_class = PortfolioFeedLogSerializer
    permission_classes = (permissions.AllowAny,)
    # No auth: a stale/invalid Bearer token must not turn this into a 401.
    authentication_classes = ()

    def get_queryset(self):
        user = User.objects.filter(username=settings.PORTFOLIO_USERNAME).first()
        if not user:
            return StudyLog.objects.none()
        since = user_localdate(user) - timedelta(days=settings.PORTFOLIO_FEED_DAYS - 1)
        return StudyLog.objects.filter(
            user=user,
            is_public_to_portfolio=True,
            date__gte=since,
        ).select_related("category")
