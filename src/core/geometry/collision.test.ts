import { describe, expect, it } from 'vitest';
import { createEmptyPlan, type Opening, type Plan } from '../types';
import {
  blockedByWalls,
  convexPolygonsOverlap,
  footprintIntersectsWalls,
  rectFootprint,
  slideMove,
} from './collision';

// Wall along y = 0 from x = 0 to 4, with a 0.9 m door centred at x = 2.
const door: Opening = {
  id: 'd',
  wallId: 'w',
  type: 'door',
  offset: 2,
  width: 0.9,
  height: 2,
  sillHeight: 0,
};
const plan: Plan = {
  ...createEmptyPlan(),
  walls: [{ id: 'w', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.2, height: 2.4 }],
  openings: [door],
};
const R = 0.2;

describe('collision', () => {
  it('blocks bodies touching a solid wall', () => {
    expect(blockedByWalls(plan, { x: 1, y: 0.25 }, R)).toBe(true);
    expect(blockedByWalls(plan, { x: 1, y: 0.35 }, R)).toBe(false);
  });

  it('lets bodies pass through a door', () => {
    expect(blockedByWalls(plan, { x: 2, y: 0 }, R)).toBe(false);
  });

  it('does not let bodies pass through a window', () => {
    const withWindow: Plan = {
      ...plan,
      openings: [{ ...door, type: 'window', sillHeight: 0.9, height: 1.2 }],
    };
    expect(blockedByWalls(withWindow, { x: 2, y: 0 }, R)).toBe(true);
  });

  it('slides along a wall instead of stopping', () => {
    // Moving diagonally into the wall keeps the x component.
    expect(slideMove(plan, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.2 }, R)).toEqual({ x: 0.8, y: 0.5 });
    // Free movement is unchanged.
    expect(slideMove(plan, { x: 0.5, y: 1 }, { x: 0.6, y: 1.1 }, R)).toEqual({ x: 0.6, y: 1.1 });
  });
});

describe('furniture footprints', () => {
  it('builds rotated rectangles', () => {
    const r = rectFootprint({ x: 0, y: 0 }, 2, 1, 0);
    expect(r).toEqual([
      { x: -1, y: -0.5 },
      { x: 1, y: -0.5 },
      { x: 1, y: 0.5 },
      { x: -1, y: 0.5 },
    ]);
    const q = rectFootprint({ x: 0, y: 0 }, 2, 1, Math.PI / 2);
    expect(q[0]?.x).toBeCloseTo(0.5);
    expect(q[0]?.y).toBeCloseTo(-1);
  });

  it('detects convex overlap with SAT, ignoring flush contact', () => {
    const a = rectFootprint({ x: 0, y: 0 }, 2, 2, 0);
    expect(convexPolygonsOverlap(a, rectFootprint({ x: 1.5, y: 0 }, 2, 2, 0))).toBe(true);
    expect(convexPolygonsOverlap(a, rectFootprint({ x: 2, y: 0 }, 2, 2, 0))).toBe(false); // touching
    expect(convexPolygonsOverlap(a, rectFootprint({ x: 3, y: 3 }, 1, 1, 0))).toBe(false);
    // A diamond whose corner pokes into the square.
    expect(convexPolygonsOverlap(a, rectFootprint({ x: 1.3, y: 1.3 }, 1, 1, Math.PI / 4))).toBe(
      true,
    );
  });

  it('blocks footprints that overlap a wall but allows flush placement', () => {
    // Wall along y = 0 (0.2 thick → occupies y ∈ [−0.1, 0.1]).
    const sofaInWall = rectFootprint({ x: 2, y: 0.4 }, 2, 0.9, 0); // y ∈ [−0.05, 0.85]
    expect(footprintIntersectsWalls(sofaInWall, plan)).toBe(true);
    const sofaFlush = rectFootprint({ x: 2, y: 0.55 }, 2, 0.9, 0); // y ∈ [0.1, 1.0]
    expect(footprintIntersectsWalls(sofaFlush, plan)).toBe(false);
    // Rotated 90° near the wall end: x ∈ [4.2−0.45, …] is past the wall's end at 4.
    expect(
      footprintIntersectsWalls(rectFootprint({ x: 4.6, y: 0 }, 2, 0.9, Math.PI / 2), plan),
    ).toBe(false);
  });
});
