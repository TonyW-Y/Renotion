import * as THREE from 'three';

/**
 * One solid piece of wall in wall-local space: x runs along the wall from its
 * start, y is height, z is across the thickness (+z = side B, −z = side A).
 * Each side can start and end at a different x, which is how mitred corners
 * are made.
 */
export interface WallPiece {
  u0A: number;
  u0B: number;
  u1A: number;
  u1B: number;
  z0: number;
  z1: number;
  thickness: number;
}

/**
 * Builds the piece as a 6-face prism. Material groups follow BoxGeometry's
 * order — 0: end (+x), 1: start (−x), 2: top, 3: bottom, 4: side B (+z),
 * 5: side A (−z) — and UVs are in metres so textures keep real-world scale and
 * line up across pieces.
 */
export function wallPieceGeometry(p: WallPiece): THREE.BufferGeometry {
  const h = p.thickness / 2;
  type P = [number, number, number];
  const A0b: P = [p.u0A, p.z0, -h];
  const A0t: P = [p.u0A, p.z1, -h];
  const A1b: P = [p.u1A, p.z0, -h];
  const A1t: P = [p.u1A, p.z1, -h];
  const B0b: P = [p.u0B, p.z0, h];
  const B0t: P = [p.u0B, p.z1, h];
  const B1b: P = [p.u1B, p.z0, h];
  const B1t: P = [p.u1B, p.z1, h];

  // Each quad is listed counter-clockwise as seen from outside, with a UV
  // projection for its plane.
  const uvSide = (v: P) => [v[0], v[1]];
  const uvTop = (v: P) => [v[0], v[2]];
  const uvEnd = (v: P) => [v[2], v[1]];
  const quads: [P[], (v: P) => number[]][] = [
    [[A1b, A1t, B1t, B1b], uvEnd], // 0 end
    [[A0b, B0b, B0t, A0t], uvEnd], // 1 start
    [[A0t, B0t, B1t, A1t], uvTop], // 2 top
    [[A0b, A1b, B1b, B0b], uvTop], // 3 bottom
    [[B0b, B1b, B1t, B0t], uvSide], // 4 side B
    [[A1b, A0b, A0t, A1t], uvSide], // 5 side A
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const geo = new THREE.BufferGeometry();
  quads.forEach(([q, uv], i) => {
    const [a, b, c, d] = q as [P, P, P, P];
    for (const v of [a, b, c, a, c, d]) {
      positions.push(...v);
      uvs.push(...uv(v));
    }
    geo.addGroup(i * 6, 6, i);
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}
