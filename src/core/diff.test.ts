import { describe, expect, it } from 'vitest';
import {
  addOpening,
  addWall,
  applyCommand,
  deleteWall,
  setRoomMeta,
  setWallProps,
  type Command,
} from './commands';
import { detectRooms } from './geometry/roomDetection';
import { diffPlans } from './diff';
import { createEmptyPlan, type Plan } from './types';

/** 4 × 3 room drawn counter-clockwise, so side A of every wall faces inside. */
function room(): Plan {
  let p = createEmptyPlan();
  const pts = [
    [0, 0],
    [4, 0],
    [4, 3],
    [0, 3],
  ] as const;
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length] ?? [0, 0];
    p = applyCommand(p, addWall(`w${i}`, { x, y }, { x: nx, y: ny }));
  });
  return p;
}

const run = (p: Plan, ...cmds: (Command | null)[]) =>
  cmds.reduce<Plan>((acc, c) => (c ? applyCommand(acc, c) : acc), p);

describe('diffPlans', () => {
  it('reports nothing for identical plans', () => {
    expect(diffPlans(room(), room())).toEqual([]);
  });

  it('detects a floor change with area, perimeter and door widths', () => {
    const base = run(
      room(),
      addOpening({
        id: 'd',
        wallId: 'w0',
        type: 'door',
        offset: 2,
        width: 0.9,
        height: 2.03,
        sillHeight: 0,
      }),
    );
    const key = detectRooms(base.walls)[0]?.key ?? '';
    const planned = run(
      base,
      setRoomMeta(null, { key, name: 'Den', floorMaterial: 'oak-hardwood' }),
    );
    const events = diffPlans(base, planned);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'floorChanged',
      roomName: 'Den',
      from: null,
      to: 'oak-hardwood',
      area: 12,
      perimeter: 14,
      doorWidths: [0.9],
    });
  });

  it('ignores an unchanged floor', () => {
    const key = detectRooms(room().walls)[0]?.key ?? '';
    const base = run(
      room(),
      setRoomMeta(null, { key, name: 'Den', floorMaterial: 'oak-hardwood' }),
    );
    expect(diffPlans(base, base)).toEqual([]);
  });

  it('detects painted wall sides with the facing room', () => {
    const base = room();
    const planned = run(base, setWallProps(base, 'w0', { finishA: 'paint-sage' }));
    const events = diffPlans(base, planned);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e?.type).toBe('wallPainted');
    if (e?.type !== 'wallPainted') return;
    expect(e.side).toBe('a');
    expect(e.shares).toHaveLength(1);
    expect(e.shares[0]?.roomKey).not.toBeNull();
    expect(e.shares[0]?.area).toBeCloseTo(9.76); // 4 × 2.44 (default height)
  });

  it('detects added and removed walls and openings', () => {
    const base = room();
    const planned = run(
      base,
      addWall('div', { x: 2, y: 0 }, { x: 2, y: 3 }),
      addOpening({
        id: 'win',
        wallId: 'w1',
        type: 'window',
        offset: 1.5,
        width: 1,
        height: 1.2,
        sillHeight: 0.9,
      }),
    );
    const types = diffPlans(base, planned)
      .map((e) => e.type)
      .sort();
    expect(types).toEqual(['openingAdded', 'wallAdded']);

    const removed = run(base, deleteWall(base, 'w3'));
    expect(diffPlans(base, removed).map((e) => e.type)).toEqual(['wallRemoved']);
  });

  it('does not report openings removed together with their wall', () => {
    const base = run(
      room(),
      addOpening({
        id: 'd',
        wallId: 'w0',
        type: 'door',
        offset: 2,
        width: 0.9,
        height: 2.03,
        sillHeight: 0,
      }),
    );
    const planned = run(base, deleteWall(base, 'w0'));
    expect(diffPlans(base, planned).map((e) => e.type)).toEqual(['wallRemoved']);
  });

  it('treats a moved wall as removed + added', () => {
    const base = room();
    const moved: Plan = {
      ...base,
      walls: base.walls.map((w) =>
        w.id === 'w1' ? { ...w, start: { x: 5, y: 0 }, end: { x: 5, y: 3 } } : w,
      ),
    };
    const types = diffPlans(base, moved).map((e) => e.type);
    expect(types).toContain('wallAdded');
    expect(types).toContain('wallRemoved');
  });
});

describe('diffPlans: furniture', () => {
  const sofa = { id: 'f1', modelId: 'sofa', position: { x: 2, y: 1.5 }, rotation: 0 };
  const chair = { id: 'f2', modelId: 'dining-chair', position: { x: 1, y: 1 }, rotation: 0 };

  it('reports new furniture with its room and size factor', () => {
    const base = room();
    const rooms = detectRooms(base.walls);
    const named = run(base, setRoomMeta(null, { key: rooms[0]?.key ?? '', name: 'Living' }));
    const planned: Plan = {
      ...named,
      furniture: [sofa, { ...chair, size: { width: 0.9, depth: 1.04, height: 0.9 } }],
    };
    const events = diffPlans(named, planned).filter((e) => e.type === 'furnitureAdded');
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: 'furnitureAdded',
      itemId: 'f1',
      modelId: 'sofa',
      sizeFactor: 1,
      roomName: 'Living',
    });
    expect(events[1]).toMatchObject({ itemId: 'f2' });
    if (events[1]?.type === 'furnitureAdded') expect(events[1].sizeFactor).toBeGreaterThan(1);
  });

  it('ignores furniture that was already there, moved or removed', () => {
    const base: Plan = { ...room(), furniture: [sofa, chair] };
    const planned: Plan = { ...base, furniture: [{ ...sofa, position: { x: 1, y: 1 } }] };
    expect(diffPlans(base, planned).filter((e) => e.type === 'furnitureAdded')).toEqual([]);
  });
});
