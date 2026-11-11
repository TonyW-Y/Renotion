import { describe, expect, it } from 'vitest';
import {
  addOpening,
  addWall,
  applyCommand,
  setRoomMeta,
  setWallProps,
  type Command,
} from '../commands';
import { diffPlans } from '../diff';
import { detectRooms } from '../geometry/roomDetection';
import { createEmptyPlan, type Plan } from '../types';
import { buildEstimate } from './costs';

/** 4 × 3 room (walls 2.44 m tall), counter-clockwise so side A faces inside. */
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

describe('buildEstimate', () => {
  /*
   * Hand calculation for the renovation below:
   *   Oak floor: 12 m² × 1.10 × 10.7639 = 142.08 → 143 sq ft × $9.50 = $1,358.50
   *   Baseboard: (14 − 0.9) × 1.1 = 14.41 m × 3.28084 = 47.28 → 48 lft × $2.60 = $124.80
   *   Paint: 4 sides, (4+3+4+3) × 2.44 = 34.16 − 0.9 × 2.03 = 32.333 m²
   *          × 2 coats / 37 = 1.748 → 2 gal × $62 = $124.00
   *   Door: 1 × $280 = $280.00
   *   Total = $1,887.30
   */
  const base = room();
  const key = detectRooms(base.walls)[0]?.key ?? '';
  const planned = run(
    base,
    setRoomMeta(null, { key, name: 'Den', floorMaterial: 'oak-hardwood' }),
    addOpening({
      id: 'd',
      wallId: 'w0',
      type: 'door',
      offset: 2,
      width: 0.9,
      height: 2.03,
      sillHeight: 0,
    }),
    ...base.walls.map((w) => setWallProps(base, w.id, { finishA: 'paint-sage' })),
  );

  it('prices a small renovation', () => {
    const est = buildEstimate(diffPlans(base, planned));
    const by = (cat: string) => est.lines.find((l) => l.category === cat);
    expect(by('flooring')).toMatchObject({
      quantity: 143,
      unit: 'sqft',
      unitCost: 9.5,
      total: 1358.5,
    });
    expect(by('trim')).toMatchObject({ quantity: 48, unit: 'lft', total: 124.8 });
    expect(by('paint')).toMatchObject({ quantity: 2, unit: 'gallon', total: 124 });
    expect(by('doors')).toMatchObject({ quantity: 1, total: 280 });
    expect(est.total).toBeCloseTo(1887.3, 2);
  });

  it('groups subtotals by room and category', () => {
    const est = buildEstimate(diffPlans(base, planned));
    expect(est.byRoom).toEqual([{ key, label: 'Den', total: 1887.3 }]);
    expect(est.byCategory[0]).toMatchObject({ key: 'flooring', total: 1358.5 });
  });

  it('applies per-project price overrides', () => {
    const est = buildEstimate(diffPlans(base, planned), { 'oak-hardwood': 8 });
    // 143 × $8 = $1,144
    expect(est.lines.find((l) => l.category === 'flooring')?.total).toBe(1144);
  });

  it('pools paint per room before rounding', () => {
    // Each single side would round up to 1 gal (4 gal total); pooled it's 2.
    const est = buildEstimate(diffPlans(base, planned));
    expect(est.lines.filter((l) => l.category === 'paint')).toHaveLength(1);
  });

  it('prices new walls as drywall and removed walls as an allowance', () => {
    const withDivider = run(base, addWall('div', { x: 2, y: 0 }, { x: 2, y: 3 }));
    const est = buildEstimate(diffPlans(base, withDivider));
    // Divider: 3 × 2.44 = 7.32 m² per side, both sides = 14.64 m² across two rooms
    // left 7.32 × 1.1 / 2.973 = 2.71 → 3 sheets, right also 3 → 6 sheets total
    const sheets = est.lines
      .filter((l) => l.category === 'drywall')
      .reduce((s, l) => s + l.quantity, 0);
    expect(sheets).toBe(6);

    const removed = buildEstimate(diffPlans(withDivider, base));
    expect(removed.lines).toEqual([
      expect.objectContaining({ category: 'demolition', quantity: 1, total: 450 }),
    ]);
  });

  it('is empty when nothing changed', () => {
    expect(buildEstimate(diffPlans(base, base))).toEqual({
      lines: [],
      byRoom: [],
      byCategory: [],
      total: 0,
    });
  });
});

