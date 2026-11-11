import { beforeEach, describe, expect, it } from 'vitest';
import { addWall } from '@/core/commands';
import { createProject } from '@/core/project';
import {
  selectActivePlan,
  selectCanRedo,
  selectCanUndo,
  selectUndoLabel,
  usePlanStore,
} from './planStore';

const wall = (id: string, x: number) => addWall(id, { x, y: 0 }, { x: x + 1, y: 0 });
const state = () => usePlanStore.getState();

describe('planStore', () => {
  beforeEach(() => {
    state().loadProject(createProject('test'));
  });

  it('executes commands on the active plan', () => {
    state().execute(wall('w1', 0));
    expect(selectActivePlan(state()).walls).toHaveLength(1);
    expect(selectUndoLabel(state())).toBe('Add wall');
  });

  it('undoes and redoes', () => {
    state().execute(wall('w1', 0));
    state().execute(wall('w2', 2));
    state().undo();
    expect(selectActivePlan(state()).walls.map((w) => w.id)).toEqual(['w1']);
    expect(selectCanRedo(state())).toBe(true);
    state().redo();
    expect(selectActivePlan(state()).walls).toHaveLength(2);
    expect(selectCanRedo(state())).toBe(false);
  });

  it('clears redo after a new command', () => {
    state().execute(wall('w1', 0));
    state().undo();
    state().execute(wall('w2', 2));
    expect(selectCanRedo(state())).toBe(false);
  });

  it('ignores null commands and empty undo', () => {
    state().execute(null);
    state().undo();
    expect(selectCanUndo(state())).toBe(false);
  });

  it('starts planning from a copy of the baseline with separate history', () => {
    state().execute(wall('w1', 0));
    state().startPlanning();
    expect(state().activeKind).toBe('planned');
    expect(selectActivePlan(state()).walls).toHaveLength(1);
    expect(selectCanUndo(state())).toBe(false);

    state().execute(wall('w2', 2));
    expect(selectActivePlan(state()).walls).toHaveLength(2);
    expect(state().project.baseline.walls).toHaveLength(1);

    state().setActiveKind('baseline');
    expect(selectActivePlan(state()).walls).toHaveLength(1);
    expect(selectCanUndo(state())).toBe(true);
  });

  it('refuses to switch to a planned version that does not exist', () => {
    state().setActiveKind('planned');
    expect(state().activeKind).toBe('baseline');
  });
});
