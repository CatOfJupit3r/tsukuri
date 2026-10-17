import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import type { ViteUserConfig } from 'vitest/config';

type iTestOptions = NonNullable<ViteUserConfig['test']>;

export function createVitestConfig(test: Pick<iTestOptions, 'include' | 'exclude' | 'testTimeout'>) {
  return defineConfig({
    plugins: [swc.vite({ tsconfigFile: './tsconfig.json' })],
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
