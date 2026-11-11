import * as THREE from 'three';
import { openingStyleOf } from '@/core/openings';
import type { Opening } from '@/core/types';
import { MATERIALS } from './materials';

/** One box of an opening, in the opening's local frame (x along the wall, y up, z across). */
export interface OpeningPart {
  position: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
  shadow?: boolean;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();
function painted(hex: string, roughness: number): THREE.MeshStandardMaterial {
  const key = `${hex}|${roughness}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness });
    cache.set(key, m);
  }
  return m;
}

const PET_FLAP = '#3a3d42';

/**
 * Builds a door or window design out of boxes. The origin is the bottom
 * centre of the opening on the wall's centre line.
 */
export function openingParts(o: Opening, wallThickness: number): OpeningPart[] {
  const style = openingStyleOf(o);
  const w = o.width;
  const h = o.height;
  const depth = wallThickness + 0.02;
  const parts: OpeningPart[] = [];
  const add = (
    x: number,
    y: number,
    z: number,
    sw: number,
    sh: number,
    sd: number,
    material: THREE.Material,
    shadow = true,
  ) => {
    parts.push({ position: [x, y, z], size: [sw, sh, sd], material, shadow });
  };

  // Small openings get a slimmer frame.
  const f = Math.min(style === 'picture' ? 0.07 : 0.05, w * 0.12, h * 0.12);

  if (o.type === 'window') {
    const frame = o.color ? painted(o.color, 0.55) : MATERIALS.frame;
    const iw = w - 2 * f;
    const ih = h - 2 * f;
    // Frame: jambs, head and sill.
    add(-w / 2 + f / 2, h / 2, 0, f, h, depth, frame);
    add(w / 2 - f / 2, h / 2, 0, f, h, depth, frame);
    add(0, h - f / 2, 0, w, f, depth, frame);
    add(0, f / 2, 0, w, f, depth, frame);
    add(0, h / 2, 0, iw, ih, 0.01, MATERIALS.glass, false);
    const bar = 0.035;
    switch (style) {
      case 'casement':
        add(0, h / 2, 0, bar, ih, 0.05, frame);
        break;
      case 'double-hung':
        add(0, h / 2, 0, iw, bar * 1.4, 0.06, frame);
        break;
      case 'slider':
        add(-iw / 2 + iw * 0.52, h / 2, 0.012, bar, ih, 0.03, frame);
        add(-iw / 2 + iw * 0.48, h / 2, -0.012, bar, ih, 0.03, frame);
        break;
      case 'grid':
        for (const k of [-1, 1]) {
          add((k * iw) / 6, h / 2, 0, 0.02, ih, 0.03, frame);
          add(0, h / 2 + (k * ih) / 6, 0, iw, 0.02, 0.03, frame);
        }
        break;
      case 'bay':
        add(0, 0.02, 0, w + 0.16, 0.04, depth + 0.24, frame);
        add(0, h + 0.03, 0, w + 0.1, 0.06, depth + 0.06, frame);
        add(0, h / 2, 0, bar, ih, 0.05, frame);
        break;
      default:
        break; // picture: frame only
    }
    return parts;
  }

  // ---- Doors
  const trim = MATERIALS.frame;
  const leaf = o.color
    ? painted(o.color, 0.6)
    : style === 'pet'
      ? painted(PET_FLAP, 0.4)
      : MATERIALS.door;
  add(-w / 2 + f / 2, h / 2, 0, f, h, depth, trim);
  add(w / 2 - f / 2, h / 2, 0, f, h, depth, trim);
  add(0, h - f / 2, 0, w, f, depth, trim);

  const lw = w - 2 * f - 0.006;
  const lh = h - f - 0.01;
  const ly = lh / 2 + 0.005;
  const t = 0.04;

  /** A glazed leaf: stiles and rails around a glass pane. */
  const glazed = (cx: number, width: number, stile: number, bottom: number) => {
    add(cx - width / 2 + stile / 2, ly, 0, stile, lh, t, leaf);
    add(cx + width / 2 - stile / 2, ly, 0, stile, lh, t, leaf);
    add(cx, lh - stile / 2 + 0.005, 0, width, stile, t, leaf);
    add(cx, bottom / 2 + 0.005, 0, width, bottom, t, leaf);
    const gh = lh - stile - bottom;
    add(cx, bottom + gh / 2 + 0.005, 0, width - 2 * stile, gh, 0.01, MATERIALS.glass, false);
  };

  switch (style) {
    case 'panel': {
      add(0, ly, 0, lw, lh, t, leaf);
      const pw = lw * 0.32;
      for (const x of [-lw * 0.22, lw * 0.22]) {
        add(x, lh * 0.27, 0, pw, lh * 0.36, t + 0.014, leaf);
        add(x, lh * 0.72, 0, pw, lh * 0.38, t + 0.014, leaf);
      }
      break;
    }
    case 'glass':
      glazed(0, lw, Math.min(0.1, lw * 0.15), Math.min(0.22, lh * 0.12));
      break;
    case 'double': {
      const half = lw / 2 - 0.003;
      glazed(-lw / 4, half, Math.min(0.07, half * 0.15), Math.min(0.16, lh * 0.1));
      glazed(lw / 4, half, Math.min(0.07, half * 0.15), Math.min(0.16, lh * 0.1));
      break;
    }
    case 'barn': {
      // Leaf hangs on side A's face, on a track it can slide along.
      const z = -(wallThickness / 2 + 0.025);
      const bw = w + 0.12;
      const bh = Math.min(h + 0.04, h + f);
      add(0, bh / 2, z, bw, bh, 0.035, leaf);
      for (const y of [bh * 0.18, bh * 0.82]) add(0, y, z - 0.02, bw, 0.12, 0.01, leaf);
      add(w / 2, bh + 0.03, z, w * 2 + 0.16, 0.03, 0.02, painted('#2a2c30', 0.4));
      add(bw / 2 - 0.08, bh * 0.5, z - 0.03, 0.025, 0.3, 0.025, painted('#2a2c30', 0.4));
      break;
    }
    case 'pet':
      add(0, ly, 0, lw, lh, 0.012, leaf);
      break;
    default:
      add(0, ly, 0, lw, lh, t, leaf);
  }
  return parts;
}
