import { describe, expect, it } from 'vitest';
import { createProject } from '@/core/project';
import type { Db } from '@/lib/supabase';
import { createSupabaseRepository, ProjectConflictError } from './cloudRepository';

interface Call {
  fn: string;
  args: Record<string, unknown> | undefined;
}

/** A tiny stand-in for the Supabase client's `rpc`, scripted per call. */
function fakeDb(responses: Record<string, (args: Record<string, unknown> | undefined) => unknown>) {
  const calls: Call[] = [];
  const db = {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      calls.push({ fn, args });
      await Promise.resolve();
      const handler = responses[fn];
      if (!handler) throw new Error(`unexpected rpc ${fn}`);
      return handler(args);
    },
  };
  return { db: db as unknown as Db, calls };
}

const doc = createProject('11111111-1111-4111-8111-111111111111', 'Kitchen');

describe('cloud repository', () => {
  it('creates new projects, then sends the remembered revision with later saves', async () => {
    let revision = 0;
    const { db, calls } = fakeDb({ save_project: () => ({ data: ++revision, error: null }) });
    const repo = createSupabaseRepository(db);
    await repo.save(doc);
    await repo.save({ ...doc, name: 'Kitchen v2' });
    expect(calls[0]?.args).not.toHaveProperty('p_expected_revision');
    expect(calls[1]?.args).toMatchObject({ p_expected_revision: 1 });
  });

  it('remembers the revision of a loaded project', async () => {
    const { db, calls } = fakeDb({
      load_project: () => ({ data: { ...doc, revision: 7 }, error: null }),
      save_project: () => ({ data: 8, error: null }),
    });
    const repo = createSupabaseRepository(db);
    expect((await repo.load(doc.id))?.name).toBe('Kitchen');
    await repo.save(doc);
    expect(calls[1]?.args).toMatchObject({ p_expected_revision: 7 });
  });

  it('turns a revision conflict into a ProjectConflictError', async () => {
    const { db } = fakeDb({
      save_project: () => ({ data: null, error: { code: '40001', message: 'revision conflict' } }),
    });
    await expect(createSupabaseRepository(db).save(doc)).rejects.toBeInstanceOf(
      ProjectConflictError,
    );
  });

  it('runs saves one after another so quick edits never conflict with each other', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let revision = 0;
    const { db, calls } = fakeDb({
      save_project: () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        inFlight--;
        return { data: ++revision, error: null };
      },
    });
    const repo = createSupabaseRepository(db);
    await Promise.all([repo.save(doc), repo.save(doc), repo.save(doc)]);
    expect(maxInFlight).toBe(1);
    expect(calls.map((c) => c.args?.p_expected_revision)).toEqual([undefined, 1, 2]);
  });

  it('maps project listings and returns null for missing projects', async () => {
    const { db } = fakeDb({
      list_projects: () => ({
        data: [
          { id: doc.id, name: 'Kitchen', updated_at: '2026-01-01', role: 'owner', wall_count: 4 },
        ],
        error: null,
      }),
      load_project: () => ({ data: null, error: null }),
    });
    const repo = createSupabaseRepository(db);
    expect(await repo.list()).toEqual([
      { id: doc.id, name: 'Kitchen', updatedAt: '2026-01-01', wallCount: 4, role: 'owner' },
    ]);
    expect(await repo.load('missing')).toBeNull();
  });
});
