import { useEffect, useState } from 'react';

const loaded = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

/** Loads an image once per URL (shared across the app). */
export function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = loaded.get(url);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        loaded.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        pending.delete(url);
        reject(new Error(`failed to load ${url}`));
      };
      img.src = url;
    });
    pending.set(url, p);
  }
  return p;
}

export const loadedImage = (url: string): HTMLImageElement | undefined => loaded.get(url);

/** The image at `url` once it has loaded (null until then, or when no URL). */
export function useImage(url: string | undefined): HTMLImageElement | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!url || loaded.has(url)) return;
    let alive = true;
    loadImage(url).then(
      () => {
        if (alive) setTick((t) => t + 1);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return url ? (loaded.get(url) ?? null) : null;
}
