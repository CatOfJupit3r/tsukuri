import path from 'node:path';
import { defineConfig } from 'vitest/config';

import { createSwcPlugin } from '@startername/swc-config/vitest';
import { loadExampleEnv } from '@startername/vitest-config/example-env';
import { MODULE_CACHE_TEST_OPTIONS, moduleCacheKeyPlugin } from '@startername/vitest-config/module-cache';
import { withWorkspaceSourceResolve } from '@startername/workspace-source/vite';

export default defineConfig({
  plugins: [
    createSwcPlugin(),
    moduleCacheKeyPlugin({
      rootDirectory: __dirname,
      configFilePaths: [path.resolve(__dirname, 'tsconfig.json')],
      transformerPackageNames: ['@swc/core', 'unplugin-swc'],
    }),
  ],
  ...withWorkspaceSourceResolve({ isTest: true }),
  cacheDir: 'node_modules/.vitest',
  test: {
    experimental: MODULE_CACHE_TEST_OPTIONS,
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['reflect-metadata'],
    env: loadExampleEnv(path.resolve(__dirname, '../..'), { NODE_ENV: 'test', LOG_LEVEL: 'error' }),
  },
});
