from django.db import migrations, models


class Migration(migrations.Migration):
    """Buff rules editions. Existing purchases are marked as edition 1 (the
    rules they were bought under); new ones default to 2."""

    dependencies = [
        ('tracker', '0021_userprofile_room_slots'),
    ]

    operations = [
        migrations.AddField(
            model_name='bitpurchase',
            name='rules',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AlterField(
            model_name='bitpurchase',
            name='rules',
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.AddField(
            model_name='bitpurchase',
            name='state',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
