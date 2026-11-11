import { footprintIntersectsWalls, rectFootprint } from '../geometry/collision';
import type { FurnitureItem, FurnitureSize, Plan, Vec2 } from '../types';
import { FURNITURE_BY_ID, NON_TINTABLE, type FurnitureModel, type FurniturePart } from './catalog';

type ItemShape = Pick<FurnitureItem, 'modelId' | 'size' | 'colors'>;

/** The two main colours of a model, by how much of the piece they cover. */
export interface FurniturePalette {
  primary?: string;
  secondary?: string;
}

const paletteCache = new WeakMap<FurnitureModel, FurniturePalette>();

/**
 * Picks a model's primary / secondary colours automatically: the two
 * recolourable colours that cover the most volume (e.g. upholstery, then
 * wood). Glass and metal are never recoloured.
 */
export function furniturePalette(model: FurnitureModel): FurniturePalette {
  const cached = paletteCache.get(model);
  if (cached) return cached;
  const volume = new Map<string, number>();
  for (const p of model.parts) {
    if (NON_TINTABLE.has(p.color)) continue;
    volume.set(p.color, (volume.get(p.color) ?? 0) + p.size[0] * p.size[1] * p.size[2]);
  }
  const [primary, secondary] = [...volume.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const palette: FurniturePalette = {
    ...(primary ? { primary } : {}),
    ...(secondary ? { secondary } : {}),
  };
  paletteCache.set(model, palette);
  return palette;
}

const modelCache = new WeakMap<object, FurnitureModel>();

function scalePart(p: FurniturePart, sx: number, sy: number, sz: number): FurniturePart {
  const [w, h, d] = p.size;
  const [x, y, z] = p.position;
  if (p.shape === 'box') {
    return { ...p, size: [w * sx, h * sy, d * sz], position: [x * sx, y * sy, z * sz] };
  }
  // Round parts stay round: scale their diameter by the smaller horizontal factor.
  const k = Math.min(sx, sz);
  if (p.shape === 'cylinder') {
    return { ...p, size: [w * k, h * sy, d * k], position: [x * sx, y * sy, z * sz] };
  }
  const ks = Math.min(k, sy);
  const bottom = (y - h / 2) * sy;
  return {
    ...p,
    size: [w * ks, h * ks, d * ks],
    position: [x * sx, bottom + (h * ks) / 2, z * sz],
  };
}

/**
 * The catalogue model with an item's custom size and colours applied.
 * Returns the shared catalogue model when nothing is customised, and is
 * memoised per (immutable) item so renders stay cheap.
 */
export function modelFor(item: ItemShape): FurnitureModel | undefined {
  const base = FURNITURE_BY_ID.get(item.modelId);
  if (!base || (!item.size && !item.colors)) return base;
  const cached = modelCache.get(item);
  if (cached) return cached;

  const size = item.size ?? base;
  const sx = size.width / base.width;
  const sy = size.height / base.height;
  const sz = size.depth / base.depth;
  const palette = furniturePalette(base);
  const swap = new Map<string, string>();
  if (palette.primary && item.colors?.primary) swap.set(palette.primary, item.colors.primary);
  if (palette.secondary && item.colors?.secondary)
    swap.set(palette.secondary, item.colors.secondary);

  const model: FurnitureModel = {
    ...base,
    width: size.width,
    depth: size.depth,
    height: size.height,
    parts: base.parts.map((p) => {
      const scaled = scalePart(p, sx, sy, sz);
      const color = swap.get(p.color);
      return color ? { ...scaled, color } : scaled;
    }),
  };
  modelCache.set(item, model);
  return model;
}

/** Keeps a custom size between half and double the catalogue size (at least 10 cm). */
export function clampFurnitureSize(model: FurnitureModel, size: FurnitureSize): FurnitureSize {
  const clamp = (v: number, base: number) =>
    Math.min(base * 2, Math.max(Math.max(0.1, base / 2), v));
  return {
    width: clamp(size.width, model.width),
    depth: clamp(size.depth, model.depth),
    height: clamp(size.height, model.height),
  };
}

/** Price multiplier for a resized item: its footprint area relative to the catalogue size. */
export function sizeFactor(item: ItemShape): number {
  const base = FURNITURE_BY_ID.get(item.modelId);
  if (!base || !item.size) return 1;
  return (item.size.width * item.size.depth) / (base.width * base.depth);
}

/** Plan-space footprint of a furniture item (rotated rectangle), or null if the model is unknown. */
export function furnitureFootprint(
  item: Pick<FurnitureItem, 'modelId' | 'position' | 'rotation' | 'size'>,
): Vec2[] | null {
  const m = FURNITURE_BY_ID.get(item.modelId);
  if (!m) return null;
  const size = item.size ?? m;
  return rectFootprint(item.position, size.width, size.depth, item.rotation);
}

/** True if the item can stand here without overlapping a wall. */
export function canPlaceFurniture(
  item: Pick<FurnitureItem, 'modelId' | 'position' | 'rotation' | 'size'>,
  plan: Pick<Plan, 'walls'>,
): boolean {
  const fp = furnitureFootprint(item);
  return fp !== null && !footprintIntersectsWalls(fp, plan);
}

/** Normalizes an angle to [0, 2π). */
export const normalizeAngle = (a: number): number =>
  ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
