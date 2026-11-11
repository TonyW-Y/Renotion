import { useEffect } from 'react';
import { deleteFurniture, deleteOpening, deleteWall } from '@/core/commands';
import { selectActivePlan, usePlanStore } from '@/state/planStore';
import { useUiStore } from '@/state/uiStore';
import { toolByShortcut, VIEW_SHORTCUTS } from './tools';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Deletes whatever is selected (walls, openings, furniture). */
export function deleteSelection(): void {
  const { selection, select } = useUiStore.getState();
  if (!selection) return;
  const plan = selectActivePlan(usePlanStore.getState());
  const cmd =
    selection.kind === 'wall'
      ? deleteWall(plan, selection.id)
      : selection.kind === 'opening'
        ? deleteOpening(plan, selection.id)
        : selection.kind === 'furniture'
          ? deleteFurniture(plan, selection.id)
          : null;
  if (cmd) {
    usePlanStore.getState().execute(cmd);
    select(null);
  }
}

/** Global keyboard shortcuts for the editor. */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      // In walk mode the keyboard drives the camera.
      if (document.pointerLockElement) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) usePlanStore.getState().redo();
        else usePlanStore.getState().undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        usePlanStore.getState().redo();
        return;
      }
      if (mod || e.altKey) return;

      const { setTool, setViewMode, select } = useUiStore.getState();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (e.key === 'Escape') {
        // The active canvas tool handles Escape first (e.g. finishing a wall chain).
        if (e.defaultPrevented) return;
        if (useUiStore.getState().selection) select(null);
        else setTool('select');
        return;
      }
      const view = VIEW_SHORTCUTS[e.key];
      if (view) {
        setViewMode(view);
        return;
      }
      const tool = toolByShortcut(e.key);
      if (tool) {
        e.preventDefault();
        setTool(tool.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
