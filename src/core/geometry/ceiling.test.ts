import { describe, expect, it } from 'vitest';
import { ceilingOutline, offsetEdges } from './ceiling';

const square = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
];
const round = (pts: { x: number; y: number }[]) =>
  pts.map((p) => ({ x: Math.round(p.x * 1e6) / 1e6, y: Math.round(p.y * 1e6) / 1e6 }));

describe('offsetEdges', () => {
  it('pushes every edge outwards (either winding)', () => {
    const expected = [
      { x: -0.1, y: -0.1 },
      { x: 4.1, y: -0.1 },
      { x: 4.1, y: 3.1 },
      { x: -0.1, y: 3.1 },
    ];
    expect(round(offsetEdges(square, [0.1, 0.1, 0.1, 0.1]))).toEqual(expected);
    expect(round(offsetEdges([...square].reverse(), [0.1, 0.1, 0.1, 0.1]))).toEqual(
      [...expected].reverse(),
    );
  });

  it('can leave some edges in place', () => {
    // Only the right edge (index 1) moves out.
    expect(round(offsetEdges(square, [0, 0.1, 0, 0]))).toEqual([
      { x: 0, y: 0 },
      { x: 4.1, y: 0 },
      { x: 4.1, y: 3 },
      { x: 0, y: 3 },
    ]);
  });
});

describe('ceilingOutline', () => {
  const wall = (id: string, x1: number, y1: number, x2: number, y2: number) => ({
    id,
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 0.2,
  });
  // Two rooms side by side: x 0..4 and 4..8, y 0..3, sharing the wall at x = 4.
  const left = square;
  const right = square.map((p) => ({ x: p.x + 4, y: p.y }));
  const walls = [
    wall('s', 0, 0, 8, 0),
    wall('n', 8, 3, 0, 3),
    wall('w', 0, 3, 0, 0),
    wall('e', 8, 0, 8, 3),
    wall('mid', 4, 0, 4, 3),
  ];

  it('reaches the outer face of exterior walls but stays on shared walls', () => {
    expect(round(ceilingOutline(left, [left, right], walls))).toEqual([
      { x: -0.1, y: -0.1 },
      { x: 4, y: -0.1 },
      { x: 4, y: 3.1 },
      { x: -0.1, y: 3.1 },
    ]);
  });
});
