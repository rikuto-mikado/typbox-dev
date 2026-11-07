"""Charms and blessings now start locked and are unlocked once, for a price
(charms.py, blessings.py). What an account already wears, or already paid for
under the earlier rules (a 'charm:<id>' / 'blessing:<id>' purchase), is
unlocked here for nothing."""

from django.db import migrations

CHARMS = {"astra", "polaris", "nova", "aurora", "nebula", "orion"}
BLESSINGS = {
    "steady", "grace", "first_light", "sprinter", "still_water", "hearth", "sabbath",
    "marathon", "resonance", "homecoming", "tenacity", "constellation", "ascendant",
}


def grant(apps, schema_editor):
    UserProfile = apps.get_model("tracker", "UserProfile")
    BitPurchase = apps.get_model("tracker", "BitPurchase")
    wanted = set()
    for p in UserProfile.objects.all().only("user_id", "charm", "blessing"):
        if p.charm in CHARMS:
            wanted.add((p.user_id, f"unlock:charm:{p.charm}"))
        if p.blessing in BLESSINGS:
            wanted.add((p.user_id, f"unlock:blessing:{p.blessing}"))
    for user_id, item_id in BitPurchase.objects.filter(item_id__startswith="charm:").values_list("user_id", "item_id"):
        if item_id[len("charm:"):] in CHARMS:
            wanted.add((user_id, "unlock:" + item_id))
    for user_id, item_id in BitPurchase.objects.filter(item_id__startswith="blessing:").values_list("user_id", "item_id"):
        if item_id[len("blessing:"):] in BLESSINGS:
            wanted.add((user_id, "unlock:" + item_id))
    for user_id, item_id in sorted(wanted):
        if not BitPurchase.objects.filter(user_id=user_id, item_id=item_id).exists():
            BitPurchase.objects.create(user_id=user_id, item_id=item_id, price=0)


def ungrant(apps, schema_editor):
    BitPurchase = apps.get_model("tracker", "BitPurchase")
    BitPurchase.objects.filter(item_id__startswith="unlock:", price=0).delete()


class Migration(migrations.Migration):
    dependencies = [("tracker", "0039_charms_worn_by_choice")]

    operations = [migrations.RunPython(grant, ungrant)]
