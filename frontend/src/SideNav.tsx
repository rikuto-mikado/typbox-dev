import React from 'react';
import { BarChart3, Home, Settings, Share2, Terminal, X } from 'lucide-react';
import { BitShard } from './BitsBadge';
import { useI18n } from './i18n';
import { ThemeToggleIcon } from './ThemeToggleIcon';
import { TypboxLogo } from './TypboxLogo';

// The site's navigation. From lg up it is a thin rail of icons fixed to the
// left edge; below that the same element becomes a drawer opened from the
// header's menu button. One element for both, so what lives in it (the noise
// mixer above all, which owns the audio) stays mounted when the drawer closes
// or the window crosses the breakpoint.

export type MainView = 'home' | 'data';

interface SideNavProps {
  /** Below lg: whether the drawer is out. Ignored from lg up. */
  open: boolean;
  onClose: () => void;
  view: MainView;
  /** Which dialog the rail opened is up, so its icon reads as current. */
  bitsOpen: boolean;
  settingsOpen: boolean;
  onHome: () => void;
  onBits: () => void;
  onData: () => void;
  onSettings: () => void;
  onCommand: () => void;
  onCard: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  isRunning: boolean;
  /** The noise mixer (AmbientSoundControl, nav variant). */
  sound: React.ReactNode;
  /** The signed-in user's avatar and name; nothing for a guest. */
  user: { avatar: React.ReactNode; name: string } | null;
  background: string;
  borderCol: string;
  textMuted: string;
}

const ROW = 'relative w-full h-11 lg:h-10 flex items-center gap-3 px-4 lg:px-0 lg:justify-center font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer';

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  textMuted: string;
}> = ({ label, icon, active, onClick, textMuted }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    className={`${ROW} ${active ? 'text-emerald-400 bg-emerald-500/10' : `${textMuted} hover:text-emerald-400 hover:bg-emerald-500/5`}`}
  >
    {active && <span className="absolute left-0 inset-y-1.5 w-0.5 bg-emerald-400" aria-hidden />}
    <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden>
      {icon}
    </span>
    <span className="lg:sr-only">{label}</span>
  </button>
);

export const SideNav: React.FC<SideNavProps> = ({
  open,
  onClose,
  view,
  bitsOpen,
  settingsOpen,
  onHome,
  onBits,
  onData,
  onSettings,
  onCommand,
  onCard,
  onToggleTheme,
  isDark,
  isRunning,
  sound,
  user,
  background,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  // Picking anything in the drawer puts it away.
  const pick = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <>
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={onClose} aria-hidden />}
      <nav
        aria-label={t.navLabel}
        className={`${open ? 'flex nav-drawer-in' : 'hidden'} lg:flex fixed inset-y-0 left-0 z-40 lg:z-30 w-[78vw] max-w-[300px] lg:w-15 flex-col border-r ${borderCol} overflow-y-auto overscroll-contain`}
        style={{ backgroundColor: background }}
      >
        {/* Brand: the logo alone on the rail, the full lockup in the drawer. */}
        <div className={`shrink-0 h-13 sm:h-16 flex items-center justify-between lg:justify-center gap-2 px-4 lg:px-0 border-b ${borderCol}`}>
          <button
            type="button"
            onClick={pick(onHome)}
            aria-label={t.navHome}
            className="flex items-center space-x-2 min-w-0 cursor-pointer"
          >
            <TypboxLogo className="w-5 h-5 shrink-0" isDark={isDark} isRunning={isRunning} />
            <span className="lg:hidden font-mono text-lg font-bold tracking-tighter">TYPBOX</span>
            <span className={`lg:hidden font-mono text-xs px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>.me</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.navClose}
            className={`lg:hidden h-9 w-9 flex items-center justify-center border ${borderCol} cursor-pointer hover:opacity-80`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-2 space-y-0.5">
          <NavButton label={t.navHome} icon={<Home className="w-4 h-4" />} active={view === 'home' && !bitsOpen && !settingsOpen} onClick={pick(onHome)} textMuted={textMuted} />
          <NavButton label={t.navBits} icon={<BitShard className="w-3.5 h-3.5" />} active={bitsOpen} onClick={pick(onBits)} textMuted={textMuted} />
          <NavButton label={t.navData} icon={<BarChart3 className="w-4 h-4" />} active={view === 'data' && !bitsOpen && !settingsOpen} onClick={pick(onData)} textMuted={textMuted} />
          <NavButton label={t.navSettings} icon={<Settings className="w-4 h-4" />} active={settingsOpen} onClick={pick(onSettings)} textMuted={textMuted} />
        </div>

        {/* Tools, then who is signed in, at the foot. */}
        <div className={`mt-auto shrink-0 border-t ${borderCol} py-2 space-y-0.5`}>
          <NavButton label={t.navCommand} icon={<Terminal className="w-4 h-4" />} onClick={pick(onCommand)} textMuted={textMuted} />
          <NavButton label={t.navCard} icon={<Share2 className="w-4 h-4" />} onClick={pick(onCard)} textMuted={textMuted} />
          {sound}
          <NavButton
            label={isDark ? t.navLightMode : t.navDarkMode}
            icon={<ThemeToggleIcon showSun={isDark} className="w-4 h-4" />}
            onClick={onToggleTheme}
            textMuted={textMuted}
          />
        </div>
        {user && (
          <div className={`shrink-0 border-t ${borderCol} h-14 flex items-center gap-3 px-4 lg:px-0 lg:justify-center`}>
            {user.avatar}
            <span className="lg:sr-only font-mono text-xs font-semibold truncate">{user.name}</span>
          </div>
        )}
      </nav>
    </>
  );
};
