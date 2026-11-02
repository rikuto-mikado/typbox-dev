from django.db import migrations, models


class Migration(migrations.Migration):
    """STARLIGHT is worked out from the logs: only what was spent is stored."""

    dependencies = [
        ('tracker', '0026_userprofile_starlight'),
    ]

    operations = [
        migrations.RemoveField(model_name='userprofile', name='starlight'),
        migrations.RemoveField(model_name='userprofile', name='star_days'),
        migrations.AddField(
            model_name='userprofile',
            name='star_spends',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='crate_omen',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='shop_salt',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
