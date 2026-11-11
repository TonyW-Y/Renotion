import { describe, expect, it } from 'vitest';
import { createEmptyPlan, type Plan } from '../types';
import { canPlaceFurniture, furnitureFootprint, normalizeAngle } from './placement';

const plan: Plan = {
  ...createEmptyPlan(),
  walls: [{ id: 'w', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.2, height: 2.4 }],
};

describe('furniture placement', () => {
  it('uses catalogue dimensions for the footprint', () => {
    // Sofa is 2.1 × 0.9
    const fp = furnitureFootprint({ modelId: 'sofa', position: { x: 0, y: 0 }, rotation: 0 });
    expect(fp?.[2]).toEqual({ x: 1.05, y: 0.45 });
    expect(
      furnitureFootprint({ modelId: 'nope', position: { x: 0, y: 0 }, rotation: 0 }),
    ).toBeNull();
  });

  it('rejects placements through a wall and accepts flush ones', () => {
    expect(
      canPlaceFurniture({ modelId: 'sofa', position: { x: 2, y: 0.3 }, rotation: 0 }, plan),
    ).toBe(false);
    expect(
      canPlaceFurniture({ modelId: 'sofa', position: { x: 2, y: 0.55 }, rotation: 0 }, plan),
    ).toBe(true);
  });

  it('normalizes angles', () => {
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2);
    expect(normalizeAngle(5 * Math.PI)).toBeCloseTo(Math.PI);
  });
});
