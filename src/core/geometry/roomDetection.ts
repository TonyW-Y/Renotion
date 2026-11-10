import type { ID, Vec2 } from '../types';
import { area as polyArea, labelPoint, perimeter as polyPerimeter, signedArea } from './polygon';
import { cross, dot, sub } from './vec2';
import { buildWallGraph, NODE_TOLERANCE, type WallLike } from './wallGraph';

export interface DetectedRoom {
  /** Stable key: sorted ids of bounding walls. */
  key: string;
  /** Counter-clockwise polygon (collinear vertices removed). */
  polygon: Vec2[];
  area: number;
  perimeter: number;
  wallIds: ID[];
  labelAt: Vec2;
}

const MIN_ROOM_AREA = 0.05; // m² — ignore slivers

function simplify(poly: Vec2[]): Vec2[] {
  if (poly.length <= 3) return poly;
  const out: Vec2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const prev = poly[(i - 1 + poly.length) % poly.length];
    const cur = poly[i];
    const next = poly[(i + 1) % poly.length];
    if (!prev || !cur || !next) continue;
    const a = sub(cur, prev);
    const b = sub(next, cur);
    const collinear = Math.abs(cross(a, b)) < 1e-9 && dot(a, b) > 0;
    if (!collinear) out.push(cur);
  }
  return out;
}

/**
 * Finds enclosed rooms as the bounded faces of the planar wall graph.
 *
 * Algorithm: build the graph, prune dangling filaments (walls that don't
 * enclose anything), sort each node's neighbours by angle, then walk every
 * half-edge taking the next edge clockwise at each node. This traces each
 * face with the face on the left: bounded faces come out counter-clockwise
 * (positive area); the unbounded outer face comes out clockwise and is dropped.
 */
export function detectRooms(walls: readonly WallLike[], tol = NODE_TOLERANCE): DetectedRoom[] {
  const g = buildWallGraph(walls, tol);

  // Prune filaments: repeatedly remove nodes with degree ≤ 1.
  const alive = new Set(g.edges.map((e) => e.id));
  const degree = g.nodes.map((n) => n.edges.length);
  const queue = g.nodes.filter((n) => n.edges.length <= 1).map((n) => n.id);
  while (queue.length > 0) {
    const nid = queue.pop();
    if (nid === undefined) break;
    const node = g.nodes[nid];
    if (!node) continue;
    for (const eid of node.edges) {
      if (!alive.has(eid)) continue;
      alive.delete(eid);
      const e = g.edges[eid];
      if (!e) continue;
      const other = e.a === nid ? e.b : e.a;
      degree[nid] = (degree[nid] ?? 1) - 1;
      degree[other] = (degree[other] ?? 1) - 1;
      if (degree[other] === 1) queue.push(other);
    }
  }

  // Neighbours sorted counter-clockwise by angle.
  const nbrs = new Map<number, { node: number; edge: number }[]>();
  for (const node of g.nodes) {
    const list: { node: number; edge: number; ang: number }[] = [];
    for (const eid of node.edges) {
      if (!alive.has(eid)) continue;
      const e = g.edges[eid];
      if (!e) continue;
      const other = e.a === node.id ? e.b : e.a;
      const op = g.nodes[other]?.pos;
      if (!op) continue;
      list.push({ node: other, edge: eid, ang: Math.atan2(op.y - node.pos.y, op.x - node.pos.x) });
    }
    list.sort((a, b) => a.ang - b.ang);
    nbrs.set(node.id, list);
  }

  const visited = new Set<string>();
  const rooms: DetectedRoom[] = [];

  for (const eid of alive) {
    const e = g.edges[eid];
    if (!e) continue;
    for (const [from, to] of [
      [e.a, e.b],
      [e.b, e.a],
    ] as const) {
      if (visited.has(`${from}>${to}`)) continue;

      const nodeIds: number[] = [];
      const wallIds = new Set<ID>();
      let u = from;
      let v = to;
      let edgeId = eid;
      let guard = 0;
      while (!visited.has(`${u}>${v}`) && guard++ < 10_000) {
        visited.add(`${u}>${v}`);
        nodeIds.push(u);
        const w = g.edges[edgeId];
        if (w) wallIds.add(w.wallId);

        const list = nbrs.get(v) ?? [];
        const idx = list.findIndex((n) => n.node === u);
        const next = list[(idx - 1 + list.length) % list.length];
        if (!next) break;
        u = v;
        v = next.node;
        edgeId = next.edge;
      }

      const raw = nodeIds.map((id) => g.nodes[id]?.pos).filter((p): p is Vec2 => !!p);
      if (signedArea(raw) <= MIN_ROOM_AREA) continue; // outer face or sliver
      const polygon = simplify(raw);
      const ids = [...wallIds].sort();
      rooms.push({
        key: ids.join('|'),
        polygon,
        area: polyArea(polygon),
        perimeter: polyPerimeter(polygon),
        wallIds: ids,
        labelAt: labelPoint(polygon),
      });
    }
  }

  // Deterministic order, and unique keys in pathological cases.
  rooms.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.area - b.area));
  const seen = new Map<string, number>();
  for (const r of rooms) {
    const n = (seen.get(r.key) ?? 0) + 1;
    seen.set(r.key, n);
    if (n > 1) r.key = `${r.key}#${n}`;
  }
  return rooms;
}
