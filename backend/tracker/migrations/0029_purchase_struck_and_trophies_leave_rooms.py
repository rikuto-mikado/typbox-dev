from django.db import migrations, models

# Trophies and medals moved from the room to the COLLECTION. They were never
# bought (they were worked out from the logs), so only rooms hold them.
GONE = {"trophy_100h", "trophy_500h", "trophy_1000h", "medal_logs100", "medal_logs1000"}


def _without(layout):
    if not isinstance(layout, dict) or not isinstance(layout.get("items"), list):
        return layout, False
    kept = [
        item
        for item in layout["items"]
        if not (isinstance(item, dict) and item.get("id") in GONE)
    ]
    if len(kept) == len(layout["items"]):
        return layout, False
    return {**layout, "items": kept}, True


def take_trophies_out_of_rooms(apps, schema_editor):
    UserProfile = apps.get_model("tracker", "UserProfile")
    for profile in UserProfile.objects.exclude(room_layout={}, room_slots=[]).iterator():
        layout, changed = _without(profile.room_layout)
        slots = profile.room_slots if isinstance(profile.room_slots, list) else []
        new_slots = []
        for slot in slots:
            if isinstance(slot, dict):
                for key in ("layout", "saved"):
                    cleaned, gone = _without(slot.get(key))
                    if gone:
                        slot = {**slot, key: cleaned}
                        changed = True
            new_slots.append(slot)
        if changed:
            profile.room_layout = layout
            profile.room_slots = new_slots
            profile.save(update_fields=["room_layout", "room_slots"])
    BitPurchase = apps.get_model("tracker", "BitPurchase")
    BitPurchase.objects.filter(item_id__in=GONE).delete()


class Migration(migrations.Migration):
    dependencies = [("tracker", "0028_userprofile_festival_gifts")]

    operations = [
        migrations.AddField(
            model_name="bitpurchase",
            name="struck",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(take_trophies_out_of_rooms, migrations.RunPython.noop),
    ]
