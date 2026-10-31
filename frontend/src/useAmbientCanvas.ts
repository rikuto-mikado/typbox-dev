import type React from 'react';
import { useEffect } from 'react';
import { createAmbientScene, type AmbientFrame } from './ambientThemes';

const FPS = 30;

/**
 * Runs a scene on a canvas; `animate=false` draws a settled still frame.
 * The one renderer for every ambient canvas (the overlay, the settings
 * previews, NEWS): it clears each frame, scales for the display and lets
 * particles settle before the first visible frame.
 */
export function useAmbientCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  themeId: string,
  opts: { fullscreen: boolean; animate: boolean; backdrop?: string }
) {
  const { fullscreen, animate, backdrop } = opts;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    let frame: AmbientFrame;
    let start = performance.now();

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      if (backdrop) {
        ctx.fillStyle = backdrop;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.save();
      frame(ctx, t, dt);
      ctx.restore();
    };

    const setup = () => {
      // Capped DPR: this runs for hours with the screen on, so trade a little
      // crispness on 3x phones for a lot less fill work.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = fullscreen ? window.innerWidth : canvas.clientWidth || 192;
      h = fullscreen ? window.innerHeight : canvas.clientHeight || 108;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame = createAmbientScene(themeId, w, h);
      start = performance.now();
      // Let particles spread out before the first visible frame.
      for (let i = 0; i < 40; i++) draw(i / FPS, 1 / FPS);
    };
    setup();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduceMotion) return;

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = now - last;
      if (elapsed < 1000 / FPS - 2) return;
      last = now;
      draw((now - start) / 1000 + 40 / FPS, Math.min(0.1, elapsed / 1000));
    };
    raf = requestAnimationFrame(tick);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup, 200);
    };
    if (fullscreen) window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [canvasRef, themeId, fullscreen, animate, backdrop]);
}
