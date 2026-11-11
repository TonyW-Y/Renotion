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
