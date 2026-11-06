import React from 'react';
import { useNavTarget } from './pageSwitch';

/** A thin bar sweeping under the header while a page is still being drawn.
 *  It fades in only after a short wait (index.css .nav-progress), so a quick
 *  switch never flashes it. */
export const NavProgress: React.FC = () => {
  const target = useNavTarget();
  if (target === null) return null;
  return (
    <div className="nav-progress fixed inset-x-0 top-13 sm:top-16 lg:left-15 z-40 h-0.5 overflow-hidden pointer-events-none" role="progressbar" aria-busy="true">
      <div className="nav-progress-sweep h-full w-1/3 bg-emerald-400" />
    </div>
  );
};
