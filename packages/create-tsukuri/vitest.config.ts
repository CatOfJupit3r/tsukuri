import path from 'node:path';
import { defineConfig } from 'vitest/config';
import type { ViteUserConfig } from 'vitest/config';

import { createSwcPlugin } from '@startername/swc-config/vitest';

type iTestOptions = NonNullable<ViteUserConfig['test']>;

export function createVitestConfig(test: Pick<iTestOptions, 'include' | 'exclude' | 'testTimeout'>) {
  return defineConfig({
    plugins: [createSwcPlugin()],
    resolve: {
      alias: {
        '@~': path.resolve(__dirname, './src'),
      },
    },
    cacheDir: 'node_modules/.vitest',
    test: {
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
