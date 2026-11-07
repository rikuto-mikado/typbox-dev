"""VITALITY, PROVISIONS and the BACKPACK are gone: a boss's blows take BITS
again (attacks.py). Whatever was bought for them comes back: the purchases
are deleted, so the ledger refunds their price, and the stars a bigger
backpack cost are spent no more."""

from django.db import migrations


def forwards(apps, schema_editor):
    BitPurchase = apps.get_model("tracker", "BitPurchase")
    UserProfile = apps.get_model("tracker", "UserProfile")
    BitPurchase.objects.filter(item_id__startswith="food:").delete()
    BitPurchase.objects.filter(item_id__startswith="pack:").delete()
    for profile in UserProfile.objects.exclude(star_spends=[]):
        spends = [
            s
            for s in profile.star_spends or []
            if not (isinstance(s, dict) and str(s.get("key", "")).startswith("pack:"))
        ]
        if spends != (profile.star_spends or []):
            profile.star_spends = spends
            profile.save(update_fields=["star_spends"])


class Migration(migrations.Migration):
    dependencies = [("tracker", "0037_charms_vitality_bank")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
