from datetime import timedelta

from django.db import migrations, models
from django.utils import timezone


def give_paid_omens_a_full_turn(apps, schema_editor):
    # Omens read before the crate changed on a clock were paid for: they get
    # six hours from now rather than vanishing on the deploy.
    Profile = apps.get_model("tracker", "UserProfile")
    Profile.objects.exclude(crate_omen="").update(
        crate_omen_until=timezone.now() + timedelta(hours=6)
    )


class Migration(migrations.Migration):
    dependencies = [
        ("tracker", "0031_remove_userprofile_festival_gifts"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="crate_omen_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(give_paid_omens_a_full_turn, migrations.RunPython.noop),
    ]
