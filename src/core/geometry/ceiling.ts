import type { Vec2 } from '../types';
import { pointInPolygon, signedArea, type Polygon } from './polygon';
import { add, cross, normalize, pointToSegmentDistance, scale, sub } from './vec2';

/**
 * Moves each edge of a polygon outwards by its own distance (edge i runs from
 * point i to point i + 1) and returns the new corners. Works for either
 * winding; corners where both edges stay put are unchanged.
 */
export function offsetEdges(poly: Polygon, dist: readonly number[]): Vec2[] {
  const n = poly.length;
  if (n < 3) return [...poly];
  const ccw = signedArea(poly) > 0;
  const edge = (i: number) => {
    const a = poly[i % n] ?? { x: 0, y: 0 };
    const b = poly[(i + 1) % n] ?? { x: 0, y: 0 };
    const d = normalize(sub(b, a));
    // Outward normal: right of the direction for CCW polygons, left for CW.
    const out = ccw ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
    const o = scale(out, dist[i % n] ?? 0);
    return { p: add(a, o), d };
  };
  return poly.map((corner, i) => {
    const prev = edge(i + n - 1);
    const next = edge(i);
    const den = cross(prev.d, next.d);
    if (Math.abs(den) < 1e-9) return add(corner, sub(next.p, corner));
    const t = cross(sub(next.p, prev.p), next.d) / den;
    return add(prev.p, scale(prev.d, t));
  });
}

interface WallLike {
  start: Vec2;
  end: Vec2;
  thickness: number;
}

/**
 * The outline of a room's ceiling. Rooms are traced along wall centre lines;
 * a ceiling sits on top of the walls, so along exterior walls it reaches the
 * wall's outer face, while along walls shared with another room it stops at
 * the centre line (where the neighbouring ceiling takes over).
 */
export function ceilingOutline(
  polygon: Polygon,
  rooms: readonly Polygon[],
  walls: readonly WallLike[],
): Vec2[] {
  const n = polygon.length;
  const ccw = signedArea(polygon) > 0;
  const dist = polygon.map((a, i) => {
    const b = polygon[(i + 1) % n] ?? a;
    const mid = scale(add(a, b), 0.5);
    const d = normalize(sub(b, a));
    const out = ccw ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
    const probe = add(mid, scale(out, 0.05));
    const shared = rooms.some((r) => r !== polygon && pointInPolygon(probe, r));
    if (shared) return 0;
    const wall = walls.find((w) => pointToSegmentDistance(mid, w.start, w.end) < 0.02);
    return wall ? wall.thickness / 2 : 0;
  });
  return offsetEdges(polygon, dist);
}
