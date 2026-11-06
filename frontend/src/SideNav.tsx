import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Armchair, BarChart3, Home, LogIn, LogOut, PanelLeftClose, Settings, Share2, Terminal } from 'lucide-react';
import { useI18n } from './i18n';
import { useNavTarget } from './pageSwitch';
import { ThemeToggleIcon } from './ThemeToggleIcon';

// The site's navigation, one element at every size so what lives in it (the
// noise mixer above all, which owns the audio) stays mounted when the window
// crosses the breakpoint.
// - From lg up: a rail fixed to the left edge, icons alone or (wide) with
//   their names. The rail's width, the page's room for it and the names
//   fading in and out are CSS (index.css: .nav-rail / .nav-offset /
//   .nav-label) keyed on <html data-nav="wide">, and the state lives here, so
//   a toggle re-renders this component only and the motion starts at once.
//   Every icon sits at the same place in both widths.
// - Below lg: a bar fixed to the bottom of the screen with the five pages and
//   SIGN OUT (SIGN IN for a guest); SHARE CARD, NOISE and the theme sit as
//   icons in the header's top-right corner.

export type MainView = 'home' | 'data' | 'bits' | 'room' | 'settings';
const PAGES: MainView[] = ['home', 'bits', 'room', 'data', 'settings'];

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';
const WIDE_KEY = 'typbox_nav_expanded';

const readWide = () => {
  try {
    return localStorage.getItem(WIDE_KEY) === '1';
  } catch {
    return false;
  }
};

interface SideNavProps {
  view: MainView;
  onHome: () => void;
  onBits: () => void;
  onData: () => void;
  onRoom: () => void;
  onSettings: () => void;
  onCommand: () => void;
  onCard: () => void;
  onToggleTheme: () => void;
  onSignIn: () => void;
  /** Signed in only: SIGN OUT among the tools (in the demo it leaves the demo). */
  onSignOut?: () => void;
  isDark: boolean;
  /** The noise mixer (AmbientSoundControl, nav variant). */
  sound: React.ReactNode;
  /** The signed-in user's avatar and name; null for a guest. */
  user: { avatar: React.ReactNode; name: string } | null;
  background: string;
  borderCol: string;
  textMuted: string;
}

/** BITS as a currency mark: the shard's diamond in outline, a smaller one
 *  inside, in the row's own colour like every other icon here. */
const BitsMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden>
    <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" strokeWidth="1.5" />
    <path d="M8 5.25 10.75 8 8 10.75 5.25 8Z" strokeWidth="1.25" />
  </svg>
);

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  /** One of the bottom bar's tabs below lg (icon over a small name). */
  tab?: boolean;
  /** Below lg: an icon square in the header's top-right corner. */
  tool?: boolean;
  /** Armed for a second tap (SIGN OUT): red, with a fuse burning down. */
  armed?: boolean;
  onClick: () => void;
  textMuted: string;
  className?: string;
}> = ({ label, icon, active, tab, tool, armed, onClick, textMuted, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    className={`relative w-full h-11 lg:h-10 flex items-center gap-3 px-5 font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
      tab ? 'max-lg:h-14 max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:px-0 max-lg:text-[9px] max-lg:tracking-normal' : ''
    } ${tool ? `max-lg:w-9 max-lg:h-9 max-lg:px-0 max-lg:justify-center max-lg:border ${'border-[var(--tb-border)]'}` : ''} ${
      armed
        ? 'text-rose-400 bg-rose-500/10'
        : active
        ? `text-emerald-400 ${tab ? '' : 'bg-emerald-500/10'}`
        : `${textMuted} hover:text-emerald-400 ${tab ? '' : 'hover:bg-emerald-500/5'}`
    } ${className}`}
  >
    {armed && <span className="signout-fuse absolute left-0 bottom-0 h-0.5 w-full bg-rose-400" aria-hidden />}
    {active && !tab && (
      <span
        className={`absolute bg-emerald-400 left-0 inset-y-1.5 w-0.5 ${tab ? 'max-lg:inset-y-auto max-lg:top-0 max-lg:inset-x-3 max-lg:w-auto max-lg:h-0.5' : ''}`}
        aria-hidden
      />
    )}
    <span
      className={`w-5 h-5 flex items-center justify-center shrink-0 ${tab ? 'nav-tab-icon' : ''} ${armed ? 'signout-armed' : ''}`}
      data-on={active ? '' : undefined}
      aria-hidden
    >
      {icon}
    </span>
    <span className={`nav-label truncate whitespace-nowrap ${tab ? 'max-lg:max-w-full max-lg:px-0.5' : ''} ${tool ? 'max-lg:hidden' : ''}`}>{label}</span>
  </button>
);

const SIGN_OUT_FUSE_MS = 3000;

/** SIGN OUT in two taps: the first arms it (red, TAP AGAIN, a fuse burning
 *  down for three seconds), the second signs out; left alone it disarms. */
const SignOutButton: React.FC<{ tab?: boolean; onSignOut: () => void; textMuted: string; className?: string }> = ({
  tab,
  onSignOut,
  textMuted,
  className,
}) => {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), SIGN_OUT_FUSE_MS);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <NavButton
      tab={tab}
      armed={armed}
      label={armed ? t.signOutConfirm : t.signOut}
      icon={<LogOut className="w-4 h-4" />}
      onClick={() => (armed ? onSignOut() : setArmed(true))}
      textMuted={textMuted}
      className={className}
    />
  );
};

