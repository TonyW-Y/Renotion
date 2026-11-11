import type { ChangeEvent } from '../diff';
import { getMaterial } from '../estimate/defaultCosts';
import { openingStyleInfo } from '../openings';
import { halfDays, PHASE_ORDER, TEMPLATES, type TaskPhase, type TaskTemplate } from './templates';

export interface TaskSpec {
  /** Deterministic key, so user status / notes survive regeneration. */
  key: string;
  templateKey: string;
  title: string;
  roomKey: string | null;
  roomName: string;
  phase: TaskPhase;
  durationDays: number;
  /** Keys of tasks that must finish first. */
  deps: string[];
}

const roomId = (key: string | null) => key ?? 'exterior';

function chain(
  base: string,
  templateGroup: keyof typeof TEMPLATES,
  templates: readonly TaskTemplate[],
  room: { roomKey: string | null; roomName: string },
  qty: number,
  titlePrefix = '',
): TaskSpec[] {
  let prev: string | null = null;
  return templates.map((t) => {
    const key = `${base}:${t.step}`;
    const spec: TaskSpec = {
      key,
      templateKey: `${templateGroup}.${t.step}`,
      title: titlePrefix ? `${titlePrefix}: ${t.title}` : t.title,
      roomKey: room.roomKey,
      roomName: room.roomName,
      phase: t.phase,
      durationDays: typeof t.duration === 'number' ? t.duration : t.duration(qty),
      deps: prev ? [prev] : [],
    };
    prev = key;
    return spec;
  });
}

/**
 * Turns plan changes into a task list with dependencies:
 *  - each change type expands into its template chain;
 *  - wall painting is grouped per room;
 *  - cross-room rules: all demolition before any drywall, all drywall
 *    before any painting, and painting before flooring in the same room.
 */
export function generateTasks(events: readonly ChangeEvent[]): TaskSpec[] {
  const tasks: TaskSpec[] = [];
  interface RoomArea {
    roomKey: string | null;
    roomName: string;
    area: number;
  }
  const paintedRooms = new Map<string, RoomArea>();
  const finished = new Map<string, RoomArea>();
  const furnished = new Map<string, { roomKey: string | null; roomName: string; pieces: number }>();

  for (const e of events) {
    switch (e.type) {
      case 'floorChanged':
        tasks.push(
          ...chain(`floor:${roomId(e.roomKey)}`, 'floorChanged', TEMPLATES.floorChanged, e, e.area),
        );
        break;
      case 'wallPainted':
        for (const s of e.shares) {
          const textured = getMaterial(e.to)?.category === 'wallFinish' && !e.tintOnly;
          const painted = textured ? finished : paintedRooms;
          const k = roomId(s.roomKey);
          const cur = painted.get(k) ?? { roomKey: s.roomKey, roomName: s.roomName, area: 0 };
          cur.area += s.area;
          painted.set(k, cur);
        }
        break;
      case 'wallRemoved':
        tasks.push(...chain(`remove:${e.wallId}`, 'wallRemoved', TEMPLATES.wallRemoved, e, 1));
        break;
      case 'wallAdded': {
        const room = e.shares.find((s) => s.roomKey !== null) ??
          e.shares[0] ?? { roomKey: null, roomName: 'Exterior' };
        tasks.push(...chain(`add:${e.wallId}`, 'wallAdded', TEMPLATES.wallAdded, room, 1));
        break;
      }
      case 'openingAdded':
        tasks.push(
          ...chain(
            `open:${e.openingId}`,
            'openingAdded',
            TEMPLATES.openingAdded,
            e,
            1,
            `New ${e.style ? `${openingStyleInfo({ type: e.kind, style: e.style }).name.toLowerCase()} ` : ''}${e.kind}`,
          ),
        );
        break;
      case 'furnitureAdded': {
        const k = roomId(e.roomKey);
        const cur = furnished.get(k) ?? { roomKey: e.roomKey, roomName: e.roomName, pieces: 0 };
        cur.pieces += 1;
        furnished.set(k, cur);
        break;
      }
      case 'openingRefinished':
        tasks.push(
          ...chain(
            `refinish:${e.openingId}`,
            'openingRefinished',
            TEMPLATES.openingRefinished,
            e,
            1,
            e.kind === 'door' ? 'Door' : 'Window',
          ),
        );
        break;
      case 'openingRemoved':
        tasks.push(
          ...chain(
            `close:${e.openingId}`,
            'openingRemoved',
            TEMPLATES.openingRemoved,
            e,
            1,
            e.kind === 'door' ? 'Old door' : 'Old window',
          ),
        );
        break;
    }
  }

  for (const [k, p] of finished) {
    tasks.push(...chain(`finish:${k}`, 'roomWallFinished', TEMPLATES.roomWallFinished, p, p.area));
  }
  for (const [k, p] of paintedRooms) {
    tasks.push(...chain(`paint:${k}`, 'roomPainted', TEMPLATES.roomPainted, p, p.area));
  }

  for (const [k, f] of furnished) {
    const [task] = chain(`furnish:${k}`, 'roomFurnished', TEMPLATES.roomFurnished, f, f.pieces);
    if (task) {
      task.title = `${task.title} (${f.pieces} ${f.pieces === 1 ? 'piece' : 'pieces'})`;
      tasks.push(task);
    }
  }

  // Cross-room ordering rules.
  const keysWhere = (pred: (t: TaskSpec) => boolean) => tasks.filter(pred).map((t) => t.key);
  const demolition = keysWhere((t) => t.phase === 'demolition');
  const drywall = keysWhere((t) => t.phase === 'drywall');
  const addDeps = (t: TaskSpec, deps: string[]) => {
    for (const d of deps) if (d !== t.key && !t.deps.includes(d)) t.deps.push(d);
  };
  for (const t of tasks) {
    if (t.phase === 'drywall') addDeps(t, demolition);
    if (t.phase === 'prep' || t.phase === 'paint') {
      if (
        t.templateKey.startsWith('roomPainted') ||
        t.templateKey.startsWith('roomWallFinished') ||
        t.templateKey.startsWith('wallRemoved.paint')
      )
        addDeps(t, drywall);
    }
    // Furniture goes in once everything else in that room is done.
    if (t.phase === 'furnish') {
      addDeps(
        t,
        keysWhere((p) => p.roomKey === t.roomKey && p.phase !== 'furnish'),
      );
    }
    if (t.templateKey === 'floorChanged.install') {
      addDeps(
        t,
        keysWhere((p) => p.roomKey === t.roomKey && p.phase === 'paint'),
      );
    }
  }

  const rank = (p: TaskPhase) => PHASE_ORDER.indexOf(p);
  return tasks.sort(
    (a, b) => rank(a.phase) - rank(b.phase) || a.roomName.localeCompare(b.roomName),
  );
}

export { halfDays };
