import { PHASE_ORDER, type TaskPhase } from './templates';

export interface SchedulableTask {
  key: string;
  durationDays: number;
  deps: readonly string[];
  phase?: TaskPhase;
}

export interface ScheduledTask<T extends SchedulableTask = SchedulableTask> {
  task: T;
  /** Working-day offsets from the project start (fractional). */
  startDay: number;
  endDay: number;
  /** ISO dates (YYYY-MM-DD), inclusive. */
  startDate: string;
  endDate: string;
}

export interface Schedule<T extends SchedulableTask = SchedulableTask> {
  items: ScheduledTask<T>[];
  /** Total length in working days. */
  totalDays: number;
  startDate: string;
  endDate: string;
}

/** Thrown when task dependencies form a cycle. */
export class ScheduleCycleError extends Error {
  override readonly name = 'ScheduleCycleError';
  constructor(readonly cycle: readonly string[]) {
    super(`Task dependencies form a cycle: ${cycle.join(' → ')}`);
  }
}

/** Thrown when a task depends on a key that doesn't exist. */
export class MissingDependencyError extends Error {
  override readonly name = 'MissingDependencyError';
  constructor(
    readonly task: string,
    readonly dependency: string,
  ) {
    super(`Task "${task}" depends on unknown task "${dependency}"`);
  }
}

/* ---------------- dates (UTC, no time-zone surprises) ---------------- */

const parse = (iso: string): Date => {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const format = (d: Date): string => d.toISOString().slice(0, 10);
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** The first working day on or after `iso`. */
export function nextWorkday(iso: string, skipWeekends: boolean): string {
  const d = parse(iso);
  while (skipWeekends && isWeekend(d)) d.setUTCDate(d.getUTCDate() + 1);
  return format(d);
}

/** Adds `n` working days (n ≥ 0) to a working day. */
export function addWorkdays(iso: string, n: number, skipWeekends: boolean): string {
  const d = parse(iso);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!skipWeekends || !isWeekend(d)) left--;
  }
  return format(d);
}

/* ---------------- topological sort ---------------- */

/**
 * Kahn's algorithm. Ties are broken by phase order, then input order, so the
 * result is stable. Throws ScheduleCycleError (with the cycle) on cycles.
 */
export function topologicalSort<T extends SchedulableTask>(tasks: readonly T[]): T[] {
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  const indegree = new Map(tasks.map((t) => [t.key, 0]));
  const dependents = new Map<string, string[]>(tasks.map((t) => [t.key, []]));
  for (const t of tasks) {
    for (const d of t.deps) {
      if (!byKey.has(d)) throw new MissingDependencyError(t.key, d);
      indegree.set(t.key, (indegree.get(t.key) ?? 0) + 1);
      dependents.get(d)?.push(t.key);
    }
  }

  const order = new Map(tasks.map((t, i) => [t.key, i]));
  const rank = (k: string) => {
    const p = byKey.get(k)?.phase;
    return (p ? PHASE_ORDER.indexOf(p) : 0) * 1e6 + (order.get(k) ?? 0);
  };
  const ready = tasks.filter((t) => indegree.get(t.key) === 0).map((t) => t.key);
  const out: T[] = [];
  while (ready.length > 0) {
    ready.sort((a, b) => rank(a) - rank(b));
    const k = ready.shift();
    if (k === undefined) break;
    const t = byKey.get(k);
    if (t) out.push(t);
    for (const n of dependents.get(k) ?? []) {
      const left = (indegree.get(n) ?? 0) - 1;
      indegree.set(n, left);
      if (left === 0) ready.push(n);
    }
  }

  if (out.length !== tasks.length) throw new ScheduleCycleError(findCycle(tasks));
  return out;
}

/** Finds one dependency cycle among `tasks` (DFS), for error reporting. */
function findCycle(tasks: readonly SchedulableTask[]): string[] {
  const deps = new Map(tasks.map((t) => [t.key, t.deps]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (k: string): string[] | null => {
    if (state.get(k) === 'done') return null;
    if (state.get(k) === 'visiting') return [...stack.slice(stack.indexOf(k)), k];
    state.set(k, 'visiting');
    stack.push(k);
    for (const d of deps.get(k) ?? []) {
      const c = visit(d);
      if (c) return c;
    }
    stack.pop();
    state.set(k, 'done');
    return null;
  };
  for (const t of tasks) {
    const c = visit(t.key);
    if (c) return c.reverse();
  }
  return [];
}

/* ---------------- scheduling ---------------- */

/**
 * Earliest-start schedule: each task starts when its last dependency ends.
 * Durations are in working days; weekends are skipped when requested.
 */
export function buildSchedule<T extends SchedulableTask>(
  tasks: readonly T[],
  startDate: string,
  { skipWeekends = true }: { skipWeekends?: boolean } = {},
): Schedule<T> {
  const sorted = topologicalSort(tasks);
  const first = nextWorkday(startDate, skipWeekends);
  const end = new Map<string, number>();
  const items: ScheduledTask<T>[] = sorted.map((task) => {
    const startDay = Math.max(0, ...task.deps.map((d) => end.get(d) ?? 0));
    const endDay = startDay + Math.max(0, task.durationDays);
    end.set(task.key, endDay);
    return {
      task,
      startDay,
      endDay,
      startDate: addWorkdays(first, Math.floor(startDay), skipWeekends),
      endDate: addWorkdays(
        first,
        Math.max(Math.floor(startDay), Math.ceil(endDay) - 1),
        skipWeekends,
      ),
    };
  });
  const totalDays = Math.max(0, ...items.map((i) => i.endDay));
  return {
    items,
    totalDays,
    startDate: first,
    endDate: items.length
      ? addWorkdays(first, Math.max(0, Math.ceil(totalDays) - 1), skipWeekends)
      : first,
  };
}
