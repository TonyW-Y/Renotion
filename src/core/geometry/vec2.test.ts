import { describe, expect, it } from 'vitest';
import {
  add,
  angle,
  cross,
  distance,
  dot,
  equals,
  length,
  normalize,
  perp,
  pointToSegmentDistance,
  projectOntoSegment,
  rotate,
  segmentIntersection,
  sub,
  vec2,
} from './vec2';

describe('vec2 basics', () => {
  it('adds, subtracts, dots, crosses', () => {
    expect(add(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(vec2(1, 2), vec2(3, 4))).toEqual({ x: -2, y: -2 });
    expect(dot(vec2(1, 2), vec2(3, 4))).toBe(11);
    expect(cross(vec2(1, 0), vec2(0, 1))).toBe(1);
  });

  it('measures length and distance (3-4-5 triangle)', () => {
    expect(length(vec2(3, 4))).toBe(5);
    expect(distance(vec2(1, 1), vec2(4, 5))).toBe(5);
  });

  it('normalizes, including the zero vector', () => {
    expect(normalize(vec2(3, 4))).toEqual({ x: 0.6, y: 0.8 });
    expect(normalize(vec2(0, 0))).toEqual({ x: 0, y: 0 });
  });

  it('rotates and takes perpendiculars', () => {
    const r = rotate(vec2(1, 0), Math.PI / 2);
    expect(equals(r, vec2(0, 1))).toBe(true);
    expect(perp(vec2(1, 0))).toEqual({ x: -0, y: 1 });
    expect(angle(vec2(0, 1))).toBeCloseTo(Math.PI / 2);
  });
});

describe('projectOntoSegment', () => {
  const a = vec2(0, 0);
  const b = vec2(4, 0);

  it('projects inside the segment', () => {
    const p = projectOntoSegment(vec2(1, 3), a, b);
    expect(p.point).toEqual({ x: 1, y: 0 });
    expect(p.t).toBe(0.25);
    expect(p.distance).toBe(3);
  });

  it('clamps beyond the ends', () => {
    expect(projectOntoSegment(vec2(-2, 0), a, b).t).toBe(0);
    expect(projectOntoSegment(vec2(9, 0), a, b).point).toEqual({ x: 4, y: 0 });
  });

  it('gives point-to-segment distance', () => {
    // nearest point is the end (4,0): distance to (7,4) = 5
    expect(pointToSegmentDistance(vec2(7, 4), a, b)).toBe(5);
  });
});

describe('segmentIntersection', () => {
  it('finds a crossing', () => {
    const hit = segmentIntersection(vec2(0, 0), vec2(4, 4), vec2(0, 4), vec2(4, 0));
    expect(hit?.point).toEqual({ x: 2, y: 2 });
    expect(hit?.t).toBe(0.5);
  });

  it('returns null for parallel or disjoint segments', () => {
    expect(segmentIntersection(vec2(0, 0), vec2(1, 0), vec2(0, 1), vec2(1, 1))).toBeNull();
    expect(segmentIntersection(vec2(0, 0), vec2(1, 0), vec2(2, -1), vec2(2, 1))).toBeNull();
  });
});
