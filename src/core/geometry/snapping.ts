import type { Vec2 } from '../types';
import { add, angle, distance, fromAngle, projectOntoSegment, sub } from './vec2';

export const DEFAULT_GRID = 0.1;
export const DEFAULT_ENDPOINT_RADIUS = 0.2;
export const DEFAULT_ANGLE_STEP_DEG = 15;

/** Rounds away floating-point noise (e.g. 0.30000000000000004 → 0.3). */
const clean = (n: number): number => Math.round(n * 1e6) / 1e6 || 0;

export function snapToGrid(p: Vec2, grid = DEFAULT_GRID): Vec2 {
  return { x: clean(Math.round(p.x / grid) * grid), y: clean(Math.round(p.y / grid) * grid) };
}

/** Nearest candidate within `radius`, or null. */
export function snapToPoints(
  p: Vec2,
  points: readonly Vec2[],
  radius = DEFAULT_ENDPOINT_RADIUS,
): Vec2 | null {
  let best: Vec2 | null = null;
  let bestD = radius;
  for (const q of points) {
    const d = distance(p, q);
    if (d <= bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

/**
 * Snaps the direction anchor→p to the nearest multiple of `stepDeg`,
 * and the length to the grid.
 */
export function snapAngle(
  anchor: Vec2,
  p: Vec2,
  stepDeg = DEFAULT_ANGLE_STEP_DEG,
  grid = DEFAULT_GRID,
): Vec2 {
  const d = sub(p, anchor);
  const step = (stepDeg * Math.PI) / 180;
  const a = Math.round(angle(d) / step) * step;
  const len = Math.round(Math.hypot(d.x, d.y) / grid) * grid;
  const out = add(anchor, fromAngle(a, len));
  return { x: clean(out.x), y: clean(out.y) };
}

export interface SnapSegment {
  start: Vec2;
  end: Vec2;
}

export interface SnapOptions {
  grid?: number;
  endpointRadius?: number;
  wallRadius?: number;
  angleStepDeg?: number;
  /** Start of the wall being drawn; enables angle snapping. */
  anchor?: Vec2 | null;
  /** False while Shift is held. */
  angleSnap?: boolean;
  endpoints?: readonly Vec2[];
  walls?: readonly SnapSegment[];
}

export type SnapKind = 'endpoint' | 'wall' | 'angle' | 'grid';

export interface SnapResult {
  point: Vec2;
  kind: SnapKind;
}

/**
 * Snap priority: existing endpoint › angle (while drawing) › onto a wall › grid.
 */
export function snapPoint(p: Vec2, opts: SnapOptions = {}): SnapResult {
  const {
    grid = DEFAULT_GRID,
    endpointRadius = DEFAULT_ENDPOINT_RADIUS,
    wallRadius = endpointRadius,
    angleStepDeg = DEFAULT_ANGLE_STEP_DEG,
    anchor = null,
    angleSnap = true,
    endpoints = [],
    walls = [],
  } = opts;

  const endpoint = snapToPoints(p, endpoints, endpointRadius);
  if (endpoint) return { point: endpoint, kind: 'endpoint' };

  if (anchor && angleSnap) {
    return { point: snapAngle(anchor, p, angleStepDeg, grid), kind: 'angle' };
  }

  let bestWall: Vec2 | null = null;
  let bestD = wallRadius;
  for (const w of walls) {
    const proj = projectOntoSegment(p, w.start, w.end);
    if (proj.distance <= bestD) {
      bestD = proj.distance;
      bestWall = proj.point;
    }
  }
  if (bestWall) return { point: bestWall, kind: 'wall' };

  return { point: snapToGrid(p, grid), kind: 'grid' };
}
