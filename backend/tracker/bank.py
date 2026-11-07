"""
TYPBOX BANK: loans and the VAULT.

LOANS (one open at a time per plan):
  study      interest-free for GRACE days, small: up to STUDY_RATE BITS per
             hour studied in the last 30 days (STUDY_CAP at most). Past its
             grace it charges like a standard loan's big sister.
  standard   as much as STANDARD_RATE BITS per hour ever studied (STANDARD_CAP
             at most), interest every day from the first.
  emergency  never asked for: when a boss's blow leaves the wallet short
             (attacks.py), the bank lends exactly the shortfall at the
             highest rate. While one is owed nothing else can be bought
             (the bank aside), and half of what every new log
             earns goes to paying it back.
Interest is simple and daily: each whole day a loan has run past its grace
adds rate_bp of what is still owed of its principal (at least 1 BITS), and
it never adds up to more than the principal itself. A repayment pays the
interest first, then the principal.

The VAULT holds BITS out of the wallet: a boss's blow never touches it. It
grows VAULT_RATE_BP a day (at most VAULT_DAY_CAP) on every day with
VAULT_STUDY_MINUTES logged, so it pays to keep studying, not to sit on it.
NEBULA's wishes reach in: a DRIFT stops loan interest for days, a SILVER RAIN
doubles the vault's next paying day (wishes.py).

All of it is replayed from BankEntry rows (models.py) and the logs; nothing
is stored but the movements, which a BITS reset deletes.
"""

from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import BankEntry, StudyLog, UserProfile
from .timezones import get_user_zone

GRACE = 14
STUDY_RATE = 30
STUDY_CAP = 5000
STANDARD_RATE = 50
STANDARD_CAP = 50000
PLANS = {
    "study": {"name": "STUDY LOAN", "rate_bp": 100, "grace": GRACE},
    "standard": {"name": "STANDARD LOAN", "rate_bp": 50, "grace": 0},
    "emergency": {"name": "EMERGENCY LOAN", "rate_bp": 200, "grace": 0},
}
VAULT_RATE_BP = 50
VAULT_DAY_CAP = 300
VAULT_STUDY_MINUTES = 60
AUTO_REPAY_SHARE = 0.5
DAY = timedelta(days=1)


class BankError(Exception):
    pass


def _zone(user):
    return get_user_zone(user) or timezone.get_current_timezone()


def ledger_flow(user):
    """What the bank puts in the wallet (positive) or takes from it."""
    sums = {
        row["kind"]: row["total"] or 0
        for row in BankEntry.objects.filter(user=user).values("kind").annotate(total=Sum("amount"))
    }
    return (
        sums.get(BankEntry.LOAN, 0)
        + sums.get(BankEntry.WITHDRAW, 0)
        - sums.get(BankEntry.REPAY, 0)
        - sums.get(BankEntry.DEPOSIT, 0)
    )


