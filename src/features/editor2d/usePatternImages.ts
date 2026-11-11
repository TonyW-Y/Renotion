import { useEffect, useState } from 'react';
import { textureUrl } from '@/features/materials/textures';
import { patternKey, tintImage } from '@/features/materials/tint';
import { loadedImage, loadImage } from '@/features/materials/useImage';

export type PatternImage = HTMLImageElement | HTMLCanvasElement;

const cache = new Map<string, PatternImage>();

export interface PatternRequest {
  set: string;
  tint?: string | undefined;
}

/**
 * Loads (and tints) texture images for 2D pattern fills, keyed by
 * `patternKey(set, tint)`; re-renders as each one arrives.
 */
export function usePatternImages(
  requests: readonly PatternRequest[],
): ReadonlyMap<string, PatternImage> {
  const [, setVersion] = useState(0);
  const key = [...new Set(requests.map((r) => patternKey(r.set, r.tint)))].sort().join(',');

  useEffect(() => {
    let alive = true;
    for (const k of key ? key.split(',') : []) {
      if (cache.has(k)) continue;
      const [set = '', tint] = k.split('|');
      const url = textureUrl(set, 'color');
      const ready = (img: HTMLImageElement) => {
        cache.set(k, tint ? tintImage(img, tint) : img);
        if (alive) setVersion((v) => v + 1);
      };
      const img = loadedImage(url);
      if (img) ready(img);
      else loadImage(url).then(ready, () => undefined);
    }
    return () => {
      alive = false;
    };
  }, [key]);

  return cache;
}
