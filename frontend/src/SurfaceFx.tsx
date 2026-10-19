import React from 'react';
import type { SurfaceFx } from './telemetryFeatures';

// Ambient motion layer for NEO Surface Themes that declare an `fx`. It sits
// fixed behind the whole app (negative z-index inside the isolated root), so
// it only shows through page gutters and translucent chrome — never over
// card text. Particles are deterministic (seeded once at module load), use
// transform/opacity animations only, and the layer is hidden entirely under
// prefers-reduced-motion (see .surface-fx in index.css).

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Particle {
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  dx: number;
  dy: number;
  o: number;
}

function particles(seed: number, count: number, opts: { size: [number, number]; dur: [number, number]; o: [number, number] }): Particle[] {
  const rand = mulberry32(seed);
  const span = (r: [number, number]) => r[0] + rand() * (r[1] - r[0]);
  return Array.from({ length: count }, () => {
    const dur = span(opts.dur);
    return {
      x: rand() * 100,
      y: rand() * 100,
      size: span(opts.size),
      dur,
      delay: -rand() * dur,
      dx: (rand() - 0.5) * 120,
      dy: -(40 + rand() * 140),
      o: span(opts.o),
    };
  });
}

const FIELDS = {
  dust: particles(1, 30, { size: [1, 2.4], dur: [18, 36], o: [0.25, 0.6] }),
  snow: particles(2, 40, { size: [1.2, 3.2], dur: [14, 30], o: [0.3, 0.7] }),
  rain: particles(3, 38, { size: [10, 26], dur: [1.1, 2.4], o: [0.2, 0.45] }),
  fireflies: particles(4, 18, { size: [2, 3.4], dur: [6, 14], o: [0.4, 0.9] }),
  stars: particles(5, 64, { size: [0.8, 2], dur: [3, 8], o: [0.25, 0.8] }),
  embers: particles(6, 24, { size: [1.4, 3], dur: [8, 16], o: [0.35, 0.8] }),
  bubbles: particles(7, 18, { size: [4, 11], dur: [10, 22], o: [0.25, 0.55] }),
  glitch: particles(8, 4, { size: [2, 6], dur: [7, 13], o: [0.35, 0.6] }),
  matrix: particles(9, 14, { size: [11, 13], dur: [14, 26], o: [0.35, 0.7] }),
  aurora: particles(10, 3, { size: [38, 60], dur: [22, 34], o: [0.5, 0.9] }),
};

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロワン0123456789';
const MATRIX_COLUMNS = (() => {
  const rand = mulberry32(99);
  return FIELDS.matrix.map(() =>
    Array.from({ length: 14 }, () => KATAKANA[Math.floor(rand() * KATAKANA.length)]).join('')
  );
})();

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const v = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)).join(', ');
}

interface SurfaceFxLayerProps {
  fx: SurfaceFx;
  accentHex: string;
  isDark: boolean;
}

export const SurfaceFxLayer: React.FC<SurfaceFxLayerProps> = ({ fx, accentHex, isDark }) => {
  const style = {
    '--fx-rgb': hexToRgb(accentHex),
    // Light surfaces get a quieter layer so dark text keeps its punch.
    '--fx-gain': isDark ? 1 : 0.55,
  } as React.CSSProperties;

  const dot = (p: Particle, i: number, extra: React.CSSProperties = {}) => (
    <span
      key={i}
      className="surface-fx-p"
      style={
        {
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          animationDuration: `${p.dur}s`,
          animationDelay: `${p.delay}s`,
          '--p-o': p.o,
          '--p-dx': `${p.dx}px`,
          '--p-dy': `${p.dy}px`,
          ...extra,
        } as React.CSSProperties
      }
    />
  );

  let content: React.ReactNode = null;
  switch (fx) {
    case 'dust':
    case 'snow':
    case 'fireflies':
    case 'stars':
    case 'embers':
    case 'bubbles':
      content = FIELDS[fx].map((p, i) => dot(p, i));
      break;
    case 'rain':
      content = FIELDS.rain.map((p, i) => dot(p, i, { width: '1px', height: `${p.size}px` }));
      break;
    case 'glitch':
      content = FIELDS.glitch.map((p, i) => dot(p, i, { left: 0, width: '100%', height: `${p.size}px` }));
      break;
    case 'matrix':
      content = FIELDS.matrix.map((p, i) => (
        <span
          key={i}
          className="surface-fx-p"
          style={
            {
              left: `${(i / FIELDS.matrix.length) * 100 + 2}%`,
              fontSize: `${p.size}px`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              '--p-o': p.o,
            } as React.CSSProperties
          }
        >
          {MATRIX_COLUMNS[i]}
        </span>
      ));
      break;
    case 'aurora':
      content = FIELDS.aurora.map((p, i) =>
        dot(p, i, { width: `${p.size}vmax`, height: `${p.size * 0.45}vmax`, left: `${10 + i * 28}%`, top: `${-8 + i * 6}%` })
      );
      break;
    case 'scan':
    case 'pulse':
    case 'sweep':
      content = <span className="surface-fx-p" />;
      break;
  }

  return (
    <div className={`surface-fx surface-fx-${fx}`} style={style} aria-hidden>
      {content}
    </div>
  );
};
