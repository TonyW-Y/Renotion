import type { Vec2 } from '../types';
import { distance, pointToSegmentDistance } from './vec2';

export type Polygon = readonly Vec2[];

/** Shoelace signed area. Positive for counter-clockwise polygons. */
export function signedArea(poly: Polygon): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (!a || !b) continue;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export const area = (poly: Polygon): number => Math.abs(signedArea(poly));

export function perimeter(poly: Polygon): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (a && b) sum += distance(a, b);
  }
  return sum;
}

/** Area-weighted centroid. Falls back to the vertex average for degenerate polygons. */
export function centroid(poly: Polygon): Vec2 {
  const a = signedArea(poly);
  if (Math.abs(a) < 1e-12) {
    const n = poly.length || 1;
    return {
      x: poly.reduce((s, p) => s + p.x, 0) / n,
      y: poly.reduce((s, p) => s + p.y, 0) / n,
    };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (!p || !q) continue;
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Even-odd ray casting. Points exactly on the boundary may go either way. */
export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (!a || !b) continue;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToBoundary(p: Vec2, poly: Polygon): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (a && b) best = Math.min(best, pointToSegmentDistance(p, a, b));
  }
  return best;
}

/**
 * A good point to put a label: the centroid when it is comfortably inside,
 * otherwise the sampled interior point farthest from the boundary
 * (handles L- and U-shaped rooms).
 */
export function labelPoint(poly: Polygon, samples = 24): Vec2 {
  const c = centroid(poly);
  if (poly.length < 3) return c;

  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  let best = c;
  let bestD = pointInPolygon(c, poly) ? distanceToBoundary(c, poly) : -1;
  // Centroid is good enough if it's at least 40% as clear as the bbox half-size.
  const target = 0.4 * (Math.min(maxX - minX, maxY - minY) / 2);
  if (bestD >= target) return c;

  for (let i = 1; i < samples; i++) {
    for (let j = 1; j < samples; j++) {
      const p = {
        x: minX + ((maxX - minX) * i) / samples,
        y: minY + ((maxY - minY) * j) / samples,
      };
      if (!pointInPolygon(p, poly)) continue;
      const d = distanceToBoundary(p, poly);
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
  }
  return best;
}
