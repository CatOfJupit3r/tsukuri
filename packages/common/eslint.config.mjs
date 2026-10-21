import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['tsdown.config.ts'],
  enumwaiiWireExceptions: [
    {
      name: { regex: '^(keyboardKeysEnumwaii|mediaTypesEnumwaii|abortErrorNamesEnumwaii)$' },
      reason: 'external-contract',
      justification: 'KeyboardEvent.key values, MIME types and Error.name values are spelled by the platform.',
    },
  ],
};

export default createBackendConfig(LINT_OPTIONS);
