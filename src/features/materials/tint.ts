/**
 * Recolours a photo texture while keeping its detail: each pixel keeps its
 * brightness relative to the image's average, and that brightness is applied
 * to the chosen colour. So the tinted texture's average colour is the tint,
 * and the grain / grout / brick pattern stays visible. The same canvas is
 * used for 2D pattern fills and as the 3D colour map, so both always match.
 */

const cache = new Map<string, HTMLCanvasElement>();

/** Map key for a (possibly tinted) texture set. */
export const patternKey = (set: string, tint?: string): string =>
  tint ? `${set}|${tint.toLowerCase()}` : set;

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A cached, tinted copy of `img`. */
export function tintImage(img: HTMLImageElement, hex: string): HTMLCanvasElement {
  const key = `${img.src}|${hex.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) return canvas;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;

  let total = 0;
  for (let i = 0; i < px.length; i += 4) {
    total += 0.2126 * (px[i] ?? 0) + 0.7152 * (px[i + 1] ?? 0) + 0.0722 * (px[i + 2] ?? 0);
  }
  const avg = Math.max(1, total / (px.length / 4));
  const [r, gg, b] = hexToRgb(hex);
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.2126 * (px[i] ?? 0) + 0.7152 * (px[i + 1] ?? 0) + 0.0722 * (px[i + 2] ?? 0);
    // Slightly soften extremes so very dark / bright textures stay readable.
    const k = Math.min(2.2, Math.pow(lum / avg, 0.85));
    px[i] = Math.min(255, r * k);
    px[i + 1] = Math.min(255, gg * k);
    px[i + 2] = Math.min(255, b * k);
  }
  g.putImageData(data, 0, 0);
  cache.set(key, canvas);
  return canvas;
}
