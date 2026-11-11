import { motion } from 'motion/react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Clock,
  ListChecks,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { Button, CommitInput, Tooltip } from '@/components/ui';
import type { TaskStatus } from '@/core/project';
import { addWorkdays } from '@/core/tasks/schedule';
import { PHASE_LABELS, PHASE_ORDER } from '@/core/tasks/templates';
import { cn } from '@/lib/cn';
import { usePlanStore } from '@/state/planStore';
import { todayIso, useSchedule, type Task } from '@/state/useSchedule';
import { useUiStore } from '@/state/uiStore';
import { PHASE_COLORS } from './phaseColors';

const NEXT: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

const fmtDate = (
  iso: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) => {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', opts);
};

function StatusButton({ task }: { task: Task }) {
  const updateTask = usePlanStore((s) => s.updateTask);
  const s = task.status;
  return (
    <Tooltip content={`${STATUS_LABEL[s]} — click for ${STATUS_LABEL[NEXT[s]].toLowerCase()}`}>
      <button
        type="button"
        aria-label={`${task.title}: ${STATUS_LABEL[s]}`}
        onClick={() => {
          updateTask(task.key, { status: NEXT[s] });
        }}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full transition-all',
          s === 'done' && 'bg-success text-white',
          s === 'in_progress' && 'text-warning',
          s === 'todo' && 'text-fg-subtle hover:text-fg',
        )}
      >
        {s === 'done' ? (
          <Check className="size-3" strokeWidth={3} />
        ) : s === 'in_progress' ? (
          <Clock className="size-[18px]" />
        ) : (
          <CircleDashed className="size-[18px]" />
        )}
      </button>
    </Tooltip>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3.5 shadow-panel">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <p className="tabular mt-0.5 font-mono text-xl font-semibold text-fg">{value}</p>
      {sub && <p className="text-[11px] text-fg-subtle">{sub}</p>}
    </div>
  );
}

