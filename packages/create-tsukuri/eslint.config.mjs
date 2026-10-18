import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['vitest.config.ts', 'vitest.install.config.ts', 'fragments/**'],
};

export default createBackendConfig(LINT_OPTIONS);
