import { describe, expect, it } from 'vitest';
import { wallSegments } from './wallSegments';

// 4 m long, 2.4 m tall, 0.2 m thick
const wall = { start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.2, height: 2.4 };
const door = { offset: 1, width: 0.9, height: 2.0, sillHeight: 0 };
const window = { offset: 3, width: 1.0, height: 1.2, sillHeight: 0.9 };

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const r = (boxes: ReturnType<typeof wallSegments>) =>
  boxes.map((b) => ({ ...b, u0: round(b.u0), u1: round(b.u1), z0: round(b.z0), z1: round(b.z1) }));

describe('wallSegments', () => {
  it('returns one full box for a plain wall', () => {
    expect(wallSegments(wall, [])).toEqual([{ kind: 'full', u0: 0, u1: 4, z0: 0, z1: 2.4 }]);
  });

  it('extends joined ends by half the thickness', () => {
    expect(wallSegments(wall, [], { start: true, end: true })).toEqual([
      { kind: 'full', u0: -0.1, u1: 4.1, z0: 0, z1: 2.4 },
    ]);
  });

  it('splits around a door: two full pieces and a lintel', () => {
    // door spans 0.55 → 1.45, top at 2.0
    expect(r(wallSegments(wall, [door]))).toEqual([
      { kind: 'full', u0: 0, u1: 0.55, z0: 0, z1: 2.4 },
      { kind: 'lintel', u0: 0.55, u1: 1.45, z0: 2, z1: 2.4 },
      { kind: 'full', u0: 1.45, u1: 4, z0: 0, z1: 2.4 },
    ]);
  });

  it('adds a sill below a window', () => {
    // window spans 2.5 → 3.5, from 0.9 to 2.1
    expect(r(wallSegments(wall, [window]))).toEqual([
      { kind: 'full', u0: 0, u1: 2.5, z0: 0, z1: 2.4 },
      { kind: 'lintel', u0: 2.5, u1: 3.5, z0: 2.1, z1: 2.4 },
      { kind: 'sill', u0: 2.5, u1: 3.5, z0: 0, z1: 0.9 },
      { kind: 'full', u0: 3.5, u1: 4, z0: 0, z1: 2.4 },
    ]);
  });

  it('handles several openings in any order', () => {
    const boxes = wallSegments(wall, [window, door]);
    expect(boxes.map((b) => b.kind)).toEqual(['full', 'lintel', 'full', 'lintel', 'sill', 'full']);
  });

  it('omits the lintel for a full-height opening', () => {
    const boxes = wallSegments(wall, [{ offset: 2, width: 1, height: 2.4, sillHeight: 0 }]);
    expect(boxes.map((b) => b.kind)).toEqual(['full', 'full']);
  });

  it('conserves solid volume (wall area minus opening areas)', () => {
    const boxes = wallSegments(wall, [door, window]);
    const area = boxes.reduce((s, b) => s + (b.u1 - b.u0) * (b.z1 - b.z0), 0);
    // 4 × 2.4 − 0.9 × 2.0 − 1.0 × 1.2 = 9.6 − 1.8 − 1.2 = 6.6
    expect(area).toBeCloseTo(6.6, 10);
  });
});
