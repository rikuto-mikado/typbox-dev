from django.db import migrations
from django.db.models import Sum

# 1 hour of logged study = 1,000 DATA CREDITS; mirrors economy.CREDITS_PER_HOUR
# (kept as a literal here, not imported, since migrations must not depend on
# app code that can change independently of migration history).
CREDITS_PER_HOUR = 1000


def backfill_credits(apps, schema_editor):
    """
    Retroactively grants every existing user a starting DATA CREDITS balance
    equal to all of their historical StudyLog time, so nobody who studied
    before this feature shipped loses out relative to a brand-new user.
    """
    StudyLog = apps.get_model('tracker', 'StudyLog')
    CreditWallet = apps.get_model('tracker', 'CreditWallet')

    totals = (
        StudyLog.objects.values('user_id')
        .annotate(total_minutes=Sum('duration_minutes'))
        .filter(total_minutes__gt=0)
    )
    wallets = [
        CreditWallet(
            user_id=row['user_id'],
            balance=(row['total_minutes'] * CREDITS_PER_HOUR) // 60,
            lifetime_earned=(row['total_minutes'] * CREDITS_PER_HOUR) // 60,
            lifetime_spent=0,
        )
        for row in totals
    ]
    if wallets:
        CreditWallet.objects.bulk_create(wallets, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        ('tracker', '0009_creditwallet_mapprogress_profile_fields'),
    ]

    # Reverse is a no-op: by the time anyone rolls this back, backfilled
    # credits may already be spent on EXPLORE MAP cells, so zeroing the
    # wallet back out isn't a safe inverse (same reasoning as
    # 0003_clear_default_topic_placeholder.py's RunPython.noop reverse).
    operations = [
        migrations.RunPython(backfill_credits, migrations.RunPython.noop),
    ]
