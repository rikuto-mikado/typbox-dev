import { useEffect, useState } from 'react';

// Keeps the display from dimming / sleeping while `active` (stopwatch
// running, or an Ambient overlay preview).
//
// 1. Screen Wake Lock API where available. The browser silently releases
//    the lock whenever the tab is hidden, the screen locks, or (on some
//    platforms) battery saver kicks in, so the sentinel's `release` event is
//    tracked and the lock is re-requested on return to the page, on the next
//    tap/keypress, and by a slow watchdog.
// 2. Otherwise (no API, or the request is refused — e.g. iOS home-screen
//    apps before 18.4), the same trick video players rely on: a tiny muted,
//    inline, looping clip keeps the OS from treating the page as idle.
//    Clips: public/keep-awake.{webm,mp4} (NoSleep.js, MIT).

export type KeepAwakeMode = 'off' | 'wake-lock' | 'video' | 'unavailable';

const WATCHDOG_MS = 20_000;
const LOCK_TIMEOUT_MS = 3_000;

function createKeepAwakeVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.setAttribute('aria-hidden', 'true');
  video.muted = true;
  video.title = 'TYPBOX keep-awake';
  // In the viewport (some engines pause off-screen media) but invisible.
  Object.assign(video.style, {
    position: 'fixed',
    left: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    opacity: '0.01',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  for (const [ext, type] of [
    ['webm', 'video/webm'],
    ['mp4', 'video/mp4'],
  ]) {
    const source = document.createElement('source');
    source.src = `${import.meta.env.BASE_URL}keep-awake.${ext}`;
    source.type = type;
    video.appendChild(source);
  }
  video.addEventListener('loadedmetadata', () => {
    if (video.duration <= 1) {
      video.loop = true;
    } else {
      // The mp4 clip has a trailing frame some players treat as "ended";
      // hop back before reaching it instead of looping.
      video.addEventListener('timeupdate', () => {
        if (video.currentTime > 0.5) video.currentTime = Math.random();
      });
    }
  });
  return video;
}

export function useKeepAwake(active: boolean): KeepAwakeMode {
  const [mode, setMode] = useState<KeepAwakeMode>('unavailable');

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let sentinel: WakeLockSentinel | null = null;
    let video: HTMLVideoElement | null = null;
    let acquiring = false;

    const isHeld = () => (sentinel !== null && !sentinel.released) || (video !== null && !video.paused);

    const startVideo = async (): Promise<boolean> => {
      if (!video) {
        video = createKeepAwakeVideo();
        document.body.appendChild(video);
      }
      try {
        await video.play();
        return true;
      } catch {
        // Autoplay refused until a user gesture; retried on the next tap.
        return false;
      }
    };

    // Takes ownership of a granted lock (possibly one that arrived after we
    // had already given up waiting and started the video).
    const adoptLock = (lock: WakeLockSentinel) => {
      if (disposed || (sentinel && !sentinel.released)) {
        lock.release().catch(() => {});
        return;
      }
      sentinel = lock;
      lock.addEventListener('release', () => {
        if (sentinel === lock) sentinel = null;
        // Re-request straight away if we're still visible (e.g. a
        // power-saver release); hidden pages retry on visibilitychange.
        if (!disposed) window.setTimeout(acquire, 1000);
      });
      video?.pause();
      setMode('wake-lock');
    };

    // Some engines leave the request pending (e.g. a permission policy that
    // never answers), so give it a few seconds before falling back.
    const requestLock = (): Promise<boolean> =>
      new Promise((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          settled = true;
          resolve(false);
        }, LOCK_TIMEOUT_MS);
        navigator.wakeLock.request('screen').then(
          (lock) => {
            window.clearTimeout(timer);
            adoptLock(lock);
            if (!settled) resolve(true);
          },
          () => {
            window.clearTimeout(timer);
            if (!settled) resolve(false);
          }
        );
      });

    const acquire = async () => {
      if (disposed || acquiring || document.visibilityState !== 'visible' || isHeld()) return;
      acquiring = true;
      try {
        if ('wakeLock' in navigator && navigator.wakeLock && (await requestLock())) return;
        const ok = await startVideo();
        if (!disposed && !(sentinel && !sentinel.released)) setMode(ok ? 'video' : 'unavailable');
      } finally {
        acquiring = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    // A gesture both satisfies autoplay policies and is a natural moment to
    // notice a lock the platform dropped without telling us.
    const onGesture = () => {
      if (!isHeld()) acquire();
    };
    const gestureEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchend'];

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    gestureEvents.forEach((evt) => window.addEventListener(evt, onGesture, { passive: true }));
    const watchdog = window.setInterval(() => {
      if (!isHeld()) acquire();
    }, WATCHDOG_MS);

    return () => {
      disposed = true;
      window.clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      gestureEvents.forEach((evt) => window.removeEventListener(evt, onGesture));
      if (sentinel) sentinel.release().catch(() => {});
      sentinel = null;
      if (video) {
        video.pause();
        video.remove();
        video = null;
      }
    };
  }, [active]);

  return active ? mode : 'off';
}
