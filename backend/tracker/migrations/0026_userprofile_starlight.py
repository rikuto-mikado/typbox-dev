from django.db import migrations, models


class Migration(migrations.Migration):
    """STARLIGHT: the gauge, the days a star was lit and the last save."""

    dependencies = [
        ('tracker', '0025_restore_trimmed_bonuses'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='starlight',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='star_days',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='last_guard',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
