import { createProject, normalizeProject, type ProjectDoc } from '@/core/project';
import { createId } from '@/lib/id';
import { supabase } from '@/lib/supabase';
import { cloudRepository } from './cloud';
import { getRepository, type ProjectLocation, type ProjectRef } from './persistence';
import { usePlanStore } from './planStore';
import { flushPendingSave, repositoryFor, showProject } from './useProjectSync';

/** Cloud rows use UUIDs; projects on this device keep short ids. */
const newIdFor = (location: ProjectLocation): string =>
  location === 'cloud' ? crypto.randomUUID() : createId();

const isOpen = (ref: ProjectRef): boolean => {
  const s = usePlanStore.getState();
  return s.ready && s.project.id === ref.id && s.location === ref.location;
};

/** Loads a project into the editor. Returns false if it no longer exists. */
export async function openProject(ref: ProjectRef): Promise<boolean> {
  if (isOpen(ref)) return true;
  await flushPendingSave();
  const doc = await repositoryFor(ref.location).load(ref.id);
  if (!doc) return false;
  showProject(doc, ref.location);
  return true;
}

export async function createNewProject(location: ProjectLocation): Promise<ProjectRef> {
  await flushPendingSave();
  const doc = createProject(newIdFor(location));
  await repositoryFor(location).save(doc);
  showProject(doc, location);
  return { id: doc.id, location };
}

/** "Plan A → Plan B": a full copy, saved next to the original. */
export async function duplicateProject(ref: ProjectRef): Promise<ProjectRef> {
  await flushPendingSave();
  const repo = repositoryFor(ref.location);
  const doc = await repo.load(ref.id);
  if (!doc) throw new Error('Project not found');
  const now = new Date().toISOString();
  const copy: ProjectDoc = {
    ...structuredClone(doc),
    id: newIdFor(ref.location),
    name: `${doc.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  await repo.save(copy);
  return { id: copy.id, location: ref.location };
}

export async function renameProject(ref: ProjectRef, name: string): Promise<void> {
  const clean = name.trim() || 'Untitled project';
  if (isOpen(ref)) {
    usePlanStore.getState().setProjectName(clean);
    await flushPendingSave();
    return;
  }
  const repo = repositoryFor(ref.location);
  const doc = await repo.load(ref.id);
  if (!doc) return;
  await repo.save({ ...doc, name: clean, updatedAt: new Date().toISOString() });
}

/** Deletes a project; if it was open, the editor falls back to another one. */
export async function deleteProject(ref: ProjectRef): Promise<void> {
  const wasOpen = isOpen(ref);
  await repositoryFor(ref.location).remove(ref.id);
  if (!wasOpen) return;
  const [recent] = await getRepository().list();
  const next = recent ? await getRepository().load(recent.id) : null;
  if (next) showProject(next, 'local');
  else showProject(createProject(createId()), 'local');
}

/** Copies a project from this device to the signed-in user's cloud account and removes the local copy. */
export async function moveToCloud(localId: string): Promise<ProjectRef> {
  if (!cloudRepository) throw new Error('Cloud is not configured');
  const wasOpen = isOpen({ id: localId, location: 'local' });
  await flushPendingSave();
  const doc = await getRepository().load(localId);
  if (!doc) throw new Error('Project not found');
  const cloudDoc: ProjectDoc = { ...doc, id: crypto.randomUUID() };
  await cloudRepository.save(cloudDoc);
  await getRepository().remove(localId);
  if (wasOpen) showProject(cloudDoc, 'cloud');
  return { id: cloudDoc.id, location: 'cloud' };
}

/** A link anyone can use to open a read-only copy of a cloud project you own. */
export async function shareLink(cloudId: string): Promise<string> {
  if (!cloudRepository) throw new Error('Cloud is not configured');
  await flushPendingSave();
  const token = await cloudRepository.share(cloudId);
  return `${window.location.origin}/share/${token}`;
}

/** Opens a shared project as a copy on this device. Returns null for unknown or revoked links. */
export async function openSharedCopy(token: string): Promise<ProjectDoc | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('shared_project', { p_token: token });
  if (error) throw error;
  const shared = normalizeProject(data);
  if (!shared) return null;
  await flushPendingSave();
  const now = new Date().toISOString();
  const copy: ProjectDoc = { ...shared, id: createId(), createdAt: now, updatedAt: now };
  await getRepository().save(copy);
  showProject(copy, 'local');
  return copy;
}

/** Signs out; if a cloud project was open, switches to one on this device. */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  await flushPendingSave();
  const wasCloud = usePlanStore.getState().location === 'cloud';
  await supabase.auth.signOut();
  if (!wasCloud) return;
  const [recent] = await getRepository().list();
  const next = recent ? await getRepository().load(recent.id) : null;
  showProject(next ?? createProject(createId()), 'local');
}
