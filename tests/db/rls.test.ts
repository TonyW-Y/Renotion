import { beforeAll, describe, expect, it } from 'vitest';
import { createDemoProject } from '@/core/demo';
import { normalizeProject } from '@/core/project';
import type { Json } from '@/lib/database.types';
import { anonClient, userClient, type Db } from './clients';

/*
 * Verifies the SQL schema, functions and Row Level Security policies against
 * a real Postgres (local Supabase). Alice owns a project; Bob is a stranger
 * until Alice adds him as a viewer; anonymous visitors only get share links.
 */

let alice: Db;
let bob: Db;
let bobId: string;
const doc = createDemoProject(crypto.randomUUID(), '2026-01-05T09:00:00.000Z');

const json = (v: unknown): Json => JSON.parse(JSON.stringify(v)) as Json;
const save = (c: Db, d: unknown, expected?: number) =>
  c.rpc(
    'save_project',
    expected === undefined ? { p_doc: json(d) } : { p_doc: json(d), p_expected_revision: expected },
  );
const load = (c: Db, id: string) => c.rpc('load_project', { p_id: id });

beforeAll(async () => {
  alice = (await userClient('alice')).client;
  const b = await userClient('bob');
  bob = b.client;
  bobId = b.id;
});

describe('saving and loading', () => {
  it('creates a project at revision 1 and loads back the same document', async () => {
    const { data: revision, error } = await save(alice, doc);
    expect(error).toBeNull();
    expect(revision).toBe(1);

    const loaded = await load(alice, doc.id);
    expect(loaded.error).toBeNull();
    const back = normalizeProject(loaded.data);
    expect(back?.name).toBe(doc.name);
    expect(back?.baseline).toEqual(doc.baseline);
    expect(back?.planned).toEqual(doc.planned);
    expect(back?.expenses).toEqual(doc.expenses);
  });

  it('lists only the caller’s projects, with a wall count', async () => {
    const { data, error } = await alice.rpc('list_projects');
    expect(error).toBeNull();
    expect(data).toEqual([
      expect.objectContaining({ id: doc.id, role: 'owner', wall_count: doc.baseline.walls.length }),
    ]);
    const bobs = await bob.rpc('list_projects');
    expect(bobs.data).toEqual([]);
  });

  it('rejects a stale revision (optimistic concurrency) and accepts the current one', async () => {
    const stale = await save(alice, { ...doc, name: 'Stale edit' }, 7);
    expect(stale.error?.code).toBe('40001');

    const ok = await save(alice, { ...doc, name: 'Renamed' }, 1);
    expect(ok.data).toBe(2);
    const loaded = await load(alice, doc.id);
    expect(normalizeProject(loaded.data)?.name).toBe('Renamed');
  });

  it('stores task progress, price overrides and expenses relationally', async () => {
    const withState = {
      ...doc,
      name: 'Renamed',
      costOverrides: { 'oak-hardwood': 8.75 },
      tasks: { 'floor:abc:install': { status: 'done', notes: 'Went well' } },
    };
    expect((await save(alice, withState, 2)).data).toBe(3);
    const back = normalizeProject((await load(alice, doc.id)).data);
    expect(back?.costOverrides).toEqual({ 'oak-hardwood': 8.75 });
    expect(back?.tasks).toEqual({ 'floor:abc:install': { status: 'done', notes: 'Went well' } });
  });

  it('enforces table constraints (e.g. no negative expenses)', async () => {
    const bad = {
      ...doc,
      expenses: [{ ...doc.expenses[0], amount: -5 }],
    };
    const res = await save(alice, bad, 3);
    expect(res.error?.code).toBe('23514'); // check_violation
    // The failed save rolled back as a whole: still at revision 3.
    expect(normalizeProject((await load(alice, doc.id)).data)?.expenses).toEqual(doc.expenses);
  });
});

