import type { Vec2 } from '@/core/types';
import { PX_PER_METRE } from './constants';

/** Screen transform: plan metres (y = north, up) → canvas pixels (y down). */
export interface View {
  /** Screen position of the plan origin. */
  ox: number;
  oy: number;
  /** Pixels per metre. */
  s: number;
}

export function makeView(width: number, height: number, pan: Vec2, zoom: number): View {
  return { ox: width / 2 + pan.x, oy: height / 2 + pan.y, s: PX_PER_METRE * zoom };
}

export const toScreen = (p: Vec2, v: View): Vec2 => ({ x: v.ox + p.x * v.s, y: v.oy - p.y * v.s });
export const toWorld = (p: Vec2, v: View): Vec2 => ({
  x: (p.x - v.ox) / v.s,
  y: (v.oy - p.y) / v.s,
});

/** Flattens points into Konva's [x0, y0, x1, y1, …] format in screen space. */
export const flat = (pts: readonly Vec2[], v: View): number[] =>
  pts.flatMap((p) => [v.ox + p.x * v.s, v.oy - p.y * v.s]);

export interface Bounds {
  min: Vec2;
  max: Vec2;
}

export function boundsOf(points: readonly Vec2[]): Bounds | null {
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    min: { x: Math.min(...xs), y: Math.min(...ys) },
    max: { x: Math.max(...xs), y: Math.max(...ys) },
  };
}

/** Zoom + pan that fit `b` inside a width × height canvas with `padding` px. */
export function fitView(
  b: Bounds,
  width: number,
  height: number,
  padding = 80,
  limits: { min: number; max: number } = { min: 0.25, max: 4 },
): { zoom: number; pan: Vec2 } {
  const w = Math.max(b.max.x - b.min.x, 0.5);
  const h = Math.max(b.max.y - b.min.y, 0.5);
  const s = Math.min((width - padding * 2) / w, (height - padding * 2) / h);
  const zoom = Math.min(limits.max, Math.max(limits.min, s / PX_PER_METRE));
  const cx = (b.min.x + b.max.x) / 2;
  const cy = (b.min.y + b.max.y) / 2;
  const sp = PX_PER_METRE * zoom;
  return { zoom, pan: { x: -cx * sp, y: cy * sp } };
}
