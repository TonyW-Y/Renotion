import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export type Db = SupabaseClient<Database>;

const env = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing (see tests/db/globalSetup.ts)`);
  return v;
};

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** A client with no session (the `anon` role). */
export const anonClient = (): Db =>
  createClient<Database>(env('DB_TEST_URL'), env('DB_TEST_PUBLISHABLE_KEY'), options);

/** Admin client, used only to create test users. */
const admin = (): Db =>
  createClient<Database>(env('DB_TEST_URL'), env('DB_TEST_SECRET_KEY'), options);

/** Creates a fresh confirmed user and returns a client signed in as them. */
export async function userClient(label: string): Promise<{ client: Db; id: string }> {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@renotion.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const client = anonClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { client, id: created.data.user.id };
}
