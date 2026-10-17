import { createBackendConfig } from '@startername/lint-config/eslint';

export default createBackendConfig({
  rootDir: import.meta.url,
  additionalIgnores: ['vitest.config.ts', 'vitest.install.config.ts', 'fragments/**'],
});
