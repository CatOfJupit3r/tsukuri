import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  // The SQLite variant replaces Postgres files in a generated project and is checked there.
  additionalIgnores: ['vitest.config.ts', 'variants/**'],
};

export default createBackendConfig(LINT_OPTIONS);
