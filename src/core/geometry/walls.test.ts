import { describe, expect, it } from 'vitest';
import {
  canPlaceOpening,
  clampOpeningOffset,
  offsetAlongWall,
  openingSpan,
  wallFootprint,
  wallLength,
} from './walls';

const wall = { start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.2 };

describe('wallFootprint', () => {
  it('builds a rectangle around the centreline for free ends', () => {
    expect(wallFootprint(wall)).toEqual([
      { x: 0, y: 0.1 },
      { x: 4, y: 0.1 },
      { x: 4, y: -0.1 },
      { x: 0, y: -0.1 },
    ]);
  });

  it('extends joined ends by half the thickness', () => {
    const [sl, el] = wallFootprint(wall, { start: true, end: true });
    expect(sl.x).toBeCloseTo(-0.1);
    expect(el.x).toBeCloseTo(4.1);
  });
});

describe('openings', () => {
  it('measures spans along the wall', () => {
    expect(wallLength(wall)).toBe(4);
    const span = openingSpan({ offset: 2, width: 0.9 }, wall);
    expect(span.from).toBeCloseTo(1.55);
    expect(span.to).toBeCloseTo(2.45);
    expect(span.start.x).toBeCloseTo(1.55);
  });

  it('converts a point to an offset along the wall', () => {
    expect(offsetAlongWall({ x: 1.5, y: 0.7 }, wall)).toBeCloseTo(1.5);
  });

  it('clamps openings inside the wall', () => {
    // 0.9 m door on a 4 m wall: centre range [0.5, 3.5]
    expect(clampOpeningOffset(0.1, 0.9, 4)).toBeCloseTo(0.5);
    expect(clampOpeningOffset(3.9, 0.9, 4)).toBeCloseTo(3.5);
    expect(clampOpeningOffset(2, 0.9, 4)).toBe(2);
    expect(clampOpeningOffset(0.5, 0.9, 0.95)).toBeNull();
  });

  it('rejects overlapping openings on the same wall only', () => {
    const existing = [{ id: 'o1', wallId: 'w', offset: 1, width: 0.9 }];
    expect(canPlaceOpening({ id: 'n', offset: 1.5, width: 0.9 }, wall, existing, 'w')).toBe(false);
    expect(canPlaceOpening({ id: 'n', offset: 2.5, width: 0.9 }, wall, existing, 'w')).toBe(true);
    expect(canPlaceOpening({ id: 'n', offset: 1.5, width: 0.9 }, wall, existing, 'other')).toBe(
      true,
    );
    // moving an opening onto itself is fine
    expect(canPlaceOpening({ id: 'o1', offset: 1.2, width: 0.9 }, wall, existing, 'w')).toBe(true);
  });
});
