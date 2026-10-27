import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

// Submit button with the same three-step feedback as COMMIT LOG: a spinner
// while the request is in flight, then a green flash + check that holds for
// a moment before the button returns to idle. The feedback lives on the
// button itself, so it is seen even when the form's status message is
// scrolled out of view.

export type SaveState = 'idle' | 'saving' | 'saved';

const SAVED_HOLD_MS = 1800;

// eslint-disable-next-line react-refresh/only-export-components
export function useSaveState() {
  const [state, setState] = useState<SaveState>('idle');
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  const begin = useCallback(() => {
    clear();
    setState('saving');
  }, []);
  const succeed = useCallback(() => {
    clear();
    setState('saved');
    timer.current = window.setTimeout(() => {
      setState('idle');
      timer.current = null;
    }, SAVED_HOLD_MS);
  }, []);
  const fail = useCallback(() => {
    clear();
    setState('idle');
  }, []);
  return { state, begin, succeed, fail };
}

interface SaveButtonProps {
  state: SaveState;
  isDark: boolean;
  idleLabel: string;
  savingLabel: string;
  savedLabel: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  state,
  isDark,
  idleLabel,
  savingLabel,
  savedLabel,
  icon,
  disabled,
}) => (
  <button
    type="submit"
    disabled={disabled || state === 'saving'}
    aria-busy={state === 'saving'}
    aria-live="polite"
    className={`w-full min-h-[46px] lg:min-h-0 py-3.5 lg:py-2.5 px-4 font-mono text-xs uppercase tracking-widest font-semibold transition-colors duration-300 flex items-center justify-center space-x-2 disabled:opacity-60 ${
      state === 'saved'
        ? 'bg-emerald-500 text-zinc-950 commit-success-flash cursor-default'
        : state === 'saving'
        ? `${isDark ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-700 text-zinc-200'} cursor-wait`
        : isDark
        ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300 cursor-pointer'
        : 'bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer'
    }`}
  >
    {state === 'saving' ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{savingLabel}</span>
      </>
    ) : state === 'saved' ? (
      <>
        <CheckCircle2 className="w-4 h-4 typbox-toast-pop" />
        <span>{savedLabel}</span>
      </>
    ) : (
      <>
        {icon}
        <span>{idleLabel}</span>
      </>
    )}
  </button>
);