def loan_status(loan, repayments, now, asleep=()):
    """{'principal', 'interest', 'owed', 'paid', 'days'} for one loan.
    `asleep`: [(from, until)] a NEBULA DRIFT kept the interest away
    (wishes.py): a day ending inside one adds none."""
    rate, grace = loan.rate_bp, loan.grace_days
    pays = sorted((r for r in repayments if r.created_at <= now), key=lambda r: (r.created_at, r.id))
    left_principal, interest, accrued, paid = loan.amount, 0, 0, 0
    i = 0

    def pay(amount):
        nonlocal interest, left_principal, paid
        paid += amount
        to_interest = min(amount, interest)
        interest -= to_interest
        left_principal = max(0, left_principal - (amount - to_interest))

    days = max(0, int((now - loan.created_at) / DAY))
    for k in range(1, days + 1):
        boundary = loan.created_at + k * DAY
        while i < len(pays) and pays[i].created_at < boundary:
            pay(pays[i].amount)
            i += 1
        if left_principal <= 0 and interest <= 0:
            break
        if any(start <= boundary < until for start, until in asleep):
            continue
        if k > grace and rate and left_principal > 0 and accrued < loan.amount:
            add = min(max(1, left_principal * rate // 10000), loan.amount - accrued)
            interest += add
            accrued += add
    while i < len(pays):
        pay(pays[i].amount)
        i += 1
    return {
        "principal": left_principal,
        "interest": interest,
        "owed": left_principal + interest,
        "paid": paid,
        "days": days,
    }


def loans(user, now=None):
    """[(loan, status)] oldest first."""
    now = now or timezone.now()
    rows = list(BankEntry.objects.filter(user=user, kind__in=(BankEntry.LOAN, BankEntry.REPAY)))
    pays = {}
    for r in rows:
        if r.kind == BankEntry.REPAY and r.loan_id:
            pays.setdefault(r.loan_id, []).append(r)
    from . import wishes

    asleep = wishes.drift_windows(user)
    return [
        (loan, loan_status(loan, pays.get(loan.id, []), now, asleep))
        for loan in sorted((r for r in rows if r.kind == BankEntry.LOAN), key=lambda r: (r.created_at, r.id))
    ]


def emergency_owed(user, now=None):
    return sum(s["owed"] for loan, s in loans(user, now) if loan.plan == "emergency")


def check_not_in_debt(user, now=None):
    """Raises economy.PurchaseError while an EMERGENCY loan is owed."""
    from .economy import PurchaseError

    if emergency_owed(user, now) > 0:
        raise PurchaseError("Pay back TYPBOX BANK's emergency loan first.")


def _minutes_by_day(user):
    out = {}
    for day, minutes in StudyLog.objects.filter(user=user).values_list("date", "duration_minutes"):
        out[day] = out.get(day, 0) + minutes
    return out


def silver_state(user, now=None):
    """[(from, multiplier, used)] for each SILVER RAIN (wishes.py): used once
    a vault day ending after it has paid."""
    return _vault(user, now)["rains"]


def vault_state(user, now=None):
    out = _vault(user, now)
    out.pop("rains")
    return out


def _vault(user, now=None):
    """{'balance', 'interest', 'deposited', 'withdrawn'}: the VAULT replayed
    from its movements, with a day's interest added at the end of each past
    local day with enough study."""
    now = now or timezone.now()
    moves = list(
        BankEntry.objects.filter(user=user, kind__in=(BankEntry.DEPOSIT, BankEntry.WITHDRAW)).order_by(
            "created_at", "id"
        )
    )
    from . import wishes

    rains = [[start, mult, False] for start, mult in wishes.silver_rains(user)]
    if not moves:
        return {"balance": 0, "interest": 0, "deposited": 0, "withdrawn": 0, "rains": [tuple(r) for r in rains]}
    zone = _zone(user)
    minutes = _minutes_by_day(user)
    day = timezone.localtime(moves[0].created_at, zone).date()
    today = timezone.localtime(now, zone).date()
    balance = interest = deposited = withdrawn = 0
    i = 0
    while True:
        end = timezone.make_aware(datetime.combine(day + timedelta(days=1), time.min), zone)
        while i < len(moves) and moves[i].created_at < min(end, now + timedelta(microseconds=1)):
            m = moves[i]
            if m.kind == BankEntry.DEPOSIT:
                balance += m.amount
                deposited += m.amount
            else:
                balance -= m.amount
                withdrawn += m.amount
            i += 1
        if day >= today:
            break
        if balance > 0 and minutes.get(day, 0) >= VAULT_STUDY_MINUTES:
            add = min(VAULT_DAY_CAP, balance * VAULT_RATE_BP // 10000)
            rain = next((r for r in rains if not r[2] and r[0] < end), None)
            if rain is not None and add > 0:
                rain[2] = True
                add *= rain[1]
            balance += add
            interest += add
        day += timedelta(days=1)
    return {
        "balance": max(0, balance),
        "interest": interest,
        "deposited": deposited,
        "withdrawn": withdrawn,
        "rains": [tuple(r) for r in rains],
    }


def _hours_since(user, since):
    q = StudyLog.objects.filter(user=user)
    if since is not None:
        q = q.filter(date__gte=since)
    return (q.aggregate(m=Sum("duration_minutes"))["m"] or 0) / 60


def limits(user, now=None):
    now = now or timezone.now()
    today = timezone.localtime(now, _zone(user)).date()
    return {
        "study": min(STUDY_CAP, int(_hours_since(user, today - timedelta(days=30)) * STUDY_RATE)),
        "standard": min(STANDARD_CAP, int(_hours_since(user, None) * STANDARD_RATE)),
    }


def _wallet(user):
    from .economy import bits_summary

    return bits_summary(user)["balance"]


def _lock(user):
    profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
    return profile


def _amount(raw):
    if isinstance(raw, bool):
        raise BankError("Enter an amount.")
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise BankError("Enter an amount.")
    if value <= 0 or value > 10_000_000:
        raise BankError("Enter an amount.")
    return value


def borrow(user, plan, amount, now=None):
    now = now or timezone.now()
    if plan not in ("study", "standard"):
        raise BankError("Unknown loan.")
    amount = _amount(amount)
    with transaction.atomic():
        _lock(user)
        if any(loan.plan == plan and s["owed"] > 0 for loan, s in loans(user, now)):
            raise BankError(f"You already have a {PLANS[plan]['name']}. Pay it back first.")
        cap = limits(user, now)[plan]
        if amount > cap:
            raise BankError(f"The bank lends you up to {cap:,} BITS on this plan.")
        spec = PLANS[plan]
        return BankEntry.objects.create(
            user=user, kind=BankEntry.LOAN, plan=plan, amount=amount,
            rate_bp=spec["rate_bp"], grace_days=spec["grace"], created_at=now,
        )


def repay(user, loan_id, amount, now=None):
    now = now or timezone.now()
    amount = _amount(amount)
    with transaction.atomic():
        _lock(user)
        found = next(((loan, s) for loan, s in loans(user, now) if str(loan.id) == str(loan_id)), None)
        if found is None or found[1]["owed"] <= 0:
            raise BankError("Nothing is owed on that loan.")
        loan, status = found
        amount = min(amount, status["owed"])
        if amount > _wallet(user):
            raise BankError("Not enough BITS in your wallet.")
        return BankEntry.objects.create(user=user, kind=BankEntry.REPAY, loan=loan, amount=amount, created_at=now)


def deposit(user, amount, now=None):
    now = now or timezone.now()
    amount = _amount(amount)
    with transaction.atomic():
        _lock(user)
        if amount > _wallet(user):
            raise BankError("Not enough BITS in your wallet.")
        return BankEntry.objects.create(user=user, kind=BankEntry.DEPOSIT, amount=amount, created_at=now)


def withdraw(user, amount, now=None):
    now = now or timezone.now()
    amount = _amount(amount)
    with transaction.atomic():
        _lock(user)
        if amount > vault_state(user, now)["balance"]:
            raise BankError("The vault doesn't hold that much.")
        return BankEntry.objects.create(user=user, kind=BankEntry.WITHDRAW, amount=amount, created_at=now)


def cover_shortfall(user, now=None):
    """Lends a wallet that a boss left below zero back up to zero (EMERGENCY).
    The caller holds the profile lock."""
    now = now or timezone.now()
    short = -_wallet(user)
    if short <= 0:
        return None
    spec = PLANS["emergency"]
    return BankEntry.objects.create(
        user=user, kind=BankEntry.LOAN, plan="emergency", amount=short,
        rate_bp=spec["rate_bp"], grace_days=spec["grace"], created_at=now,
    )


def auto_repay(log, now=None):
    """Half of what a new log earns goes to the EMERGENCY loans, oldest first."""
    from .economy import bits_for_minutes

    now = now or timezone.now()
    earned = bits_for_minutes(log.duration_minutes) + (log.bonus_bits or 0) + (log.blessing_bits or 0)
    budget = int(earned * AUTO_REPAY_SHARE)
    if budget <= 0:
        return 0
    with transaction.atomic():
        _lock(log.user)
        paid = 0
        for loan, status in loans(log.user, now):
            if loan.plan != "emergency" or status["owed"] <= 0 or budget <= 0:
                continue
            amount = min(budget, status["owed"])
            BankEntry.objects.create(user=log.user, kind=BankEntry.REPAY, loan=loan, amount=amount, created_at=now)
            budget -= amount
            paid += amount
        return paid


def serialize(user, now=None):
    now = now or timezone.now()
    rows = loans(user, now)
    caps = limits(user, now)
    open_plans = {loan.plan for loan, s in rows if s["owed"] > 0}
    return {
        "loans": [
            {
                "id": loan.id,
                "plan": loan.plan,
                "name": PLANS.get(loan.plan, {}).get("name", loan.plan.upper()),
                "amount": loan.amount,
                "rate_bp": loan.rate_bp,
                "grace_days": loan.grace_days,
                "created_at": loan.created_at.isoformat(),
                "interest_from": (loan.created_at + loan.grace_days * DAY).isoformat(),
                **status,
            }
            for loan, status in rows
            if status["owed"] > 0
        ],
        "owed": sum(s["owed"] for _, s in rows),
        "emergency_owed": sum(s["owed"] for loan, s in rows if loan.plan == "emergency"),
        "plans": [
            {
                "id": plan,
                "name": spec["name"],
                "rate_bp": spec["rate_bp"],
                "grace_days": spec["grace"],
                "limit": caps.get(plan, 0),
                "open": plan in open_plans,
            }
            for plan, spec in PLANS.items()
            if plan != "emergency"
        ],
        "vault": {
            **vault_state(user, now),
            "rate_bp": VAULT_RATE_BP,
            "day_cap": VAULT_DAY_CAP,
            "study_minutes": VAULT_STUDY_MINUTES,
        },
        "auto_repay": AUTO_REPAY_SHARE,
    }
