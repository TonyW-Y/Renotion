import { describe, expect, it } from 'vitest';
import { createEmptyPlan, type Plan } from '../types';
import { FURNITURE, FURNITURE_BY_ID } from './catalog';
import {
  canPlaceFurniture,
  clampFurnitureSize,
  furnitureFootprint,
  furniturePalette,
  modelFor,
  normalizeAngle,
  sizeFactor,
} from './placement';

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

const fail = (): never => {
  throw new Error('missing catalogue model');
};

describe('modelFor (custom size and colours)', () => {
  const sofa = FURNITURE_BY_ID.get('sofa');
  const item = { modelId: 'sofa', position: { x: 0, y: 0 }, rotation: 0 };

  it('returns the catalogue model untouched when nothing is customised', () => {
    expect(modelFor(item)).toBe(sofa);
  });

  it('scales dimensions and every part per axis', () => {
    const m = modelFor({ ...item, size: { width: 4.2, depth: 0.9, height: 0.82 } });
    expect(m?.width).toBe(4.2);
    expect(m?.parts[0]?.size[0]).toBeCloseTo((sofa?.parts[0]?.size[0] ?? 0) * 2);
    expect(m?.parts[0]?.size[2]).toBeCloseTo(sofa?.parts[0]?.size[2] ?? 0);
    // Parts stay inside the new footprint.
    for (const p of m?.parts ?? [])
      expect(Math.abs(p.position[0]) + p.size[0] / 2).toBeLessThanOrEqual(2.1 + 1e-9);
  });

  it('keeps round parts round by using the smaller horizontal scale', () => {
    const table = FURNITURE_BY_ID.get('side-table');
    const round = table?.parts.find((p) => p.shape === 'cylinder');
    const m = modelFor({
      ...item,
      modelId: 'side-table',
      size: {
        width: (table?.width ?? 0) * 2,
        depth: table?.depth ?? 0,
        height: table?.height ?? 0,
      },
    });
    const scaled = m?.parts[table?.parts.indexOf(round as never) ?? -1];
    expect(scaled?.size[0]).toBeCloseTo(round?.size[0] ?? 0);
    expect(scaled?.size[0]).toBeCloseTo(scaled?.size[2] ?? -1);
  });

  it('recolours the primary and secondary materials only', () => {
    const palette = furniturePalette(FURNITURE[0] ?? fail());
    expect(palette.primary).toBeDefined();
    const m = modelFor({ ...item, colors: { primary: '#ff0000' } });
    const before = sofa?.parts.filter((p) => p.color === palette.primary).length;
    expect(m?.parts.filter((p) => p.color === '#ff0000').length).toBe(before);
    expect(m?.parts.some((p) => p.color === palette.secondary)).toBe(true);
  });

  it('is memoised per item object', () => {
    const custom = { ...item, size: { width: 3, depth: 1, height: 0.9 } };
    expect(modelFor(custom)).toBe(modelFor(custom));
  });

  it('uses the custom size for footprints and collisions', () => {
    const wide = {
      ...item,
      position: { x: 2, y: 0.8 },
      size: { width: 2.1, depth: 1.8, height: 0.82 },
    };
    expect(canPlaceFurniture({ ...item, position: wide.position }, plan)).toBe(true);
    expect(canPlaceFurniture(wide, plan)).toBe(false);
  });

  it('clamps sizes to half / double the catalogue size (min 10 cm)', () => {
    if (!sofa) throw new Error('sofa');
    expect(clampFurnitureSize(sofa, { width: 10, depth: 0.1, height: 0.82 })).toEqual({
      width: 4.2,
      depth: 0.45,
      height: 0.82,
    });
  });

  it('scales price by footprint area', () => {
    expect(sizeFactor(item)).toBe(1);
    expect(sizeFactor({ ...item, size: { width: 4.2, depth: 0.9, height: 0.82 } })).toBeCloseTo(2);
  });
});
