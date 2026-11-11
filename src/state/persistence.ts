import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval';
import { normalizeProject, type ProjectDoc } from '@/core/project';

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  wallCount: number;
}

/**
 * Storage backend for projects. IndexedDB now; Supabase in Phase 6 implements
 * the same interface, so swapping backends is a one-line change.
 */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  load(id: string): Promise<ProjectDoc | null>;
  save(doc: ProjectDoc): Promise<void>;
  remove(id: string): Promise<void>;
}

const PREFIX = 'project:';

const summarize = (doc: ProjectDoc): ProjectSummary => ({
  id: doc.id,
  name: doc.name,
  updatedAt: doc.updatedAt,
  wallCount: doc.baseline.walls.length,
});

const byRecent = (a: ProjectSummary, b: ProjectSummary) => b.updatedAt.localeCompare(a.updatedAt);

export function createIndexedDbRepository(
  store: UseStore = createStore('renotion', 'projects'),
): ProjectRepository {
  return {
    async list() {
      const all = (await keys(store)).filter(
        (k): k is string => typeof k === 'string' && k.startsWith(PREFIX),
      );
      const docs = await Promise.all(all.map((k) => get<unknown>(k, store)));
      return docs
        .map(normalizeProject)
        .filter((d): d is ProjectDoc => d !== null)
        .map(summarize)
        .sort(byRecent);
    },
    async load(id) {
      return normalizeProject(await get<unknown>(PREFIX + id, store));
    },
    async save(doc) {
      await set(PREFIX + doc.id, doc, store);
    },
    async remove(id) {
      await del(PREFIX + id, store);
    },
  };
}

/** In-memory backend for tests and browsers without IndexedDB. */
export function createMemoryRepository(): ProjectRepository {
  const docs = new Map<string, ProjectDoc>();
  return {
    list: () => Promise.resolve([...docs.values()].map(summarize).sort(byRecent)),
    load: (id) => Promise.resolve(docs.has(id) ? structuredClone(docs.get(id) ?? null) : null),
    save: (doc) => {
      docs.set(doc.id, structuredClone(doc));
      return Promise.resolve();
    },
    remove: (id) => {
      docs.delete(id);
      return Promise.resolve();
    },
  };
}

let repo: ProjectRepository | null = null;

export function getRepository(): ProjectRepository {
  repo ??=
    typeof indexedDB === 'undefined' ? createMemoryRepository() : createIndexedDbRepository();
  return repo;
}

/** Test hook / Phase 6 hook: swap the storage backend. */
export function setRepository(next: ProjectRepository): void {
  repo = next;
}

const LAST_PROJECT_KEY = 'renotion:lastProject';

export function getLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setLastProjectId(id: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id);
  } catch {
    /* storage unavailable */
  }
}
