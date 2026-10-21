import { defineConfig } from 'vitest/config';

import { MODULE_CACHE_TEST_OPTIONS, moduleCacheKeyPlugin } from '@startername/vitest-config/module-cache';

export default defineConfig({
  plugins: [moduleCacheKeyPlugin({ rootDirectory: __dirname, configFilePaths: [], transformerPackageNames: [] })],
  cacheDir: 'node_modules/.vitest',
  test: {
    experimental: MODULE_CACHE_TEST_OPTIONS,
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
