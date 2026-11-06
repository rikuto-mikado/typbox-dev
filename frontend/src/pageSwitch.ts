// Where the navigation is headed while the page it asked for is still being
// drawn. Kept outside React's tree so marking a switch re-renders only what
// reads it (the progress bar and the rail's highlight), never the whole app;
// the heavy page render then runs as a transition behind it.

import { useSyncExternalStore } from 'react';

let target: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export const navProgress = {
  /** A switch to `view` has started. */
  start(view: string) {
    if (target === view) return;
    target = view;
    emit();
  },
  /** The page on screen is now `view`: the switch to it is over. */
  settle(view: string) {
    if (target === null || target !== view) return;
    target = null;
    emit();
  },
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** The page being switched to, or null when nothing is pending. */
export const useNavTarget = () => useSyncExternalStore(subscribe, () => target);
