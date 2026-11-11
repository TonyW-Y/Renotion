import type { Opening, Vec2, Wall } from '../types';
import { add, distance, normalize, perp, projectOntoSegment, scale, sub } from './vec2';
import type { EndpointJoins } from './wallGraph';

export const wallLength = (w: Pick<Wall, 'start' | 'end'>): number => distance(w.start, w.end);

export const wallDirection = (w: Pick<Wall, 'start' | 'end'>): Vec2 =>
  normalize(sub(w.end, w.start));

/**
 * The wall's rectangular outline in plan. Joined ends are extended by half the
 * thickness so that corners close cleanly without CSG.
 * Order: start-left, end-left, end-right, start-right (left = side A).
 */
export function wallFootprint(
  w: Pick<Wall, 'start' | 'end' | 'thickness'>,
  joins: EndpointJoins = { start: false, end: false },
): [Vec2, Vec2, Vec2, Vec2] {
  const dir = wallDirection(w);
  const half = w.thickness / 2;
  const n = scale(perp(dir), half);
  const s = sub(w.start, scale(dir, joins.start ? half : 0));
  const e = add(w.end, scale(dir, joins.end ? half : 0));
  return [add(s, n), add(e, n), sub(e, n), sub(s, n)];
}

/** Minimum clearance between an opening and a wall end or another opening (m). */
export const OPENING_MARGIN = 0.05;

export interface OpeningSpan {
  /** Distance from wall.start to the opening's near / far edge. */
  from: number;
  to: number;
  start: Vec2;
  end: Vec2;
}

export function openingSpan(
  o: Pick<Opening, 'offset' | 'width'>,
  w: Pick<Wall, 'start' | 'end'>,
): OpeningSpan {
  const dir = wallDirection(w);
  const from = o.offset - o.width / 2;
  const to = o.offset + o.width / 2;
  return { from, to, start: add(w.start, scale(dir, from)), end: add(w.start, scale(dir, to)) };
}

/** Distance along the wall from its start to the projection of p. */
export function offsetAlongWall(p: Vec2, w: Pick<Wall, 'start' | 'end'>): number {
  return projectOntoSegment(p, w.start, w.end).t * wallLength(w);
}

/**
 * Clamps a desired opening centre so the opening stays inside the wall.
 * Returns null if the opening is wider than the wall allows.
 */
export function clampOpeningOffset(
  offset: number,
  width: number,
  length: number,
  margin = OPENING_MARGIN,
): number | null {
  const min = width / 2 + margin;
  const max = length - width / 2 - margin;
  if (min > max + 1e-9) return null;
  return Math.min(max, Math.max(min, offset));
}

/** True if the candidate fits within the wall and doesn't overlap the other openings. */
export function canPlaceOpening(
  candidate: Pick<Opening, 'id' | 'offset' | 'width'>,
  wall: Pick<Wall, 'start' | 'end'>,
  openings: readonly Pick<Opening, 'id' | 'wallId' | 'offset' | 'width'>[],
  wallId: string,
  margin = OPENING_MARGIN,
): boolean {
  const len = wallLength(wall);
  const from = candidate.offset - candidate.width / 2;
  const to = candidate.offset + candidate.width / 2;
  if (from < margin - 1e-9 || to > len - margin + 1e-9) return false;
  return openings.every((o) => {
    if (o.wallId !== wallId || o.id === candidate.id) return true;
    const oFrom = o.offset - o.width / 2;
    const oTo = o.offset + o.width / 2;
    return to + margin <= oFrom + 1e-9 || from >= oTo + margin - 1e-9;
  });
}

/**
 * Widest this opening can be, centred where it is now, without leaving the
 * wall or touching a neighbouring opening.
 */
export function maxOpeningWidth(
  o: Pick<Opening, 'id' | 'offset'>,
  wall: Pick<Wall, 'start' | 'end'>,
  openings: readonly Pick<Opening, 'id' | 'wallId' | 'offset' | 'width'>[],
  wallId: string,
  margin = OPENING_MARGIN,
): number {
  let left = margin;
  let right = wallLength(wall) - margin;
  for (const other of openings) {
    if (other.wallId !== wallId || other.id === o.id) continue;
    if (other.offset < o.offset) left = Math.max(left, other.offset + other.width / 2 + margin);
    else right = Math.min(right, other.offset - other.width / 2 - margin);
  }
  return Math.max(0, 2 * Math.min(o.offset - left, right - o.offset));
}
