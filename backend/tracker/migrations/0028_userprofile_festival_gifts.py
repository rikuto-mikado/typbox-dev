from django.db import migrations, models


class Migration(migrations.Migration):
    """FESTIVALS: the years a festival's present was opened."""

    dependencies = [
        ('tracker', '0027_starlight_from_logs'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='festival_gifts',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
