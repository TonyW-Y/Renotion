import { useMemo } from 'react';
import type { TaskStatus } from '@/core/project';
import { generateTasks, type TaskSpec } from '@/core/tasks/generate';
import { buildSchedule, type Schedule } from '@/core/tasks/schedule';
import { usePlanStore } from './planStore';
import { useEstimate } from './useEstimate';

export interface Task extends TaskSpec {
  status: TaskStatus;
  notes: string;
  /** Template duration before any user override. */
  defaultDuration: number;
}

export interface ScheduleResult {
  tasks: Task[];
  schedule: Schedule<Task> | null;
  error: Error | null;
  hasPlanned: boolean;
}

/** Today's local date as YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tasks generated from the plan diff, merged with saved status/notes, and scheduled. */
export function useSchedule(): ScheduleResult {
  const { events, hasPlanned } = useEstimate();
  const state = usePlanStore((s) => s.project.tasks);
  const startDate = usePlanStore((s) => s.project.startDate);
  const skipWeekends = usePlanStore((s) => s.project.skipWeekends);

  const tasks = useMemo<Task[]>(
    () =>
      generateTasks(events).map((t) => {
        const st = state[t.key];
        return {
          ...t,
          defaultDuration: t.durationDays,
          durationDays: st?.durationDays ?? t.durationDays,
          status: st?.status ?? 'todo',
          notes: st?.notes ?? '',
        };
      }),
    [events, state],
  );

  return useMemo(() => {
    try {
      return {
        tasks,
        schedule: buildSchedule(tasks, startDate ?? todayIso(), { skipWeekends }),
        error: null,
        hasPlanned,
      };
    } catch (e) {
      return {
        tasks,
        schedule: null,
        error: e instanceof Error ? e : new Error(String(e)),
        hasPlanned,
      };
    }
  }, [tasks, startDate, skipWeekends, hasPlanned]);
}
