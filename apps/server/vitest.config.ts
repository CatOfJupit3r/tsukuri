import path from 'node:path';
import { defineConfig } from 'vitest/config';

import { createSwcPlugin } from '@startername/swc-config/vitest';
import { withWorkspaceSourceResolve } from '@startername/workspace-source/vite';

const alias = {
  '@~': path.resolve(__dirname, './src'),
};

const commonTestConfig = {
  globals: true,
  environment: 'node',
  clearMocks: true,
  restoreMocks: true,
  mockReset: true,
  watchExclude: ['dist/**', '.vitest/**'],
  env: {
    NODE_ENV: 'test',
    BETTER_AUTH_SECRET: 'test-secret',
    BETTER_AUTH_URL: 'http://localhost:3000/auth',
    VALKEY_HOST: 'localhost',
    VALKEY_PORT: '6379',
    POSTGRES_URL: 'postgresql://postgres:postgres@localhost:5432/startername-test',
    LOG_LEVEL: 'error',
  },
  coverage: {
    provider: 'v8' as const,
    reporter: ['text', 'json', 'html'],
    exclude: ['node_modules', 'dist', 'test', '**/*.test.ts', '**/*.config.ts'],
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
  },
};

const baseProjectConfig = {
  plugins: [createSwcPlugin()],
  ...withWorkspaceSourceResolve(alias),
  cacheDir: 'node_modules/.vitest',
};

export default defineConfig({
  ...baseProjectConfig,
  test: {
    ...commonTestConfig,
    include: ['test/**/*.test.ts'],
    projects: [
      {
        ...baseProjectConfig,
        test: {
          ...commonTestConfig,
          name: 'unit',
          include: ['test/unit/**/*.test.ts', 'test/**/*.unit.test.ts'],
          exclude: ['test/integration/**', 'test/**/*.int.test.ts'],
          setupFiles: ['./test/helpers/matchers.ts'],
          isolate: true,
          sequence: {
            groupOrder: 0,
          },
        },
      },
      {
        ...baseProjectConfig,
        test: {
          ...commonTestConfig,
          name: 'integration',
          include: ['test/**/*.test.ts'],
          exclude: ['test/unit/**', 'test/**/*.unit.test.ts'],
          globalSetup: ['./test/global-setup.ts'],
          setupFiles: ['./test/helpers/setup.ts'],
          testTimeout: 10000,
          hookTimeout: 10000,
          isolate: false,
          fileParallelism: false,
          maxWorkers: 1,
          minWorkers: 1,
          sequence: {
            groupOrder: 1,
          },
        },
      },
    ],
  },
});
