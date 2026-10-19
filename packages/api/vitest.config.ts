import { globSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

import { createSwcPlugin } from '@startername/swc-config/vitest';
import { loadExampleEnv } from '@startername/vitest-config/example-env';
import { MODULE_CACHE_TEST_OPTIONS, moduleCacheKeyPlugin } from '@startername/vitest-config/module-cache';
import { withWorkspaceSourceResolve } from '@startername/workspace-source/vite';

/** Each installed module may add a test setup file; they run before the API starts. */
const MODULE_TEST_SETUP_FILES = globSync('./test/helpers/setup/*.setup.ts', { cwd: __dirname }).toSorted();

const commonTestConfig = {
  experimental: MODULE_CACHE_TEST_OPTIONS,
  globals: true,
  environment: 'node',
  clearMocks: true,
  restoreMocks: true,
  mockReset: true,
  env: loadExampleEnv(path.resolve(__dirname, '../..'), { NODE_ENV: 'test', LOG_LEVEL: 'error' }),
};

const baseProjectConfig = {
  plugins: [
    createSwcPlugin(),
    moduleCacheKeyPlugin({
      rootDirectory: __dirname,
      configFilePaths: [path.resolve(__dirname, 'tsconfig.json')],
      transformerPackageNames: ['@swc/core', 'unplugin-swc'],
    }),
  ],
  ...withWorkspaceSourceResolve(),
  cacheDir: 'node_modules/.vitest',
};

export default defineConfig({
  ...baseProjectConfig,
  test: {
    ...commonTestConfig,
    projects: [
      {
        ...baseProjectConfig,
        test: {
          ...commonTestConfig,
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          setupFiles: ['reflect-metadata', './test/helpers/matchers.ts'],
          sequence: { groupOrder: 0 },
        },
      },
      {
        ...baseProjectConfig,
        test: {
          ...commonTestConfig,
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['reflect-metadata', ...MODULE_TEST_SETUP_FILES, './test/helpers/setup.ts'],
          testTimeout: 10000,
          hookTimeout: 10000,
          isolate: false,
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
