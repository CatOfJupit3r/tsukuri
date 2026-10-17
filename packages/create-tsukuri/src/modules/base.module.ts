import { MARKDOWN_DOCUMENTS } from '@~/enums/markdown-documents.enums';
import { MODULE_CATEGORIES } from '@~/enums/module-categories.enums';
import { MODULE_IDS } from '@~/enums/module-ids.enums';
import { SKILL_IDS } from '@~/enums/skill-ids.enums';
import { defineModule } from '@~/manifest/define-module';

import { fragmentPath } from './fragment-path';

const LINT_CONFIG_DEPENDENCIES = {
  '@eslint/compat': '^2.1.0',
  '@eslint/js': '^9.39.2',
  '@stylistic/eslint-plugin': '^5.10.0',
  '@tanstack/eslint-plugin-query': '^5.101.2',
  '@tanstack/eslint-plugin-router': '^1.162.0',
  '@typescript-eslint/eslint-plugin': '^8.63.0',
  '@typescript-eslint/parser': '^8.63.0',
  'eslint-config-airbnb-extended': '^3.1.0',
  'eslint-config-prettier': '^10.1.8',
  'eslint-import-resolver-typescript': '^4.4.5',
  'eslint-plugin-better-tailwindcss': '^4.6.1',
  'eslint-plugin-enumwaii': '1.2.0',
  'eslint-plugin-import-x': '^4.17.1',
  'eslint-plugin-jsx-a11y': '^6.10.2',
  'eslint-plugin-n': '^18.2.2',
  'eslint-plugin-prettier': '^5.5.6',
  'eslint-plugin-react': '^7.37.5',
  'eslint-plugin-react-hooks': '^7.1.1',
  'eslint-plugin-react-refresh': '^0.5.3',
  globals: '^17.7.0',
  'typescript-eslint': '^8.63.0',
};

export const baseModule = defineModule({
  id: MODULE_IDS.BASE,
  name: 'Base tooling',
  description: 'pnpm workspace, TypeScript, ESLint, Prettier, verify script and the shared common package',
  category: MODULE_CATEGORIES.BASE,
  isAlwaysIncluded: true,
  files: [
    { source: '.gitattributes' },
    { source: '.gitignore' },
    { source: '.node-version' },
    { source: '.nvmrc' },
    { source: '.vscode' },
    { source: '.husky' },
    { source: '.github/ISSUE_TEMPLATE' },
    { source: 'cz.config.cjs' },
    { source: 'lint-staged.shared.cjs' },
    { source: 'tsconfig.json' },
    { source: 'tsconfig.base.json' },
    { source: 'types' },
    { source: 'scripts/verify.ts' },
    { source: 'scripts/clean.ts' },
    { source: 'configs/eslint-config' },
    { source: 'configs/prettier-config' },
    { source: 'packages/common', exclude: ['src/constants/achievements.ts', 'src/constants/badges.ts'] },
  ],
  packageJson: [
    {
      workspace: '.',
      fields: {
        name: 'startername',
        private: true,
        type: 'module',
        config: {
          commitizen: {
            path: 'node_modules/cz-git',
            czConfig: './cz.config.cjs',
          },
        },
        packageManager: 'pnpm@11.5.0',
        engines: {
          node: '24.13.0',
          pnpm: '>=11.5.0',
        },
      },
      scripts: {
        build: 'pnpm --recursive run build',
        test: 'pnpm --recursive --stream run test',
        'check-types': 'pnpm --recursive --stream --no-bail run check-types',
        prettify: 'pnpm --recursive --stream run prettify',
        prettier: 'pnpm run prettify',
        lint: 'pnpm --recursive --stream --no-bail run lint',
        'lint:fix': 'pnpm run lint',
        verify: 'tsx scripts/verify.ts',
        'clean:modules': 'tsx scripts/clean.ts',
        prepare: 'husky',
        commit: 'cz',
        'update:workspaces': 'pnpm update --interactive --recursive',
      },
      devDependencies: {
        '@types/node': 'catalog:',
        commitizen: '4.3.2',
        'cz-git': '1.13.1',
        husky: '9.1.7',
        'lint-staged': '17.0.8',
        rimraf: '6.1.3',
        tsx: 'catalog:',
      },
    },
    {
      workspace: 'configs/eslint-config',
      fields: {
        name: '@startername/eslint-config',
        version: '1.0.0',
        type: 'module',
        private: true,
        description: 'Shared ESLint configuration for startername monorepo',
        exports: { '.': './src/index.mjs' },
        engines: { node: '24.13.0' },
      },
      dependencies: LINT_CONFIG_DEPENDENCIES,
      peerDependencies: {
        eslint: 'catalog:',
        prettier: 'catalog:',
        typescript: 'catalog:',
      },
    },
    {
      workspace: 'configs/prettier-config',
      fields: {
        name: '@startername/prettier-config',
        version: '1.0.0',
        type: 'module',
        private: true,
        description: 'Shared Prettier configuration for startername monorepo',
        main: './prettier.config.mjs',
        exports: { '.': './prettier.config.mjs' },
      },
      dependencies: {
        '@trivago/prettier-plugin-sort-imports': '^6.0.2',
      },
      peerDependencies: {
        prettier: 'catalog:',
      },
    },
    {
      workspace: 'packages/common',
      fields: {
        name: '@startername/common',
        version: '0.0.0',
        type: 'module',
        exports: {
          './globals': {
            types: './dist/globals.d.mts',
            default: './dist/globals.d.mts',
          },
          './constants/*': {
            types: './dist/constants/*.d.mts',
            default: './dist/constants/*.mjs',
          },
          './enums/*': {
            types: './dist/enums/*.d.mts',
            default: './dist/enums/*.mjs',
          },
          './helpers/*': {
            types: './dist/helpers/*.d.mts',
            default: './dist/helpers/*.mjs',
          },
        },
        files: ['dist'],
        prettier: '@startername/prettier-config',
      },
      scripts: {
        dev: 'tsdown --watch --no-clean',
        build: 'tsdown',
        'check-types': 'tsc --noEmit',
        lint: 'eslint . --fix',
        prettify: 'prettier --write ./src/',
        test: "echo 'No tests for common library yet'",
        prepare: 'tsdown',
      },
      dependencies: {
        enumwaii: '1.2.0',
        zod: 'catalog:',
      },
      devDependencies: {
        '@startername/eslint-config': 'workspace:*',
        '@startername/prettier-config': 'workspace:*',
        '@types/node': 'catalog:',
        '@typescript/native-preview': 'catalog:',
        eslint: 'catalog:',
        prettier: 'catalog:',
        tsdown: 'catalog:',
        typescript: 'catalog:',
      },
      peerDependencies: {
        typescript: 'catalog:',
      },
    },
  ],
  pnpmWorkspace: {
    packages: ['packages/*', 'configs/*'],
    catalog: {
      eslint: '9.39.2',
      prettier: '3.9.5',
      zod: '4.4.3',
      typescript: '6.0.3',
      '@types/node': '26.1.1',
      tsdown: '0.22.4',
      tsx: '4.23.0',
      '@typescript/native-preview': '7.0.0-dev.20260707.2',
    },
    allowBuilds: {
      esbuild: true,
      'unrs-resolver': true,
    },
    minimumReleaseAgeExclude: ['eslint-plugin-n@18.2.2'],
  },
  skills: [SKILL_IDS.REVIEW_CODE],
  markdown: [
    { document: MARKDOWN_DOCUMENTS.AGENTS, source: fragmentPath('base/agents.md') },
    { document: MARKDOWN_DOCUMENTS.README, source: fragmentPath('base/readme.md') },
  ],
});
