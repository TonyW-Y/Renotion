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
