import { describe, expect, it } from 'vitest';
import { createEmptyPlan, type Opening, type Plan } from '../types';
import {
  addOpening,
  addWall,
  applyCommand,
  deleteOpening,
  deleteWall,
  describeCommand,
  invertCommand,
  moveCorner,
  moveOpening,
  setOpeningProps,
  setRoomMeta,
  setWallLength,
  setWallProps,
  translateWall,
  type Command,
} from './index';

/** Unwraps a builder result, failing the test if it is null. */
function must(cmd: Command | null): Command {
  if (!cmd) throw new Error('expected a command');
  return cmd;
}

const door: Opening = {
  id: 'd1',
  wallId: 'w1',
  type: 'door',
  offset: 2,
  width: 0.9,
  height: 2.03,
  sillHeight: 0,
};

/** Two walls meeting at (4,0), with a door on w1. */
function basePlan(): Plan {
  let plan = createEmptyPlan();
  plan = applyCommand(plan, addWall('w1', { x: 0, y: 0 }, { x: 4, y: 0 }));
  plan = applyCommand(plan, addWall('w2', { x: 4, y: 0 }, { x: 4, y: 3 }));
  plan = applyCommand(plan, addOpening(door));
  return plan;
}

/** apply → invert must restore the exact original plan. */
function expectRoundTrip(plan: Plan, cmd: Command | null) {
  expect(cmd).not.toBeNull();
  if (!cmd) return;
  const after = applyCommand(plan, cmd);
  expect(after).not.toEqual(plan);
  const restored = applyCommand(after, invertCommand(cmd));
  expect(restored).toEqual(plan);
  // JSON round-trip: commands must be serializable for sync.
  expect(JSON.parse(JSON.stringify(cmd))).toEqual(cmd);
}

