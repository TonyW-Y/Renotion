import type { ID, Vec2 } from '../types';
import { distance, lerp, projectOntoSegment, segmentIntersection } from './vec2';

/** Endpoints closer than this are treated as the same node (metres). */
export const NODE_TOLERANCE = 0.01;

export interface WallLike {
  id: ID;
  start: Vec2;
  end: Vec2;
}

export interface GraphNode {
  id: number;
  pos: Vec2;
  /** Ids of incident edges. */
  edges: number[];
}

export interface GraphEdge {
  id: number;
  a: number;
  b: number;
  /** The plan wall this edge is (part of). */
  wallId: ID;
}

export interface WallGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Builds a planar graph from walls:
 *  - endpoints within `tol` are merged into one node;
 *  - a wall is split wherever another wall's endpoint lands on its interior (T-junction);
 *  - crossing walls are split at their intersection.
 * Each edge remembers the id of the wall it came from.
 */
export function buildWallGraph(walls: readonly WallLike[], tol = NODE_TOLERANCE): WallGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  const nodeAt = (p: Vec2): GraphNode => {
    for (const n of nodes) if (distance(n.pos, p) <= tol) return n;
    const n: GraphNode = { id: nodes.length, pos: { x: p.x, y: p.y }, edges: [] };
    nodes.push(n);
    return n;
  };

  const valid = walls.filter((w) => distance(w.start, w.end) > tol);

  // Register every endpoint first so splits snap to existing endpoint positions.
  for (const w of valid) {
    nodeAt(w.start);
    nodeAt(w.end);
  }

  for (const w of valid) {
    const len = distance(w.start, w.end);
    const tTol = tol / len;
    const ts = [0, 1];

    for (const other of valid) {
      if (other === w) continue;
      for (const q of [other.start, other.end]) {
        const proj = projectOntoSegment(q, w.start, w.end);
        if (proj.distance <= tol && proj.t > tTol && proj.t < 1 - tTol) ts.push(proj.t);
      }
      const hit = segmentIntersection(w.start, w.end, other.start, other.end);
      if (hit && hit.t > tTol && hit.t < 1 - tTol) ts.push(hit.t);
    }

    ts.sort((a, b) => a - b);
    let prev = nodeAt(w.start);
    for (let i = 1; i < ts.length; i++) {
      const t = ts[i] ?? 1;
      const next = i === ts.length - 1 ? nodeAt(w.end) : nodeAt(lerp(w.start, w.end, t));
      if (next.id !== prev.id) {
        const key = prev.id < next.id ? `${prev.id}-${next.id}` : `${next.id}-${prev.id}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          const e: GraphEdge = { id: edges.length, a: prev.id, b: next.id, wallId: w.id };
          edges.push(e);
          prev.edges.push(e.id);
          next.edges.push(e.id);
        }
      }
      prev = next;
    }
  }

  return { nodes, edges };
}

export interface EndpointJoins {
  start: boolean;
  end: boolean;
}

/**
 * For each wall, whether each endpoint touches another wall (shared corner or
 * T-junction). Joined ends get extended by half the thickness so corners close.
 */
export function endpointJoins(
  walls: readonly WallLike[],
  tol = NODE_TOLERANCE,
): Map<ID, EndpointJoins> {
  const touches = (p: Vec2, self: WallLike) =>
    walls.some((o) => o !== self && projectOntoSegment(p, o.start, o.end).distance <= tol);
  return new Map(walls.map((w) => [w.id, { start: touches(w.start, w), end: touches(w.end, w) }]));
}
