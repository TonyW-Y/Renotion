/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd.supabase.co (cloud features are off without it). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (or legacy anon) key: safe in the browser, guarded by RLS. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
