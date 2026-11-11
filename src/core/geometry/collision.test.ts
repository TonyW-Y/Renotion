import { describe, expect, it } from 'vitest';
import { createEmptyPlan, type Opening, type Plan } from '../types';
import { blockedByWalls, slideMove } from './collision';

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