describe('row level security: a stranger', () => {
  it('cannot load, list or select another user’s project', async () => {
    expect((await load(bob, doc.id)).data).toBeNull();
    expect((await bob.from('projects').select('id').eq('id', doc.id)).data).toEqual([]);
    expect((await bob.from('plan_versions').select('kind').eq('project_id', doc.id)).data).toEqual(
      [],
    );
    expect((await bob.from('expenses').select('id').eq('project_id', doc.id)).data).toEqual([]);
  });

  it('cannot overwrite, rename or delete it', async () => {
    const overwrite = await save(bob, { ...doc, name: 'Hijacked' }, 3);
    expect(overwrite.error?.code).toBe('42501');

    const rename = await bob
      .from('projects')
      .update({ name: 'Hijacked' })
      .eq('id', doc.id)
      .select();
    expect(rename.data).toEqual([]);
    const del = await bob.from('projects').delete().eq('id', doc.id).select();
    expect(del.data).toEqual([]);
    expect(normalizeProject((await load(alice, doc.id)).data)?.name).toBe('Renamed');
  });

  it('cannot add themself as a member or create projects in someone else’s name', async () => {
    const join = await bob
      .from('project_members')
      .insert({ project_id: doc.id, user_id: bobId, role: 'editor' });
    expect(join.error?.code).toBe('42501');

    const { data: aliceUser } = await alice.auth.getUser();
    const impersonate = await bob
      .from('projects')
      .insert({ name: 'Fake', owner_id: aliceUser.user?.id ?? '' });
    expect(impersonate.error?.code).toBe('42501');
  });
});

describe('row level security: members', () => {
  it('a viewer can read but not write; only the owner can delete', async () => {
    const add = await alice
      .from('project_members')
      .insert({ project_id: doc.id, user_id: bobId, role: 'viewer' });
    expect(add.error).toBeNull();

    expect(normalizeProject((await load(bob, doc.id)).data)?.name).toBe('Renamed');
    expect((await save(bob, { ...doc, name: 'Viewer edit' }, 3)).error?.code).toBe('42501');
    const del = await bob.from('projects').delete().eq('id', doc.id).select();
    expect(del.data).toEqual([]);
  });

  it('an editor can save, but still cannot delete or manage members', async () => {
    await alice
      .from('project_members')
      .update({ role: 'editor' })
      .eq('project_id', doc.id)
      .eq('user_id', bobId);
    expect((await save(bob, { ...doc, name: 'Edited by Bob' }, 3)).data).toBe(4);
    const del = await bob.from('projects').delete().eq('id', doc.id).select();
    expect(del.data).toEqual([]);
    const promote = await bob
      .from('project_members')
      .update({ role: 'owner' })
      .eq('project_id', doc.id)
      .eq('user_id', bobId)
      .select();
    expect(promote.data).toEqual([]);
  });
});

describe('anonymous visitors and share links', () => {
  it('have no direct access to any table', async () => {
    const res = await anonClient().from('projects').select('id');
    expect(res.error?.code).toBe('42501');
    expect((await anonClient().rpc('load_project', { p_id: doc.id })).error?.code).toBe('42501');
  });

  it('can open a project through its share link until it is revoked', async () => {
    const { data: token, error } = await alice.rpc('share_project', { p_project: doc.id });
    expect(error).toBeNull();
    if (!token) throw new Error('no share token');
    const again = await alice.rpc('share_project', { p_project: doc.id });
    expect(again.data).toBe(token); // the same link is reused

    const shared = await anonClient().rpc('shared_project', { p_token: token });
    expect(normalizeProject(shared.data)?.baseline).toEqual(doc.baseline);
    expect(shared.data).not.toHaveProperty('revision');

    await alice
      .from('project_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', token);
    expect((await anonClient().rpc('shared_project', { p_token: token })).data).toBeNull();
  });

  it('only the owner can create share links', async () => {
    const res = await bob.rpc('share_project', { p_project: doc.id });
    expect(res.error?.code).toBe('42501');
  });
});

describe('ownership', () => {
  it('the owner can delete the project, which removes everything with it', async () => {
    const del = await alice.from('projects').delete().eq('id', doc.id).select('id');
    expect(del.data).toEqual([{ id: doc.id }]);
    expect((await load(alice, doc.id)).data).toBeNull();
    expect(
      (await alice.from('plan_versions').select('kind').eq('project_id', doc.id)).data,
    ).toEqual([]);
  });

  it('every new user gets a profile they alone can see', async () => {
    const mine = await bob.from('profiles').select('id');
    expect(mine.data).toEqual([{ id: bobId }]);
  });
});
