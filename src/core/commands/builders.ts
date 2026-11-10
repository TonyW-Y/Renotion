import { distance } from '../geometry/vec2';
import { NODE_TOLERANCE } from '../geometry/wallGraph';
import { wallDirection } from '../geometry/walls';
import {
  DEFAULT_WALL_HEIGHT,
  DEFAULT_WALL_THICKNESS,
  type ID,
  type Opening,
  type Plan,
  type RoomMeta,
  type Vec2,
  type Wall,
} from '../types';
import type { Command, OpeningPatch, WallPatch } from './types';

/** Captures the current values of the patched keys (missing → null) for inversion. */
function snapshot<P extends object>(obj: object, to: P): P {
  const src = obj as Record<string, unknown>;
  const from: Record<string, unknown> = {};
  for (const k of Object.keys(to)) from[k] = k in src ? src[k] : null;
  return from as P;
}

export function addWall(
  id: ID,
  start: Vec2,
  end: Vec2,
  props: Partial<Pick<Wall, 'thickness' | 'height'>> = {},
): Command {
  return {
    type: 'addWall',
    wall: {
      id,
      start: { ...start },
      end: { ...end },
      thickness: props.thickness ?? DEFAULT_WALL_THICKNESS,
      height: props.height ?? DEFAULT_WALL_HEIGHT,
    },
  };
}

export function deleteWall(plan: Plan, wallId: ID): Command | null {
  const index = plan.walls.findIndex((w) => w.id === wallId);
  const wall = plan.walls[index];
  if (!wall) return null;
  const openings = plan.openings
    .map((opening, i) => ({ opening, index: i }))
    .filter((o) => o.opening.wallId === wallId);
  return { type: 'deleteWall', wall, index, openings };
}

export function setWallProps(plan: Plan, wallId: ID, to: WallPatch): Command | null {
  const wall = plan.walls.find((w) => w.id === wallId);
  if (!wall) return null;
  return { type: 'setWallProps', wallId, from: snapshot(wall, to), to };
}

/** Moves every wall endpoint at `at` (a shared corner) to `to`. */
export function moveCorner(plan: Plan, at: Vec2, to: Vec2, tol = NODE_TOLERANCE): Command | null {
  const commands: Command[] = [];
  for (const w of plan.walls) {
    for (const endpoint of ['start', 'end'] as const) {
      if (distance(w[endpoint], at) <= tol) {
        commands.push({
          type: 'moveWallEndpoint',
          wallId: w.id,
          endpoint,
          from: { ...w[endpoint] },
          to: { ...to },
        });
      }
    }
  }
  if (commands.length === 0) return null;
  return commands.length === 1
    ? (commands[0] ?? null)
    : { type: 'batch', label: 'Move corner', commands };
}

/** Moves a whole wall by `delta`, dragging connected corners along. */
export function translateWall(plan: Plan, wallId: ID, delta: Vec2): Command | null {
  const wall = plan.walls.find((w) => w.id === wallId);
  if (!wall) return null;
  const moved = (p: Vec2) => ({ x: p.x + delta.x, y: p.y + delta.y });
  const commands = [
    moveCorner(plan, wall.start, moved(wall.start)),
    moveCorner(plan, wall.end, moved(wall.end)),
  ].filter((c): c is Command => c !== null);
  return { type: 'batch', label: 'Move wall', commands };
}

/** Changes a wall's length by moving its end corner along its direction. */
export function setWallLength(plan: Plan, wallId: ID, length: number): Command | null {
  const wall = plan.walls.find((w) => w.id === wallId);
  if (!wall || length <= 0) return null;
  const dir = wallDirection(wall);
  const to = { x: wall.start.x + dir.x * length, y: wall.start.y + dir.y * length };
  const cmd = moveCorner(plan, wall.end, to);
  return cmd && cmd.type !== 'batch' ? cmd : cmd && { ...cmd, label: 'Resize wall' };
}

export function addOpening(opening: Opening): Command {
  return { type: 'addOpening', opening };
}

export function deleteOpening(plan: Plan, openingId: ID): Command | null {
  const index = plan.openings.findIndex((o) => o.id === openingId);
  const opening = plan.openings[index];
  return opening ? { type: 'deleteOpening', opening, index } : null;
}

export function moveOpening(plan: Plan, openingId: ID, offset: number): Command | null {
  const opening = plan.openings.find((o) => o.id === openingId);
  return opening ? { type: 'moveOpening', openingId, from: opening.offset, to: offset } : null;
}

export function setOpeningProps(plan: Plan, openingId: ID, to: OpeningPatch): Command | null {
  const opening = plan.openings.find((o) => o.id === openingId);
  return opening ? { type: 'setOpeningProps', openingId, from: snapshot(opening, to), to } : null;
}

export function deleteFurniture(plan: Plan, itemId: ID): Command | null {
  const index = plan.furniture.findIndex((f) => f.id === itemId);
  const item = plan.furniture[index];
  return item ? { type: 'deleteFurniture', item, index } : null;
}

/** Replaces `from` (possibly stored under an older key) with `to`. */
export function setRoomMeta(from: RoomMeta | null, to: RoomMeta | null): Command {
  return { type: 'setRoomMeta', from, to };
}
