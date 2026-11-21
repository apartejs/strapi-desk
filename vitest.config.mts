import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Each file boots a real Strapi: give it time, and one at a time.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    // Strapi's own log is printed for a failing test only.
    silent: 'passed-only',
    // Threads, not forks: a fork lost its channel to vitest while Strapi booted.
    pool: 'threads',
  },
});
