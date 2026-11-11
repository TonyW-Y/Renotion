import { createEmptyPlan, type ID, type Plan } from './types';

export type PlanKind = 'baseline' | 'planned';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

/** User-editable state for a generated task, keyed by the task's stable key. */
export interface TaskState {
  status: TaskStatus;
  /** Overrides the template duration. */
  durationDays?: number;
  notes?: string;
}

export type ExpenseCategory =
  | 'flooring'
  | 'tile'
  | 'paint'
  | 'trim'
  | 'drywall'
  | 'doors'
  | 'windows'
  | 'demolition'
  | 'furniture'
  | 'wallFinish'
  | 'ceiling'
  | 'labour'
  | 'other';

export interface Expense {
  id: ID;
  /** YYYY-MM-DD */
  spentOn: string;
  description: string;
  category: ExpenseCategory;
  roomKey: string | null;
  amount: number;
}

/**
 * A project holds two plans: the home as it is (`baseline`) and after the
 * renovation (`planned`, created by "Start planning"). Estimates and tasks are
 * derived from the difference between them.
 */
export interface ProjectDoc {
  id: ID;
  name: string;
  createdAt: string;
  updatedAt: string;
  baseline: Plan;
  planned: Plan | null;
  /** Price overrides (CAD per unit) keyed by material id. */
  costOverrides: Record<string, number>;
  /** Project start (YYYY-MM-DD) for the schedule; null = today. */
  startDate: string | null;
  skipWeekends: boolean;
  tasks: Record<string, TaskState>;
  expenses: Expense[];
}

export function createProject(
  id: ID,
  name = 'Untitled project',
  now = new Date().toISOString(),
): ProjectDoc {
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    baseline: createEmptyPlan(),
    planned: null,
    costOverrides: {},
    startDate: null,
    skipWeekends: true,
    tasks: {},
    expenses: [],
  };
}

export function getPlan(project: ProjectDoc, kind: PlanKind): Plan {
  return kind === 'planned' && project.planned ? project.planned : project.baseline;
}

/** Deep-clones a plan (plans are plain JSON). */
export const clonePlan = (plan: Plan): Plan => structuredClone(plan);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function normalizePlan(v: unknown): Plan {
  const base = createEmptyPlan();
  if (!isObject(v)) return base;
  return {
    version: 1,
    units: v.units === 'imperial' ? 'imperial' : 'metric',
    walls: Array.isArray(v.walls) ? (v.walls as Plan['walls']) : [],
    openings: Array.isArray(v.openings) ? (v.openings as Plan['openings']) : [],
    rooms: Array.isArray(v.rooms) ? (v.rooms as Plan['rooms']) : [],
    furniture: Array.isArray(v.furniture) ? (v.furniture as Plan['furniture']) : [],
  };
}

/**
 * Validates and fills defaults for a project loaded from storage, so older
 * saved documents keep working as the schema grows. Returns null if unusable.
 */
export function normalizeProject(v: unknown): ProjectDoc | null {
  if (!isObject(v) || typeof v.id !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: v.id,
    name: typeof v.name === 'string' && v.name.trim() ? v.name : 'Untitled project',
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : now,
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : now,
    baseline: normalizePlan(v.baseline),
    planned: v.planned ? normalizePlan(v.planned) : null,
    costOverrides: normalizeOverrides(v.costOverrides),
    startDate: typeof v.startDate === 'string' && ISO_DATE.test(v.startDate) ? v.startDate : null,
    skipWeekends: v.skipWeekends !== false,
    tasks: normalizeTasks(v.tasks),
    expenses: Array.isArray(v.expenses) ? v.expenses.filter(isExpense) : [],
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set<TaskStatus>(['todo', 'in_progress', 'done']);

function normalizeTasks(v: unknown): Record<string, TaskState> {
  if (!isObject(v)) return {};
  const out: Record<string, TaskState> = {};
  for (const [k, raw] of Object.entries(v)) {
    if (!isObject(raw) || !STATUSES.has(raw.status as TaskStatus)) continue;
    out[k] = {
      status: raw.status as TaskStatus,
      ...(typeof raw.durationDays === 'number' && raw.durationDays > 0
        ? { durationDays: raw.durationDays }
        : {}),
      ...(typeof raw.notes === 'string' && raw.notes ? { notes: raw.notes } : {}),
    };
  }
  return out;
}

function isExpense(v: unknown): v is Expense {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.spentOn === 'string' &&
    typeof v.description === 'string' &&
    typeof v.category === 'string' &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount)
  );
}

function normalizeOverrides(v: unknown): Record<string, number> {
  if (!isObject(v)) return {};
  return Object.fromEntries(
    Object.entries(v).filter(
      (e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] >= 0,
    ),
  );
}
