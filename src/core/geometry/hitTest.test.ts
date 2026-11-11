import { describe, expect, it } from 'vitest';
import { createEmptyPlan, type Plan } from '../types';
import { cornerAt, hitTest } from './hitTest';

const plan: Plan = {
  ...createEmptyPlan(),
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.2, height: 2.4 },
    { id: 'w2', start: { x: 4, y: 0 }, end: { x: 4, y: 3 }, thickness: 0.2, height: 2.4 },
  ],
  openings: [
    { id: 'o1', wallId: 'w1', type: 'door', offset: 2, width: 0.9, height: 2, sillHeight: 0 },
  ],
};

const rooms = [
  {
    key: 'r',
    polygon: [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ],
  },
];

describe('hitTest', () => {
  it('prefers openings over the wall they sit in', () => {
    expect(hitTest(plan, { x: 2.1, y: 0.05 })).toEqual({ kind: 'opening', id: 'o1' });
  });

  it('hits walls within half thickness + tolerance', () => {
    expect(hitTest(plan, { x: 0.5, y: 0.14 })).toEqual({ kind: 'wall', id: 'w1' });
    expect(hitTest(plan, { x: 0.5, y: 0.2 })).toBeNull();
  });

  it('falls through to rooms', () => {
    expect(hitTest(plan, { x: 1, y: 1.5 }, { rooms })).toEqual({ kind: 'room', id: 'r' });
  });

  it('hits furniture footprints above rooms', () => {
    const withSofa: Plan = {
      ...plan,
      furniture: [{ id: 'f', modelId: 'sofa', position: { x: 2, y: 2 }, rotation: 0 }],
    };
    const footprint = () => [
      { x: 1.5, y: 1.5 },
      { x: 2.5, y: 1.5 },
      { x: 2.5, y: 2.5 },
      { x: 1.5, y: 2.5 },
    ];
    expect(hitTest(withSofa, { x: 2, y: 2 }, { rooms, furnitureFootprint: footprint })).toEqual({
      kind: 'furniture',
      id: 'f',
    });
  });

  it('finds corners', () => {
    expect(cornerAt(plan, { x: 3.95, y: 0.05 }, 0.1)).toEqual({ x: 4, y: 0 });
    expect(cornerAt(plan, { x: 2, y: 0 }, 0.1)).toBeNull();
  });
});
