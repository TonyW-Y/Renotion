import { footprintIntersectsWalls, rectFootprint } from '../geometry/collision';
import type { FurnitureItem, Plan, Vec2 } from '../types';
import { FURNITURE_BY_ID } from './catalog';

/** Plan-space footprint of a furniture item (rotated rectangle), or null if the model is unknown. */
export function furnitureFootprint(
  item: Pick<FurnitureItem, 'modelId' | 'position' | 'rotation'>,
): Vec2[] | null {
  const m = FURNITURE_BY_ID.get(item.modelId);
  return m ? rectFootprint(item.position, m.width, m.depth, item.rotation) : null;
}

/** True if the item can stand here without overlapping a wall. */
export function canPlaceFurniture(
  item: Pick<FurnitureItem, 'modelId' | 'position' | 'rotation'>,
  plan: Pick<Plan, 'walls'>,
): boolean {
  const fp = furnitureFootprint(item);
  return fp !== null && !footprintIntersectsWalls(fp, plan);
}

/** Normalizes an angle to [0, 2π). */
export const normalizeAngle = (a: number): number =>
  ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
