import { describe, expect, it } from 'vitest';
import {
  addWorkdays,
  buildSchedule,
  MissingDependencyError,
  nextWorkday,
  ScheduleCycleError,
  topologicalSort,
  type SchedulableTask,
} from './schedule';

const t = (key: string, durationDays: number, deps: string[] = []): SchedulableTask => ({
  key,
  durationDays,
  deps,
});

// 2026-11-09 is a Monday.
const MON = '2026-11-09';

describe('working-day arithmetic', () => {
  it('skips weekends', () => {
    expect(addWorkdays('2026-11-13', 1, true)).toBe('2026-11-16'); // Fri + 1 → Mon
    expect(addWorkdays('2026-11-13', 1, false)).toBe('2026-11-14'); // Fri + 1 → Sat
    expect(addWorkdays(MON, 5, true)).toBe('2026-11-16');
    expect(nextWorkday('2026-11-14', true)).toBe('2026-11-16'); // Sat → Mon
    expect(nextWorkday('2026-11-14', false)).toBe('2026-11-14');
  });
});

describe('topologicalSort', () => {
  it('orders dependencies first', () => {
    const order = topologicalSort([t('c', 1, ['b']), t('b', 1, ['a']), t('a', 1)]).map(
      (x) => x.key,
    );
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('detects a cycle and reports it', () => {
    let err: unknown;
    try {
      topologicalSort([t('a', 1, ['c']), t('b', 1, ['a']), t('c', 1, ['b']), t('d', 1)]);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ScheduleCycleError);
    const cycle = (err as ScheduleCycleError).cycle;
    expect(new Set(cycle)).toEqual(new Set(['a', 'b', 'c']));
    expect(cycle[0]).toBe(cycle.at(-1)); // closed loop
  });

  it('detects a self-dependency', () => {
    expect(() => topologicalSort([t('a', 1, ['a'])])).toThrow(ScheduleCycleError);
  });

  it('rejects unknown dependencies', () => {
    expect(() => topologicalSort([t('a', 1, ['ghost'])])).toThrow(MissingDependencyError);
  });
});

describe('buildSchedule', () => {
  it('runs independent tasks in parallel and chains dependent ones', () => {
    // A (2d) → B (1d); C (1d) independent.
    const s = buildSchedule([t('A', 2), t('B', 1, ['A']), t('C', 1)], MON);
    const at = (k: string) => s.items.find((i) => i.task.key === k);
    expect(at('A')).toMatchObject({
      startDay: 0,
      endDay: 2,
      startDate: MON,
      endDate: '2026-11-10',
    });
    expect(at('B')).toMatchObject({
      startDay: 2,
      endDay: 3,
      startDate: '2026-11-11',
      endDate: '2026-11-11',
    });
    expect(at('C')).toMatchObject({ startDay: 0, endDay: 1, startDate: MON, endDate: MON });
    expect(s.totalDays).toBe(3);
    expect(s.endDate).toBe('2026-11-11');
  });

  it('waits for the slowest branch of a diamond', () => {
    const s = buildSchedule(
      [t('A', 1), t('B', 3, ['A']), t('C', 1, ['A']), t('D', 1, ['B', 'C'])],
      MON,
    );
    expect(s.items.find((i) => i.task.key === 'D')?.startDay).toBe(4);
    expect(s.totalDays).toBe(5);
  });

  it('skips weekends when spanning them', () => {
    // 4 days from Thursday: Thu, Fri, Mon, Tue.
    const s = buildSchedule([t('A', 4)], '2026-11-12');
    expect(s.items[0]).toMatchObject({ startDate: '2026-11-12', endDate: '2026-11-17' });
    const raw = buildSchedule([t('A', 4)], '2026-11-12', { skipWeekends: false });
    expect(raw.items[0]?.endDate).toBe('2026-11-15');
  });

  it('moves a weekend start date to Monday', () => {
    expect(buildSchedule([t('A', 1)], '2026-11-14').startDate).toBe('2026-11-16');
  });

  it('packs half days into the same calendar day', () => {
    const s = buildSchedule([t('A', 0.5), t('B', 0.5, ['A'])], MON);
    expect(s.items.map((i) => [i.startDate, i.endDate])).toEqual([
      [MON, MON],
      [MON, MON],
    ]);
    expect(s.totalDays).toBe(1);
  });

  it('handles an empty task list', () => {
    expect(buildSchedule([], MON)).toEqual({
      items: [],
      totalDays: 0,
      startDate: MON,
      endDate: MON,
    });
  });
});
