import React, { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Flame, Landmark, Loader2, PiggyBank, Wallet } from 'lucide-react';
import type { BankAction, BankState, LoanPlan } from './api';
import { BitShard } from './BitsBadge';
import { tf, useI18n } from './i18n';

// The BANK tab of BITS // EXCHANGE: TYPBOX BANK's loans and vault (backend
// bank.py).

const fmt = (n: number) => n.toLocaleString('en-US');
const pct = (bp: number) => (bp / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

const AmountForm: React.FC<{
  label: string;
  max: number;
  disabled: boolean;
  busy: boolean;
  onSubmit: (amount: number) => void;
  borderCol: string;
  textMuted: string;
  accent?: string;
}> = ({ label, max, disabled, busy, onSubmit, borderCol, textMuted, accent = '#fbbf24' }) => {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const amount = Math.floor(Number(value));
  const ok = !disabled && Number.isFinite(amount) && amount > 0 && amount <= max;
  return (
    <form
      className="flex items-stretch gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) {
          onSubmit(amount);
          setValue('');
        }
      }}
    >
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={tf(t.bankUpTo, { n: fmt(Math.max(0, max)) })}
        aria-label={`${label} · ${t.bankAmount}`}
        disabled={disabled}
        className={`min-w-0 flex-1 h-9 px-2 bg-black/20 border ${borderCol} text-xs tabular-nums outline-none focus:border-amber-400 disabled:opacity-50`}
      />
      <button
        type="button"
        onClick={() => setValue(String(Math.max(0, max)))}
        disabled={disabled || max <= 0}
        className={`px-2 border ${borderCol} ${textMuted} text-[9px] uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        MAX
      </button>
      <button
        type="submit"
        disabled={!ok || busy}
        className="px-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950"
        style={{ background: accent }}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : label}
      </button>
    </form>
  );
};

/** run(): one action at a time, its error shown above the panel. */
const useRunner = (fallback: string) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError((err as Error).message || fallback);
    } finally {
      setBusy(null);
    }
  };
  return { busy, error, run };
};

/** One of the three numbers at the top of the bank. */
const Stat: React.FC<{ icon: React.ReactNode; label: string; value: number; tone: string; textMuted: string }> = ({ icon, label, value, tone, textMuted }) => (
  <div className="p-3 border border-white/10 bg-black/20 min-w-0">
    <div className={`flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] ${textMuted}`}>
      {icon}
      {label}
    </div>
    <div className="mt-1 flex items-center gap-1.5 text-lg sm:text-xl font-bold tabular-nums truncate" style={{ color: tone }}>
      <BitShard className="w-3 h-3 shrink-0" />
      {fmt(value)}
    </div>
  </div>
);

export const BankPanel: React.FC<{
  bank: BankState;
  balance: number;
  demo: boolean;
  onBank: (body: BankAction) => Promise<void>;
  borderCol: string;
  textMuted: string;
}> = ({ bank, balance, demo, onBank, borderCol, textMuted }) => {
  const { t } = useI18n();
  const { busy, error, run } = useRunner(t.bankFailed);
  const [vaultMode, setVaultMode] = useState<'deposit' | 'withdraw'>('deposit');
  const emergency = bank.loans.filter((l) => l.plan === 'emergency');

  return (
    <div className="space-y-4">
      {error && <div className="p-2 border border-rose-500/40 text-rose-400 text-[10px]">{error}</div>}

      {/* The counter: wallet, vault and what is owed, at a glance. */}
      <section
        className="relative overflow-hidden p-3 sm:p-4 border border-amber-400/30"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(0,0,0,0) 55%), repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 6px, transparent 6px 12px)' }}
        aria-label={t.bankTitle}
      >
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">
          <Landmark className="w-4 h-4" />
          {t.bankTitle}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat icon={<Wallet className="w-3 h-3" />} label={t.bankWallet} value={balance} tone="#fafafa" textMuted={textMuted} />
          <Stat icon={<PiggyBank className="w-3 h-3" />} label={t.bankVault} value={bank.vault.balance} tone="#fbbf24" textMuted={textMuted} />
          <Stat icon={<Landmark className="w-3 h-3" />} label={t.bankOwedLabel} value={bank.owed} tone={bank.owed ? '#fb7185' : '#71717a'} textMuted={textMuted} />
        </div>
      </section>

      {emergency.length > 0 && (
        <div className="p-3 border border-rose-500/60 bg-rose-500/10 text-rose-200 text-[10px] font-sans flex gap-2">
          <Flame className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{tf(t.bankEmergency, { r: pct(emergency[0].rate_bp) })}</span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2 items-start">
        {/* LOANS: what is owed, then what can be borrowed. */}
        <section className="space-y-2" aria-label={t.bankLoans}>
          <div className={`text-[10px] font-bold uppercase tracking-[0.2em] border-b ${borderCol} pb-1`}>{t.bankLoans}</div>
          {bank.loans.length === 0 && <div className={`p-3 border border-dashed ${borderCol} text-[10px] ${textMuted}`}>{t.bankNoLoans}</div>}
          {bank.loans.map((loan) => {
            const paidShare = loan.paid / Math.max(1, loan.paid + loan.owed);
            const red = loan.plan === 'emergency';
            return (
              <article key={loan.id} className={`p-3 border space-y-2 ${red ? 'border-rose-500/60 bg-rose-500/5' : borderCol}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`text-[11px] font-bold tracking-wider ${red ? 'text-rose-300' : ''}`}>{loan.name}</span>
                  <span className="flex items-center gap-1 text-sm font-bold tabular-nums">
                    <BitShard className="w-2.5 h-2.5" />
                    {fmt(loan.owed)}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10" aria-hidden>
                  <div className="h-full bg-emerald-400" style={{ width: `${paidShare * 100}%` }} />
                </div>
                <div className={`flex flex-wrap justify-between gap-2 text-[9px] uppercase tracking-wider tabular-nums ${textMuted}`}>
                  <span>{tf(t.bankOwedSplit, { p: fmt(loan.principal), i: fmt(loan.interest) })}</span>
                  <span>{loan.grace_days ? tf(t.bankGrace, { n: loan.grace_days, r: pct(loan.rate_bp) }) : tf(t.bankRate, { r: pct(loan.rate_bp) })}</span>
                </div>
                <AmountForm
                  label={t.bankRepay}
                  max={Math.min(loan.owed, balance)}
                  disabled={demo}
                  busy={busy === `repay-${loan.id}`}
                  onSubmit={(amount) => run(`repay-${loan.id}`, () => onBank({ action: 'repay', loan: loan.id, amount }))}
                  borderCol={borderCol}
                  textMuted={textMuted}
                  accent="#34d399"
                />
              </article>
            );
          })}
          {bank.plans.map((plan) => (
            <article key={plan.id} className={`p-3 border ${borderCol} space-y-2`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wider">{plan.name}</span>
                <span className="px-1.5 py-0.5 border border-amber-400/50 text-amber-300 text-[9px] font-bold uppercase tracking-wider">
                  {plan.grace_days ? tf(t.bankGrace, { n: plan.grace_days, r: pct(plan.rate_bp) }) : tf(t.bankRate, { r: pct(plan.rate_bp) })}
                </span>
              </div>
              <div className={`text-[9px] uppercase tracking-wider tabular-nums ${textMuted}`}>{tf(t.bankUpTo, { n: fmt(plan.limit) })}</div>
              {plan.open ? (
                <div className={`text-[9px] uppercase tracking-wider ${textMuted}`}>{t.bankOpen}</div>
              ) : (
                <AmountForm
                  label={t.bankBorrow}
                  max={plan.limit}
                  disabled={demo || plan.limit <= 0}
                  busy={busy === `borrow-${plan.id}`}
                  onSubmit={(amount) => run(`borrow-${plan.id}`, () => onBank({ action: 'borrow', plan: plan.id as LoanPlan, amount }))}
                  borderCol={borderCol}
                  textMuted={textMuted}
                />
              )}
            </article>
          ))}
        </section>

        {/* VAULT: a safe with one door, in or out. */}
        <section className="space-y-2" aria-label={t.bankVault}>
          <div className={`text-[10px] font-bold uppercase tracking-[0.2em] border-b ${borderCol} pb-1`}>{t.bankVault}</div>
          <article className="p-3 border border-amber-400/40 space-y-3" style={{ background: 'radial-gradient(80% 100% at 100% 0%, rgba(251,191,36,0.1), transparent 60%)' }}>
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-12 h-12 flex items-center justify-center border-2 border-amber-400/70 rounded-full bg-black/30">
                <PiggyBank className="w-6 h-6 text-amber-400" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-xl font-bold tabular-nums text-amber-300">
                  <BitShard className="w-3 h-3" />
                  {fmt(bank.vault.balance)}
                </span>
                {bank.vault.interest > 0 && <span className="block text-[9px] uppercase tracking-wider text-emerald-400">{tf(t.bankVaultEarned, { n: fmt(bank.vault.interest) })}</span>}
              </span>
            </div>
            <p className={`m-0 text-[10px] font-sans ${textMuted}`}>
              {tf(t.bankVaultHint, { r: pct(bank.vault.rate_bp), c: fmt(bank.vault.day_cap), m: bank.vault.study_minutes })}
            </p>
            <div className={`grid grid-cols-2 border ${borderCol}`} role="tablist">
              {(['deposit', 'withdraw'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={vaultMode === mode}
                  onClick={() => setVaultMode(mode)}
                  className={`h-8 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                    vaultMode === mode ? 'bg-amber-400/15 text-amber-300' : textMuted
                  }`}
                >
                  {mode === 'deposit' ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                  {mode === 'deposit' ? t.bankDeposit : t.bankWithdraw}
                </button>
              ))}
            </div>
            <AmountForm
              key={vaultMode}
              label={vaultMode === 'deposit' ? t.bankDeposit : t.bankWithdraw}
              max={vaultMode === 'deposit' ? balance : bank.vault.balance}
              disabled={demo}
              busy={busy === vaultMode}
              onSubmit={(amount) => run(vaultMode, () => onBank({ action: vaultMode, amount }))}
              borderCol={borderCol}
              textMuted={textMuted}
              accent={vaultMode === 'deposit' ? '#fbbf24' : '#34d399'}
            />
          </article>
        </section>
      </div>
    </div>
  );
};
