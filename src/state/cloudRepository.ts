import { normalizeProject, type ProjectDoc } from '@/core/project';
import type { Json } from '@/lib/database.types';
import type { Db } from '@/lib/supabase';
import type { ProjectRepository, ProjectSummary } from './persistence';

/** Someone (another tab or device) saved this project since we loaded it. */
export class ProjectConflictError extends Error {
  constructor(readonly projectId: string) {
    super('This project was changed somewhere else.');
    this.name = 'ProjectConflictError';
  }
}

export interface CloudProjectSummary extends ProjectSummary {
  role: string;
}

export interface CloudRepository extends ProjectRepository {
  list(): Promise<CloudProjectSummary[]>;
  /** Creates (or reuses) a read-only share link token for a project you own. */
  share(id: string): Promise<string>;
}

const toJson = (doc: ProjectDoc): Json => JSON.parse(JSON.stringify(doc)) as Json;

const revisionOf = (data: Json): number | null =>
  typeof data === 'object' &&
  data !== null &&
  !Array.isArray(data) &&
  typeof data.revision === 'number'
    ? data.revision
    : null;

/**
 * Projects stored in Postgres via Supabase. Implements the same interface as
 * the IndexedDB repository; Row Level Security decides what each user can do.
 *
 * Optimistic concurrency: the revision of every loaded / saved project is
 * remembered and sent with the next save. If someone else saved in between,
 * the database refuses (SQLSTATE 40001) and a ProjectConflictError is thrown.
 * Saves are serialized so our own quick successive saves never conflict.
 */
export function createSupabaseRepository(db: Db): CloudRepository {
  const revisions = new Map<string, number>();
  let queue: Promise<unknown> = Promise.resolve();

  const serialized = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  return {
    async list() {
      const { data, error } = await db.rpc('list_projects');
      if (error) throw error;
      return data.map((r) => ({
        id: r.id,
        name: r.name,
        updatedAt: r.updated_at,
        wallCount: r.wall_count,
        role: r.role,
      }));
    },

    async load(id) {
      const { data, error } = await db.rpc('load_project', { p_id: id });
      if (error) throw error;
      if (data === null) return null;
      const revision = revisionOf(data);
      if (revision !== null) revisions.set(id, revision);
      return normalizeProject(data);
    },

    save(doc) {
      return serialized(async () => {
        const expected = revisions.get(doc.id);
        const { data, error } = await db.rpc(
          'save_project',
          expected === undefined
            ? { p_doc: toJson(doc) }
            : { p_doc: toJson(doc), p_expected_revision: expected },
        );
        if (error) {
          if (error.code === '40001') throw new ProjectConflictError(doc.id);
          throw error;
        }
        revisions.set(doc.id, data);
      });
    },

    async remove(id) {
      const { error } = await db.from('projects').delete().eq('id', id);
      if (error) throw error;
      revisions.delete(id);
    },

    async share(id) {
      const { data, error } = await db.rpc('share_project', { p_project: id });
      if (error) throw error;
      return data;
    },
  };
}
