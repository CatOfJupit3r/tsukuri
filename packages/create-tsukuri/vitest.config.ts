import path from 'node:path';
import { defineConfig } from 'vitest/config';
import type { ViteUserConfig } from 'vitest/config';

import { createSwcPlugin } from '@startername/swc-config/vitest';
import { MODULE_CACHE_TEST_OPTIONS, moduleCacheKeyPlugin } from '@startername/vitest-config/module-cache';

type iTestOptions = NonNullable<ViteUserConfig['test']>;

export function createVitestConfig(test: Pick<iTestOptions, 'include' | 'exclude' | 'testTimeout'>) {
  return defineConfig({
    plugins: [
      createSwcPlugin(),
      moduleCacheKeyPlugin({
        rootDirectory: __dirname,
        configFilePaths: [path.resolve(__dirname, 'tsconfig.json')],
        transformerPackageNames: ['@swc/core', 'unplugin-swc'],
      }),
    ],
    cacheDir: 'node_modules/.vitest',
    test: {
      experimental: MODULE_CACHE_TEST_OPTIONS,
      globals: true,
      environment: 'node',
      setupFiles: ['reflect-metadata'],
      clearMocks: true,
      restoreMocks: true,
      ...test,
    },
  });
}

export default createVitestConfig({
  include: ['test/**/*.test.ts'],
  exclude: ['test/install/**'],
  testTimeout: 20000,
});
