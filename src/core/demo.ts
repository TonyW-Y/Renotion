import {
  addOpening,
  addWall,
  applyCommand,
  deleteFurniture,
  deleteWall,
  setFurnitureProps,
  setOpeningProps,
  setRoomMeta,
  setWallProps,
  type Command,
} from './commands';
import { pointInPolygon } from './geometry/polygon';
import { detectRooms } from './geometry/roomDetection';
import { clonePlan, createProject, type ProjectDoc } from './project';
import {
  createEmptyPlan,
  type FurnitureItem,
  type ID,
  type Opening,
  type Plan,
  type Vec2,
} from './types';

/*
 * A small sample home and a renovation of it, so a first-time visitor sees
 * every feature filled in: 2D plan, 3D model, estimate, schedule and budget.
 *
 *   y=7 ┌──────────────┬──────────┐
 *       │ Den          │ Bedroom  │
 *   y=4 ├─────────── ┐ │          │
 *       │ Living       ├──────────┤ y=3.5
 *       │              │ Kitchen  │
 *   y=0 └──────────────┴──────────┘
 *       x=0          x=6        x=10
 *
 * The renovation knocks out the living / kitchen wall for an open plan,
 * re-floors it, adds a brick accent wall, paints the bedroom, swaps two
 * doors, adds a plank ceiling and a kitchen island.
 */

const QUARTER = Math.PI / 2;

const run = (plan: Plan, cmds: readonly (Command | null)[]): Plan =>
  cmds.reduce<Plan>((p, c) => (c ? applyCommand(p, c) : p), plan);

/** Key of the room containing `p` (rooms are re-detected from the current walls). */
function roomKeyAt(plan: Plan, p: Vec2): string {
  const room = detectRooms(plan.walls).find((r) => pointInPolygon(p, r.polygon));
  if (!room) throw new Error(`demo: no room at ${String(p.x)}, ${String(p.y)}`);
  return room.key;
}

const door = (id: ID, wallId: ID, offset: number, width = 0.82): Opening => ({
  id,
  wallId,
  type: 'door',
  offset,
  width,
  height: 2.03,
  sillHeight: 0,
});

const window_ = (id: ID, wallId: ID, offset: number, width: number, height = 1.4): Opening => ({
  id,
  wallId,
  type: 'window',
  offset,
  width,
  height,
  sillHeight: 0.9,
});

const piece = (id: ID, modelId: string, x: number, y: number, rotation = 0): FurnitureItem => ({
  id,
  modelId,
  position: { x, y },
  rotation,
});

/** The home as it is today. */
function baselinePlan(): Plan {
  let plan = run(createEmptyPlan(), [
    // Exterior, counter-clockwise, so side A of each wall faces inside.
    addWall('w-south', { x: 0, y: 0 }, { x: 10, y: 0 }),
    addWall('w-east', { x: 10, y: 0 }, { x: 10, y: 7 }),
    addWall('w-north', { x: 10, y: 7 }, { x: 0, y: 7 }),
    addWall('w-west', { x: 0, y: 7 }, { x: 0, y: 0 }),
    // Interior.
    addWall('w-kitchen', { x: 6, y: 0 }, { x: 6, y: 3.5 }),
    addWall('w-bedroom-den', { x: 6, y: 3.5 }, { x: 6, y: 7 }),
    addWall('w-den', { x: 0, y: 4 }, { x: 6, y: 4 }),
    addWall('w-bedroom', { x: 6, y: 3.5 }, { x: 10, y: 3.5 }),
    // Openings.
    addOpening(door('o-front', 'w-south', 1.4, 0.92)),
    addOpening(window_('o-living', 'w-south', 4, 1.6)),
    addOpening(window_('o-kitchen', 'w-south', 8.1, 1.2, 1.1)),
    addOpening(window_('o-west', 'w-west', 5, 1.2)),
    addOpening(window_('o-bedroom', 'w-north', 2, 1.4)),
    addOpening(window_('o-den', 'w-north', 7, 1.6)),
    addOpening(window_('o-east', 'w-east', 5.4, 1)),
    addOpening(door('o-den-door', 'w-den', 5)),
    addOpening(door('o-kitchen-door', 'w-kitchen', 2.6)),
    addOpening(door('o-bedroom-door', 'w-bedroom-den', 1.3)),
  ]);

  const rooms: [Vec2, string, string][] = [
    [{ x: 3, y: 2 }, 'Living room', 'laminate-honey'],
    [{ x: 8, y: 1.7 }, 'Kitchen', 'ceramic-tile'],
    [{ x: 8, y: 5 }, 'Bedroom', 'carpet-sand'],
    [{ x: 3, y: 5.5 }, 'Den', 'laminate-natural'],
  ];
  for (const [at, name, floorMaterial] of rooms) {
    plan = applyCommand(plan, setRoomMeta(null, { key: roomKeyAt(plan, at), name, floorMaterial }));
  }

  const east = -QUARTER; // facing west, backs against the east wall
  const furniture = [
    piece('f-sofa', 'sofa', 3, 3.3),
    piece('f-rug', 'rug', 3, 2.1),
    piece('f-coffee', 'coffee-table', 3, 2.2),
    piece('f-tv', 'tv-stand', 3, 0.35, Math.PI),
    piece('f-plant', 'plant', 0.45, 3.55),
    piece('f-fridge', 'fridge', 9.55, 0.5, east),
    piece('f-stove', 'stove', 9.6, 1.4, east),
    piece('f-counter-1', 'base-cabinet', 9.62, 2.1, east),
    piece('f-counter-2', 'base-cabinet', 9.62, 2.7, east),
    piece('f-bed', 'double-bed', 8, 5.85),
    piece('f-night-1', 'nightstand', 6.85, 6.6),
    piece('f-night-2', 'nightstand', 9.15, 6.6),
    piece('f-desk', 'desk', 1.5, 6.5),
    piece('f-chair', 'office-chair', 1.5, 5.8, Math.PI),
    piece('f-books', 'bookshelf', 4.5, 6.7),
  ];
  return run(
    plan,
    furniture.map((item) => ({ type: 'addFurniture', item }) as const),
  );
}

