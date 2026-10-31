import React, { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// The "commit log" a reset leaves under its button in ACCOUNT: the command,
// what was removed and what was kept, line by line, stamped with the time.
// It stays until the next reset (or the settings close), so the operator
// can always see that the reset went through and what it did.

export interface ResetReceiptData {
  ok: boolean;
  /** Terminal-style command line, e.g. "reset bits --keep-logs". */
  command: string;
  lines: Array<[label: string, value: string, tone?: 'gone' | 'kept']>;
  /** Footer, e.g. "OK // 21:04:13" or the error message. */
  footer: string;
}

const TONES = {
  sky: { text: 'text-sky-400', border: 'border-sky-500/50', flash: 'reset-receipt-sky' },
  amber: { text: 'text-amber-400', border: 'border-amber-500/50', flash: 'reset-receipt-amber' },
} as const;

export const ResetReceipt: React.FC<{
  receipt: ResetReceiptData;
  tone: keyof typeof TONES;
  textMuted: string;
}> = ({ receipt, tone, textMuted }) => {
  const c = TONES[tone];
  const ref = useRef<HTMLDivElement>(null);
  // Bring the result into view (it prints below the button, often past
  // the fold on a phone, where the toast also covers the bottom edge).
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, []);
  const accent = receipt.ok ? c.text : 'text-rose-400';
  return (
    <div
      ref={ref}
      role="status"
      className={`reset-receipt ${receipt.ok ? c.flash : ''} border ${receipt.ok ? c.border : 'border-rose-500/50'} bg-zinc-500/5 p-2.5 font-mono text-[10px] leading-relaxed`}
    >
      <div className={`flex items-center gap-1.5 ${accent}`}>
        <span aria-hidden>&gt;</span>
        <span className="font-bold truncate">{receipt.command}</span>
      </div>
      {receipt.lines.length > 0 && (
        <dl className="m-0 mt-1.5 flex flex-col gap-0.5">
          {receipt.lines.map(([label, value, lineTone], i) => (
            <div key={label} className="reset-receipt-line flex items-baseline gap-2" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <dt className={`shrink-0 ${textMuted}`}>{label}</dt>
              <span className={`flex-1 min-w-2 border-b border-dotted ${textMuted} opacity-40 translate-y-[-3px]`} aria-hidden />
              <dd
                className={`m-0 shrink-0 tabular-nums font-bold ${
                  lineTone === 'kept' ? 'text-emerald-400' : lineTone === 'gone' ? accent : ''
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div
        className={`reset-receipt-line mt-1.5 pt-1.5 border-t border-dashed border-zinc-500/30 flex items-start gap-1.5 font-bold ${
          receipt.ok ? 'text-emerald-400' : 'text-rose-400'
        }`}
        style={{ animationDelay: `${120 + receipt.lines.length * 90}ms` }}
      >
        {receipt.ok ? (
          <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0 typbox-toast-pop" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
        )}
        <span className="break-words min-w-0">{receipt.footer}</span>
      </div>
    </div>
  );
};
