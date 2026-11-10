import { describe, expect, it } from 'vitest';
import { area, centroid, labelPoint, perimeter, pointInPolygon, signedArea } from './polygon';

const rect = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
];

// L-shape: 4×4 square minus the 2×2 top-right corner → area 12
const lShape = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 4 },
  { x: 0, y: 4 },
];

describe('polygon', () => {
  it('computes signed area by winding', () => {
    expect(signedArea(rect)).toBe(12);
    expect(signedArea([...rect].reverse())).toBe(-12);
    expect(area([...rect].reverse())).toBe(12);
  });

  it('computes L-shape area and perimeter', () => {
    expect(area(lShape)).toBe(12);
    // 4 + 2 + 2 + 2 + 2 + 4 = 16
    expect(perimeter(lShape)).toBe(16);
  });

  it('computes centroids', () => {
    expect(centroid(rect)).toEqual({ x: 2, y: 1.5 });
    // L-shape: big square (16, c=(2,2)) minus corner (4, c=(3,3)) → ((32-12)/12, (32-12)/12)
    const c = centroid(lShape);
    expect(c.x).toBeCloseTo(5 / 3, 10);
    expect(c.y).toBeCloseTo(5 / 3, 10);
  });

  it('tests point containment', () => {
    expect(pointInPolygon({ x: 1, y: 1 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 3, y: 3 }, lShape)).toBe(false);
    expect(pointInPolygon({ x: 5, y: 1 }, rect)).toBe(false);
  });

  it('places labels inside the polygon', () => {
    expect(labelPoint(rect)).toEqual({ x: 2, y: 1.5 });
    const p = labelPoint(lShape);
    expect(pointInPolygon(p, lShape)).toBe(true);
  });

  it('places labels inside a U-shape whose centroid is outside', () => {
    // U: 6×4 with a 2×3 notch cut from the top middle
    const u = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 4 },
      { x: 0, y: 4 },
    ];
    expect(pointInPolygon(labelPoint(u), u)).toBe(true);
  });
});
