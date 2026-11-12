import { execFileSync } from 'node:child_process';

/** Reads the local stack's URL and keys from the Supabase CLI. */
export default function setup(): void {
  let raw: string;
  try {
    raw = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error('Local Supabase is not running. Start it with `npx supabase start`.');
  }
  const status = JSON.parse(raw.slice(raw.indexOf('{'))) as Partial<Record<string, string>>;
  process.env.DB_TEST_URL = status.API_URL;
  process.env.DB_TEST_PUBLISHABLE_KEY = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  process.env.DB_TEST_SECRET_KEY = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
}
