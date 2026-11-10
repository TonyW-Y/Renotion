import type { DetectedRoom } from './geometry/roomDetection';
import type { RoomMeta } from './types';

export interface ResolvedRoom extends DetectedRoom {
  /** The stored metadata for this room, if any (possibly under an older key). */
  meta: RoomMeta | null;
  /** Display name: the stored name or a default like "Room 2". */
  name: string;
}

const wallSet = (key: string) => new Set(key.split('#')[0]?.split('|') ?? []);

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Pairs detected rooms with stored metadata.
 *
 * Room keys are derived from bounding wall ids, so they change when a wall is
 * added to or removed from a room's boundary. Exact key matches win; any
 * leftover metadata is then matched to the unclaimed room whose wall set
 * overlaps most (Jaccard ≥ `threshold`), so names and finishes survive edits.
 */
export function resolveRooms(
  rooms: readonly DetectedRoom[],
  metas: readonly RoomMeta[],
  threshold = 0.5,
): ResolvedRoom[] {
  const byKey = new Map(metas.map((m) => [m.key, m]));
  const claimed = new Set<string>();
  const result = new Map<DetectedRoom, RoomMeta>();

  for (const r of rooms) {
    const m = byKey.get(r.key);
    if (m) {
      result.set(r, m);
      claimed.add(m.key);
    }
  }

  const candidates: { room: DetectedRoom; meta: RoomMeta; score: number }[] = [];
  for (const meta of metas) {
    if (claimed.has(meta.key)) continue;
    const ms = wallSet(meta.key);
    for (const room of rooms) {
      if (result.has(room)) continue;
      const score = jaccard(ms, new Set(room.wallIds));
      if (score >= threshold) candidates.push({ room, meta, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    if (result.has(c.room) || claimed.has(c.meta.key)) continue;
    result.set(c.room, c.meta);
    claimed.add(c.meta.key);
  }

  let n = 0;
  return rooms.map((room) => {
    n++;
    const meta = result.get(room) ?? null;
    return { ...room, meta, name: meta?.name ?? `Room ${n}` };
  });
}
