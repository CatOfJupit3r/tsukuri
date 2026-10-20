import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: 'node_modules/.vitest',
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
