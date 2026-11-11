import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterial } from '@/core/estimate/defaultCosts';
import { textureUrl } from '@/features/materials/textures';
import { MATERIALS } from './materials';

export type HighlightState = 'none' | 'hover' | 'selected';

const cache = new Map<string, THREE.MeshStandardMaterial>();

function tinted(base: THREE.MeshStandardMaterial, state: HighlightState, accent: string) {
  if (state === 'none') return base;
  const m = base.clone();
  m.emissive = new THREE.Color(accent);
  m.emissiveIntensity = state === 'selected' ? 0.55 : 0.2;
  return m;
}

/** Wall surface material for a finish id (paint colour), cached per colour + state. */
export function wallFaceMaterial(
  finish: string | undefined,
  state: HighlightState,
  accent: string,
) {
  const color = getMaterial(finish)?.colorHex;
  const key = `${color ?? 'base'}|${state}|${accent}`;
  let m = cache.get(key);
  if (!m) {
    const base = color
      ? new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
      : MATERIALS.wall;
    m = tinted(base, state, accent);
    cache.set(key, m);
  }
  return m;
}

/** Edge / top faces of walls (unpainted). */
export function wallEdgeMaterial(state: HighlightState, accent: string) {
  return wallFaceMaterial(undefined, state, accent);
}

function configure(textures: Record<string, THREE.Texture>, tileSize: number) {
  for (const [name, t] of Object.entries(textures)) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / tileSize, 1 / tileSize);
    t.anisotropy = 8;
    if (name === 'map') t.colorSpace = THREE.SRGBColorSpace;
  }
}

/**
 * Textured floor material. Floor UVs are in plan metres, so repeating every
 * `tileSize` metres gives true real-world scale.
 */
export function useTexturedFloor(
  set: string,
  tileSize: number,
  state: HighlightState,
  accent: string,
) {
  const maps = useTexture(
    {
      map: textureUrl(set, 'color'),
      normalMap: textureUrl(set, 'normal'),
      roughnessMap: textureUrl(set, 'rough'),
    },
    (loaded) => {
      configure(loaded, tileSize);
    },
  );
  return useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      ...maps,
      roughness: 1,
      normalScale: new THREE.Vector2(0.6, 0.6),
    });
    return tinted(m, state, accent);
  }, [maps, state, accent]);
}
