import { createEmptyPlan, type ID, type Plan } from './types';

export type PlanKind = 'baseline' | 'planned';

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
  };
}

function normalizeOverrides(v: unknown): Record<string, number> {
  if (!isObject(v)) return {};
  return Object.fromEntries(
    Object.entries(v).filter(
      (e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] >= 0,
    ),
  );
}
