import { createBackendConfig } from '@startername/lint-config/eslint';

/**
 * Lints the Worker app's own files as `apps/worker` of a project sees them; this folder only installs the
 * Worker's packages and maps the files it shares with `apps/server`.
 */
export const LINT_OPTIONS = {
  rootDir: import.meta.url,
};

export default createBackendConfig(LINT_OPTIONS);
