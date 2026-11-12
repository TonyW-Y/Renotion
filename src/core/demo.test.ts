import { describe, expect, it } from 'vitest';
import { createDemoProject } from './demo';
import { diffPlans } from './diff';
import { buildEstimate } from './estimate/costs';
import { canPlaceFurniture } from './furniture/placement';
import { detectRooms } from './geometry/roomDetection';
import { canPlaceOpening } from './geometry/walls';
import { resolveRooms } from './rooms';
import { generateTasks } from './tasks/generate';
import { buildSchedule } from './tasks/schedule';
import type { Plan } from './types';

const demo = createDemoProject('demo', '2026-01-05T09:00:00.000Z');
if (!demo.planned) throw new Error('demo has no renovation plan');
const planned = demo.planned;
const names = (plan: Plan) =>
  resolveRooms(detectRooms(plan.walls), plan.rooms)
    .map((r) => r.name)
    .sort();

describe('demo project', () => {
  it('has four rooms today and an open plan after the renovation', () => {
    expect(names(demo.baseline)).toEqual(['Bedroom', 'Den', 'Kitchen', 'Living room']);
    expect(names(planned)).toEqual(['Bedroom', 'Den', 'Kitchen & living']);
  });

  it('places every piece of furniture clear of the walls', () => {
    for (const plan of [demo.baseline, planned]) {
      for (const item of plan.furniture) {
        expect(canPlaceFurniture(item, plan), item.id).toBe(true);
      }
    }
  });

  it('fits every door and window in its wall', () => {
    for (const plan of [demo.baseline, planned]) {
      for (const o of plan.openings) {
        const wall = plan.walls.find((w) => w.id === o.wallId);
        expect(wall, o.id).toBeDefined();
        if (!wall) continue;
        expect(canPlaceOpening(o, wall, plan.openings, wall.id), o.id).toBe(true);
        expect(o.sillHeight + o.height).toBeLessThanOrEqual(wall.height);
      }
    }
  });

  it('produces an estimate touching every kind of work', () => {
    const estimate = buildEstimate(diffPlans(demo.baseline, planned));
    const categories = estimate.byCategory.map((c) => c.key).sort();
    expect(categories).toEqual(
      expect.arrayContaining([
        'ceiling',
        'demolition',
        'doors',
        'flooring',
        'furniture',
        'paint',
        'wallFinish',
        'windows',
      ]),
    );
    expect(estimate.total).toBeGreaterThan(5000);
  });

  it('schedules cleanly and logs an expense', () => {
    const tasks = generateTasks(diffPlans(demo.baseline, planned));
    expect(tasks.length).toBeGreaterThan(10);
    expect(() => buildSchedule(tasks, '2026-01-05')).not.toThrow();
    expect(demo.expenses).toHaveLength(1);
  });
});
