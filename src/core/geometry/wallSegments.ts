import type { Opening, Wall } from '../types';
import type { EndpointJoins } from './wallGraph';
import { wallLength } from './walls';

export type WallBoxKind = 'full' | 'lintel' | 'sill';

/**
 * A solid box in wall-local coordinates:
 * u = distance along the wall from `start` (can be negative / > length at
 * joined ends), z = height above the floor. Depth is the wall thickness.
 */
export interface WallBox {
  kind: WallBoxKind;
  u0: number;
  u1: number;
  z0: number;
  z1: number;
}

const EPS = 1e-6;

/**
 * Splits a wall into solid boxes around its openings — full-height pieces
 * between openings, a lintel above each opening and a sill below each
 * window. No CSG needed. Joined ends are extended by half the thickness so
 * corners close.
 */
export function wallSegments(
  wall: Pick<Wall, 'start' | 'end' | 'thickness' | 'height'>,
  openings: readonly Pick<Opening, 'offset' | 'width' | 'height' | 'sillHeight'>[],
  joins: EndpointJoins = { start: false, end: false },
): WallBox[] {
  const len = wallLength(wall);
  const H = wall.height;
  const half = wall.thickness / 2;
  const startU = joins.start ? -half : 0;
  const endU = len + (joins.end ? half : 0);

  const spans = openings
    .map((o) => ({
      from: Math.max(0, o.offset - o.width / 2),
      to: Math.min(len, o.offset + o.width / 2),
      bottom: Math.max(0, o.sillHeight),
      top: Math.min(H, o.sillHeight + o.height),
    }))
    .filter((s) => s.to - s.from > EPS && s.top - s.bottom > EPS)
    .sort((a, b) => a.from - b.from);

  const boxes: WallBox[] = [];
  let cursor = startU;
  for (const s of spans) {
    const from = Math.max(s.from, cursor);
    if (from - cursor > EPS) boxes.push({ kind: 'full', u0: cursor, u1: from, z0: 0, z1: H });
    if (s.to - from > EPS) {
      if (H - s.top > EPS) boxes.push({ kind: 'lintel', u0: from, u1: s.to, z0: s.top, z1: H });
      if (s.bottom > EPS) boxes.push({ kind: 'sill', u0: from, u1: s.to, z0: 0, z1: s.bottom });
    }
    cursor = Math.max(cursor, s.to);
  }
  if (endU - cursor > EPS) boxes.push({ kind: 'full', u0: cursor, u1: endU, z0: 0, z1: H });
  return boxes;
}
