import { describe, expect, it } from 'vitest';
import { wallPieceGeometry } from './wallGeometry';

describe('wallPieceGeometry', () => {
  const geo = wallPieceGeometry({
    u0A: 0.1,
    u0B: -0.1,
    u1A: 3.9,
    u1B: 4.1,
    z0: 0,
    z1: 2.4,
    thickness: 0.2,
  });
  const normal = (group: number) => {
    const n = geo.getAttribute('normal');
    const i = group * 6;
    return [n.getX(i), n.getY(i), n.getZ(i)].map((v) => Math.round(v * 1000) / 1000 + 0);
  };

  it('has six material groups in BoxGeometry order', () => {
    expect(geo.groups.map((g) => g.materialIndex)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('points every face outward', () => {
    expect(normal(2)).toEqual([0, 1, 0]);
    expect(normal(3)).toEqual([0, -1, 0]);
    expect(normal(4)).toEqual([0, 0, 1]);
    expect(normal(5)).toEqual([0, 0, -1]);
    // Mitred ends lean but still face away from the piece.
    expect(normal(0)[0]).toBeGreaterThan(0.5);
    expect(normal(1)[0]).toBeLessThan(-0.5);
  });

  it('uses metre UVs on the sides', () => {
    const uv = geo.getAttribute('uv');
    const xs = Array.from({ length: 6 }, (_, k) => uv.getX(4 * 6 + k));
    expect(Math.max(...xs)).toBeCloseTo(4.1);
    expect(Math.min(...xs)).toBeCloseTo(-0.1);
  });
});
