import { describe, expect, it } from 'vitest';
import { wallEndCuts } from './wallEnds';

const T = 0.2; // thickness → half = 0.1
const w = (id: string, x1: number, y1: number, x2: number, y2: number, thickness = T) => ({
  id,
  start: { x: x1, y: y1 },
  end: { x: x2, y: y2 },
  thickness,
});
const round = (n: number) => Math.round(n * 1e6) / 1e6;
const cuts = (walls: Parameters<typeof wallEndCuts>[0], id: string) => {
  const c = wallEndCuts(walls).get(id);
  if (!c) throw new Error(`no cuts for ${id}`);
  return {
    start: { a: round(c.start.a), b: round(c.start.b), joined: c.start.joined },
    end: { a: round(c.end.a), b: round(c.end.b), joined: c.end.joined },
  };
};

describe('wallEndCuts', () => {
  it('leaves free ends square', () => {
    expect(cuts([w('a', 0, 0, 4, 0)], 'a')).toEqual({
      start: { a: 0, b: 0, joined: false },
      end: { a: 0, b: 0, joined: false },
    });
  });

  it('mitres a right-angle corner: outer side extends, inner side retracts', () => {
    // a runs +x, b turns left (+y) at (4,0). Side A (left of a) is the inside.
    const walls = [w('a', 0, 0, 4, 0), w('b', 4, 0, 4, 3)];
    expect(cuts(walls, 'a').end).toEqual({ a: -0.1, b: 0.1, joined: true });
    // b starts at the corner; its right side (B) faces the outside.
    expect(cuts(walls, 'b').start).toEqual({ a: -0.1, b: 0.1, joined: true });
  });

  it('mitres a corner between walls of different thickness', () => {
    const walls = [w('a', 0, 0, 4, 0, 0.2), w('b', 4, 0, 4, 3, 0.1)];
    // a's sides stop on b's faces (x = 4 ± 0.05); b's on a's (y = ±0.1).
    expect(cuts(walls, 'a').end).toEqual({ a: -0.05, b: 0.05, joined: true });
    expect(cuts(walls, 'b').start).toEqual({ a: -0.1, b: 0.1, joined: true });
  });

  it('butts a T-junction stem against the near face of the through wall', () => {
    const walls = [w('main', 0, 0, 6, 0), w('stem', 3, 0, 3, 2)];
    expect(cuts(walls, 'stem').start).toEqual({ a: -0.1, b: -0.1, joined: true });
    expect(cuts(walls, 'main')).toEqual({
      start: { a: 0, b: 0, joined: false },
      end: { a: 0, b: 0, joined: false },
    });
  });

  it('butts collinear walls end to end and treats a stem at their joint as a T', () => {
    const walls = [w('a', 0, 0, 3, 0), w('b', 3, 0, 6, 0), w('d', 3, 0, 3, 2)];
    expect(cuts(walls, 'a').end).toEqual({ a: 0, b: 0, joined: true });
    expect(cuts(walls, 'b').start).toEqual({ a: 0, b: 0, joined: true });
    expect(cuts(walls, 'd').start).toEqual({ a: -0.1, b: -0.1, joined: true });
  });

  it('falls back to a half-thickness extension at complex junctions', () => {
    // Three non-collinear walls meeting at the origin.
    const walls = [w('a', 0, 0, 4, 0), w('b', 0, 0, 0, 3), w('c', 0, 0, -2, -2)];
    expect(cuts(walls, 'a').start).toEqual({ a: 0.1, b: 0.1, joined: true });
  });

  it('falls back instead of producing a long spike at very sharp corners', () => {
    const walls = [w('a', 0, 0, 4, 0), w('b', 4, 0, 0, 0.1)];
    const end = cuts(walls, 'a').end;
    expect(end).toEqual({ a: 0.1, b: 0.1, joined: true });
  });
});
