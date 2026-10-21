import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  additionalIgnores: ['vitest.config.ts', 'vitest.install.config.ts', 'fragments/**'],
  enumwaiiWireExceptions: [
    {
      name: {
        regex: '^(moduleIdsEnumwaii|presetIdsEnumwaii|promptIdsEnumwaii|modifyActionsEnumwaii)$',
      },
      reason: 'external-contract',
      justification:
        'Module ids, presets, prompt flags and subcommands are typed on the CLI and stored in starter.json.',
    },
    {
      name: { regex: '^(skillIdsEnumwaii|controlBlocksEnumwaii)$' },
      reason: 'external-contract',
      justification: 'Skill ids are folder names under .agents/skills and control blocks are markdown tag names.',
    },
  ],
};

export default createBackendConfig(LINT_OPTIONS);
