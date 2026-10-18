import { createVitestConfig } from './vitest.config';

/** Generates projects and installs them from the registry; slow and network-bound. */
export default createVitestConfig({
  include: ['test/install/**/*.test.ts'],
  testTimeout: 10 * 60 * 1000,
});
