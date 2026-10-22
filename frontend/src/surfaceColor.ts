// OKLCH color math for the generated Surface Theme series (surfaceThemes.ts).
// OKLCH is used instead of HSL because its lightness is perceptual: an
// L 0.20 yellow and an L 0.20 blue look equally dark, so every hue in a
// series sits at the same brightness and the contrast a theme is built on
// (chroma or hue) is the only thing that changes between them.

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function oklchToLinearRgb(l: number, c: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: [number, number, number]) => rgb.every((v) => v >= -0.0001 && v <= 1.0001);

/** Highest chroma that hue `h` can reach at lightness `l` inside sRGB. */
export function maxChroma(l: number, h: number): number {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinearRgb(l, mid, h))) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** OKLCH → #rrggbb. Out-of-gamut colors keep their lightness and hue and lose chroma. */
export function oklch(l: number, c: number, h: number): string {
  const lightness = Math.min(1, Math.max(0, l));
  const chroma = Math.min(Math.max(0, c), maxChroma(lightness, h));
  const rgb = oklchToLinearRgb(lightness, chroma, h);
  const hex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, fromLinear(v))) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`;
}

export function oklchAlpha(l: number, c: number, h: number, alpha: number): string {
  const hex = oklch(l, c, h);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Text color of hue `h` / chroma `c`, starting at lightness `l` and walked
 * away from the backgrounds until it reaches `ratio` against every one of
 * them — lighter on dark surfaces, darker on light ones.
 */
export function readableText(l: number, c: number, h: number, backgrounds: string[], ratio: number): string {
  const step = relativeLuminance(backgrounds[0]) < 0.18 ? 0.01 : -0.01;
  let lightness = l;
  let color = oklch(lightness, c, h);
  while (backgrounds.some((bg) => contrastRatio(color, bg) < ratio) && lightness > 0 && lightness < 1) {
    lightness += step;
    color = oklch(lightness, c, h);
  }
  return color;
}

/** #rrggbb → [L, C, h] in OKLCH. */
export function hexToOklch(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
}

/** `hex` unchanged if it already reaches `ratio` on every background, else nudged along lightness until it does. */
export function ensureReadable(hex: string, backgrounds: string[], ratio: number): string {
  if (backgrounds.every((bg) => contrastRatio(hex, bg) >= ratio)) return hex;
  const [l, c, h] = hexToOklch(hex);
  return readableText(l, c, h, backgrounds, ratio);
}
