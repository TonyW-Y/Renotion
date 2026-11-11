import { pointInPolygon } from './geometry/polygon';
import { detectRooms } from './geometry/roomDetection';
import { distance, lerp } from './geometry/vec2';
import { wallLength } from './geometry/walls';
import { wallSideArea, wallSideRooms, type WallSides } from './estimate/quantities';
import { resolveRooms, type ResolvedRoom } from './rooms';
import type { ID, Opening, OpeningType, Plan, Wall } from './types';

export interface RoomRef {
  /** Room key in the planned plan, or null for the exterior. */
  roomKey: string | null;
  roomName: string;
}

export interface AreaShare extends RoomRef {
  area: number;
}

/**
 * What changed between the baseline (as-is) and planned plans.
 * Estimates and tasks are both derived from these events.
 */
export type ChangeEvent =
  | ({
      type: 'floorChanged';
      from: ID | null;
      to: ID;
      area: number;
      perimeter: number;
      doorWidths: number[];
    } & RoomRef)
  | {
      type: 'wallPainted';
      wallId: ID;
      side: 'a' | 'b';
      from: ID | null;
      to: ID;
      shares: AreaShare[];
    }
  | { type: 'wallAdded'; wallId: ID; length: number; height: number; shares: AreaShare[] }
  | ({ type: 'wallRemoved'; wallId: ID; length: number; height: number } & RoomRef)
  | ({ type: 'openingAdded'; openingId: ID; kind: OpeningType; width: number } & RoomRef)
  | ({ type: 'openingRemoved'; openingId: ID; kind: OpeningType; width: number } & RoomRef);

export type ChangeType = ChangeEvent['type'];

const EXTERIOR: RoomRef = { roomKey: null, roomName: 'Exterior' };
const MOVE_TOLERANCE = 0.01;

interface Derived {
  plan: Plan;
  rooms: ResolvedRoom[];
  sides: Map<ID, WallSides>;
  openingsByWall: Map<ID, Opening[]>;
}

function derive(plan: Plan): Derived {
  const rooms = resolveRooms(detectRooms(plan.walls), plan.rooms);
  const openingsByWall = new Map<ID, Opening[]>();
  for (const o of plan.openings)
    openingsByWall.set(o.wallId, [...(openingsByWall.get(o.wallId) ?? []), o]);
  return { plan, rooms, sides: wallSideRooms(plan, rooms), openingsByWall };
}

const sameGeometry = (a: Wall, b: Wall) =>
  distance(a.start, b.start) < MOVE_TOLERANCE && distance(a.end, b.end) < MOVE_TOLERANCE;

/** Planned room (or exterior) at a point. */
function roomAt(d: Derived, p: { x: number; y: number }): RoomRef {
  const r = d.rooms.find((x) => pointInPolygon(p, x.polygon));
  return r ? { roomKey: r.key, roomName: r.name } : EXTERIOR;
}

/** The planned room an opening on `wall` serves (prefers an interior side). */
function roomForWall(d: Derived, wallId: ID): RoomRef {
  const s = d.sides.get(wallId);
  const share = [...(s?.a ?? []), ...(s?.b ?? [])].find((x) => x.roomKey !== null);
  const room = share && d.rooms.find((r) => r.key === share.roomKey);
  return room ? { roomKey: room.key, roomName: room.name } : EXTERIOR;
}

function sideShares(d: Derived, wall: Wall, side: 'a' | 'b'): AreaShare[] {
  const area = wallSideArea(wall, d.openingsByWall.get(wall.id) ?? []);
  const shares = d.sides.get(wall.id)?.[side] ?? [{ roomKey: null, fraction: 1 }];
  return shares.map((s) => {
    const room = s.roomKey ? d.rooms.find((r) => r.key === s.roomKey) : undefined;
    return {
      roomKey: room?.key ?? null,
      roomName: room?.name ?? 'Exterior',
      area: area * s.fraction,
    };
  });
}

/** Diffs baseline → planned into change events. */
export function diffPlans(baseline: Plan, planned: Plan): ChangeEvent[] {
  const base = derive(baseline);
  const next = derive(planned);
  const events: ChangeEvent[] = [];

  // --- Floors: match each planned room to its baseline room (key or overlap).
  const baseAsMeta = base.rooms.map((r) => ({
    key: r.key,
    name: r.name,
    ...(r.meta?.floorMaterial ? { floorMaterial: r.meta.floorMaterial } : {}),
  }));
  const matched = resolveRooms(next.rooms, baseAsMeta);
  for (const [i, room] of next.rooms.entries()) {
    const to = room.meta?.floorMaterial;
    const from = matched[i]?.meta?.floorMaterial ?? null;
    if (!to || to === from) continue;
    const doorWidths = planned.openings
      .filter((o) => o.type === 'door' && room.wallIds.includes(o.wallId))
      .map((o) => o.width);
    events.push({
      type: 'floorChanged',
      roomKey: room.key,
      roomName: room.name,
      from,
      to,
      area: room.area,
      perimeter: room.perimeter,
      doorWidths,
    });
  }

  // --- Walls.
  const baseWalls = new Map(baseline.walls.map((w) => [w.id, w]));
  const nextWalls = new Map(planned.walls.map((w) => [w.id, w]));

  for (const w of planned.walls) {
    const old = baseWalls.get(w.id);
    const rebuilt = !old || !sameGeometry(old, w);
    if (rebuilt) {
      events.push({
        type: 'wallAdded',
        wallId: w.id,
        length: wallLength(w),
        height: w.height,
        shares: [...sideShares(next, w, 'a'), ...sideShares(next, w, 'b')],
      });
    }
    for (const side of ['a', 'b'] as const) {
      const key = side === 'a' ? 'finishA' : 'finishB';
      const to = w[key];
      const from = old && !rebuilt ? (old[key] ?? null) : null;
      if (to && to !== from) {
        events.push({
          type: 'wallPainted',
          wallId: w.id,
          side,
          from,
          to,
          shares: sideShares(next, w, side),
        });
      }
    }
  }

  for (const old of baseline.walls) {
    const now = nextWalls.get(old.id);
    if (now && sameGeometry(old, now)) continue;
    events.push({
      type: 'wallRemoved',
      wallId: old.id,
      length: wallLength(old),
      height: old.height,
      ...roomAt(next, lerp(old.start, old.end, 0.5)),
    });
  }

  // --- Openings.
  const baseOpenings = new Map(baseline.openings.map((o) => [o.id, o]));
  const nextOpenings = new Map(planned.openings.map((o) => [o.id, o]));
  const changed = (a: Opening, b: Opening) =>
    a.type !== b.type ||
    a.wallId !== b.wallId ||
    Math.abs(a.offset - b.offset) > MOVE_TOLERANCE ||
    Math.abs(a.width - b.width) > MOVE_TOLERANCE;

  for (const o of planned.openings) {
    const old = baseOpenings.get(o.id);
    if (old && !changed(old, o)) continue;
    events.push({
      type: 'openingAdded',
      openingId: o.id,
      kind: o.type,
      width: o.width,
      ...roomForWall(next, o.wallId),
    });
  }
  for (const o of baseline.openings) {
    const now = nextOpenings.get(o.id);
    if (now && !changed(o, now)) continue;
    // Openings that disappear with their wall are covered by the wall's removal.
    if (!now && !nextWalls.has(o.wallId)) continue;
    events.push({
      type: 'openingRemoved',
      openingId: o.id,
      kind: o.type,
      width: o.width,
      ...roomForWall(base, o.wallId),
    });
  }

  return events;
}
