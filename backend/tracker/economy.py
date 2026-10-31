"""
BITS: the study currency. 1 hour of logged study = 100 BITS, whether it was
recorded with the stopwatch or entered manually.

Base earnings are derived from the StudyLog table rather than stored, so
every log ever written (including those that predate this feature) is paid
out with no backfill, and editing, deleting, clearing or importing logs
keeps the balance in step automatically. On top of that:

- a shop buff active when a log is committed adds that log's bonus_bits
  (stored on the log, so deleting it takes the bonus back too);
- every BitPurchase debits its price, less anything refunded when a buff
  was cancelled early (cancel_buff).

balance = floor(total minutes * 100 / 60) + sum(bonus_bits) - sum(price - refunded)

The frontend mirrors BITS_PER_HOUR and the rounding in src/bits.ts to show
an instant balance after each commit; keep the two in sync.
"""

import random
from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import F, Q, Sum
from django.utils import timezone

from .furniture import FURNITURE, weekly_shop
from .models import BitPurchase, Category, UserProfile
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
# week (~7,500 BITS, ~1,000 a day) as a real BITS sink: each costs up to
# about a day's earnings and, used to the full, returns only ~1.2-1.35x its
# price, so a buff pays off only for the operator who actually puts the
# hours in. Listed (and shown in the shop) cheapest first.
#   window:   'any' | 'night' (commits 22:00-01:59 local) |
#             'morning' (05:00-08:59 local) | 'weekend' (Sat/Sun local)
#   expires:  'hours' (that many hours after purchase) | 'weekend' (end of the coming Sunday)
#   per_hour: extra BITS per covered hour of study (minute-capped buffs)
#   per_use:  flat bonus per qualifying log (use-capped buffs)
#   category: True = bought for one category and pays only on its logs
#   crate:    {buff_id: weight}: buying it starts one of those buffs, drawn
#             at random (the purchase records the crate in `via`)
BUFFS = {
    'warm_up': {
        'name': 'WARM-UP',
        'tagline': '×2 on your next 5 study hours',
        'detail': 'Every log you commit in the next 48h earns +100 BITS/h until 5 hours are covered (up to +500). A cheap first buff.',
        'price': 400,
        'window': 'any',
        'expires': 'hours',
        'hours': 48,
        'minutes': 300,
        'per_hour': 100,
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
    'early_bird': {
        'name': 'EARLY BIRD',
        'tagline': '×2 for morning study',
        'detail': 'Logs committed between 05:00 and 09:00 in the next 72h earn +100 BITS/h (up to 8 hours, +800).',
        'price': 650,
        'window': 'morning',
        'expires': 'hours',
        'hours': 72,
        'minutes': 480,
        'per_hour': 100,
    },
    'mystery_crate': {
        'name': 'MYSTERY CRATE',
        'tagline': 'One random buff — maybe a HYPERDRIVE',
        'detail': 'Opens into one of the other buffs (not CATEGORY LOCK), which starts right away with its usual rules. Rare ones are rare.',
        'price': 700,
        'window': 'any',
        'expires': 'hours',
        'crate': {
            'warm_up': 20,
            'night_shift': 15,
            'early_bird': 15,
            'overclock': 15,
            'focus_chip': 12,
            'weekend_surge': 8,
            'lucky_byte': 8,
            'deep_dive': 5,
            'hyperdrive': 2,
        },
    },
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
    'category_lock': {
        'name': 'CATEGORY LOCK',
        'tagline': '×2 for one category you pick',
        'detail': 'Pick a category: for 72h its logs earn +100 BITS/h (up to 12 hours, +1,200). Logs in other categories earn the usual rate.',
        'price': 900,
        'window': 'any',
        'expires': 'hours',
        'hours': 72,
        'minutes': 720,
        'per_hour': 100,
        'category': True,
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
    'deep_dive': {
        'name': 'DEEP DIVE',
        'tagline': '+250 for each 2-hour+ session',
        'detail': 'For 96h, each single log of 120 minutes or more earns +250 BITS (up to 6 logs, +1,500).',
        'price': 1200,
        'window': 'any',
        'expires': 'hours',
        'hours': 96,
        'uses': 6,
        'min_minutes': 120,
        'per_use': 250,
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

# The crate itself never runs as a buff: its purchases carry the rolled id.
RUNNABLE_BUFFS = [item_id for item_id, spec in BUFFS.items() if 'crate' not in spec]


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
    if spec['window'] == 'morning':
        return 5 <= local.hour < 9
    if spec['window'] == 'weekend':
        return local.weekday() >= 5
    return False


def active_buff(user, now=None):
    """The user's live buff purchase, or None."""
    now = now or timezone.now()
    return (
        BitPurchase.objects.filter(user=user, item_id__in=RUNNABLE_BUFFS, expires_at__gt=now)
        .filter(Q(remaining_minutes__isnull=True) | Q(remaining_minutes__gt=0))
        .filter(Q(remaining_uses__isnull=True) | Q(remaining_uses__gt=0))
        .select_related('category')
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
        # Re-check under the lock: a cancel (or another log using the last
        # minutes / uses) may have landed between the lookup and the lock.
        if (
            buff.expires_at is None
            or buff.expires_at <= timezone.now()
            or (buff.remaining_minutes is not None and buff.remaining_minutes <= 0)
            or (buff.remaining_uses is not None and buff.remaining_uses <= 0)
        ):
            return
        spec = BUFFS[buff.item_id]
        if not _in_window(log.user, spec, now):
            return
        if spec.get('category') and (buff.category_id is None or log.category_id != buff.category_id):
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
    spent = user.bit_purchases.aggregate(total=Sum(F('price') - F('refunded')))['total'] or 0
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
    category = purchase.category
    return {
        'item_id': purchase.item_id,
        'name': spec['name'],
        'expires_at': purchase.expires_at,
        'remaining_minutes': purchase.remaining_minutes,
        'total_minutes': spec.get('minutes'),
        'remaining_uses': purchase.remaining_uses,
        'total_uses': spec.get('uses'),
        'bonus_earned': purchase.bonus_earned,
        'refund': refund_amount(purchase),
        'via': purchase.via,
        'category': (
            {'id': category.id, 'code': category.code, 'name': category.name, 'color': category.color}
            if category
            else None
        ),
    }


def max_bonus(spec):
    """The most a buff can pay out, or None when it is down to luck."""
    if 'per_hour' in spec:
        return spec['minutes'] * spec['per_hour'] // 60
    if 'per_use' in spec:
        return spec['uses'] * spec['per_use']
    return None


def crate_odds(spec):
    total = sum(spec['crate'].values())
    return [
        {'item_id': item_id, 'name': BUFFS[item_id]['name'], 'chance': weight / total}
        for item_id, weight in spec['crate'].items()
    ]


def serialize_buff_offer(item_id, spec):
    return {
        'item_id': item_id,
        **{k: spec[k] for k in ('name', 'tagline', 'detail', 'price', 'window', 'expires')},
        # Card stats: lifetime, cap and the best case.
        'hours': spec.get('hours'),
        'minutes': spec.get('minutes'),
        'uses': spec.get('uses'),
        'max_bonus': max_bonus(spec),
        'needs_category': bool(spec.get('category')),
        'odds': crate_odds(spec) if 'crate' in spec else None,
    }


def shop_state(user, now=None):
    now = now or timezone.now()
    return {
        'bits': bits_summary(user),
        'active_buff': serialize_buff(active_buff(user, now)),
        'buffs': [serialize_buff_offer(item_id, spec) for item_id, spec in BUFFS.items()],
    }


class PurchaseError(Exception):
    pass


# Cancelling a running buff hands back two thirds of the unused part of its
# price. Prorating by what is left (minutes or uses) matters: bonuses already
# paid onto logs stay, so a flat refund would let anyone use a buff almost
# to the end and then get most of the price back.
REFUND_NUMERATOR = 2
REFUND_DENOMINATOR = 3


def remaining_share(purchase):
    """(left, total) of the buff's capacity: minutes for minute-capped
    buffs, uses for use-capped ones."""
    spec = BUFFS[purchase.item_id]
    if spec.get('minutes') and purchase.remaining_minutes is not None:
        return purchase.remaining_minutes, spec['minutes']
    if spec.get('uses') and purchase.remaining_uses is not None:
        return purchase.remaining_uses, spec['uses']
    return 0, 1


def refund_amount(purchase):
    left, total = remaining_share(purchase)
    return purchase.price * left * REFUND_NUMERATOR // (total * REFUND_DENOMINATOR)


def cancel_buff(user, now=None):
    """Ends the running buff now and refunds its unused share; returns the
    BITS refunded, or raises PurchaseError when no buff is running."""
    now = now or timezone.now()
    with transaction.atomic():
        # Same lock as a purchase: a cancel can't race a buy or a log commit.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        buff = active_buff(user, now)
        if buff is None:
            raise PurchaseError('No buff is running.')
        buff = BitPurchase.objects.select_for_update().get(pk=buff.pk)
        refund = refund_amount(buff)
        buff.refunded = refund
        buff.expires_at = now
        buff.save(update_fields=['refunded', 'expires_at'])
        return refund


def roll_crate(spec):
    """The buff id a crate opens into (weighted draw)."""
    ids = list(spec['crate'])
    return random.choices(ids, weights=[spec['crate'][i] for i in ids])[0]


def buy(user, item_id, now=None, category_id=None):
    """Debits the price and starts the buff (or adds the furniture piece to
    the inventory), or raises PurchaseError. CATEGORY LOCK needs
    `category_id`: one of the user's own in-progress categories."""
    now = now or timezone.now()
    if item_id in FURNITURE:
        return _buy_furniture(user, item_id, now)
    spec = BUFFS.get(item_id)
    if spec is None:
        raise PurchaseError('Unknown item.')
    category = None
    if spec.get('category'):
        if category_id in (None, ''):
            raise PurchaseError('Pick a category for this buff.')
        try:
            category = Category.objects.get(pk=int(category_id), user=user, completed_at__isnull=True)
        except (Category.DoesNotExist, TypeError, ValueError):
            raise PurchaseError('Unknown category.')
    with transaction.atomic():
        # Serialize a user's purchases so two quick taps can't both spend
        # the same balance.
        UserProfile.objects.select_for_update().get_or_create(user=user)
        if active_buff(user, now) is not None:
            raise PurchaseError('A buff is already running — wait for it to finish.')
        if bits_summary(user)['balance'] < spec['price']:
            raise PurchaseError('Not enough BITS.')
        via = ''
        runs, run_spec = item_id, spec
        if 'crate' in spec:
            via = item_id
            runs = roll_crate(spec)
            run_spec = BUFFS[runs]
        return BitPurchase.objects.create(
            user=user,
            item_id=runs,
            price=spec['price'],
            expires_at=_expiry(user, run_spec, now),
            remaining_minutes=run_spec.get('minutes'),
            remaining_uses=run_spec.get('uses'),
            category=category,
            via=via,
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
