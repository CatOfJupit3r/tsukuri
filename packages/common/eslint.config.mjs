import { createBackendConfig } from '@startername/lint-config/eslint';

export default createBackendConfig({
  rootDir: import.meta.url,
  additionalIgnores: ['tsdown.config.ts'],
});
