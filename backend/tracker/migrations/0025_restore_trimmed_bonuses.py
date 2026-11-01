from datetime import timedelta

from django.db import migrations
from django.db.models import Sum

# auto_now and auto_now_add are stamped microseconds apart on create, and
# paying a bonus does not touch updated_at, so anything past this was edited.
EDITED_AFTER = timedelta(seconds=1)


def restore_trimmed_bonuses(apps, schema_editor):
    """Shortening a log used to trim its bonus_bits, while the purchase's
    bonus_earned kept the full amount. Hands the difference back to the log.

    Old lengths were not recorded and a deleted log leaves the same gap, so
    this only acts when exactly one log of the purchase has been edited.
    """
    BitPurchase = apps.get_model("tracker", "BitPurchase")
    StudyLog = apps.get_model("tracker", "StudyLog")

    for purchase in BitPurchase.objects.filter(bonus_earned__gt=0).order_by("created_at"):
        logs = StudyLog.objects.filter(
            user_id=purchase.user_id,
            bonus_item=purchase.item_id,
            created_at__gte=purchase.created_at,
        )
        # Only one buff runs at a time, so the next purchase of the same item
        # closes the span of logs this one paid on.
        following = (
            BitPurchase.objects.filter(
                user_id=purchase.user_id,
                item_id=purchase.item_id,
                created_at__gt=purchase.created_at,
            )
            .order_by("created_at")
            .first()
        )
        if following is not None:
            logs = logs.filter(created_at__lt=following.created_at)

        paid = logs.aggregate(total=Sum("bonus_bits"))["total"] or 0
        gap = purchase.bonus_earned - paid
        if gap <= 0:
            continue

        edited = [
            log for log in logs if log.updated_at - log.created_at > EDITED_AFTER
        ]
        if len(edited) != 1:
            print(
                f"  purchase {purchase.pk} ({purchase.item_id}): {gap} BITS gap, "
                f"{len(edited)} edited logs, left as is"
            )
            continue

        log = edited[0]
        print(
            f"  purchase {purchase.pk} ({purchase.item_id}): log {log.pk} bonus "
            f"{log.bonus_bits} -> {log.bonus_bits + gap}"
        )
        StudyLog.objects.filter(pk=log.pk).update(bonus_bits=log.bonus_bits + gap)


class Migration(migrations.Migration):
    """Editing a log no longer changes its buff bonus: undo past trims."""

    dependencies = [
        ('tracker', '0024_bitpurchase_payout'),
    ]

    operations = [
        migrations.RunPython(restore_trimmed_bonuses, migrations.RunPython.noop),
    ]
