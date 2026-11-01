from django.db import migrations, models


class Migration(migrations.Migration):
    """The furniture shop's reserve: one piece a user keeps on hold."""

    dependencies = [
        ('tracker', '0022_bitpurchase_rules_state'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='shop_reserve',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
    ]