export const SideNav: React.FC<SideNavProps> = ({
  view,
  onHome,
  onBits,
  onData,
  onRoom,
  onSettings,
  onCommand,
  onCard,
  onToggleTheme,
  onSignIn,
  onSignOut,
  isDark,
  sound,
  user,
  background,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  // Light the page asked for at once, while it is still being drawn.
  const pending = useNavTarget() as MainView | null;
  const current = pending ?? view;
  // Where the sliding marker sits: the pages in the order they are listed.
  const markerAt = PAGES.indexOf(current);
  const [wide, setWide] = useState(readWide);

  // The page reads the rail's width off <html>; set before the first paint.
  useLayoutEffect(() => {
    document.documentElement.dataset.nav = wide ? 'wide' : 'narrow';
  }, [wide]);
  const toggleWide = useCallback(() => {
    setWide((prev) => {
      try {
        localStorage.setItem(WIDE_KEY, prev ? '0' : '1');
      } catch {
        // Storage can be off; the rail still toggles for this visit.
      }
      return !prev;
    });
  }, []);

  const pick = (action: () => void) => () => action();

  return (
    <>
      <nav
        aria-label={t.navLabel}
        className={[
          'nav-rail fixed z-40 flex',
          // Phones and tablets: a bar along the bottom edge.
          `inset-x-0 bottom-0 flex-row border-t pb-[env(safe-area-inset-bottom)] ${borderCol}`,
          // Desktop: a rail down the left edge (its width is .nav-rail's).
          'lg:inset-x-auto lg:left-0 lg:top-0 lg:z-30 lg:flex-col lg:border-t-0 lg:border-r lg:pb-0 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain',
        ].join(' ')}
        style={{ backgroundColor: background }}
      >
        {/* Desktop: who is signed in, at the top (a guest gets the way in). */}
        <div className={`hidden lg:flex shrink-0 h-16 items-center gap-2 pl-[1.125rem] pr-4 border-b ${borderCol}`}>
          {user ? (
            <div className="flex items-center gap-3 min-w-0">
              {user.avatar}
              <span className="nav-label font-mono text-xs font-semibold truncate whitespace-nowrap">{user.name}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              aria-label={t.signIn}
              className={`flex items-center gap-3 min-w-0 ml-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${textMuted} hover:text-emerald-400`}
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden>
                <LogIn className="w-4 h-4" />
              </span>
              <span className="nav-label truncate whitespace-nowrap">{t.signIn}</span>
            </button>
          )}
        </div>

        {/* The pages: the bar's tabs below lg, the rail's rows from lg up. */}
        <div className="relative flex flex-1 min-w-0 lg:flex-none lg:block lg:py-2 lg:space-y-0.5">
          {/* One marker for the current page, gliding to the next one rather
              than blinking from row to row (index.css .nav-marker). */}
          <span
            className="nav-marker pointer-events-none absolute"
            style={{ '--i': Math.max(0, markerAt), opacity: markerAt < 0 ? 0 : 1 } as React.CSSProperties}
            aria-hidden
          />
          <NavButton tab label={t.navHome} icon={<Home className="w-4 h-4" />} active={current === 'home'} onClick={pick(onHome)} textMuted={textMuted} />
          <NavButton tab label={t.navBits} icon={<BitsMark className="w-4 h-4" />} active={current === 'bits'} onClick={pick(onBits)} textMuted={textMuted} />
          <NavButton tab label={t.navRoom} icon={<Armchair className="w-4 h-4" />} active={current === 'room'} onClick={pick(onRoom)} textMuted={textMuted} />
          <NavButton tab label={t.navData} icon={<BarChart3 className="w-4 h-4" />} active={current === 'data'} onClick={pick(onData)} textMuted={textMuted} />
          <NavButton tab label={t.navSettings} icon={<Settings className="w-4 h-4" />} active={current === 'settings'} onClick={pick(onSettings)} textMuted={textMuted} />
          {/* Below lg the sixth tab is the way out (or in, for a guest). */}
          {onSignOut ? (
            <SignOutButton tab onSignOut={onSignOut} textMuted={textMuted} className="lg:hidden" />
          ) : (
            <NavButton tab label={t.signIn} icon={<LogIn className="w-4 h-4" />} onClick={onSignIn} textMuted={textMuted} className="lg:hidden" />
          )}
        </div>

        {/* The tools: at the rail's foot from lg up; below lg, SHARE CARD,
            NOISE and the theme sit in the header's top-right corner (COMMAND
            needs a keyboard, and SIGN OUT has its tab). */}
        <div
          className={[
            `shrink-0 lg:mt-auto lg:border-t ${borderCol} lg:py-2 lg:space-y-0.5`,
            'max-lg:fixed max-lg:top-0 max-lg:right-2 max-lg:h-13 sm:max-lg:h-16 max-lg:flex max-lg:items-center max-lg:gap-1',
          ].join(' ')}
        >
          <NavButton label={t.navCommand} icon={<Terminal className="w-4 h-4" />} onClick={pick(onCommand)} textMuted={textMuted} className="max-lg:hidden" />
          <NavButton tool label={t.navCard} icon={<Share2 className="w-4 h-4" />} onClick={pick(onCard)} textMuted={textMuted} />
          {sound}
          <NavButton
            tool
            label={isDark ? t.navLightMode : t.navDarkMode}
            icon={<ThemeToggleIcon showSun={isDark} className="w-4 h-4" />}
            onClick={onToggleTheme}
            textMuted={textMuted}
          />
          {onSignOut && <SignOutButton onSignOut={onSignOut} textMuted={textMuted} className="max-lg:hidden" />}
        </div>

        {/* From lg up: widen the rail to show the names, or fold it back. The
            icon turns with it. */}
        <div className={`hidden lg:block shrink-0 border-t ${borderCol} py-2`}>
          <NavButton
            label={wide ? t.navCollapse : t.navExpand}
            icon={
              <PanelLeftClose
                className={`w-4 h-4 transition-transform duration-300 ${EASE} motion-reduce:transition-none ${wide ? '' : 'rotate-180'}`}
              />
            }
            onClick={toggleWide}
            textMuted={textMuted}
          />
        </div>
      </nav>
    </>
  );
};
