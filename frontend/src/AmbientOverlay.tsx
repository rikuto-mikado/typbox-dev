import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, Lock, MonitorSmartphone } from 'lucide-react';
import { tf, useI18n } from './i18n';
import { AMBIENT_DIM_LEVELS, AMBIENT_THEMES, type AmbientDim, type AmbientTheme } from './ambientThemes';
import { useAmbientCanvas } from './useAmbientCanvas';
import { isUnlockRuleMet, unlockRuleRank, type ChronoProgress } from './chronometerThemes';
import { unlockLockedMessage, unlockRequirementLabel } from './ChronometerFace';
import type { KeepAwakeMode } from './keepAwake';

// ==========================================
// Full-screen overlay
// ==========================================

interface AmbientOverlayProps {
  themeId: string;
  dimAlpha: number;
  /** Elapsed-time readout; omitted when the user turned it off. */
  clock?: { main: string; sub?: string } | null;
  /** Preview: sits above modals and exits on click / key. */
  preview?: boolean;
  onExit?: () => void;
}

// The readout drifts to a new spot every minute so a long session never
// burns the same pixels on an OLED panel.
const DRIFT_MS = 60_000;
const randomSpot = () => ({ x: 22 + Math.random() * 56, y: 25 + Math.random() * 50 });

export const AmbientOverlay: React.FC<AmbientOverlayProps> = ({ themeId, dimAlpha, clock, preview, onExit }) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAmbientCanvas(canvasRef, themeId, { fullscreen: true, animate: true });
  const [spot, setSpot] = useState(randomSpot);
  useEffect(() => {
    const id = window.setInterval(() => setSpot(randomSpot()), DRIFT_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!preview || !onExit) return;
    // Ignore the click that opened the preview.
    const armed = window.setTimeout(() => {
      window.addEventListener('keydown', onExit);
      window.addEventListener('pointerdown', onExit);
    }, 300);
    return () => {
      window.clearTimeout(armed);
      window.removeEventListener('keydown', onExit);
      window.removeEventListener('pointerdown', onExit);
    };
  }, [preview, onExit]);

  return (
    <div className={`fixed inset-0 ${preview ? 'z-[80] bg-zinc-950' : 'z-30 pointer-events-none'} transition-opacity duration-1000`} aria-hidden={!preview}>
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${dimAlpha})` }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Screen sleep is already held off by the Wake Lock API (see
          useKeepAwake); this readout drifting to a new spot each minute is
          purely OLED burn-in hygiene, so it's kept almost invisible rather
          than a bright, eye-catching overlay. */}
      {clock && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center font-mono text-white pointer-events-none"
          style={{ left: `${spot.x}%`, top: `${spot.y}%`, transition: 'left 4s ease-in-out, top 4s ease-in-out' }}
        >
          <div className="text-2xl sm:text-3xl font-light tabular-nums tracking-wider opacity-[0.07]">{clock.main}</div>
          {clock.sub && <div className="mt-1 text-[9px] uppercase tracking-[0.35em] opacity-[0.05]">{clock.sub}</div>}
        </div>
      )}
      {preview && (
        <div className="absolute bottom-6 inset-x-0 text-center font-mono text-[10px] uppercase tracking-widest text-white/60 pointer-events-none">
          {t.ambientPreviewExit}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Settings panel
// ==========================================

const AmbientThumb: React.FC<{ themeId: string; animate: boolean }> = ({ themeId, animate }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useAmbientCanvas(ref, themeId, { fullscreen: false, animate, backdrop: '#0b0b10' });
  return <canvas ref={ref} className="block w-full aspect-video" />;
};

const SORTED_AMBIENT = [...AMBIENT_THEMES].sort((a, b) => unlockRuleRank(a.unlock) - unlockRuleRank(b.unlock));

// eslint-disable-next-line react-refresh/only-export-components
export const isAmbientThemeUnlocked = (th: AmbientTheme, progress: ChronoProgress) => isUnlockRuleMet(th.unlock, progress);

interface AmbientSettingsPanelProps {
  activeThemeId: string;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
  progress: ChronoProgress;
  showClock: boolean;
  onToggleClock: () => void;
  dim: AmbientDim;
  onChangeDim: (dim: AmbientDim) => void;
  keepAwakeMode: KeepAwakeMode;
  borderCol: string;
  textMuted: string;
}

export const AmbientSettingsPanel: React.FC<AmbientSettingsPanelProps> = ({
  activeThemeId,
  onSelect,
  onPreview,
  progress,
  showClock,
  onToggleClock,
  dim,
  onChangeDim,
  keepAwakeMode,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  const [notice, setNotice] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const unlockedCount = useMemo(() => AMBIENT_THEMES.filter((th) => isAmbientThemeUnlocked(th, progress)).length, [progress]);
  const awakeText: Record<KeepAwakeMode, string> = {
    off: t.keepAwakeOff,
    'wake-lock': t.keepAwakeWakeLock,
    video: t.keepAwakeVideo,
    unavailable: t.keepAwakeUnavailable,
  };
  const chip = (on: boolean) =>
    `px-2 py-1 border text-[10px] cursor-pointer transition-colors ${
      on ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold' : `${borderCol} ${textMuted} hover:text-emerald-400`
    }`;

  return (
    <div className="space-y-3 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
        <span className="font-semibold">{tf(t.ambientTitle, { n: AMBIENT_THEMES.length })}</span>
        <span className="text-emerald-400 tabular-nums">{tf(t.chronoUnlocked, { a: unlockedCount, b: AMBIENT_THEMES.length })}</span>
      </div>
      <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.ambientHint}</p>

      <div className={`p-2.5 border ${borderCol} space-y-2.5`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase">
          <span className="flex items-center gap-1.5">
            <span className={textMuted}>{t.ambientClockLabel}</span>
            <button type="button" onClick={onToggleClock} className={chip(showClock)} aria-pressed={showClock}>
              {showClock ? 'ON' : 'OFF'}
            </button>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={textMuted}>{t.ambientDimLabel}</span>
            <span className="flex gap-1">
              {AMBIENT_DIM_LEVELS.map((d) => (
                <button key={d.id} type="button" onClick={() => onChangeDim(d.id)} className={chip(dim === d.id)} aria-pressed={dim === d.id}>
                  {d.label}
                </button>
              ))}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-[10px]">
          <MonitorSmartphone className={`w-3.5 h-3.5 shrink-0 ${keepAwakeMode === 'wake-lock' || keepAwakeMode === 'video' ? 'text-emerald-400' : textMuted}`} />
          <span>
            <span className="uppercase font-semibold">{t.keepAwakeTitle}</span>
            <span className={`ml-1.5 font-sans ${textMuted}`}>{awakeText[keepAwakeMode]}</span>
          </span>
        </div>
      </div>

      {notice && (
        <div className="p-2 border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{notice}</span>
          </span>
          <button type="button" onClick={() => setNotice(null)} className="text-[9px] underline ml-2 cursor-pointer">
            {t.dismiss}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SORTED_AMBIENT.map((th) => {
          const unlocked = isAmbientThemeUnlocked(th, progress);
          const active = th.id === activeThemeId;
          return (
            <div
              key={th.id}
              onMouseEnter={() => setHovered(th.id)}
              onMouseLeave={() => setHovered((h) => (h === th.id ? null : h))}
              className={`border flex flex-col min-w-0 [content-visibility:auto] [contain-intrinsic-size:auto_150px] ${
                active ? 'border-emerald-500/70 bg-emerald-500/10' : borderCol
              }`}
            >
              <button
                type="button"
                title={th.desc}
                aria-pressed={active}
                onClick={() => {
                  if (!unlocked) {
                    setNotice(unlockLockedMessage(th.unlock, th.name, progress, t));
                    return;
                  }
                  setNotice(null);
                  onSelect(th.id);
                }}
                className="text-left cursor-pointer"
              >
                <div className={`relative ${unlocked ? '' : 'opacity-35 blur-[1.5px]'}`}>
                  <AmbientThumb themeId={th.id} animate={unlocked && hovered === th.id} />
                </div>
                <div className="p-1.5 flex items-center gap-1.5 min-w-0">
                  <span className={`text-[9px] px-1 border shrink-0 ${active ? 'border-emerald-500 text-emerald-400 font-bold' : `${borderCol} ${textMuted}`}`}>{th.code}</span>
                  <span className={`text-[10px] font-bold truncate ${active ? 'text-emerald-400' : ''}`}>{th.name}</span>
                  {active && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                </div>
              </button>
              <div className="px-1.5 pb-1.5 mt-auto flex items-center justify-between gap-1">
                {unlocked ? (
                  <button
                    type="button"
                    onClick={() => onPreview(th.id)}
                    className={`text-[9px] px-1 border ${borderCol} ${textMuted} hover:text-emerald-400 flex items-center gap-1 cursor-pointer`}
                  >
                    <Eye className="w-2.5 h-2.5" />
                    {t.ambientPreview}
                  </button>
                ) : (
                  <span className={`text-[9px] px-1 border ${borderCol} text-amber-400 flex items-center space-x-1`}>
                    <Lock className="w-2.5 h-2.5" />
                    <span>{unlockRequirementLabel(th.unlock, t)}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
