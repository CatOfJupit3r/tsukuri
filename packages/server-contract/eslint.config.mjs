import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['tsdown.config.ts'],
};

export default createBackendConfig(LINT_OPTIONS);
