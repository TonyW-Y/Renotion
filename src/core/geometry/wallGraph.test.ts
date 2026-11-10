import { describe, expect, it } from 'vitest';
import { buildWallGraph, endpointJoins, type WallLike } from './wallGraph';

const w = (id: string, x1: number, y1: number, x2: number, y2: number): WallLike => ({
  id,
  start: { x: x1, y: y1 },
  end: { x: x2, y: y2 },
});

describe('buildWallGraph', () => {
  it('merges shared corners of a rectangle into 4 nodes and 4 edges', () => {
    const g = buildWallGraph([
      w('a', 0, 0, 4, 0),
      w('b', 4, 0, 4, 3),
      w('c', 4, 3, 0, 3),
      w('d', 0, 3, 0, 0),
    ]);
    expect(g.nodes).toHaveLength(4);
    expect(g.edges).toHaveLength(4);
    expect(g.nodes.every((n) => n.edges.length === 2)).toBe(true);
  });

  it('merges endpoints within tolerance', () => {
    const g = buildWallGraph([w('a', 0, 0, 4, 0), w('b', 4.005, 0.003, 4, 3)]);
    expect(g.nodes).toHaveLength(3);
  });

  it('splits a wall at a T-junction', () => {
    // b's start lands in the middle of a
    const g = buildWallGraph([w('a', 0, 0, 6, 0), w('b', 3, 0, 3, 4)]);
    expect(g.nodes).toHaveLength(4);
    expect(g.edges).toHaveLength(3);
    expect(g.edges.filter((e) => e.wallId === 'a')).toHaveLength(2);
  });

  it('splits crossing walls at the intersection', () => {
    const g = buildWallGraph([w('a', 0, 0, 4, 4), w('b', 0, 4, 4, 0)]);
    expect(g.nodes).toHaveLength(5);
    expect(g.edges).toHaveLength(4);
  });

  it('ignores zero-length walls and duplicate overlaps', () => {
    const g = buildWallGraph([w('a', 0, 0, 4, 0), w('dup', 4, 0, 0, 0), w('z', 1, 1, 1, 1)]);
    expect(g.edges).toHaveLength(1);
  });
});

describe('endpointJoins', () => {
  it('detects corner and T-junction joins but not free ends', () => {
    const joins = endpointJoins([w('a', 0, 0, 6, 0), w('b', 6, 0, 6, 4), w('c', 3, 0, 3, 2)]);
    expect(joins.get('a')).toEqual({ start: false, end: true });
    expect(joins.get('b')).toEqual({ start: true, end: false });
    expect(joins.get('c')).toEqual({ start: true, end: false });
  });
});
