import type { Vec2 } from '../types';

/** Default tolerance for geometric comparisons (metres). */
export const EPS = 1e-6;

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
/** 2D cross product (z component of a × b). Positive when b is counter-clockwise from a. */
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const lengthSq = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
/** Left-hand perpendicular (rotated +90°). */
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });
/** Angle of the vector in radians, in (-π, π]. */
export const angle = (a: Vec2): number => Math.atan2(a.y, a.x);
export const fromAngle = (rad: number, len = 1): Vec2 => ({
  x: Math.cos(rad) * len,
  y: Math.sin(rad) * len,
});
export const equals = (a: Vec2, b: Vec2, eps = EPS): boolean =>
  Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  return len < EPS ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
}

export function rotate(a: Vec2, rad: number): Vec2 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export interface Projection {
  /** Closest point on the segment. */
  point: Vec2;
  /** Parameter along a→b, clamped to [0, 1]. */
  t: number;
  /** Distance from p to `point`. */
  distance: number;
}

/** Projects p onto segment ab (clamped). */
export function projectOntoSegment(p: Vec2, a: Vec2, b: Vec2): Projection {
  const ab = sub(b, a);
  const lenSq = lengthSq(ab);
  const t = lenSq < EPS * EPS ? 0 : Math.min(1, Math.max(0, dot(sub(p, a), ab) / lenSq));
  const point = lerp(a, b, t);
  return { point, t, distance: distance(p, point) };
}

export const pointToSegmentDistance = (p: Vec2, a: Vec2, b: Vec2): number =>
  projectOntoSegment(p, a, b).distance;

export interface SegmentIntersection {
  point: Vec2;
  /** Parameter along the first segment. */
  t: number;
  /** Parameter along the second segment. */
  u: number;
}

/** Proper intersection of segments ab and cd, or null if parallel / disjoint. */
export function segmentIntersection(
  a: Vec2,
  b: Vec2,
  c: Vec2,
  d: Vec2,
): SegmentIntersection | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const denom = cross(r, s);
  if (Math.abs(denom) < EPS) return null;
  const ac = sub(c, a);
  const t = cross(ac, s) / denom;
  const u = cross(ac, r) / denom;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { point: lerp(a, b, t), t, u };
}
