import { describe, expect, it } from 'vitest';
import type { DetectedRoom } from './geometry/roomDetection';
import { resolveRooms } from './rooms';

const room = (wallIds: string[]): DetectedRoom => ({
  key: [...wallIds].sort().join('|'),
  wallIds: [...wallIds].sort(),
  polygon: [],
  area: 1,
  perimeter: 4,
  labelAt: { x: 0, y: 0 },
});

describe('resolveRooms', () => {
  it('matches metadata by exact key', () => {
    const r = resolveRooms([room(['a', 'b', 'c', 'd'])], [{ key: 'a|b|c|d', name: 'Kitchen' }]);
    expect(r[0]?.name).toBe('Kitchen');
    expect(r[0]?.meta?.key).toBe('a|b|c|d');
  });

  it('gives unnamed rooms default names', () => {
    const r = resolveRooms([room(['a', 'b', 'c']), room(['d', 'e', 'f'])], []);
    expect(r.map((x) => x.name)).toEqual(['Room 1', 'Room 2']);
  });

  it('keeps a name when a wall is split into two (key changed)', () => {
    // a was replaced by a1 + a2: overlap {b,c,d} / {a,a1,a2,b,c,d} = 0.5
    const r = resolveRooms(
      [room(['a1', 'a2', 'b', 'c', 'd'])],
      [{ key: 'a|b|c|d', name: 'Bedroom' }],
    );
    expect(r[0]?.name).toBe('Bedroom');
    expect(r[0]?.meta?.key).toBe('a|b|c|d');
  });

  it('gives the name to the closer match when a room is divided', () => {
    // Original room a|b|c|d split by wall m into left (a,b,m,d) and right (c, m, x, y)
    const r = resolveRooms(
      [room(['a', 'b', 'd', 'm']), room(['c', 'm', 'x', 'y'])],
      [{ key: 'a|b|c|d', name: 'Living' }],
    );
    expect(r.map((x) => x.name)).toEqual(['Living', 'Room 2']);
  });

  it('does not match unrelated rooms', () => {
    const r = resolveRooms([room(['p', 'q', 'r'])], [{ key: 'a|b|c|d', name: 'Old' }]);
    expect(r[0]?.meta).toBeNull();
  });
});
