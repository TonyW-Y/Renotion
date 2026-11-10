import { describe, expect, it } from 'vitest';
import { detectRooms } from './roomDetection';
import type { WallLike } from './wallGraph';

const w = (id: string, x1: number, y1: number, x2: number, y2: number): WallLike => ({
  id,
  start: { x: x1, y: y1 },
  end: { x: x2, y: y2 },
});

/** 4 × 3 rectangle, walls a-b-c-d. */
const rect = [w('a', 0, 0, 4, 0), w('b', 4, 0, 4, 3), w('c', 4, 3, 0, 3), w('d', 0, 3, 0, 0)];

describe('detectRooms', () => {
  it('finds a single rectangular room', () => {
    const rooms = detectRooms(rect);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.area).toBeCloseTo(12);
    expect(rooms[0]?.perimeter).toBeCloseTo(14);
    expect(rooms[0]?.key).toBe('a|b|c|d');
    expect(rooms[0]?.labelAt).toEqual({ x: 2, y: 1.5 });
  });

  it('works regardless of wall direction', () => {
    const reversed = rect.map((r) => ({ ...r, start: r.end, end: r.start }));
    expect(detectRooms(reversed)[0]?.area).toBeCloseTo(12);
  });

  it('finds two rooms sharing a wall', () => {
    // 6 × 4 split at x = 3 by wall m; outer walls are split into separate pieces.
    const walls = [
      w('s1', 0, 0, 3, 0),
      w('s2', 3, 0, 6, 0),
      w('e', 6, 0, 6, 4),
      w('n2', 6, 4, 3, 4),
      w('n1', 3, 4, 0, 4),
      w('wst', 0, 4, 0, 0),
      w('m', 3, 0, 3, 4),
    ];
    const rooms = detectRooms(walls);
    expect(rooms).toHaveLength(2);
    expect(rooms.map((r) => r.area)).toEqual([12, 12]);
    expect(rooms.every((r) => r.wallIds.includes('m'))).toBe(true);
  });

  it('finds two rooms when a divider forms T-junctions with long walls', () => {
    const walls = [
      w('s', 0, 0, 6, 0),
      w('e', 6, 0, 6, 4),
      w('n', 6, 4, 0, 4),
      w('wst', 0, 4, 0, 0),
      w('m', 3, 0, 3, 4),
    ];
    const rooms = detectRooms(walls);
    expect(rooms).toHaveLength(2);
    // left = s, m, n, wst; right = e, m, n, s
    expect(rooms.map((r) => r.key).sort()).toEqual(['e|m|n|s', 'm|n|s|wst']);
    expect(rooms[0]?.polygon).toHaveLength(4); // collinear T-junction vertices removed
  });

  it('finds an L-shaped room', () => {
    const walls = [
      w('1', 0, 0, 4, 0),
      w('2', 4, 0, 4, 2),
      w('3', 4, 2, 2, 2),
      w('4', 2, 2, 2, 4),
      w('5', 2, 4, 0, 4),
      w('6', 0, 4, 0, 0),
    ];
    const rooms = detectRooms(walls);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.area).toBeCloseTo(12);
  });

  it('finds no room for open, non-enclosed walls', () => {
    expect(detectRooms([w('a', 0, 0, 4, 0), w('b', 4, 0, 4, 3), w('c', 4, 3, 0, 3)])).toEqual([]);
    expect(detectRooms([])).toEqual([]);
  });

  it('ignores a dangling half-wall inside a room', () => {
    const rooms = detectRooms([...rect, w('stub', 2, 0, 2, 1)]);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.area).toBeCloseTo(12);
    expect(rooms[0]?.wallIds).not.toContain('stub');
  });

  it('splits a room into four with crossing walls', () => {
    const rooms = detectRooms([...rect, w('x1', 0, 0, 4, 3), w('x2', 0, 3, 4, 0)]);
    expect(rooms).toHaveLength(4);
    expect(rooms.reduce((s, r) => s + r.area, 0)).toBeCloseTo(12);
  });

  it('closes rooms with tiny endpoint gaps', () => {
    const rooms = detectRooms([
      w('a', 0, 0, 4, 0),
      w('b', 4.004, 0, 4, 3),
      w('c', 4, 3, 0, 3),
      w('d', 0, 3, 0, 0.006),
    ]);
    expect(rooms).toHaveLength(1);
  });

  it('finds separate rooms in disconnected buildings', () => {
    const shifted = rect.map((r) => ({
      id: `${r.id}2`,
      start: { x: r.start.x + 10, y: r.start.y },
      end: { x: r.end.x + 10, y: r.end.y },
    }));
    expect(detectRooms([...rect, ...shifted])).toHaveLength(2);
  });
});
