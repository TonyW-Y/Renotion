import { describe, expect, it } from 'vitest';
import { snapAngle, snapPoint, snapToGrid, snapToPoints } from './snapping';

describe('snapToGrid', () => {
  it('rounds to 0.1 m by default without float noise', () => {
    expect(snapToGrid({ x: 1.234, y: -0.26 })).toEqual({ x: 1.2, y: -0.3 });
    expect(snapToGrid({ x: 0.29999, y: 0.04 })).toEqual({ x: 0.3, y: 0 });
  });

  it('supports custom grids', () => {
    expect(snapToGrid({ x: 1.3, y: 0.74 }, 0.5)).toEqual({ x: 1.5, y: 0.5 });
  });
});

describe('snapToPoints', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];
  it('returns the nearest point within the radius', () => {
    expect(snapToPoints({ x: 0.9, y: 0.1 }, pts)).toEqual({ x: 1, y: 0 });
  });
  it('returns null outside the radius', () => {
    expect(snapToPoints({ x: 0.5, y: 0.5 }, pts)).toBeNull();
  });
});

describe('snapAngle', () => {
  it('snaps a nearly horizontal line to 0°', () => {
    // (3, 0.2) from origin: angle ≈ 3.8° → 0°, length ≈ 3.007 → 3.0
    expect(snapAngle({ x: 0, y: 0 }, { x: 3, y: 0.2 })).toEqual({ x: 3, y: 0 });
  });

  it('snaps to 45°', () => {
    // (2, 2.1): angle ≈ 46.4° → 45°, length ≈ 2.9 → 2.9
    const p = snapAngle({ x: 0, y: 0 }, { x: 2, y: 2.1 });
    expect(p.x).toBeCloseTo(2.9 * Math.SQRT1_2, 5);
    expect(p.y).toBeCloseTo(2.9 * Math.SQRT1_2, 5);
  });

  it('snaps relative to the anchor', () => {
    expect(snapAngle({ x: 1, y: 1 }, { x: 1.1, y: 3 })).toEqual({ x: 1, y: 3 });
  });
});

describe('snapPoint', () => {
  const endpoints = [{ x: 4, y: 0 }];
  const walls = [{ start: { x: 0, y: 0 }, end: { x: 4, y: 0 } }];

  it('prefers existing endpoints', () => {
    const r = snapPoint({ x: 3.9, y: 0.1 }, { endpoints, walls, anchor: { x: 0, y: 3 } });
    expect(r).toEqual({ point: { x: 4, y: 0 }, kind: 'endpoint' });
  });

  it('angle-snaps while drawing', () => {
    const r = snapPoint({ x: 2.04, y: 3.1 }, { anchor: { x: 0, y: 3 } });
    expect(r.kind).toBe('angle');
    expect(r.point).toEqual({ x: 2, y: 3 });
  });

  it('skips angle snapping when disabled (Shift)', () => {
    const r = snapPoint({ x: 2.04, y: 3.13 }, { anchor: { x: 0, y: 3 }, angleSnap: false });
    expect(r).toEqual({ point: { x: 2, y: 3.1 }, kind: 'grid' });
  });

  it('snaps onto walls for T-junctions', () => {
    const r = snapPoint({ x: 2.03, y: 0.12 }, { walls });
    expect(r.kind).toBe('wall');
    expect(r.point).toEqual({ x: 2.03, y: 0 });
  });

  it('falls back to the grid', () => {
    expect(snapPoint({ x: 7.06, y: 7.04 }, { walls, endpoints })).toEqual({
      point: { x: 7.1, y: 7 },
      kind: 'grid',
    });
  });
});
