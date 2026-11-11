import { useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getMaterial } from '@/core/estimate/defaultCosts';
import { textureUrl } from '@/features/materials/textures';
import { tintImage } from '@/features/materials/tint';
import { useImage } from '@/features/materials/useImage';
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
  return flatWallMaterial(getMaterial(finish)?.colorHex, state, accent);
}

/** Plain wall material in a flat colour (or the default wall colour). */
export function flatWallMaterial(color: string | undefined, state: HighlightState, accent: string) {
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

/** A configured copy of a loaded texture (the cached original is left untouched). */
function prepared(src: THREE.Texture, tileSize: number, srgb: boolean): THREE.Texture {
  return configure(src.clone(), tileSize, srgb);
}

function configure(t: THREE.Texture, tileSize: number, srgb: boolean): THREE.Texture {
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tileSize, 1 / tileSize);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
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
  tint?: string,
) {
  const maps = useTexture({
    map: textureUrl(set, 'color'),
    normalMap: textureUrl(set, 'normal'),
    roughnessMap: textureUrl(set, 'rough'),
  });
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map:
        tint && maps.map.image instanceof HTMLImageElement
          ? configure(new THREE.CanvasTexture(tintImage(maps.map.image, tint)), tileSize, true)
          : prepared(maps.map, tileSize, true),
      normalMap: prepared(maps.normalMap, tileSize, false),
      roughnessMap: prepared(maps.roughnessMap, tileSize, false),
      roughness: 1,
      normalScale: new THREE.Vector2(0.6, 0.6),
    });
    return tinted(m, state, accent);
  }, [maps, tileSize, state, accent, tint]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.dispose();
    },
    [material],
  );
  return material;
}

const wallCache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Material for one side of a wall: a paint colour, or a textured finish
 * (brick, panelling, tile...) optionally recoloured. Textures load in the
 * background; the finish's average colour shows until they arrive.
 * Wall UVs are in metres, so `tileSize` gives real-world scale.
 */
export function useWallSideMaterial(
  finish: string | undefined,
  tint: string | undefined,
  state: HighlightState,
  accent: string,
): THREE.Material {
  const m = getMaterial(finish);
  const set = m?.category === 'wallFinish' ? m.textureSet : undefined;
  const color = useImage(set && textureUrl(set, 'color'));
  const normal = useImage(set && textureUrl(set, 'normal'));
  return useMemo(() => {
    if (!m || !set) return flatWallMaterial(m?.colorHex, state, accent);
    if (!color) return flatWallMaterial(tint ?? m.colorHex, state, accent);
    const tile = m.tileSize ?? 1;
    const key = `${set}|${tint ?? ''}|${normal ? 'n' : ''}|${state}|${accent}`;
    let mat = wallCache.get(key);
    if (!mat) {
      const map = configure(
        tint ? new THREE.CanvasTexture(tintImage(color, tint)) : new THREE.Texture(color),
        tile,
        true,
      );
      const base = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.92,
        ...(normal
          ? {
              normalMap: configure(new THREE.Texture(normal), tile, false),
              normalScale: new THREE.Vector2(0.8, 0.8),
            }
          : {}),
      });
      mat = tinted(base, state, accent);
      wallCache.set(key, mat);
    }
    return mat;
  }, [m, set, color, normal, tint, state, accent]);
}
