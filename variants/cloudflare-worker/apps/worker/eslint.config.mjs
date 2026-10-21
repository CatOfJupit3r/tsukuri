import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['vitest.config.ts'],
  // Wrangler loads the Worker's `fetch` handler from the entry module's default export.
  defaultExportFiles: ['src/worker.ts'],
};

export default createBackendConfig(LINT_OPTIONS);
