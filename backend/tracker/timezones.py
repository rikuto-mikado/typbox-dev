"""
Per-user time zone helpers.

All timestamps are stored in UTC (settings.USE_TZ = True). The user's chosen
IANA zone (UserProfile.timezone) is only used to answer "what calendar day
is it for this user?" on the server, and by the frontend to render times.
"""
from datetime import timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone


def get_zone(name):
    """ZoneInfo for an IANA name, or None if blank/unknown."""
    if not name or not isinstance(name, str):
        return None
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return None


def is_valid_timezone(name):
    return get_zone(name) is not None


def get_user_zone(user):
    profile = getattr(user, 'profile', None)
    return get_zone(getattr(profile, 'timezone', '')) if profile else None


def user_localdate(user):
    """Today's date in the user's zone (falls back to the server zone)."""
    zone = get_user_zone(user)
    return timezone.localdate(timezone=zone) if zone else timezone.localdate()


def user_week_start(user):
    """'mon' or 'sun' from the user's profile (defaults to Monday)."""
    profile = getattr(user, 'profile', None)
    value = getattr(profile, 'week_start', '') if profile else ''
    return 'sun' if value == 'sun' else 'mon'


def week_start_date(day, week_start='mon'):
    """First day (inclusive) of the calendar week containing `day`."""
    # date.weekday(): Monday = 0 ... Sunday = 6
    offset = (day.weekday() + 1) % 7 if week_start == 'sun' else day.weekday()
    return day - timedelta(days=offset)
