import { templatePath } from '#~/constants/template-path';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/markdown-documents.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { SKILL_IDS } from '#~/enums/skill-ids.enums';
import { defineModule } from '#~/manifest/define-module';

export const baseModule = defineModule({
  id: MODULE_IDS.BASE,
  version: '1.0.0',
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
    // `_` is the runtime husky writes on install.
    { source: '.husky', exclude: ['_'] },
    { source: '.github/ISSUE_TEMPLATE' },
    { source: 'cz.config.cjs' },
    { source: 'lint-staged.shared.cjs' },
    { source: '.prettierignore' },
    { source: 'tsconfig.json' },
    { source: 'tsconfig.base.json' },
    { source: 'oxlint.config.mjs' },
    { source: 'types' },
    { source: 'scripts/verify.ts' },
    { source: 'scripts/clean.ts' },
    { source: 'configs/lint-config' },
    { source: 'configs/prettier-config' },
    { source: 'configs/vitest-config' },
    { source: 'configs/workspace-source' },
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
        packageManager: 'pnpm@12.14.0',
        engines: {
          node: '26.12.0',
          pnpm: '>=12.14.0',
        },
      },
      scripts: {
        test: 'pnpm --recursive --stream run test',
        'check-types': 'pnpm --recursive --stream --no-bail run check-types',
        prettify: 'pnpm --recursive --stream run prettify',
        prettier: 'pnpm run prettify',
        lint: 'oxlint -c oxlint.config.mjs --fix apps packages && pnpm --recursive --no-sort --stream --no-bail run lint:eslint',
        'lint:fix': 'pnpm run lint',
        verify: 'tsx scripts/verify.ts',
        'clean:modules': 'tsx scripts/clean.ts',
        prepare: 'husky',
        commit: 'cz',
        'update:workspaces': 'pnpm update --interactive --recursive',
      },
      devDependencies: {
        '@startername/lint-config': 'workspace:*',
        '@types/node': 'catalog:',
        commitizen: '4.3.2',
        'cz-git': '1.13.1',
        husky: '9.1.7',
        'lint-staged': '17.0.8',
        oxlint: 'catalog:',
        'oxlint-tsgolint': 'catalog:',
        rimraf: '6.1.3',
        tsx: 'catalog:',
      },
    },
    {
      workspace: 'configs/lint-config',
      fields: {
        name: '@startername/lint-config',
        version: '1.0.0',
        type: 'module',
        private: true,
        description: 'Shared ESLint and oxlint configuration for startername monorepo',
        exports: {
          './eslint': './src/eslint.mjs',
          './oxlint-workspaces': './src/oxlint-workspaces.mjs',
        },
        engines: {
          node: '26.12.0',
        },
      },
      dependencies: {
        '@eslint/compat': '^2.1.0',
        '@eslint/js': '^9.39.2',
        '@oxlint/migrate': '1.87.0',
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
        'eslint-plugin-oxlint': '1.87.0',
        'eslint-plugin-prettier': '^5.5.6',
        'eslint-plugin-react': '^7.37.5',
        'eslint-plugin-react-hooks': '^7.1.1',
        'eslint-plugin-react-refresh': '^0.5.3',
        'eslint-plugin-sonarjs': '4.2.2',
        globals: '^17.7.0',
        'typescript-eslint': '^8.63.0',
      },
      peerDependencies: {
        eslint: 'catalog:',
        oxlint: 'catalog:',
        'oxlint-tsgolint': 'catalog:',
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
        exports: {
          '.': './prettier.config.mjs',
        },
      },
      dependencies: {
        '@trivago/prettier-plugin-sort-imports': '^6.0.2',
      },
      peerDependencies: {
        prettier: 'catalog:',
      },
    },
    {
      workspace: 'configs/vitest-config',
      fields: {
        name: '@startername/vitest-config',
        version: '1.0.0',
        type: 'module',
        private: true,
        description: 'Shared Vitest settings: module cache and the example test environment',
        exports: {
          './module-cache': {
            types: './src/module-cache.d.mts',
            default: './src/module-cache.mjs',
          },
          './example-env': {
            types: './src/example-env.d.mts',
            default: './src/example-env.mjs',
          },
        },
      },
      dependencies: {
        dotenv: 'catalog:',
      },
      peerDependencies: {
        vitest: 'catalog:',
      },
    },
    {
      workspace: 'configs/workspace-source',
      fields: {
        name: '@startername/workspace-source',
        version: '1.0.0',
        type: 'module',
        private: true,
        description: 'Resolve workspace packages to their TypeScript source in dev, tests and type checks',
        exports: {
          './conditions': {
            types: './src/conditions.d.mts',
            default: './src/conditions.mjs',
          },
          './vite': {
            types: './src/vite.d.mts',
            default: './src/vite.mjs',
          },
        },
        peerDependenciesMeta: {
          vite: {
            optional: true,
          },
        },
      },
      peerDependencies: {
        vite: '>=8.0.0',
      },
    },
    {
      workspace: 'packages/common',
      fields: {
        name: '@startername/common',
        version: '0.0.0',
        private: true,
        type: 'module',
        exports: {
          './globals': {
            'workspace-source': './src/globals.d.ts',
            types: './dist/globals.d.mts',
            default: './dist/globals.d.mts',
          },
          './constants/*': {
            'workspace-source': './src/constants/*.ts',
            types: './dist/constants/*.d.mts',
            default: './dist/constants/*.mjs',
          },
          './enums/*': {
            'workspace-source': './src/enums/*.ts',
            types: './dist/enums/*.d.mts',
            default: './dist/enums/*.mjs',
          },
          './generated/*': {
            'workspace-source': './src/generated/*.ts',
            types: './dist/generated/*.d.mts',
            default: './dist/generated/*.mjs',
          },
          './helpers/*': {
            'workspace-source': './src/helpers/*.ts',
            types: './dist/helpers/*.d.mts',
            default: './dist/helpers/*.mjs',
          },
        },
        files: ['dist'],
        prettier: '@startername/prettier-config',
      },
      scripts: {
        build: 'tsdown',
        'check-types': 'tsc --noEmit',
        lint: 'pnpm run lint:oxlint && pnpm run lint:eslint',
        'lint:oxlint': 'oxlint -c oxlint.config.mjs --fix',
        'lint:eslint': 'eslint . --fix',
        prettify: 'prettier --write ./src/ ./test/ --ignore-path ../../.gitignore --ignore-path ../../.prettierignore',
        test: 'vitest run',
      },
      dependencies: {
        enumwaii: '1.2.0',
        zod: 'catalog:',
      },
      devDependencies: {
        '@startername/lint-config': 'workspace:*',
        '@startername/prettier-config': 'workspace:*',
        '@types/node': 'catalog:',
        '@typescript/native-preview': 'catalog:',
        eslint: 'catalog:',
        oxlint: 'catalog:',
        'oxlint-tsgolint': 'catalog:',
        prettier: 'catalog:',
        tsdown: 'catalog:',
        typescript: 'catalog:',
        vitest: 'catalog:',
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
      oxlint: '1.87.0',
      'oxlint-tsgolint': '7.0.2004',
      vitest: '4.1.10',
      '@types/node': '26.1.1',
      tsdown: '0.22.4',
      tsx: '4.23.0',
      dotenv: '17.4.2',
      '@typescript/native-preview': '7.0.0-dev.20260707.2',
    },
    allowBuilds: {
      esbuild: true,
      'unrs-resolver': true,
    },
    minimumReleaseAgeExclude: ['eslint-plugin-n@18.2.2'],
  },
  skills: [SKILL_IDS.REVIEW_CODE, SKILL_IDS.PAYLOAD_TOKENS],
  markdown: [
    { document: MARKDOWN_DOCUMENTS.AGENTS, source: templatePath('fragments/base/agents.md.hbs') },
    { document: MARKDOWN_DOCUMENTS.README, source: templatePath('fragments/base/readme.md.hbs') },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.CI_STEP,
      name: 'Verify (types, lint, tests)',
      run: 'pnpm run verify --tests',
    },
  ],
});
