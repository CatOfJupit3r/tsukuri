import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

import { MODULE_CACHE_TEST_OPTIONS, moduleCacheKeyPlugin } from '@startername/vitest-config/module-cache';
import { withWorkspaceSourceResolve } from '@startername/workspace-source/vite';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    moduleCacheKeyPlugin({
      rootDirectory: __dirname,
      configFilePaths: [],
      transformerPackageNames: ['@vitejs/plugin-react', 'babel-plugin-react-compiler'],
    }),
  ],
  test: {
    experimental: MODULE_CACHE_TEST_OPTIONS,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'test', '**/*.{test,spec}.{ts,tsx}', '**/*.config.ts'],
    },
  },
  ...withWorkspaceSourceResolve({
    '@~': path.resolve(__dirname, './src'),
  }),
});
