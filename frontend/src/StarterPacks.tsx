import React, { useEffect, useMemo, useState } from 'react';
import type { StarterPack } from './api';
import { Strip } from './ChallengePanel';
import { tf, useI18n } from './i18n';
import { snapshotRoom, thumbnail, type FurnitureSpec } from './roomRender';

const STEP_MS = 420;

/** Bought: the room furnishes itself, one piece at a time. */
export const PackSplash: React.FC<{
  pack: StarterPack;
  catalog: FurnitureSpec[];
  isDark: boolean;
  textMuted: string;
  onClose: () => void;
  onOpenRoom: () => void;
}> = ({ pack, catalog, isDark, textMuted, onClose, onOpenRoom }) => {
  const { t } = useI18n();
  const byId = useMemo(() => Object.fromEntries(catalog.map((spec) => [spec.id, spec])), [catalog]);
  // Nothing at all, then the wall and floor, then each piece in turn.
  const frames = useMemo(() => {
    const { wall, floor, items } = pack.layout;
    const shot = (count: number) =>
      snapshotRoom({ wall, floor, items: items.slice(0, count) }, byId, { on: true, night: false }, 2);
    return [
      { src: null, name: '' },
      { src: shot(0), name: byId[wall === 'wall_plain' ? floor : wall]?.name ?? '' },
      ...items.map((item, i) => ({ src: shot(i + 1), name: byId[item.id]?.name ?? '' })),
    ];
  }, [pack, byId]);
  const still = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  const [step, setStep] = useState(still ? frames.length - 1 : 0);
  const done = step >= frames.length - 1;
  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [step, done]);
  return (
    <div
      role="status"
      onClick={onClose}
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer ${
        isDark ? 'bg-zinc-950' : 'bg-white'
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400 min-h-4">
        {done ? t.bitsPackReady : t.bitsPackSetting}
      </div>
      <div className={`relative w-full max-w-md ${done ? 'pack-splash-done' : ''}`}>
        {frames[step].src ? (
          <img
            key={step}
            src={frames[step].src ?? undefined}
            alt={pack.name}
            className="pack-splash-frame block w-full aspect-[4/3] border border-amber-400/60"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="room-empty w-full aspect-[4/3] border border-amber-400/60" />
        )}
      </div>
      <div className="text-center space-y-1 min-h-14">
        <div className="text-lg font-bold tracking-wider">{done ? pack.name : frames[step].name}</div>
        {done && (
          <div className={`text-[10px] font-sans ${textMuted}`}>{t.bitsPackPlacedHint} {t.bitsPackUnlocked}</div>
        )}
      </div>
      <div className={`flex items-center gap-2 ${done ? '' : 'invisible'}`}>
        <button
          type="button"
          autoFocus
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onOpenRoom();
          }}
          className="px-3 py-1.5 border border-amber-400 bg-amber-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
        >
          {t.bitsOpenRoom}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`px-3 py-1.5 border border-current text-[10px] uppercase tracking-wider cursor-pointer ${textMuted}`}
        >
          {t.bitsSplashDismiss}
        </button>
      </div>
    </div>
  );
};

/** The first thing in the furniture shop until one of these is bought. */
export const StarterPacks = React.forwardRef<
  HTMLElement,
  {
    packs: StarterPack[];
    catalog: FurnitureSpec[];
    balance: number;
    pulse: boolean;
    borderCol: string;
    textMuted: string;
    buyButton: (packId: string, price: number) => React.ReactNode;
  }
>(({ packs, catalog, balance, pulse, borderCol, textMuted, buyButton }, ref) => {
  const { t } = useI18n();
  const byId = useMemo(() => Object.fromEntries(catalog.map((spec) => [spec.id, spec])), [catalog]);
  const pictures = useMemo(() => {
    if (!catalog.length) return {} as Record<string, string>;
    return Object.fromEntries(
      packs.map((pack) => [pack.id, snapshotRoom(pack.layout, byId, { on: true, night: false }, 2)])
    );
  }, [packs, catalog, byId]);
  const price = packs[0]?.price ?? 0;
  const left = Math.max(0, price - balance);
  const fmt = (n: number) => n.toLocaleString('en-US');
  return (
    <section
      ref={ref}
      aria-label={t.bitsPacksTitle}
      className={`scroll-mt-2 space-y-1.5 p-2 border border-amber-400/50 ${pulse ? 'pack-pulse' : ''}`}
    >
      <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400">{t.bitsPacksTitle}</div>
      <p className={`m-0 text-[10px] font-sans ${textMuted}`}>{t.bitsPacksHint}</p>
      <div className="space-y-1">
        <div className={`h-1.5 border ${borderCol}`}>
          <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (balance / Math.max(1, price)) * 100)}%` }} />
        </div>
        <div className="flex flex-wrap justify-between gap-x-2 text-[9px] uppercase tracking-wider tabular-nums">
          <span>{tf(t.bitsPacksProgress, { a: fmt(Math.min(balance, price)), b: fmt(price) })}</span>
          <span className={left ? textMuted : 'text-amber-400 font-bold'}>
            {left ? tf(t.bitsPacksHours, { n: Math.ceil(left / 100) }) : t.bitsPacksEnough}
          </span>
        </div>
      </div>
      <Strip borderCol={borderCol} textMuted={textMuted} label={t.bitsPacksTitle}>
        {packs.map((pack) => (
          <article key={pack.id} className={`w-64 sm:w-[22rem] shrink-0 snap-start p-2 border ${borderCol} flex flex-col gap-1.5`}>
            {pictures[pack.id] && (
              <img
                src={pictures[pack.id]}
                alt=""
                className={`w-full aspect-[4/3] border ${borderCol}`}
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            <div className="text-xs font-bold uppercase tracking-wider">{pack.name}</div>
            <p className={`m-0 text-[10px] font-sans leading-snug ${textMuted}`}>{pack.line}</p>
            <ul className="m-0 p-0 list-none grid grid-cols-8 sm:grid-cols-10 gap-0.5">
              {pack.pieces.map((id) => {
                const spec = byId[id];
                return (
                  <li key={id} title={spec?.name} className={`aspect-square flex items-center justify-center border ${borderCol}`}>
                    {spec && (
                      <img
                        src={thumbnail(spec)}
                        alt={spec.name}
                        className="w-full h-full object-contain p-0.5"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex items-baseline justify-between gap-2 text-[10px] tabular-nums">
              <span className="font-bold text-amber-400">{fmt(pack.price)} BITS</span>
              <span className={textMuted}>{tf(t.bitsPackWorth, { n: fmt(pack.value) })}</span>
            </div>
            {buyButton(pack.id, pack.price)}
          </article>
        ))}
      </Strip>
    </section>
  );
});
StarterPacks.displayName = 'StarterPacks';
