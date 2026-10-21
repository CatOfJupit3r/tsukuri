import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  // Variants replace files in a generated project and are checked there; their env shapes are checked here too.
  additionalIgnores: ['vitest.config.ts', 'variants/**', '!variants/**/', '!variants/**/*.env.ts'],
  enumwaiiWireExceptions: [
    {
      name: { regex: '^(nodeEnvironmentsEnumwaii|authCookieSameSitesEnumwaii)$' },
      reason: 'external-contract',
      justification: 'NODE_ENV values and cookie SameSite values are set by the deployment and the HTTP spec.',
    },
    {
      name: { regex: '^(databaseDialectsEnumwaii|authAccountProviderIdsEnumwaii)$' },
      reason: 'external-contract',
      justification: 'Drizzle adapter provider names and Better Auth account provider ids keep the library spelling.',
    },
  ],
};

export default createBackendConfig(LINT_OPTIONS);
