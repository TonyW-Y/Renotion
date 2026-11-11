import { create } from 'zustand';
import { applyCommand, describeCommand, invertCommand, type Command } from '@/core/commands';
import { clonePlan, createProject, getPlan, type PlanKind, type ProjectDoc } from '@/core/project';
import type { Plan } from '@/core/types';
import { createId } from '@/lib/id';

const HISTORY_LIMIT = 200;

interface History {
  past: Command[];
  future: Command[];
}

const emptyHistory = (): Record<PlanKind, History> => ({
  baseline: { past: [], future: [] },
  planned: { past: [], future: [] },
});

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface PlanState {
  project: ProjectDoc;
  activeKind: PlanKind;
  history: Record<PlanKind, History>;
  /** False until the project has been loaded from storage. */
  ready: boolean;
  saveStatus: SaveStatus;

  /** Applies a command to the active plan and records it for undo. No-op for null. */
  execute: (cmd: Command | null) => void;
  undo: () => void;
  redo: () => void;
  /** Clones the baseline into a new planned version and switches to it. */
  startPlanning: () => void;
  setActiveKind: (kind: PlanKind) => void;
  setProjectName: (name: string) => void;
  loadProject: (doc: ProjectDoc) => void;
  newProject: () => ProjectDoc;
  setSaveStatus: (status: SaveStatus) => void;
}

function withPlan(project: ProjectDoc, kind: PlanKind, plan: Plan): ProjectDoc {
  const updatedAt = new Date().toISOString();
  return kind === 'planned' && project.planned
    ? { ...project, planned: plan, updatedAt }
    : { ...project, baseline: plan, updatedAt };
}

export const usePlanStore = create<PlanState>()((set, get) => ({
  project: createProject(createId()),
  activeKind: 'baseline',
  history: emptyHistory(),
  ready: false,
  saveStatus: 'idle',

  execute: (cmd) => {
    if (!cmd) return;
    const { project, activeKind, history } = get();
    const plan = applyCommand(getPlan(project, activeKind), cmd);
    const h = history[activeKind];
    set({
      project: withPlan(project, activeKind, plan),
      history: {
        ...history,
        [activeKind]: { past: [...h.past, cmd].slice(-HISTORY_LIMIT), future: [] },
      },
    });
  },

  undo: () => {
    const { project, activeKind, history } = get();
    const h = history[activeKind];
    const cmd = h.past.at(-1);
    if (!cmd) return;
    const plan = applyCommand(getPlan(project, activeKind), invertCommand(cmd));
    set({
      project: withPlan(project, activeKind, plan),
      history: {
        ...history,
        [activeKind]: { past: h.past.slice(0, -1), future: [...h.future, cmd] },
      },
    });
  },

  redo: () => {
    const { project, activeKind, history } = get();
    const h = history[activeKind];
    const cmd = h.future.at(-1);
    if (!cmd) return;
    const plan = applyCommand(getPlan(project, activeKind), cmd);
    set({
      project: withPlan(project, activeKind, plan),
      history: {
        ...history,
        [activeKind]: { past: [...h.past, cmd], future: h.future.slice(0, -1) },
      },
    });
  },

  startPlanning: () => {
    const { project } = get();
    if (project.planned) {
      set({ activeKind: 'planned' });
      return;
    }
    set({
      project: {
        ...project,
        planned: clonePlan(project.baseline),
        updatedAt: new Date().toISOString(),
      },
      activeKind: 'planned',
    });
  },

  setActiveKind: (kind) => {
    if (kind === 'planned' && !get().project.planned) return;
    set({ activeKind: kind });
  },

  setProjectName: (name) => {
    set((s) => ({ project: { ...s.project, name, updatedAt: new Date().toISOString() } }));
  },

  loadProject: (doc) => {
    set({
      project: doc,
      activeKind: doc.planned ? 'planned' : 'baseline',
      history: emptyHistory(),
      ready: true,
    });
  },

  newProject: () => {
    const doc = createProject(createId());
    get().loadProject(doc);
    return doc;
  },

  setSaveStatus: (saveStatus) => {
    set({ saveStatus });
  },
}));

export const selectActivePlan = (s: PlanState): Plan => getPlan(s.project, s.activeKind);
export const selectCanUndo = (s: PlanState): boolean => s.history[s.activeKind].past.length > 0;
export const selectCanRedo = (s: PlanState): boolean => s.history[s.activeKind].future.length > 0;
export const selectUndoLabel = (s: PlanState): string | null => {
  const cmd = s.history[s.activeKind].past.at(-1);
  return cmd ? describeCommand(cmd) : null;
};
export const selectRedoLabel = (s: PlanState): string | null => {
  const cmd = s.history[s.activeKind].future.at(-1);
  return cmd ? describeCommand(cmd) : null;
};
