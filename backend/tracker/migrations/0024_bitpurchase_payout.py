from django.db import migrations, models


class Migration(migrations.Migration):
    """CHALLENGES (BOSS RAID, RIVAL): what a settled challenge paid back."""

    dependencies = [
        ('tracker', '0023_userprofile_shop_reserve'),
    ]

    operations = [
        migrations.AddField(
            model_name='bitpurchase',
            name='payout',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
