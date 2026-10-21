import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['vitest.config.ts', 'playwright-report/**', 'test-results/**', '.stack/**'],
};

export default createBackendConfig(LINT_OPTIONS);
