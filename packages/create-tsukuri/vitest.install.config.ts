import { createVitestConfig } from './vitest.config';

/** Generates projects and installs them from the registry; slow and network-bound. */
export default createVitestConfig({
  include: ['test/install/**/*.test.ts'],
  testTimeout: 10 * 60 * 1000,
  // Removing an installed project's node_modules takes longer than the default hook timeout.
  hookTimeout: 2 * 60 * 1000,
});