describe('buildEstimate: furniture', () => {
  const ev = (itemId: string, modelId: string, sizeFactor = 1, roomKey = 'r1') =>
    ({
      type: 'furnitureAdded',
      itemId,
      modelId,
      sizeFactor,
      roomKey,
      roomName: 'Dining',
    }) as const;

  it('pools identical pieces per room into one line at catalogue price', () => {
    const est = buildEstimate([
      ev('a', 'dining-chair'),
      ev('b', 'dining-chair'),
      ev('c', 'dining-table'),
    ]);
    const chairs = est.lines.find((l) => l.materialId === 'furniture:dining-chair');
    expect(chairs).toMatchObject({
      category: 'furniture',
      quantity: 2,
      unit: 'each',
      unitCost: 129,
      total: 258,
    });
    expect(est.byCategory.find((c) => c.key === 'furniture')?.total).toBe(258 + 799);
  });

  it('prices resized pieces by footprint area and keeps them on their own line', () => {
    const est = buildEstimate([ev('a', 'sofa'), ev('b', 'sofa', 1.5)]);
    const sofas = est.lines.filter((l) => l.materialId === 'furniture:sofa');
    expect(sofas.map((l) => l.unitCost).sort()).toEqual([1299, 1949]);
  });

  it('applies per-project price overrides', () => {
    const est = buildEstimate([ev('a', 'sofa', 2)], { 'furniture:sofa': 1000 });
    expect(est.lines[0]?.unitCost).toBe(2000);
  });
});

describe('buildEstimate: door and window designs', () => {
  const room = { roomKey: 'r1', roomName: 'Hall' };
  it('prices each design with its own material', () => {
    const est = buildEstimate([
      { type: 'openingAdded', openingId: 'a', kind: 'door', width: 0.9, style: 'barn', ...room },
      { type: 'openingAdded', openingId: 'b', kind: 'window', width: 1, style: 'grid', ...room },
      { type: 'openingAdded', openingId: 'c', kind: 'door', width: 0.9, ...room },
    ]);
    expect(est.lines.map((l) => [l.materialId, l.unitCost, l.category]).sort()).toEqual([
      ['door-barn', 650, 'doors'],
      ['interior-door', 280, 'doors'],
      ['window-grid', 690, 'windows'],
    ]);
  });

  it('prices refinishing as paint work', () => {
    const est = buildEstimate([
      { type: 'openingRefinished', openingId: 'a', kind: 'door', ...room },
      { type: 'openingRefinished', openingId: 'b', kind: 'window', ...room },
    ]);
    expect(est.lines).toEqual([
      expect.objectContaining({
        materialId: 'opening-refinish',
        quantity: 2,
        category: 'paint',
        total: 150,
      }),
    ]);
  });
});

describe('buildEstimate: textured wall finishes', () => {
  const shares = [{ roomKey: 'r1', roomName: 'Den', area: 10 }];
  it('prices textured finishes per sq ft with waste, separate from paint', () => {
    // 10 m² × 1.12 × 10.7639 = 120.56 → 121 sq ft × $14 = $1,694
    const est = buildEstimate([
      { type: 'wallPainted', wallId: 'w', side: 'a', from: null, to: 'red-brick', shares },
    ]);
    expect(est.lines).toEqual([
      expect.objectContaining({ category: 'wallFinish', quantity: 121, unit: 'sqft', total: 1694 }),
    ]);
  });

  it('prices a tint-only change on a texture as paint in that colour', () => {
    const est = buildEstimate([
      {
        type: 'wallPainted',
        wallId: 'w',
        side: 'a',
        from: 'red-brick',
        to: 'red-brick',
        tint: '#f4f1ea',
        tintOnly: true,
        shares,
      },
    ]);
    expect(est.lines).toEqual([
      expect.objectContaining({ category: 'paint', materialId: 'paint:#f4f1ea', unit: 'gallon' }),
    ]);
  });
});

describe('buildEstimate: your own furniture prices', () => {
  const ev = (itemId: string, price?: number) =>
    ({
      type: 'furnitureAdded',
      itemId,
      modelId: 'sofa',
      sizeFactor: 1.5,
      roomKey: 'r1',
      roomName: 'Den',
      ...(price !== undefined ? { price } : {}),
    }) as const;

  it('uses the price you entered as-is (no size scaling, no overrides)', () => {
    const est = buildEstimate([ev('a', 850), ev('b', 850), ev('c')], { 'furniture:sofa': 1000 });
    const yours = est.lines.find((l) => l.description.includes('your price'));
    expect(yours).toMatchObject({ quantity: 2, unitCost: 850, total: 1700 });
    const estimated = est.lines.find((l) => !l.description.includes('your price'));
    expect(estimated?.unitCost).toBe(1500);
  });

  it('accepts a zero price (e.g. furniture you already own)', () => {
    const est = buildEstimate([ev('a', 0)]);
    expect(est.total).toBe(0);
  });
});
