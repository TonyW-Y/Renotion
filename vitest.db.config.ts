import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Database tests: run against a local Supabase stack (`npx supabase start`),
 * checking the SQL schema, functions and Row Level Security for real.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    globalSetup: ['./tests/db/globalSetup.ts'],
    // Tests share one database; run files one after another.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
