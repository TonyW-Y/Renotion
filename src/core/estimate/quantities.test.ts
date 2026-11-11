import { describe, expect, it } from 'vitest';
import { detectRooms } from '../geometry/roomDetection';
import { createEmptyPlan, type Plan } from '../types';
import {
  baseboardMetres,
  drywallSheets,
  flooringQuantity,
  paintGallons,
  toLinearFeet,
  wallSideArea,
  wallSideRooms,
} from './quantities';

const wall = { start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, height: 2.4 };
const door = { width: 0.9, height: 2.03 };
const window = { width: 1.2, height: 1.2 };

describe('wall paint area', () => {
  it('subtracts openings from length × height', () => {
    expect(wallSideArea(wall, [])).toBeCloseTo(9.6); // 4 × 2.4
    // 9.6 − 0.9 × 2.03 = 9.6 − 1.827 = 7.773
    expect(wallSideArea(wall, [door])).toBeCloseTo(7.773);
    // 9.6 − 1.827 − 1.44 = 6.333
    expect(wallSideArea(wall, [door, window])).toBeCloseTo(6.333);
  });
});

describe('paintGallons', () => {
  it('rounds up to whole gallons for 2 coats at 37 m²/gal', () => {
    expect(paintGallons(7.773)).toBe(1); // 15.546 / 37 = 0.42
    expect(paintGallons(40)).toBe(3); // 80 / 37 = 2.16
    expect(paintGallons(37)).toBe(2); // exactly 2.0
    expect(paintGallons(0)).toBe(0);
  });

  it('supports custom coats and coverage', () => {
    expect(paintGallons(37, 1)).toBe(1);
    expect(paintGallons(50, 3, 40)).toBe(4); // 150 / 40 = 3.75
  });
});

describe('flooringQuantity', () => {
  it('converts to square feet with waste', () => {
    // 12 m² × 1.10 = 13.2 m² × 10.7639 = 142.08 → 143 sq ft
    expect(flooringQuantity(12, { unit: 'sqft', wasteFactor: 0.1 })).toEqual({
      quantity: 143,
      unit: 'sqft',
    });
  });

  it('counts boxes by coverage', () => {
    // 12 × 1.1 / 2.2 = 6 boxes exactly
    expect(flooringQuantity(12, { unit: 'box', coverage: 2.2, wasteFactor: 0.1 })).toEqual({
      quantity: 6,
      unit: 'box',
    });
    // 12.5 × 1.1 / 2.2 = 6.25 → 7
    expect(flooringQuantity(12.5, { unit: 'box', coverage: 2.2, wasteFactor: 0.1 }).quantity).toBe(
      7,
    );
  });

  it('uses 15% waste for tile', () => {
    // 10 × 1.15 = 11.5 m² × 10.7639 = 123.78 → 124
    expect(flooringQuantity(10, { unit: 'sqft', wasteFactor: 0.15 }).quantity).toBe(124);
  });
});

describe('baseboard and drywall', () => {
  it('removes door widths and adds 10% waste', () => {
    // 4 × 3 room: perimeter 14 − 0.9 = 13.1 × 1.1 = 14.41 m
    expect(baseboardMetres(14, [0.9])).toBeCloseTo(14.41);
    // 14.41 m × 3.28084 = 47.28 → 48 lft
    expect(toLinearFeet(baseboardMetres(14, [0.9]))).toBe(48);
  });

  it('counts drywall sheets with waste', () => {
    // 10 × 1.1 / 2.973 = 3.70 → 4
    expect(drywallSheets(10)).toBe(4);
    expect(drywallSheets(0)).toBe(0);
  });
});

describe('wallSideRooms', () => {
  it('splits a long wall between the rooms it faces', () => {
    // 6 × 4 box, divider at x = 3 (T-junctions on the long walls).
    const plan: Plan = {
      ...createEmptyPlan(),
      walls: [
        { id: 's', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.1, height: 2.4 },
        { id: 'e', start: { x: 6, y: 0 }, end: { x: 6, y: 4 }, thickness: 0.1, height: 2.4 },
        { id: 'n', start: { x: 6, y: 4 }, end: { x: 0, y: 4 }, thickness: 0.1, height: 2.4 },
        { id: 'w', start: { x: 0, y: 4 }, end: { x: 0, y: 0 }, thickness: 0.1, height: 2.4 },
        { id: 'm', start: { x: 3, y: 0 }, end: { x: 3, y: 4 }, thickness: 0.1, height: 2.4 },
      ],
    };
    const rooms = detectRooms(plan.walls);
    const sides = wallSideRooms(plan, rooms);

    // South wall runs west→east, so side A (left) is inside, split 50/50.
    const s = sides.get('s');
    expect(s?.a.map((x) => x.fraction).sort()).toEqual([0.5, 0.5]);
    expect(s?.b).toEqual([{ roomKey: null, fraction: 1 }]);
    // The divider faces one room on each side.
    const m = sides.get('m');
    expect(m?.a).toHaveLength(1);
    expect(m?.b).toHaveLength(1);
    expect(m?.a[0]?.roomKey).not.toBe(m?.b[0]?.roomKey);
  });
});
