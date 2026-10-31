"""
BITS: the study currency. 1 hour of logged study = 100 BITS, whether it was
recorded with the stopwatch or entered manually.

Base earnings are derived from the StudyLog table rather than stored, so
every log ever written (including those that predate this feature) is paid
out with no backfill, and editing, deleting, clearing or importing logs
keeps the balance in step automatically. On top of that:

- a shop buff active when a log is committed adds that log's bonus_bits
  (stored on the log, so deleting it takes the bonus back too);
- every BitPurchase debits its price.

balance = floor(total minutes * 100 / 60) + sum(bonus_bits) - sum(prices)

The frontend mirrors BITS_PER_HOUR and the rounding in src/bits.ts to show
an instant balance after each commit; keep the two in sync.
"""

import random
from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from .furniture import FURNITURE, weekly_shop
from .models import BitPurchase, UserProfile
from .timezones import get_user_zone

BITS_PER_HOUR = 100

# A buff's minute-based bonus never counts more than this much of one log,
# so a single oversized entry can't drain (or max out) a buff in one go.
MAX_BONUS_MINUTES_PER_LOG = 180


def bits_for_minutes(minutes):
    """Whole BITS for a span of study. Floored once over the total, so many
    short logs earn exactly what one long log of the same length would."""
    return (max(0, minutes) * BITS_PER_HOUR) // 60


# ==========================================
# Shop catalog (buffs)
# ==========================================
# Only one buff can be active at a time. Tuned around ~75 study hours a
# week (~7,500 BITS, ~1,000 a day) as a real BITS sink: each costs roughly
# a day's earnings and, used to the full, returns only ~1.2-1.3x its price,
# so a buff pays off only for the operator who actually puts the hours in.
#   window:   'any' | 'night' (commits 22:00-01:59 local) | 'weekend' (Sat/Sun local)
#   expires:  'hours' (that many hours after purchase) | 'weekend' (end of the coming Sunday)
#   per_hour: extra BITS per covered hour of study (minute-capped buffs)
#   per_use:  flat bonus per qualifying log (use-capped buffs)
BUFFS = {
    'overclock': {
        'name': 'OVERCLOCK',
        'tagline': '×1.5 on your next 20 study hours',
        'detail': 'Every log you commit in the next 72h earns +50 BITS/h until 20 hours are covered (up to +1,000).',
        'price': 800,
        'window': 'any',
        'expires': 'hours',
        'hours': 72,
        'minutes': 1200,
        'per_hour': 50,
    },
    'focus_chip': {
        'name': 'FOCUS CHIP',
        'tagline': '+100 for each 50-minute+ session',
        'detail': 'For 72h, each single log of 50 minutes or more earns +100 BITS (up to 12 logs, +1,200).',
        'price': 900,
        'window': 'any',
        'expires': 'hours',
        'hours': 72,
        'uses': 12,
        'min_minutes': 50,
        'per_use': 100,
    },
    'night_shift': {
        'name': 'NIGHT SHIFT',
        'tagline': '×2 for late-night study',
        'detail': 'Logs committed between 22:00 and 02:00 in the next 72h earn +100 BITS/h (up to 8 hours, +800).',
        'price': 650,
        'window': 'night',
        'expires': 'hours',
        'hours': 72,
        'minutes': 480,
        'per_hour': 100,
    },
    'weekend_surge': {
        'name': 'WEEKEND SURGE',
        'tagline': '×1.5 all weekend',
        'detail': 'Logs committed this Saturday and Sunday earn +50 BITS/h (up to 24 hours, +1,200). Buy it any day — it holds your buff slot until Sunday ends.',
        'price': 1000,
        'window': 'weekend',
        'expires': 'weekend',
        'minutes': 1440,
        'per_hour': 50,
    },
    'lucky_byte': {
        'name': 'LUCKY BYTE',
        'tagline': '20% chance of ×3 on each log',
        'detail': 'For 72h, each log has a 1-in-5 chance to pay triple (up to 3h of it counts; up to 20 logs).',
        'price': 1000,
        'window': 'any',
        'expires': 'hours',
        'hours': 72,
        'uses': 20,
        'chance': 0.2,
        'multiplier': 3,
    },
    'hyperdrive': {
        'name': 'HYPERDRIVE',
        'tagline': '×2 on your next 25 study hours',
        'detail': 'Every log you commit in the next 96h earns +100 BITS/h until 25 hours are covered (up to +2,500).',
        'price': 2000,
        'window': 'any',
        'expires': 'hours',
        'hours': 96,
        'minutes': 1500,
        'per_hour': 100,
    },
}


def _local_now(user, now):
    zone = get_user_zone(user)
    return timezone.localtime(now, zone) if zone else timezone.localtime(now)


def _expiry(user, spec, now):
    if spec['expires'] == 'weekend':
        local = _local_now(user, now)
        # Monday=0 … Sunday=6: the coming (or current) Sunday, end of day.
        sunday = local.date() + timedelta(days=6 - local.weekday())
        end = datetime.combine(sunday + timedelta(days=1), time.min)
        return timezone.make_aware(end, local.tzinfo)
    return now + timedelta(hours=spec['hours'])


def _in_window(user, spec, now):
    if spec['window'] == 'any':
        return True
    local = _local_now(user, now)
    if spec['window'] == 'night':
        return local.hour >= 22 or local.hour < 2
    if spec['window'] == 'weekend':
        return local.weekday() >= 5
    return False


