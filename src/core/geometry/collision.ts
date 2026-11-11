import type { Plan, Vec2 } from '../types';
import { projectOntoSegment } from './vec2';
import { wallLength } from './walls';

/**
 * True if a circular body of `radius` at `p` overlaps a solid part of any
 * wall. Door openings are passable; windows are not.
 */
export function blockedByWalls(plan: Plan, p: Vec2, radius: number): boolean {
  for (const w of plan.walls) {
    const proj = projectOntoSegment(p, w.start, w.end);
    if (proj.distance >= w.thickness / 2 + radius) continue;
    const u = proj.t * wallLength(w);
    const inDoor = plan.openings.some(
      (o) =>
        o.wallId === w.id &&
        o.type === 'door' &&
        u >= o.offset - o.width / 2 + radius * 0.5 &&
        u <= o.offset + o.width / 2 - radius * 0.5,
    );
    if (!inDoor) return true;
  }
  return false;
}

/** Moves from → to, sliding along walls instead of stopping dead. */
export function slideMove(plan: Plan, from: Vec2, to: Vec2, radius: number): Vec2 {
  if (!blockedByWalls(plan, to, radius)) return to;
  const xOnly = { x: to.x, y: from.y };
  if (!blockedByWalls(plan, xOnly, radius)) return xOnly;
  const yOnly = { x: from.x, y: to.y };
  if (!blockedByWalls(plan, yOnly, radius)) return yOnly;
  return from;
}

/* ------------------------------------------------------------------ */
/* Furniture footprints                                               */
/* ------------------------------------------------------------------ */

/** Corners of a w × d rectangle centred on `position`, rotated by `rotation` (radians, CCW). */
export function rectFootprint(
  position: Vec2,
  width: number,
  depth: number,
  rotation: number,
): Vec2[] {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const hw = width / 2;
  const hd = depth / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x = 0, y = 0]) => ({ x: position.x + x * c - y * s, y: position.y + x * s + y * c }));
}

function project(poly: readonly Vec2[], axis: Vec2): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

/**
 * Separating-axis test for two convex polygons. Touching edges (overlap
 * smaller than `eps`) do not count, so furniture can sit flush to a wall.
 */
export function convexPolygonsOverlap(a: readonly Vec2[], b: readonly Vec2[], eps = 1e-4): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      if (!p || !q) continue;
      const axis = { x: -(q.y - p.y), y: q.x - p.x };
      const len = Math.hypot(axis.x, axis.y);
      if (len < 1e-12) continue;
      const n = { x: axis.x / len, y: axis.y / len };
      const [aMin, aMax] = project(a, n);
      const [bMin, bMax] = project(b, n);
      if (aMax <= bMin + eps || bMax <= aMin + eps) return false;
    }
  }
  return true;
}

/** True if a (convex) furniture footprint overlaps the solid body of any wall. */
export function footprintIntersectsWalls(
  footprint: readonly Vec2[],
  plan: Pick<Plan, 'walls'>,
): boolean {
  return plan.walls.some((w) => {
    const dir = { x: w.end.x - w.start.x, y: w.end.y - w.start.y };
    const len = Math.hypot(dir.x, dir.y);
    if (len < 1e-9) return false;
    const center = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
    const wallRect = rectFootprint(center, len, w.thickness, Math.atan2(dir.y, dir.x));
    return convexPolygonsOverlap(footprint, wallRect);
  });
}
