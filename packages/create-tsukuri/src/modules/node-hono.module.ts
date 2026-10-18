import { templatePath } from '#~/constants/template-path';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/markdown-documents.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

const SERVER_WORKSPACE = 'apps/server';
const SERVER_PACKAGE_NAME = 'server';

export const nodeHonoModule = defineModule({
  id: MODULE_IDS.NODE_HONO,
  version: '1.0.0',
  name: 'Node Hono server',
  description: 'Hono on Node.js serving the shared API',
  category: MODULE_CATEGORIES.BACKEND,
  requires: [MODULE_IDS.API],
  provides: [CAPABILITIES.BACKEND_TARGET],
  files: [
    { source: `${SERVER_WORKSPACE}/.gitignore` },
    { source: `${SERVER_WORKSPACE}/.lintstagedrc.cjs` },
    { source: `${SERVER_WORKSPACE}/eslint.config.mjs` },
    { source: `${SERVER_WORKSPACE}/oxlint.config.mjs` },
    { source: `${SERVER_WORKSPACE}/tsconfig.json` },
    { source: `${SERVER_WORKSPACE}/tsdown.config.ts` },
    { source: `${SERVER_WORKSPACE}/vitest.config.ts` },
    { source: `${SERVER_WORKSPACE}/src` },
    { source: `${SERVER_WORKSPACE}/test` },
  ],
  packageJson: [
    {
      workspace: SERVER_WORKSPACE,
      fields: {
        name: SERVER_PACKAGE_NAME,
        private: true,
        main: 'dist/server.mjs',
        type: 'module',
        imports: { '#~/*': './src/*.js' },
        engines: { node: '>=26.0.0' },
        prettier: '@startername/prettier-config',
      },
      scripts: {
        dev: 'node --conditions=workspace-source --import @swc-node/register/esm-register --watch ./src/server.ts',
        start: 'node ./dist/server.mjs',
        build: 'tsdown',
        'check-types': 'tsgo --noEmit',
        lint: 'pnpm run lint:oxlint && pnpm run lint:eslint',
        'lint:oxlint': 'oxlint -c oxlint.config.mjs --fix',
        'lint:eslint': 'eslint . --fix',
        prettify: 'prettier --write ./src/ ./test/ --ignore-path ../../.gitignore --ignore-path ../../.prettierignore',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {
        '@hono/node-server': '^2.0.8',
        '@startername/api': 'workspace:*',
        dotenv: 'catalog:',
        hono: 'catalog:',
        'reflect-metadata': '0.2.2',
        tsyringe: '4.10.0',
        zod: 'catalog:',
      },
      devDependencies: {
        '@startername/lint-config': 'workspace:*',
        '@startername/prettier-config': 'workspace:*',
        '@startername/swc-config': 'workspace:*',
        '@startername/vitest-config': 'workspace:*',
        '@startername/workspace-source': 'workspace:*',
        '@swc-node/register': 'catalog:',
        '@swc/core': 'catalog:',
        '@types/node': 'catalog:',
        '@typescript/native-preview': 'catalog:',
        eslint: 'catalog:',
        oxlint: 'catalog:',
        'oxlint-tsgolint': 'catalog:',
        prettier: 'catalog:',
        tsdown: 'catalog:',
        typescript: 'catalog:',
        'unplugin-swc': 'catalog:',
        vitest: 'catalog:',
      },
    },
  ],
  pnpmWorkspace: {
    packages: ['apps/*'],
    catalog: {
      '@swc-node/register': '1.11.1',
      dotenv: '17.4.2',
      hono: '4.12.29',
    },
  },
  markdown: [{ document: MARKDOWN_DOCUMENTS.AGENTS, source: templatePath('fragments/node-hono/agents.md.hbs') }],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: SERVER_WORKSPACE,
      name: 'SERVER_PORT',
      schema: 'z.coerce.number().int().min(1).max(65535).default(5050)',
      example: '5050',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: SERVER_WORKSPACE,
      name: 'SERVER_HOST',
      schema: "z.string().default('localhost')",
      example: 'localhost',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: SERVER_WORKSPACE,
      name: 'CORS_ORIGIN',
      schema: "z.url().or(z.literal('')).default('')",
      example: 'http://localhost:3030',
    },
    { kind: CONNECTION_POINT_KINDS.DEV_TASK, filter: SERVER_PACKAGE_NAME },
    { kind: CONNECTION_POINT_KINDS.BUILD_TASK, filter: SERVER_PACKAGE_NAME },
  ],
});
