import * as THREE from 'three';

/** Shared materials (created once; reused by every mesh). */
export const MATERIALS = {
  wall: new THREE.MeshStandardMaterial({ color: '#f2efe9', roughness: 0.92 }),
  wallTop: new THREE.MeshStandardMaterial({ color: '#d9d4cb', roughness: 0.95 }),
  floor: new THREE.MeshStandardMaterial({ color: '#e3dccf', roughness: 0.85 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#fbfaf7', roughness: 1, side: THREE.BackSide }),
  frame: new THREE.MeshStandardMaterial({ color: '#f7f6f2', roughness: 0.6 }),
  door: new THREE.MeshStandardMaterial({ color: '#b48a63', roughness: 0.65 }),
  /** For faces buried inside a neighbouring wall (hidden to avoid z-fighting). */
  hidden: new THREE.MeshBasicMaterial({ visible: false }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#cfe8ff',
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
} as const;

/** Emissive tint applied over a base material for hover / selection. */
export function highlighted(base: THREE.MeshStandardMaterial, color: string, strength: number) {
  const m = base.clone();
  m.emissive = new THREE.Color(color);
  m.emissiveIntensity = strength;
  return m;
}
