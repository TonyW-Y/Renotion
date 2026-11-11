import { useEffect } from 'react';
import { getLastProjectId, getRepository, setLastProjectId } from './persistence';
import { usePlanStore } from './planStore';

const SAVE_DEBOUNCE_MS = 600;

/**
 * Loads the most recent project on mount (or creates one), then auto-saves
 * every change after a short debounce. Local-first: no network involved.
 */
export function useProjectSync(projectId?: string): void {
  useEffect(() => {
    let cancelled = false;
    const repo = getRepository();

    async function boot() {
      const id = projectId ?? getLastProjectId();
      const doc = id ? await repo.load(id) : null;
      if (cancelled) return;
      if (doc) {
        usePlanStore.getState().loadProject(doc);
      } else {
        const fresh = usePlanStore.getState().newProject();
        await repo.save(fresh);
      }
      setLastProjectId(usePlanStore.getState().project.id);
    }

    if (projectId !== undefined || !usePlanStore.getState().ready) void boot();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = async () => {
      const { project, setSaveStatus } = usePlanStore.getState();
      try {
        await repo.save(project);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    };

    const unsubscribe = usePlanStore.subscribe((state, prev) => {
      if (!state.ready || state.project === prev.project) return;
      if (state.project.id !== prev.project.id) return; // switching projects, not editing
      state.setSaveStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(() => void save(), SAVE_DEBOUNCE_MS);
    });

    const flush = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        void save();
      }
    };
    window.addEventListener('beforeunload', flush);

    return () => {
      cancelled = true;
      flush();
      unsubscribe();
      window.removeEventListener('beforeunload', flush);
    };
  }, [projectId]);
}
