import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Db = SupabaseClient<Database>;

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The Supabase client, or null when no project is configured; then the app
 * runs fully offline and hides account features.
 */
export const supabase: Db | null =
  url && key
    ? createClient<Database>(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const cloudEnabled = supabase !== null;
