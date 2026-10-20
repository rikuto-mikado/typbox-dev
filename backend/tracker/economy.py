from django.db import transaction

from .models import CreditWallet

# 1 hour of logged study = 1,000 DATA CREDITS (large base unit is deliberate —
# bigger numbers read as more rewarding). Floor division means a handful of
# credits are lost to rounding per log rather than ever over-crediting.
CREDITS_PER_HOUR = 1000


def get_or_create_wallet(user):
    return CreditWallet.objects.get_or_create(user=user)


def award_credits_for_log(user, duration_minutes: int) -> int:
    """
    Credits a user's wallet for a freshly created StudyLog. Only ever called
    from StudyLogViewSet.perform_create — editing or deleting a log does not
    adjust the wallet (no signals/reconciliation, matching the rest of this
    codebase; duration_minutes is capped 1-1440 by StudyLogSerializer, which
    bounds the per-log windfall to 24,000 credits).
    """
    amount = (duration_minutes * CREDITS_PER_HOUR) // 60
    if amount <= 0:
        return 0
    with transaction.atomic():
        wallet, _ = CreditWallet.objects.select_for_update().get_or_create(user=user)
        wallet.balance += amount
        wallet.lifetime_earned += amount
        wallet.save(update_fields=['balance', 'lifetime_earned', 'updated_at'])
    return amount


def backfill_wallet_totals(user_id_to_total_minutes):
    """
    Pure helper (no DB writes) used by both the data migration and its unit
    test: maps {user_id: total_minutes} -> {user_id: credits}, using the same
    floor-division rule as award_credits_for_log.
    """
    return {
        user_id: (total_minutes * CREDITS_PER_HOUR) // 60
        for user_id, total_minutes in user_id_to_total_minutes.items()
        if total_minutes > 0
    }