export function ScheduleView() {
  const { tasks, schedule, error, hasPlanned } = useSchedule();
  const project = usePlanStore((s) => s.project);
  const setStartDate = usePlanStore((s) => s.setStartDate);
  const setSkipWeekends = usePlanStore((s) => s.setSkipWeekends);
  const updateTask = usePlanStore((s) => s.updateTask);
  const setSection = useUiStore((s) => s.setSection);
  const [open, setOpen] = useState<string | null>(null);

  const done = tasks.filter((t) => t.status === 'done').length;
  const DAY = 34; // px per working day
  const totalDays = Math.max(1, Math.ceil(schedule?.totalDays ?? 1));
  const today = todayIso();
  const days = schedule
    ? Array.from({ length: totalDays }, (_, i) =>
        addWorkdays(schedule.startDate, i, project.skipWeekends),
      )
    : [];
  const todayIdx = days.indexOf(today);

  // Group rows by room, in schedule order.
  const items = schedule?.items ?? [];
  const groups = new Map<string, typeof items>();
  for (const it of items)
    groups.set(it.task.roomName, [...(groups.get(it.task.roomName) ?? []), it]);

  return (
    <div className="h-full overflow-y-auto" data-testid="schedule-view">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">Schedule</h1>
            <p className="mt-1 max-w-lg text-sm text-fg-muted">
              Tasks generated from your changes, ordered so demolition comes before drywall, drywall
              before paint, and paint before new floors.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              Start
              <input
                type="date"
                aria-label="Project start date"
                value={project.startDate ?? today}
                onChange={(e) => {
                  setStartDate(e.target.value || null);
                }}
                className="h-8 rounded-lg bg-fg/[0.04] px-2 font-mono text-xs text-fg [color-scheme:inherit] shadow-[inset_0_0_0_1px_var(--border)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-muted select-none">
              <input
                type="checkbox"
                checked={project.skipWeekends}
                onChange={(e) => {
                  setSkipWeekends(e.target.checked);
                }}
                className="size-4 accent-[var(--accent)]"
              />
              Skip weekends
            </label>
          </div>
        </div>

        {!hasPlanned || tasks.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface shadow-float">
              <ListChecks className="size-5 text-accent" />
            </div>
            <h2 className="text-base font-semibold text-fg">
              {hasPlanned ? 'No tasks yet' : 'Start planning to build a schedule'}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-fg-muted">
              Change a floor, paint a wall, or move a wall in the renovation plan — the work needed
              shows up here as an ordered timeline.
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => {
                setSection('design');
              }}
            >
              Back to design
            </Button>
          </div>
        ) : error ? (
          <div className="mt-8 flex items-start gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-fg">
            <AlertTriangle className="mt-0.5 size-4 text-danger" />
            {error.message}
          </div>
        ) : schedule ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard label="Tasks" value={`${done} / ${tasks.length}`} sub="done" />
              <SummaryCard
                label="Duration"
                value={`${schedule.totalDays} days`}
                sub={project.skipWeekends ? 'working days' : 'calendar days'}
              />
              <SummaryCard
                label="Starts"
                value={fmtDate(schedule.startDate)}
                sub={fmtDate(schedule.startDate, { weekday: 'long' })}
              />
              <SummaryCard
                label="Finishes"
                value={fmtDate(schedule.endDate)}
                sub={fmtDate(schedule.endDate, { weekday: 'long' })}
              />
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
              <motion.div
                className="h-full rounded-full bg-success"
                animate={{ width: `${(done / tasks.length) * 100}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5">
              {PHASE_ORDER.filter((p) => tasks.some((t) => t.phase === p)).map((p) => (
                <span key={p} className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                  <span className="size-2.5 rounded-sm" style={{ background: PHASE_COLORS[p] }} />
                  {PHASE_LABELS[p]}
                </span>
              ))}
            </div>

            {/* Task list + Gantt */}
            <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-panel">
              <div className="flex">
                {/* Left: task list */}
                <div className="w-[min(420px,55%)] shrink-0 border-r border-border">
                  <div className="flex h-10 items-center border-b border-border px-4 text-[11px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">
                    Task
                    <span className="ml-auto">Days</span>
                  </div>
                  {[...groups.entries()].map(([room, rows]) => (
                    <Fragment key={room}>
                      <div className="flex h-8 items-center bg-fg/[0.025] px-4 text-xs font-semibold text-fg">
                        {room}
                      </div>
                      {rows.map(({ task }) => (
                        <div key={task.key} className="border-t border-border/60">
                          <div className="flex h-11 items-center gap-2.5 px-4">
                            <StatusButton task={task} />
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-1 text-left"
                              aria-expanded={open === task.key}
                              onClick={() => {
                                setOpen(open === task.key ? null : task.key);
                              }}
                            >
                              <span
                                className={cn(
                                  'truncate text-[13px] text-fg',
                                  task.status === 'done' && 'text-fg-subtle line-through',
                                )}
                              >
                                {task.title}
                              </span>
                              {task.notes && (
                                <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                              )}
                              <ChevronRight
                                className={cn(
                                  'size-3.5 shrink-0 text-fg-subtle transition-transform',
                                  open === task.key && 'rotate-90',
                                )}
                              />
                            </button>
                            <CommitInput
                              label={`${task.title} duration in days`}
                              mono
                              className="h-7 w-14 text-right"
                              display={String(task.durationDays)}
                              onCommit={(text) => {
                                const n = Number(text);
                                if (!Number.isFinite(n) || n <= 0 || n > 60) return false;
                                updateTask(task.key, { durationDays: Math.round(n * 2) / 2 });
                                return true;
                              }}
                            />
                          </div>
                          {open === task.key && (
                            <div className="px-4 pb-3">
                              <textarea
                                aria-label={`${task.title} notes`}
                                defaultValue={task.notes}
                                placeholder="Notes — contractor, materials, reminders…"
                                onBlur={(e) => {
                                  updateTask(task.key, { notes: e.target.value });
                                }}
                                rows={2}
                                className="w-full resize-none rounded-lg bg-fg/[0.04] px-2.5 py-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none placeholder:text-fg-subtle focus:shadow-[inset_0_0_0_1.5px_var(--accent)]"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>

                {/* Right: Gantt */}
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div style={{ width: totalDays * DAY + 24 }} className="relative">
                    <div className="sticky top-0 flex h-10 border-b border-border">
                      {days.map((d, i) => (
                        <div
                          key={d}
                          style={{ width: DAY }}
                          className={cn(
                            'flex shrink-0 flex-col items-center justify-center border-r border-border/40 text-[10px] leading-tight text-fg-subtle',
                            d === today && 'text-accent',
                          )}
                        >
                          <span>{fmtDate(d, { weekday: 'narrow' })}</span>
                          <span className="font-mono">
                            {i === 0 || d.endsWith('-01') ? fmtDate(d) : d.slice(8)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {todayIdx >= 0 && (
                      <div
                        className="pointer-events-none absolute top-10 bottom-0 w-px bg-accent/70"
                        style={{ left: todayIdx * DAY + DAY / 2 }}
                      />
                    )}
                    {[...groups.entries()].map(([room, rows]) => (
                      <Fragment key={room}>
                        <div className="h-8 bg-fg/[0.025]" />
                        {rows.map((it) => (
                          <div key={it.task.key} className="border-t border-border/60">
                            <div className="relative h-11">
                              <Tooltip
                                content={`${it.task.title} · ${fmtDate(it.startDate)} → ${fmtDate(it.endDate)}`}
                              >
                                <motion.div
                                  layout
                                  className={cn(
                                    'absolute top-2.5 h-6 rounded-md shadow-sm',
                                    it.task.status === 'done' && 'opacity-40',
                                    it.task.status === 'in_progress' &&
                                      'bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/0.25)_6px_12px)]',
                                  )}
                                  style={{
                                    left: it.startDay * DAY + 2,
                                    width: Math.max(8, (it.endDay - it.startDay) * DAY - 4),
                                    backgroundColor: PHASE_COLORS[it.task.phase],
                                  }}
                                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                                />
                              </Tooltip>
                            </div>
                            {open === it.task.key && <div className="h-[68px]" />}
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
              <CalendarDays className="size-3.5" /> Durations are rough single-crew estimates — edit
              any of them to fit your contractor’s plan.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