describe('commands', () => {
  it('adds a wall with default thickness and height', () => {
    const plan = applyCommand(createEmptyPlan(), addWall('w', { x: 0, y: 0 }, { x: 1, y: 0 }));
    expect(plan.walls[0]).toMatchObject({ thickness: 0.15, height: 2.44 });
  });

  it('does not mutate the input plan', () => {
    const plan = basePlan();
    const frozen = JSON.stringify(plan);
    applyCommand(plan, must(setWallProps(plan, 'w1', { thickness: 0.3 })));
    expect(JSON.stringify(plan)).toBe(frozen);
  });

  it('round-trips addWall', () =>
    expectRoundTrip(basePlan(), addWall('w3', { x: 0, y: 0 }, { x: 0, y: 3 })));

  it('deleteWall removes its openings and restores them on undo', () => {
    const plan = basePlan();
    const cmd = deleteWall(plan, 'w1');
    const after = applyCommand(plan, must(cmd));
    expect(after.walls.map((w) => w.id)).toEqual(['w2']);
    expect(after.openings).toEqual([]);
    expectRoundTrip(plan, cmd);
  });

  it('round-trips setWallProps, including clearing optional fields', () => {
    let plan = basePlan();
    expectRoundTrip(plan, setWallProps(plan, 'w1', { thickness: 0.2, finishA: 'paint-white' }));
    plan = applyCommand(plan, must(setWallProps(plan, 'w1', { finishA: 'paint-white' })));
    const clear = setWallProps(plan, 'w1', { finishA: null });
    expect(applyCommand(plan, must(clear)).walls[0]).not.toHaveProperty('finishA');
    expectRoundTrip(plan, clear);
  });

  it('moves a shared corner on every wall that touches it', () => {
    const plan = basePlan();
    const cmd = moveCorner(plan, { x: 4, y: 0 }, { x: 5, y: 0 });
    const after = applyCommand(plan, must(cmd));
    expect(after.walls[0]?.end).toEqual({ x: 5, y: 0 });
    expect(after.walls[1]?.start).toEqual({ x: 5, y: 0 });
    expectRoundTrip(plan, cmd);
  });

  it('translates a wall and drags connected corners', () => {
    const plan = basePlan();
    const cmd = translateWall(plan, 'w2', { x: 1, y: 0 });
    const after = applyCommand(plan, must(cmd));
    expect(after.walls[1]).toMatchObject({ start: { x: 5, y: 0 }, end: { x: 5, y: 3 } });
    expect(after.walls[0]?.end).toEqual({ x: 5, y: 0 });
    expectRoundTrip(plan, cmd);
  });

  it('keeps T-junction dividers attached when their host wall moves', () => {
    // Rectangle 0..6 × 0..4 with a divider from the middle of the bottom wall.
    let plan = createEmptyPlan();
    plan = applyCommand(plan, addWall('b', { x: 0, y: 0 }, { x: 6, y: 0 }));
    plan = applyCommand(plan, addWall('r', { x: 6, y: 0 }, { x: 6, y: 4 }));
    plan = applyCommand(plan, addWall('m', { x: 3, y: 0 }, { x: 3, y: 4 }));

    // Moving the bottom wall down by 1 drags the divider's foot with it.
    const move = must(translateWall(plan, 'b', { x: 0, y: -1 }));
    const after = applyCommand(plan, move);
    expect(after.walls.find((w) => w.id === 'm')?.start).toEqual({ x: 3, y: -1 });
    expectRoundTrip(plan, move);

    // Moving the corner (6,0) to (6,-2) slides the foot to the same fraction along the wall.
    const corner = must(moveCorner(plan, { x: 6, y: 0 }, { x: 6, y: -2 }));
    expect(applyCommand(plan, corner).walls.find((w) => w.id === 'm')?.start).toEqual({
      x: 3,
      y: -1,
    });
  });

  it('sets a wall length along its direction', () => {
    const plan = basePlan();
    const cmd = setWallLength(plan, 'w1', 6);
    expect(applyCommand(plan, must(cmd)).walls[0]?.end).toEqual({ x: 6, y: 0 });
    expectRoundTrip(plan, cmd);
  });

  it('round-trips opening commands', () => {
    const plan = basePlan();
    expectRoundTrip(plan, addOpening({ ...door, id: 'd2', offset: 3.2 }));
    expectRoundTrip(plan, deleteOpening(plan, 'd1'));
    expectRoundTrip(plan, moveOpening(plan, 'd1', 1));
    expectRoundTrip(plan, setOpeningProps(plan, 'd1', { width: 0.8, swing: 'b' }));
  });

  it('round-trips room meta, including re-keying', () => {
    let plan = basePlan();
    expectRoundTrip(plan, setRoomMeta(null, { key: 'a|b', name: 'Kitchen' }));
    plan = applyCommand(plan, setRoomMeta(null, { key: 'a|b', name: 'Kitchen' }));
    const rekey = setRoomMeta({ key: 'a|b', name: 'Kitchen' }, { key: 'a|b|c', name: 'Kitchen' });
    expect(applyCommand(plan, rekey).rooms).toEqual([{ key: 'a|b|c', name: 'Kitchen' }]);
    expectRoundTrip(plan, rekey);
  });

  it('round-trips furniture commands', () => {
    const plan = basePlan();
    const item = { id: 'f1', modelId: 'sofa', position: { x: 1, y: 1 }, rotation: 0 };
    expectRoundTrip(plan, { type: 'addFurniture', item });
    const withItem = applyCommand(plan, { type: 'addFurniture', item });
    expectRoundTrip(withItem, { type: 'deleteFurniture', item, index: 0 });
    expectRoundTrip(withItem, {
      type: 'setFurnitureProps',
      itemId: 'f1',
      from: { rotation: 0 },
      to: { rotation: Math.PI / 2 },
    });
  });

  it('describes commands for the undo menu', () => {
    expect(describeCommand(addWall('w', { x: 0, y: 0 }, { x: 1, y: 0 }))).toBe('Add wall');
    expect(describeCommand(must(moveCorner(basePlan(), { x: 4, y: 0 }, { x: 5, y: 0 })))).toBe(
      'Move corner',
    );
  });
});
