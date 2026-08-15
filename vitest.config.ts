import { defineConfig } from 'vitest/config';
import path from 'node:path';

const alias = {
  '@afd/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
  '@': path.resolve(__dirname, 'apps/web/src'),
};

/**
 * Two suites with different needs:
 *
 *  - `unit` is pure and runs fully parallel.
 *  - `integration` shares one PostgreSQL database and rebuilds the schema, so
 *    its files must run one at a time. Running them in parallel would have them
 *    truncating each other's fixtures.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    // Integration files share one database, so no two test FILES may run at
    // once. Individual unit tests still parallelise inside their own project.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          fileParallelism: false,
          sequence: { concurrent: false },
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/shared/src/**', 'apps/web/src/server/**', 'apps/web/src/lib/**'],
      reporter: ['text', 'html'],
    },
  },
});
