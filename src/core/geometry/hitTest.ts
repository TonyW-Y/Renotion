import type { ID, Plan, Vec2 } from '../types';
import { pointInPolygon, type Polygon } from './polygon';
import { distance, pointToSegmentDistance } from './vec2';
import { openingSpan } from './walls';

export type HitKind = 'opening' | 'wall' | 'furniture' | 'room';

export interface Hit {
  kind: HitKind;
  /** Element id, or room key for rooms. */
  id: string;
}

export interface HitOptions {
  /** Extra pick radius in metres (e.g. a few screen pixels at the current zoom). */
  tolerance?: number;
  rooms?: readonly { key: string; polygon: Polygon }[];
  /** Footprint polygon for a furniture item, when furniture is hit-testable. */
  furnitureFootprint?: (id: ID) => Polygon | null;
}

/**
 * Finds the topmost element under `p`. Priority mirrors draw order:
 * openings › walls › furniture › rooms.
 */
export function hitTest(plan: Plan, p: Vec2, opts: HitOptions = {}): Hit | null {
  const { tolerance = 0.05, rooms = [], furnitureFootprint } = opts;
  const walls = new Map(plan.walls.map((w) => [w.id, w]));

  let best: Hit | null = null;
  let bestD = Infinity;
  for (const o of plan.openings) {
    const w = walls.get(o.wallId);
    if (!w) continue;
    const span = openingSpan(o, w);
    const d = pointToSegmentDistance(p, span.start, span.end);
    if (d <= w.thickness / 2 + tolerance && d < bestD) {
      bestD = d;
      best = { kind: 'opening', id: o.id };
    }
  }
  if (best) return best;

  for (const w of plan.walls) {
    const d = pointToSegmentDistance(p, w.start, w.end);
    if (d <= w.thickness / 2 + tolerance && d < bestD) {
      bestD = d;
      best = { kind: 'wall', id: w.id };
    }
  }
  if (best) return best;

  if (furnitureFootprint) {
    for (let i = plan.furniture.length - 1; i >= 0; i--) {
      const f = plan.furniture[i];
      const poly = f ? furnitureFootprint(f.id) : null;
      if (f && poly && pointInPolygon(p, poly)) return { kind: 'furniture', id: f.id };
    }
  }

  for (const r of rooms) {
    if (pointInPolygon(p, r.polygon)) return { kind: 'room', id: r.key };
  }
  return null;
}

/** The wall endpoint (corner) nearest to `p` within `tolerance`, if any. */
export function cornerAt(plan: Plan, p: Vec2, tolerance: number): Vec2 | null {
  let best: Vec2 | null = null;
  let bestD = tolerance;
  for (const w of plan.walls) {
    for (const q of [w.start, w.end]) {
      const d = distance(p, q);
      if (d <= bestD) {
        bestD = d;
        best = q;
      }
    }
  }
  return best;
}
