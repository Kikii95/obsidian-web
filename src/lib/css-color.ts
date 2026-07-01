const DEFAULT_FALLBACK = "#888888";
const HSL_SHORTHAND = /^\d+\s+[\d.]+%\s+[\d.]+%$/;

/**
 * Read a CSS custom property and convert it to a #rrggbb hex string, handling
 * OKLCH / LAB / HSL and any other CSS color via a 1x1 canvas fillStyle round-trip.
 * Three.js's THREE.Color cannot parse oklch(), so this is the bridge to WebGL.
 * Returns `fallback` on the server or when the value cannot be read.
 */
export function cssColorToHex(varName: string, fallback: string = DEFAULT_FALLBACK): string {
  if (typeof window === "undefined") return fallback;

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!value) return fallback;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return fallback;

  const colorValue = HSL_SHORTHAND.test(value) ? `hsl(${value})` : value;
  ctx.fillStyle = colorValue;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
