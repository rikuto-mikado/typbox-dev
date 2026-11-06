import React from 'react';
import type { BitsActiveBuff, Starlight } from './api';
import { AstraIcon } from './AstraCharm';
import { CHARM_ART } from './blessingArt';
import { lookOf } from './buffArt';
import { BuffIcon } from './BuffIcon';
import { Pixel } from './ChallengePanel';
import { tf, useI18n } from './i18n';

// The header's right-hand corner (beside SHARE, NOISE and the theme on
// narrow screens): what is on now, as three icon sockets: the buff, the blessing and ASTRA
// (whose charm shows its own state). A socket with nothing in it keeps its
// place, drawn as an empty mount, so the row never shifts. Each one opens its own view on the BITS page.

export type LoadoutSlot = 'shop' | 'blessings' | 'starlight';

export interface LoadoutBlessing {
  id: string;
  name: string;
  effect: string;
  attunement: number;
}

const Socket: React.FC<{
  title: string;
  lit: boolean;
  glow?: string;
  /** 0..1 along the socket's foot (time left, attunement), if it has one. */
  meter?: number;
  onClick: () => void;
  borderCol: string;
  children?: React.ReactNode;
}> = ({ title, lit, glow = '#fbbf24', meter, onClick, borderCol, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={title}
    className={`loadout-socket relative w-8 h-8 max-[359px]:w-7 max-[359px]:h-7 sm:w-10 sm:h-10 flex items-center justify-center border cursor-pointer transition-colors ${
      lit ? '' : `${borderCol} border-dashed`
    }`}
    style={lit ? ({ borderColor: `${glow}99`, '--socket-glow': glow } as React.CSSProperties) : undefined}
  >
    {lit ? (
      <>
        <span
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 55%, ${glow}2e, transparent 72%)` }}
          aria-hidden
        />
        <span className="relative">{children}</span>
        {meter != null && (
          <span className="absolute inset-x-1 bottom-0.5 h-0.5 bg-white/10" aria-hidden>
            <span className="block h-full" style={{ width: `${Math.max(4, Math.min(100, meter * 100))}%`, background: glow }} />
          </span>
        )}
      </>
    ) : (
      <span className="loadout-empty" aria-hidden />
    )}
  </button>
);

export const HeaderLoadout: React.FC<{
  buff: BitsActiveBuff | null;
  blessing: LoadoutBlessing | null;
  starlight?: Starlight;
  onOpen: (slot: LoadoutSlot) => void;
  borderCol: string;
}> = ({ buff, blessing, starlight, onOpen, borderCol }) => {
  const { t } = useI18n();
  // What is left of the buff, by minutes or by uses (the header refetches
  // when it runs out, so a buff here is always live).
  const buffMeter =
    buff?.total_minutes && buff.remaining_minutes != null
      ? buff.remaining_minutes / buff.total_minutes
      : buff?.total_uses && buff.remaining_uses != null
      ? buff.remaining_uses / buff.total_uses
      : undefined;
  const buffLook = buff ? lookOf(buff.item_id) : null;
  const stars = starlight?.stars ?? 0;
  return (
    <div className="flex items-center gap-1 sm:gap-1.5" role="group" aria-label={t.buffsNowOn}>
      <Socket
        title={buff ? `${t.nowBuff} · ${buff.name}` : `${t.nowBuff} · ${t.nowNone}`}
        lit={Boolean(buff)}
        glow={buffLook?.accent}
        meter={buffMeter}
        onClick={() => onOpen('shop')}
        borderCol={borderCol}
      >
        {buff && <BuffIcon itemId={buff.item_id} className="w-6 h-6 sm:w-7 sm:h-7" />}
      </Socket>
      <Socket
        title={
          blessing
            ? `${t.nowBlessing} · ${blessing.name} · ${blessing.effect}${blessing.attunement < 100 ? ` · ${tf(t.blessingAttuned, { n: blessing.attunement })}` : ''}`
            : `${t.nowBlessing} · ${t.nowNone}`
        }
        lit={Boolean(blessing)}
        meter={blessing && blessing.attunement < 100 ? blessing.attunement / 100 : undefined}
        onClick={() => onOpen('blessings')}
        borderCol={borderCol}
      >
        {blessing && CHARM_ART[blessing.id] && <Pixel art={CHARM_ART[blessing.id]} className="w-6 h-6 sm:w-7 sm:h-7 charm-float" />}
      </Socket>
      <Socket
        title={
          starlight
            ? `${t.astraName} · ${tf(t.nowStarsLine, { a: stars, b: starlight.max })}${starlight.guard_on ? ` · ${t.nowGuardOn}` : ''}`
            : `${t.astraName} · ${t.nowNone}`
        }
        lit={Boolean(starlight)}
        glow={starlight?.guard_on || (starlight && stars >= starlight.max) ? '#fde047' : '#93a4d8'}
        onClick={() => onOpen('starlight')}
        borderCol={borderCol}
      >
        {starlight && <AstraIcon starlight={starlight} className="w-7 h-7 sm:w-8 sm:h-8" />}
      </Socket>
    </div>
  );
};
