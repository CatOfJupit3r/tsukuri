import { templatePath } from '#~/constants/template-path';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/files/markdown-documents.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { API_WORKSPACE, CORS_ENV_SHAPE } from '../base/api.module';

export const WORKER_WORKSPACE = 'apps/worker';
const WORKER_PACKAGE_NAME = 'worker';
/** The Worker app only exists in generated projects, so its sources live outside the workspaces here. */
const WORKER_VARIANT = 'variants/cloudflare-worker/apps/worker';
const LINT_STAGED_SOURCE = 'lintstagedrc.cjs';

export const cloudflareWorkerModule = defineModule({
  id: MODULE_IDS.CLOUDFLARE_WORKER,
  version: '1.0.0',
  name: 'Cloudflare Worker',
  description: 'Hono on a Cloudflare Worker (wrangler) serving the shared API',
  category: MODULE_CATEGORIES.BACKEND,
  requires: [MODULE_IDS.API],
  provides: [CAPABILITIES.BACKEND_TARGET, CAPABILITIES.REMOTE_BACKEND, CAPABILITIES.WORKER_RUNTIME],
  files: [
    { source: WORKER_VARIANT, target: WORKER_WORKSPACE, exclude: [LINT_STAGED_SOURCE] },
    // Stored without the dot so lint-staged here does not load a config whose paths only resolve in a project.
    { source: `${WORKER_VARIANT}/${LINT_STAGED_SOURCE}`, target: `${WORKER_WORKSPACE}/.lintstagedrc.cjs` },
    { source: `${API_WORKSPACE}/test/helpers/cloudflare-platform.ts` },
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
    { kind: CONNECTION_POINT_KINDS.ENV_SHAPE, workspace: WORKER_WORKSPACE, shape: CORS_ENV_SHAPE },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: WORKER_WORKSPACE,
      name: 'CORS_ORIGIN',
      example: 'http://localhost:3030',
    },
    { kind: CONNECTION_POINT_KINDS.DEV_TASK, filter: WORKER_PACKAGE_NAME },
    { kind: CONNECTION_POINT_KINDS.BUILD_TASK, filter: WORKER_PACKAGE_NAME },
  ],
  hosts: [
    { kind: CONNECTION_POINT_KINDS.WORKER_BINDING, workspace: WORKER_WORKSPACE },
    { kind: CONNECTION_POINT_KINDS.ENV_SHAPE, workspace: WORKER_WORKSPACE },
  ],
});
