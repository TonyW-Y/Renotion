import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createDemoProject } from '@/core/demo';
import type { ProjectDoc } from '@/core/project';
import { createId } from '@/lib/id';
import { useAuthStore, whenAuthReady } from './authStore';
import { cloudRepository } from './cloud';
import { ProjectConflictError } from './cloudRepository';
import {
  getLastProject,
  getRepository,
  setLastProject,
  type ProjectLocation,
  type ProjectRepository,
} from './persistence';
import { usePlanStore } from './planStore';

const SAVE_DEBOUNCE_MS = 600;

export const repositoryFor = (location: ProjectLocation): ProjectRepository =>
  location === 'cloud' && cloudRepository ? cloudRepository : getRepository();

let timer: ReturnType<typeof setTimeout> | undefined;
/** Set while loading a project so the load itself isn't saved straight back. */
let suppressNextSave = false;

/** Saves the open project now, to wherever it lives. */
async function saveNow(): Promise<void> {
  timer = undefined;
  const { project, location, setSaveStatus } = usePlanStore.getState();
  try {
    await repositoryFor(location).save(project);
    setSaveStatus('saved');
  } catch (err) {
    if (err instanceof ProjectConflictError && cloudRepository) {
      // Someone saved this project elsewhere first: load their version.
      const latest = await cloudRepository.load(project.id).catch(() => null);
      if (latest) {
        showProject(latest, 'cloud');
        setSaveStatus('saved');
        toast.warning('This project was changed somewhere else', {
          description: 'Loaded the latest version. Your last few seconds of edits were not saved.',
        });
        return;
      }
    }
    setSaveStatus('error');
  }
}

/** Writes any pending (debounced) changes immediately. Call before switching projects. */
export async function flushPendingSave(): Promise<void> {
  if (timer === undefined) return;
  clearTimeout(timer);
  await saveNow();
}

/** Opens a project in the editor's store and remembers it for next time. */
export function showProject(doc: ProjectDoc, location: ProjectLocation): void {
  // Reloading the same project would look like an edit to the save listener;
  // switching to another project is already ignored there.
  suppressNextSave = usePlanStore.getState().project.id === doc.id;
  usePlanStore.getState().loadProject(doc, location);
  setLastProject({ id: doc.id, location });
}

/** The most recent project on this device, or a brand-new one. */
async function openLocalFallback(preferredId: string | null): Promise<void> {
  const local = getRepository();
  const preferred = preferredId ? await local.load(preferredId) : null;
  if (preferred) {
    showProject(preferred, 'local');
    return;
  }
  const [recent] = await local.list();
  const doc = recent ? await local.load(recent.id) : null;
  if (doc) {
    showProject(doc, 'local');
    return;
  }
  const fresh = usePlanStore.getState().newProject();
  setLastProject({ id: fresh.id, location: 'local' });
  await local.save(fresh);
}

/**
 * Loads the last project on mount (from the cloud when it lives there and the
 * user is signed in, otherwise from this device), then auto-saves every
 * change after a short debounce.
 */
export function useProjectSync(
  projectId?: string,
  /** Load a fresh copy of the demo house instead, then call `onLoaded`. */
  demo?: { onLoaded: () => void },
): void {
  const wantsDemo = demo !== undefined;
  const onDemoLoaded = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    onDemoLoaded.current = demo?.onLoaded;
  });

  useEffect(() => {
    // Read through a function so the async boot sees the flag change on cleanup.
    const run = { cancelled: false };
    const stopped = () => run.cancelled;

    async function boot() {
      if (wantsDemo) {
        const doc = createDemoProject(createId());
        showProject(doc, 'local');
        await getRepository().save(doc);
        onDemoLoaded.current?.();
        return;
      }
      const last = projectId ? { id: projectId, location: 'local' as const } : getLastProject();
      if (last?.location === 'cloud' && cloudRepository) {
        await whenAuthReady();
        if (stopped()) return;
        if (useAuthStore.getState().user) {
          const doc = await cloudRepository.load(last.id).catch(() => null);
          if (stopped()) return;
          if (doc) {
            showProject(doc, 'cloud');
            return;
          }
        }
      }
      if (stopped()) return;
      await openLocalFallback(last?.location === 'local' ? last.id : null);
    }

    if (wantsDemo || projectId !== undefined || !usePlanStore.getState().ready) void boot();

    const unsubscribe = usePlanStore.subscribe((state, prev) => {
      if (!state.ready || state.project === prev.project) return;
      if (state.project.id !== prev.project.id) return; // switching projects, not editing
      if (suppressNextSave) {
        suppressNextSave = false;
        return;
      }
      state.setSaveStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(() => void saveNow(), SAVE_DEBOUNCE_MS);
    });

    const flush = () => void flushPendingSave();
    window.addEventListener('beforeunload', flush);

    return () => {
      run.cancelled = true;
      flush();
      unsubscribe();
      window.removeEventListener('beforeunload', flush);
    };
  }, [projectId, wantsDemo]);
}
