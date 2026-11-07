"""No charm is worn at the start any more (charms.py): WEAR pays for one.

Accounts from when ASTRA came free and was worn from the first day had that
first stretch implied; it is written into their wear history here, so they
keep wearing it (settled in) and their history reads the same as before.
"""

from django.db import migrations, models

SINCE = "2000-01-01T00:00:00+00:00"


def write_free_astra(apps, schema_editor):
    UserProfile = apps.get_model("tracker", "UserProfile")
    for profile in UserProfile.objects.all().only("id", "charm", "charm_log"):
        log = [e for e in (profile.charm_log or []) if isinstance(e, dict)]
        if not log and profile.charm != "astra":
            continue
        profile.charm_log = [{"at": SINCE, "charm": "astra"}, *log][-500:]
        profile.save(update_fields=["charm_log"])


def drop_free_astra(apps, schema_editor):
    UserProfile = apps.get_model("tracker", "UserProfile")
    for profile in UserProfile.objects.all().only("id", "charm_log"):
        log = profile.charm_log or []
        if log and isinstance(log[0], dict) and log[0].get("at") == SINCE:
            profile.charm_log = log[1:]
            profile.save(update_fields=["charm_log"])


class Migration(migrations.Migration):
    dependencies = [("tracker", "0038_remove_provisions")]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="charm",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.RunPython(write_free_astra, drop_free_astra),
    ]
