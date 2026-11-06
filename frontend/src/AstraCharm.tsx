import React, { useMemo } from 'react';
import type { Starlight } from './api';
import { Pixel } from './ChallengePanel';
import { tf, useI18n } from './i18n';
import { starCharmArt } from './starCharm';

/** ASTRA as the STARLIGHT slot's icon. */
export const AstraIcon: React.FC<{ starlight: Starlight; className?: string }> = ({ starlight, className = 'w-8 h-8' }) => {
  const art = useMemo(
    () => starCharmArt(starlight.stars, starlight.max, starlight.cost, starlight.guard_on),
    [starlight.stars, starlight.max, starlight.cost, starlight.guard_on]
  );
  return <Pixel art={art} className={className} />;
};

/** ASTRA beside the night sky: the charm, its name, and what comes next. */
export const AstraCharm: React.FC<{ starlight: Starlight; borderCol: string; textMuted: string }> = ({ starlight, borderCol, textMuted }) => {
  const { t } = useI18n();
  const { stars, max, cost, guard_on: guardOn } = starlight;
  const next =
    stars >= max ? t.astraFull : stars < cost ? tf(t.astraNextStuds, { n: cost - stars }) : tf(t.astraNextFull, { n: max - stars });
  return (
    <div className={`border ${borderCol} bg-[#060816] p-3 flex sm:flex-col items-center gap-3 sm:gap-2 sm:justify-center text-center`}>
      <span className="shrink-0 relative">
        <AstraIcon starlight={starlight} className="w-20 h-20 sm:w-32 sm:h-32 charm-float" />
      </span>
      <span className="min-w-0 text-left sm:text-center">
        <span className="block text-xs font-bold tracking-[0.3em] text-slate-100">{t.astraName}</span>
        <span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">{t.astraTitle}</span>
        <span className={`block mt-1.5 text-[10px] uppercase tracking-wider tabular-nums ${guardOn ? 'text-amber-300' : 'text-slate-300'}`}>
          {tf(t.nowStarsLine, { a: stars, b: max })}
        </span>
        <span className={`block text-[9px] uppercase tracking-wider ${textMuted}`}>{next}</span>
      </span>
    </div>
  );
};
