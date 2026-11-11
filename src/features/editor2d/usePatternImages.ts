import { useEffect, useState } from 'react';
import { textureUrl } from '@/features/materials/textures';

const cache = new Map<string, HTMLImageElement>();

/** Loads texture images for 2D pattern fills; re-renders as each one arrives. */
export function usePatternImages(sets: readonly string[]): ReadonlyMap<string, HTMLImageElement> {
  const [, setVersion] = useState(0);
  const key = [...new Set(sets)].sort().join('|');

  useEffect(() => {
    let alive = true;
    for (const set of key ? key.split('|') : []) {
      if (cache.has(set)) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = textureUrl(set, 'color');
      img.onload = () => {
        cache.set(set, img);
        if (alive) setVersion((v) => v + 1);
      };
    }
    return () => {
      alive = false;
    };
  }, [key]);

  return cache;
}
