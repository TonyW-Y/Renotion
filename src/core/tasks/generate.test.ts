import { describe, expect, it } from 'vitest';
import type { ChangeEvent } from '../diff';
import { generateTasks } from './generate';
import { buildSchedule } from './schedule';

const room = { roomKey: 'r1', roomName: 'Living' };
const floor: ChangeEvent = {
  type: 'floorChanged',
  ...room,
  from: null,
  to: 'oak-hardwood',
  area: 12,
  perimeter: 14,
  doorWidths: [],
};
const paint: ChangeEvent = {
  type: 'wallPainted',
  wallId: 'w1',
  side: 'a',
  from: null,
  to: 'paint-sage',
  shares: [{ ...room, area: 30 }],
};
const removed: ChangeEvent = { type: 'wallRemoved', wallId: 'w9', length: 3, height: 2.4, ...room };

describe('generateTasks', () => {
  it('expands a floor change into its chain with area-based durations', () => {
    const tasks = generateTasks([floor]);
    expect(tasks.map((t) => t.templateKey)).toEqual([
      'floorChanged.remove',
      'floorChanged.prep',
      'floorChanged.install',
      'floorChanged.baseboard',
    ]);
    // 12 m²: remove 12/25 → 0.5, prep 12/30 → 0.5, install 12/15 = 0.8 → 1, baseboard 0.5
    expect(tasks.map((t) => t.durationDays)).toEqual([0.5, 0.5, 1, 0.5]);
    expect(tasks[1]?.deps).toEqual(['floor:r1:remove']);
  });

  it('groups painting per room', () => {
    const tasks = generateTasks([paint, { ...paint, wallId: 'w2' }]);
    expect(tasks.filter((t) => t.templateKey === 'roomPainted.paint')).toHaveLength(1);
    // 60 m² → paint 60/30 = 2 days
    expect(tasks.find((t) => t.templateKey === 'roomPainted.paint')?.durationDays).toBe(2);
  });

  it('applies cross-room ordering rules', () => {
    const tasks = generateTasks([floor, paint, removed]);
    const by = (k: string) => tasks.find((t) => t.key === k);
    // All demolition (including the floor removal) before drywall.
    expect(by('remove:w9:patch')?.deps).toEqual(
      expect.arrayContaining(['floor:r1:remove', 'remove:w9:demo']),
    );
    // Drywall before painting.
    expect(by('paint:r1:patch')?.deps).toContain('remove:w9:patch');
    // Paint before flooring install in the same room.
    expect(by('floor:r1:install')?.deps).toEqual(
      expect.arrayContaining(['paint:r1:prime', 'paint:r1:paint']),
    );
  });

  it('produces an acyclic, schedulable plan', () => {
    const tasks = generateTasks([floor, paint, removed]);
    const s = buildSchedule(tasks, '2026-11-09');
    const pos = (k: string) => s.items.findIndex((i) => i.task.key === k);
    expect(pos('remove:w9:consult')).toBeLessThan(pos('remove:w9:demo'));
    expect(pos('paint:r1:paint')).toBeLessThan(pos('floor:r1:install'));
    const end = (k: string) => s.items.find((i) => i.task.key === k)?.endDay ?? -1;
    const start = (k: string) => s.items.find((i) => i.task.key === k)?.startDay ?? -1;
    expect(start('floor:r1:install')).toBeGreaterThanOrEqual(end('paint:r1:paint'));
  });

  it('labels opening tasks by kind', () => {
    const tasks = generateTasks([
      { type: 'openingAdded', openingId: 'o1', kind: 'window', width: 1, ...room },
    ]);
    expect(tasks[0]?.title).toBe('New window: Cut opening & install header');
  });
});

describe('generateTasks: furniture', () => {
  const sofa: ChangeEvent = {
    type: 'furnitureAdded',
    itemId: 'f1',
    modelId: 'sofa',
    sizeFactor: 1,
    ...room,
  };
  const chair: ChangeEvent = { ...sofa, itemId: 'f2', modelId: 'dining-chair' };

  it("adds one delivery task per room, after that room's paint and flooring", () => {
    const tasks = generateTasks([sofa, chair, floor, paint]);
    const furnish = tasks.filter((t) => t.phase === 'furnish');
    expect(furnish).toHaveLength(1);
    const f = furnish[0];
    expect(f?.title).toBe('Deliver & set up furniture (2 pieces)');
    const install = tasks.find((t) => t.templateKey === 'floorChanged.install');
    const painting = tasks.find((t) => t.templateKey === 'roomPainted.paint');
    expect(f?.deps).toContain(install?.key);
    expect(f?.deps).toContain(painting?.key);
    expect(tasks.at(-1)?.phase).toBe('furnish');
    expect(() => buildSchedule(tasks, '2026-01-05')).not.toThrow();
  });
});
