import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  // Variants replace files in a generated project and are checked there; their env shapes are checked here too.
  additionalIgnores: ['vitest.config.ts', 'variants/**', '!variants/**/', '!variants/**/*.env.ts'],
};

export default createBackendConfig(LINT_OPTIONS);