/** The renovation, applied to a copy of the baseline. */
function plannedPlan(baseline: Plan): Plan {
  let plan = clonePlan(baseline);
  plan = run(plan, [
    // Open plan: the kitchen wall (and its door) go.
    deleteWall(plan, 'w-kitchen'),
  ]);
  const openKey = roomKeyAt(plan, { x: 3, y: 2 });
  const bedroomKey = roomKeyAt(plan, { x: 8, y: 5 });
  const meta = (key: string) => plan.rooms.find((r) => r.key === key) ?? null;

  plan = run(plan, [
    setRoomMeta(meta(openKey), {
      key: openKey,
      name: 'Kitchen & living',
      floorMaterial: 'herringbone-oak',
      ceilingMaterial: 'ceiling-wood-planks',
    }),
    setRoomMeta(meta(bedroomKey), {
      key: bedroomKey,
      name: 'Bedroom',
      floorMaterial: 'grey-oak',
    }),
    // Brick accent wall in the living area, sage bedroom.
    setWallProps(plan, 'w-west', { finishA: 'whitewashed-brick' }),
    setWallProps(plan, 'w-east', { finishA: 'paint-sage' }),
    setWallProps(plan, 'w-bedroom', { finishA: 'paint-sage' }),
    setWallProps(plan, 'w-bedroom-den', { finishB: 'paint-sage' }),
    // Doors and windows.
    setOpeningProps(plan, 'o-bedroom-door', { style: 'barn', color: '#3d4145' }),
    setOpeningProps(plan, 'o-front', { color: '#2f5d62' }),
    setOpeningProps(plan, 'o-living', { style: 'grid' }),
    // Furniture: a sectional replaces the sofa; an island joins the kitchen.
    deleteFurniture(plan, 'f-sofa'),
    setFurnitureProps(plan, 'f-coffee', { position: { x: 2.6, y: 1.55 } }),
    setFurnitureProps(plan, 'f-rug', { position: { x: 2.6, y: 1.9 } }),
  ]);
  const additions = [
    piece('f-sectional', 'sectional-sofa', 2.6, 2.95),
    piece('f-island', 'kitchen-island', 7.6, 1.8, QUARTER),
    piece('f-stool-1', 'bar-stool', 6.9, 1.2),
    piece('f-stool-2', 'bar-stool', 6.9, 1.8),
    piece('f-stool-3', 'bar-stool', 6.9, 2.4),
    piece('f-plant-2', 'plant', 5.6, 0.45),
  ];
  return run(
    plan,
    additions.map((item) => ({ type: 'addFurniture', item }) as const),
  );
}

/** A ready-to-explore sample project (a fresh id each time, so it can be edited freely). */
export function createDemoProject(id: ID, now = new Date().toISOString()): ProjectDoc {
  const baseline = baselinePlan();
  return {
    ...createProject(id, 'Demo: open-plan refresh', now),
    baseline,
    planned: plannedPlan(baseline),
    expenses: [
      {
        id: `${id}-deposit`,
        spentOn: now.slice(0, 10),
        description: 'Flooring deposit',
        category: 'flooring',
        roomKey: null,
        amount: 1500,
      },
    ],
  };
}
