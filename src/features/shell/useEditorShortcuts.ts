import { useEffect } from 'react';
import { useUiStore } from '@/state/uiStore';
import { toolByShortcut, VIEW_SHORTCUTS } from './tools';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Global single-key shortcuts for the editor (tools, view modes). */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const { setTool, setViewMode } = useUiStore.getState();

      if (e.key === 'Escape') {
        setTool('select');
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
