import { templatePath } from '#~/constants/template-path';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/markdown-documents.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { API_WORKSPACE } from './api.module';
import { CORS_ORIGIN_VARIABLE, SERVER_WORKSPACE } from './node-hono.module';

export const WORKER_WORKSPACE = 'apps/worker';
const WORKER_PACKAGE_NAME = 'worker';
export const WORKER_FILTER = `--filter=${WORKER_PACKAGE_NAME}`;
/** The Worker's own files; it only exists in generated projects, so they live outside the workspaces here. */
const WORKER_VARIANT = 'variants/cloudflare-worker/apps/worker';
const API_WORKER_VARIANT = `${API_WORKSPACE}/variants/cloudflare-worker`;
/** The Worker runs the same Hono app and workspace setup as the Node server. */
const SHARED_SERVER_FILES = [
  '.gitignore',
  '.lintstagedrc.cjs',
  'eslint.config.mjs',
  'oxlint.config.mjs',
  'tsconfig.json',
  'vitest.config.ts',
  'src/app.ts',
  'src/constants/env.ts',
];

export const cloudflareWorkerModule = defineModule({
  id: MODULE_IDS.CLOUDFLARE_WORKER,
  version: '1.0.0',
  name: 'Cloudflare Worker',
  description: 'Hono on a Cloudflare Worker (wrangler) serving the shared API',
  category: MODULE_CATEGORIES.BACKEND,
  requires: [MODULE_IDS.API],
  provides: [CAPABILITIES.BACKEND_TARGET, CAPABILITIES.REMOTE_BACKEND, CAPABILITIES.WORKER_RUNTIME],
  files: [
    // `src/generated` holds the connection points this repository type-checks the Worker against.
    { source: WORKER_VARIANT, target: WORKER_WORKSPACE, exclude: ['src/generated'] },
    ...SHARED_SERVER_FILES.map((file) => ({
      source: `${SERVER_WORKSPACE}/${file}`,
      target: `${WORKER_WORKSPACE}/${file}`,
    })),
    { source: `${API_WORKER_VARIANT}/test/helpers`, target: `${API_WORKSPACE}/test/helpers` },
  ],
  packageJson: [
    {
      workspace: WORKER_WORKSPACE,
      fields: {
        name: WORKER_PACKAGE_NAME,
        private: true,
        type: 'module',
        imports: { '#~/*': './src/*.js' },
        prettier: '@startername/prettier-config',
      },
      scripts: {
        dev: 'wrangler dev --port 5050 --env-file ../../.env',
        bundle: 'tsdown',
        build: 'wrangler deploy --dry-run',
        deploy: 'wrangler deploy',
        'check-types': 'tsgo --noEmit',
        lint: 'pnpm run lint:oxlint && pnpm run lint:eslint',
        'lint:oxlint': 'oxlint -c oxlint.config.mjs --fix',
        'lint:eslint': 'eslint . --fix',
        prettify: 'prettier --write ./src/ ./test/ --ignore-path ../../.gitignore --ignore-path ../../.prettierignore',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {
        '@startername/api': 'workspace:*',
        hono: 'catalog:',
        'reflect-metadata': '0.2.2',
        tsyringe: '4.10.0',
        zod: 'catalog:',
      },
      devDependencies: {
        '@cloudflare/workers-types': 'catalog:',
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
        tsdown: 'catalog:',
        typescript: 'catalog:',
        'unplugin-swc': 'catalog:',
        vitest: 'catalog:',
        wrangler: 'catalog:',
      },
    },
    {
      // The Cloudflare modules' API code imports binding types; their tests run on wrangler's local bindings.
      workspace: API_WORKSPACE,
      devDependencies: {
        '@cloudflare/workers-types': 'catalog:',
        wrangler: 'catalog:',
      },
    },
  ],
  pnpmWorkspace: {
    packages: ['apps/*'],
    catalog: {
      '@cloudflare/workers-types': '5.20261016.1',
      hono: '4.12.29',
      wrangler: '4.151.1',
    },
    allowBuilds: {
      workerd: true,
    },
  },
  markdown: [
    { document: MARKDOWN_DOCUMENTS.AGENTS, source: templatePath('fragments/cloudflare-worker/agents.md.hbs') },
  ],
  contributions: [
    { ...CORS_ORIGIN_VARIABLE, workspace: WORKER_WORKSPACE },
    { kind: CONNECTION_POINT_KINDS.DEV_TASK, filter: WORKER_PACKAGE_NAME },
    { kind: CONNECTION_POINT_KINDS.BUILD_TASK, filter: WORKER_PACKAGE_NAME },
  ],
  hosts: [
    { kind: CONNECTION_POINT_KINDS.WORKER_BINDING, workspace: WORKER_WORKSPACE },
    { kind: CONNECTION_POINT_KINDS.ENV_VARIABLE, workspace: WORKER_WORKSPACE },
  ],
});
