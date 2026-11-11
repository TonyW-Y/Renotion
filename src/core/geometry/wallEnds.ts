import type { ID, Vec2 } from '../types';
import { add, cross, distance, dot, normalize, perp, projectOntoSegment, scale, sub } from './vec2';
import { NODE_TOLERANCE } from './wallGraph';

export interface WallLikeWithThickness {
  id: ID;
  start: Vec2;
  end: Vec2;
  thickness: number;
}

/**
 * How far each side of a wall end reaches beyond the endpoint, along the wall
 * (metres; negative = stops short). Side A is left of start→end.
 */
export interface EndCut {
  a: number;
  b: number;
  /** True if the end meets another wall (its end face is buried and never seen). */
  joined: boolean;
}

export interface WallEndCuts {
  start: EndCut;
  end: EndCut;
}

const FREE: EndCut = { a: 0, b: 0, joined: false };
const PARALLEL = 1e-3;
/** Mitres longer than this many thicknesses fall back to a plain extension. */
const MAX_MITRE = 3;

const dirOf = (w: WallLikeWithThickness) => normalize(sub(w.end, w.start));
const parallel = (u: Vec2, v: Vec2) => Math.abs(cross(u, v)) < PARALLEL;

/**
 * Distance along `d1` (from p) at which the line `p + o + t·d1` meets the line
 * `q + o2 + s·d2`, or null if they're parallel.
 */
function meet(p: Vec2, o: Vec2, d1: Vec2, q: Vec2, o2: Vec2, d2: Vec2): number | null {
  const den = cross(d1, d2);
  if (Math.abs(den) < PARALLEL) return null;
  return cross(sub(add(q, o2), add(p, o)), d2) / den;
}

/**
 * Computes clean joints for 3D walls so that no two solid walls overlap:
 * - L corners are mitred (each side stops on the neighbour's matching face),
 * - T-junction stems butt against the near face of the wall they meet,
 * - collinear walls butt end to end,
 * - anything more complex extends by half the thickness (old behaviour).
 *
 * Because nothing overlaps, no two visible faces are ever coplanar, which is
 * what made corners flicker (z-fight) as the camera moved.
 */
export function wallEndCuts(
  walls: readonly WallLikeWithThickness[],
  tol = NODE_TOLERANCE,
): Map<ID, WallEndCuts> {
  const touching = (p: Vec2, self: WallLikeWithThickness) =>
    walls.filter((o) => o !== self && projectOntoSegment(p, o.start, o.end).distance <= tol);
  const atEndpoint = (p: Vec2, o: WallLikeWithThickness) =>
    distance(p, o.start) <= tol || distance(p, o.end) <= tol;

  function cut(w: WallLikeWithThickness, which: 'start' | 'end'): EndCut {
    const p = w[which];
    const others = touching(p, w);
    if (others.length === 0) return FREE;

    const dir = dirOf(w);
    const half = w.thickness / 2;
    const fallback: EndCut = { a: half, b: half, joined: true };
    // Direction pointing from the endpoint into this wall.
    const d1 = which === 'start' ? dir : scale(dir, -1);
    const sides = { a: scale(perp(dir), half), b: scale(perp(dir), -half) };

    // Part of a straight run: butt end to end; stems butt against us.
    if (others.some((o) => parallel(dirOf(o), dir))) return { a: 0, b: 0, joined: true };

    const n = others[0];
    if (!n) return fallback;
    const nDir = dirOf(n);
    // Several neighbours only work if they form one straight run (a T at their joint).
    if (others.some((o) => !parallel(dirOf(o), nDir))) return fallback;
    const nHalf = n.thickness / 2;
    const nNormal = perp(nDir);
    const limit = MAX_MITRE * Math.max(half, nHalf);

    // Does the neighbour run straight through this point (alone or as a pair)?
    const nIsThrough =
      !atEndpoint(p, n) || touching(p, n).some((o) => o !== w && parallel(dirOf(o), nDir));

    const result: EndCut = { a: 0, b: 0, joined: true };
    for (const side of ['a', 'b'] as const) {
      const o = sides[side];
      let t: number | null;
      if (nIsThrough) {
        // T stem: stop at the neighbour's face nearest to us.
        const near = scale(nNormal, dot(nNormal, d1) > 0 ? nHalf : -nHalf);
        t = meet(p, o, d1, n.start, near, nDir);
      } else {
        // L corner: pair the inner sides together and the outer sides together.
        const d2 = distance(p, n.start) <= tol ? nDir : scale(nDir, -1);
        const inner = dot(o, d2) > 0;
        const towardUs = dot(nNormal, d1) > 0;
        const o2 = scale(nNormal, inner === towardUs ? nHalf : -nHalf);
        t = meet(p, o, d1, p, o2, d2);
      }
      if (t === null || Math.abs(t) > limit) return fallback;
      result[side] = -t;
    }
    return result;
  }

  return new Map(walls.map((w) => [w.id, { start: cut(w, 'start'), end: cut(w, 'end') }]));
}