def active_buff(user, now=None):
    """The user's live buff purchase, or None."""
    now = now or timezone.now()
    return (
        BitPurchase.objects.filter(user=user, item_id__in=BUFFS, expires_at__gt=now)
        .filter(Q(remaining_minutes__isnull=True) | Q(remaining_minutes__gt=0))
        .filter(Q(remaining_uses__isnull=True) | Q(remaining_uses__gt=0))
        .order_by('-created_at')
        .first()
    )


def apply_buff_to_new_log(log, now=None):
    """
    Pays the active buff's bonus onto a just-created log and draws the buff
    down. Called once per log from StudyLogViewSet.perform_create (never for
    backup imports or edits).
    """
    now = now or timezone.now()
    with transaction.atomic():
        buff = active_buff(log.user, now)
        if buff is None:
            return
        buff = BitPurchase.objects.select_for_update().get(pk=buff.pk)
        spec = BUFFS[buff.item_id]
        if not _in_window(log.user, spec, now):
            return

        bonus = 0
        if 'per_hour' in spec:
            covered = min(log.duration_minutes, MAX_BONUS_MINUTES_PER_LOG, buff.remaining_minutes or 0)
            bonus = covered * spec['per_hour'] // 60
            buff.remaining_minutes -= covered
        elif 'per_use' in spec:
            if log.duration_minutes < spec.get('min_minutes', 0):
                return
            bonus = spec['per_use']
            buff.remaining_uses -= 1
        elif 'chance' in spec:
            buff.remaining_uses -= 1
            if random.random() < spec['chance']:
                counted = min(log.duration_minutes, MAX_BONUS_MINUTES_PER_LOG)
                bonus = bits_for_minutes(counted) * (spec['multiplier'] - 1)

        buff.bonus_earned += bonus
        buff.save(update_fields=['remaining_minutes', 'remaining_uses', 'bonus_earned'])
        if bonus:
            log.bonus_bits = bonus
            log.bonus_item = buff.item_id
            log.save(update_fields=['bonus_bits', 'bonus_item'])


def scale_bonus_on_edit(log, old_minutes):
    """A log shortened after the fact keeps only its share of the bonus."""
    if log.bonus_bits and log.duration_minutes < old_minutes:
        log.bonus_bits = log.bonus_bits * log.duration_minutes // old_minutes
        log.save(update_fields=['bonus_bits'])


def bits_summary(user):
    logs = user.study_logs.aggregate(
        minutes=Sum('duration_minutes'), bonus=Sum('bonus_bits')
    )
    earned = bits_for_minutes(logs['minutes'] or 0) + (logs['bonus'] or 0)
    spent = user.bit_purchases.aggregate(total=Sum('price'))['total'] or 0
    return {
        'balance': earned - spent,
        'earned': earned,
        'spent': spent,
        'per_hour': BITS_PER_HOUR,
    }


def serialize_buff(purchase):
    if purchase is None:
        return None
    spec = BUFFS[purchase.item_id]
    return {
        'item_id': purchase.item_id,
        'name': spec['name'],
        'expires_at': purchase.expires_at,
        'remaining_minutes': purchase.remaining_minutes,
        'total_minutes': spec.get('minutes'),
        'remaining_uses': purchase.remaining_uses,
        'total_uses': spec.get('uses'),
        'bonus_earned': purchase.bonus_earned,
    }


def shop_state(user, now=None):
    now = now or timezone.now()
    return {
        'bits': bits_summary(user),
        'active_buff': serialize_buff(active_buff(user, now)),
        'buffs': [
            {'item_id': item_id, **{k: spec[k] for k in ('name', 'tagline', 'detail', 'price')}}
            for item_id, spec in BUFFS.items()
        ],
    }


class PurchaseError(Exception):
    pass


def buy(user, item_id, now=None):
    """Debits the price and starts the buff (or adds the furniture piece to
    the inventory), or raises PurchaseError."""
    now = now or timezone.now()
    if item_id in FURNITURE:
        return _buy_furniture(user, item_id, now)
    spec = BUFFS.get(item_id)
    if spec is None:
        raise PurchaseError('Unknown item.')
    with transaction.atomic():
        # Serialize a user's purchases so two quick taps can't both spend
        # the same balance.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if active_buff(user, now) is not None:
            raise PurchaseError('A buff is already running — wait for it to finish.')
        if bits_summary(user)['balance'] < spec['price']:
            raise PurchaseError('Not enough BITS.')
        return BitPurchase.objects.create(
            user=user,
            item_id=item_id,
            price=spec['price'],
            expires_at=_expiry(user, spec, now),
            remaining_minutes=spec.get('minutes'),
            remaining_uses=spec.get('uses'),
        )


def _buy_furniture(user, item_id, now):
    spec = FURNITURE[item_id]
    if item_id not in weekly_shop(user, now)['items']:
        raise PurchaseError('That piece is not in this week\'s shop.')
    with transaction.atomic():
        UserProfile.objects.select_for_update().get_or_create(user=user)
        # One of each piece: owning it already (bought earlier, or a
        # double tap racing this one) blocks a second purchase.
        if BitPurchase.objects.filter(user=user, item_id=item_id).exists():
            raise PurchaseError('You already own this piece.')
        if bits_summary(user)['balance'] < spec['price']:
            raise PurchaseError('Not enough BITS.')
        return BitPurchase.objects.create(user=user, item_id=item_id, price=spec['price'])
