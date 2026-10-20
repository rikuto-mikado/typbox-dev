from django.db import migrations


class Migration(migrations.Migration):
    """
    Retires the EXPLORE MAP feature: drops the DATA CREDITS wallet, per-map
    progress, and the map-clear theme grant list. The 100 former map-reward
    Surface Themes (scene-001..scene-100) now unlock through the normal
    Clearance Level track entirely on the frontend, so nothing here needs to
    be carried over — surface_theme values pointing at them stay valid.

    0009/0010 are kept rather than deleted since they may already be applied
    to existing databases. Reversing this migration recreates the tables
    empty; the dropped balances/progress are not restored.
    """

    dependencies = [
        ('tracker', '0010_backfill_credits_from_study_logs'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='unlocked_map_theme_ids',
        ),
        migrations.DeleteModel(
            name='CreditWallet',
        ),
        migrations.DeleteModel(
            name='MapProgress',
        ),
    ]
