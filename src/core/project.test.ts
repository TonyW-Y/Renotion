import { describe, expect, it } from 'vitest';
import { clonePlan, createProject, getPlan, normalizeProject } from './project';

describe('project', () => {
  it('creates an empty project with only a baseline', () => {
    const p = createProject('p1', 'Home', '2026-01-01T00:00:00.000Z');
    expect(p.baseline.walls).toEqual([]);
    expect(p.planned).toBeNull();
    expect(getPlan(p, 'planned')).toBe(p.baseline);
  });

  it('clones plans deeply', () => {
    const p = createProject('p1');
    const c = clonePlan(p.baseline);
    c.walls.push({
      id: 'w',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      thickness: 0.1,
      height: 2,
    });
    expect(p.baseline.walls).toEqual([]);
  });

  it('normalizes partial or old documents', () => {
    const p = normalizeProject({ id: 'x', baseline: { walls: [] } });
    expect(p?.name).toBe('Untitled project');
    expect(p?.baseline.openings).toEqual([]);
    expect(p?.planned).toBeNull();
    expect(p?.costOverrides).toEqual({});
    expect(
      normalizeProject({ id: 'x', costOverrides: { oak: 8, bad: 'x', neg: -1 } })?.costOverrides,
    ).toEqual({ oak: 8 });
    expect(p?.skipWeekends).toBe(true);
    expect(p?.tasks).toEqual({});
    expect(p?.expenses).toEqual([]);
    const withTasks = normalizeProject({
      id: 'x',
      startDate: '2026-11-09',
      tasks: { a: { status: 'done', durationDays: 2 }, b: { status: 'nope' } },
      expenses: [
        {
          id: 'e',
          spentOn: '2026-11-10',
          description: 'Paint',
          category: 'paint',
          roomKey: null,
          amount: 62,
        },
        { id: 1 },
      ],
    });
    expect(withTasks?.startDate).toBe('2026-11-09');
    expect(withTasks?.tasks).toEqual({ a: { status: 'done', durationDays: 2 } });
    expect(withTasks?.expenses).toHaveLength(1);
    expect(normalizeProject(null)).toBeNull();
    expect(normalizeProject({ name: 'no id' })).toBeNull();
  });
});
