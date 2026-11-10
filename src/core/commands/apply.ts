import type { Opening, Plan, Wall } from '../types';
import type { Command, FurniturePatch, OpeningPatch, WallPatch } from './types';

/** Applies a patch; `null` deletes the key. Returns a new object. */
function patch<T extends object>(obj: T, p: object): T {
  const changes = Object.entries(p).filter(([, v]) => v !== undefined);
  const cleared = new Set(changes.filter(([, v]) => v === null).map(([k]) => k));
  const kept = Object.entries(obj).filter(([k]) => !cleared.has(k));
  return Object.fromEntries([...kept, ...changes.filter(([, v]) => v !== null)]) as T;
}

/** Inserts at `index` (or appends), returning a new array. */
function insertAt<T>(list: readonly T[], item: T, index?: number): T[] {
  if (index === undefined || index < 0 || index >= list.length) return [...list, item];
  return [...list.slice(0, index), item, ...list.slice(index)];
}

const patchWall = (w: Wall, p: WallPatch): Wall => patch(w, p);
const patchOpening = (o: Opening, p: OpeningPatch): Opening => patch(o, p);

/** Applies a command to a plan, returning a new plan (the input is not mutated). */
export function applyCommand(plan: Plan, cmd: Command): Plan {
  switch (cmd.type) {
    case 'addWall':
      return { ...plan, walls: insertAt(plan.walls, cmd.wall, cmd.index) };

    case 'deleteWall': {
      const openingIds = new Set(cmd.openings.map((o) => o.opening.id));
      return {
        ...plan,
        walls: plan.walls.filter((w) => w.id !== cmd.wall.id),
        openings: plan.openings.filter((o) => !openingIds.has(o.id)),
      };
    }

    case 'moveWallEndpoint':
      return {
        ...plan,
        walls: plan.walls.map((w) =>
          w.id === cmd.wallId ? { ...w, [cmd.endpoint]: { ...cmd.to } } : w,
        ),
      };

    case 'setWallProps':
      return {
        ...plan,
        walls: plan.walls.map((w) => (w.id === cmd.wallId ? patchWall(w, cmd.to) : w)),
      };

    case 'addOpening':
      return { ...plan, openings: insertAt(plan.openings, cmd.opening, cmd.index) };

    case 'deleteOpening':
      return { ...plan, openings: plan.openings.filter((o) => o.id !== cmd.opening.id) };

    case 'moveOpening':
      return {
        ...plan,
        openings: plan.openings.map((o) => (o.id === cmd.openingId ? { ...o, offset: cmd.to } : o)),
      };

    case 'setOpeningProps':
      return {
        ...plan,
        openings: plan.openings.map((o) => (o.id === cmd.openingId ? patchOpening(o, cmd.to) : o)),
      };

    case 'setRoomMeta': {
      const fromKey = cmd.from?.key;
      const rooms = plan.rooms.filter((r) => r.key !== fromKey && r.key !== cmd.to?.key);
      return { ...plan, rooms: cmd.to ? [...rooms, cmd.to] : rooms };
    }

    case 'addFurniture':
      return { ...plan, furniture: insertAt(plan.furniture, cmd.item, cmd.index) };

    case 'deleteFurniture':
      return { ...plan, furniture: plan.furniture.filter((f) => f.id !== cmd.item.id) };

    case 'setFurnitureProps':
      return {
        ...plan,
        furniture: plan.furniture.map((f) =>
          f.id === cmd.itemId ? patch(f, cmd.to satisfies FurniturePatch) : f,
        ),
      };

    case 'batch':
      return cmd.commands.reduce(applyCommand, plan);
  }
}

/** Returns the command that undoes `cmd`. */
export function invertCommand(cmd: Command): Command {
  switch (cmd.type) {
    case 'addWall':
      return { type: 'deleteWall', wall: cmd.wall, index: cmd.index ?? -1, openings: [] };
    case 'deleteWall':
      return {
        type: 'batch',
        label: 'Restore wall',
        commands: [
          { type: 'addWall', wall: cmd.wall, index: cmd.index },
          ...[...cmd.openings]
            .sort((a, b) => a.index - b.index)
            .map((o): Command => ({ type: 'addOpening', opening: o.opening, index: o.index })),
        ],
      };
    case 'moveWallEndpoint':
      return { ...cmd, from: cmd.to, to: cmd.from };
    case 'setWallProps':
      return { ...cmd, from: cmd.to, to: cmd.from };
    case 'addOpening':
      return { type: 'deleteOpening', opening: cmd.opening, index: cmd.index ?? -1 };
    case 'deleteOpening':
      return { type: 'addOpening', opening: cmd.opening, index: cmd.index };
    case 'moveOpening':
      return { ...cmd, from: cmd.to, to: cmd.from };
    case 'setOpeningProps':
      return { ...cmd, from: cmd.to, to: cmd.from };
    case 'setRoomMeta':
      return { type: 'setRoomMeta', from: cmd.to, to: cmd.from };
    case 'addFurniture':
      return { type: 'deleteFurniture', item: cmd.item, index: cmd.index ?? -1 };
    case 'deleteFurniture':
      return { type: 'addFurniture', item: cmd.item, index: cmd.index };
    case 'setFurnitureProps':
      return { ...cmd, from: cmd.to, to: cmd.from };
    case 'batch':
      return {
        type: 'batch',
        label: cmd.label,
        commands: cmd.commands.map(invertCommand).reverse(),
      };
  }
}

const LABELS: Record<Command['type'], string> = {
  addWall: 'Add wall',
  deleteWall: 'Delete wall',
  moveWallEndpoint: 'Move wall',
  setWallProps: 'Edit wall',
  addOpening: 'Add opening',
  deleteOpening: 'Delete opening',
  moveOpening: 'Move opening',
  setOpeningProps: 'Edit opening',
  setRoomMeta: 'Edit room',
  addFurniture: 'Add furniture',
  deleteFurniture: 'Delete furniture',
  setFurnitureProps: 'Edit furniture',
  batch: 'Edit',
};

/** Human-readable label, e.g. for "Undo Add wall". */
export function describeCommand(cmd: Command): string {
  return cmd.type === 'batch' ? cmd.label : LABELS[cmd.type];
}
