import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['vitest.config.ts', 'playwright-report/**', 'test-results/**', '.stack/**'],
  // Playwright loads its global setup through the default export.
  defaultExportFiles: ['src/playwright/global-setup.ts'],
};

export default createBackendConfig(LINT_OPTIONS);
