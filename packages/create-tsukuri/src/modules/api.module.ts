import { templatePath } from '#~/constants/template-path';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/markdown-documents.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { SKILL_IDS } from '#~/enums/skill-ids.enums';
import { defineModule } from '#~/manifest/define-module';

const API_WORKSPACE = 'packages/api';
const CONTRACT_WORKSPACE = 'packages/server-contract';
const COMMON_WORKSPACE = 'packages/common';

/** Workspace-level files every package of this module ships. */
const WORKSPACE_TOOLING_FILES = [
  '.gitignore',
  '.lintstagedrc.cjs',
  'eslint.config.mjs',
  'oxlint.config.mjs',
  'tsconfig.json',
];

export const apiModule = defineModule({
  id: MODULE_IDS.API,
  version: '1.0.0',
  name: 'Shared API',
  description: 'Runtime-agnostic oRPC API (packages/api) and its contract package, mounted by every backend target',
  // Pulled in by backend targets, never chosen on its own.
  category: MODULE_CATEGORIES.BASE,
  files: [
    { source: 'configs/swc-config' },
    ...WORKSPACE_TOOLING_FILES.map((file) => ({ source: `${API_WORKSPACE}/${file}` })),
    { source: `${API_WORKSPACE}/vitest.config.ts` },
    { source: `${API_WORKSPACE}/src/app-router.ts` },
    { source: `${API_WORKSPACE}/src/start-api.ts` },
    { source: `${API_WORKSPACE}/src/constants` },
    { source: `${API_WORKSPACE}/src/di` },
    { source: `${API_WORKSPACE}/src/lib` },
    { source: `${API_WORKSPACE}/src/features/cache` },
    { source: `${API_WORKSPACE}/src/features/events` },
    { source: `${API_WORKSPACE}/src/features/health` },
    { source: `${API_WORKSPACE}/src/features/http` },
    { source: `${API_WORKSPACE}/src/features/logger` },
    { source: `${API_WORKSPACE}/src/features/request-context` },
    { source: `${API_WORKSPACE}/src/features/startup` },
    { source: `${API_WORKSPACE}/test/helpers/matchers.ts` },
    { source: `${API_WORKSPACE}/test/helpers/orpc-errors.ts` },
    { source: `${API_WORKSPACE}/test/helpers/setup.ts` },
    { source: `${API_WORKSPACE}/test/helpers/unit-mocks.ts` },
    { source: `${API_WORKSPACE}/test/unit/error-handling-helper.test.ts` },
    { source: `${API_WORKSPACE}/test/unit/event-bus.test.ts` },
    { source: `${API_WORKSPACE}/test/unit/matchers.test.ts` },
    { source: `${API_WORKSPACE}/test/unit/orpc-error-wrapper.test.ts` },
    { source: `${API_WORKSPACE}/test/integration/health.test.ts` },
    ...WORKSPACE_TOOLING_FILES.map((file) => ({ source: `${CONTRACT_WORKSPACE}/${file}` })),
    { source: `${CONTRACT_WORKSPACE}/tsdown.config.ts` },
    { source: `${CONTRACT_WORKSPACE}/src/app.contract.ts` },
    { source: `${CONTRACT_WORKSPACE}/src/contract/index.contract.ts` },
  ],
  packageJson: [
    {
      workspace: API_WORKSPACE,
      fields: {
        name: '@startername/api',
        version: '0.0.0',
        private: true,
        type: 'module',
        imports: { '#~/*': './src/*.js' },
        exports: { './*': './src/*.ts' },
        engines: { node: '>=26.0.0' },
        prettier: '@startername/prettier-config',
      },
      scripts: {
        'check-types': 'tsgo --noEmit',
        lint: 'pnpm run lint:oxlint && pnpm run lint:eslint',
        'lint:oxlint': 'oxlint -c oxlint.config.mjs --fix',
        'lint:eslint': 'eslint . --fix',
        prettify: 'prettier --write ./src/ ./test/ --ignore-path ../../.gitignore --ignore-path ../../.prettierignore',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {
        '@orpc/openapi': 'catalog:',
        '@orpc/server': 'catalog:',
        '@orpc/zod': 'catalog:',
        '@startername/common': 'workspace:*',
        '@startername/server-contract': 'workspace:*',
        enumwaii: '1.2.0',
        'reflect-metadata': '0.2.2',
        'safe-stable-stringify': '2.5.0',
        tsyringe: '4.10.0',
        winston: '3.19.0',
        zod: 'catalog:',
      },
      devDependencies: {
        '@startername/lint-config': 'workspace:*',
        '@startername/prettier-config': 'workspace:*',
        '@startername/swc-config': 'workspace:*',
        '@startername/vitest-config': 'workspace:*',
        '@startername/workspace-source': 'workspace:*',
        '@swc/core': 'catalog:',
        '@types/node': 'catalog:',
        '@typescript/native-preview': 'catalog:',
        eslint: 'catalog:',
        oxlint: 'catalog:',
        'oxlint-tsgolint': 'catalog:',
        prettier: 'catalog:',
        typescript: 'catalog:',
        'unplugin-swc': 'catalog:',
        vitest: 'catalog:',
      },
    },
    {
      workspace: CONTRACT_WORKSPACE,
      fields: {
        name: '@startername/server-contract',
        version: '0.0.0',
        private: true,
        type: 'module',
        exports: {
          './app.contract': {
            'workspace-source': './src/app.contract.ts',
            types: './dist/app.contract.d.mts',
            default: './dist/app.contract.mjs',
          },
          './contract/*': {
            'workspace-source': './src/contract/*.ts',
            types: './dist/contract/*.d.mts',
            default: './dist/contract/*.mjs',
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
        prettify: 'prettier --write ./src/ --ignore-path ../../.gitignore --ignore-path ../../.prettierignore',
        test: "echo 'No tests for server contract library yet'",
      },
      dependencies: {
        '@orpc/contract': 'catalog:',
        '@startername/common': 'workspace:*',
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
      },
      peerDependencies: {
        typescript: 'catalog:',
      },
    },
    {
      workspace: 'configs/swc-config',
      fields: {
        name: '@startername/swc-config',
        version: '1.0.0',
        type: 'module',
        private: true,
        description: 'Shared SWC settings for workspaces that use tsyringe decorators',
        exports: {
          './tsconfig.decorators.json': './tsconfig.decorators.json',
          './vitest': {
            types: './src/vitest.d.mts',
            default: './src/vitest.mjs',
          },
        },
      },
      peerDependencies: {
        '@swc/core': 'catalog:',
        'unplugin-swc': 'catalog:',
      },
    },
  ],
  pnpmWorkspace: {
    catalog: {
      '@orpc/contract': '1.14.7',
      '@orpc/openapi': '1.14.7',
      '@orpc/server': '1.14.7',
      '@orpc/zod': '1.14.7',
      '@swc/core': '1.15.43',
      'unplugin-swc': '1.5.9',
    },
    allowBuilds: {
      '@swc/core': true,
    },
    onlyBuiltDependencies: ['@swc/core'],
  },
  skills: [
    SKILL_IDS.SERVER_MODULE,
    SKILL_IDS.DEPENDENCY_INJECTION_SETUP,
    SKILL_IDS.SERVER_ERROR_HANDLING,
    SKILL_IDS.SERVER_ROUTER_IMPLEMENTATION,
    SKILL_IDS.SERVER_TESTING,
    SKILL_IDS.ORPC_CONTRACT_CREATION,
  ],
  markdown: [{ document: MARKDOWN_DOCUMENTS.AGENTS, source: templatePath('fragments/api/agents.md.hbs') }],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.CONTRACT,
      workspace: CONTRACT_WORKSPACE,
      key: 'index',
      contract: { name: 'indexContract', from: '../contract/index.contract' },
    },
    {
      kind: CONNECTION_POINT_KINDS.ROUTER,
      workspace: API_WORKSPACE,
      key: 'index',
      router: { name: 'healthRouter', from: '#~/features/health/health.router' },
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'NODE_ENV',
      schema: `nodeEnvironmentSchema.default(NODE_ENVIRONMENTS.DEVELOPMENT)`,
      imports: [
        { name: 'nodeEnvironmentSchema', from: '#~/constants/node-environments.enums' },
        { name: 'NODE_ENVIRONMENTS', from: '#~/constants/node-environments.enums' },
      ],
      example: 'development',
    },
    {
      kind: CONNECTION_POINT_KINDS.ERROR_CODE,
      workspace: COMMON_WORKSPACE,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred',
    },
  ],
  hosts: [
    { kind: CONNECTION_POINT_KINDS.DI_REGISTRATION, workspace: API_WORKSPACE },
    { kind: CONNECTION_POINT_KINDS.STARTUP_TASK, workspace: API_WORKSPACE },
    { kind: CONNECTION_POINT_KINDS.HTTP_HANDLER, workspace: API_WORKSPACE },
    { kind: CONNECTION_POINT_KINDS.CONTEXT_PROVIDER, workspace: API_WORKSPACE },
  ],
});
