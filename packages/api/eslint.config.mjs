import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['vitest.config.ts'],
};

export default createBackendConfig(LINT_OPTIONS);
