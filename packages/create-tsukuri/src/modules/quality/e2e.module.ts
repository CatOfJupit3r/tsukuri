import { templatePath } from '#~/constants/template-path';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/files/markdown-documents.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { SKILL_IDS } from '#~/enums/skill-ids.enums';
import { defineModule } from '#~/manifest/define-module';

export const E2E_WORKSPACE = 'apps/e2e';
const E2E_PACKAGE_NAME = 'e2e';
const E2E_FILTER = `--filter=${E2E_PACKAGE_NAME}`;
const SPECS = `${E2E_WORKSPACE}/specs`;
/** Specs that need a module besides the web app come with the glue module of that module. */
const API_HEALTH_SPEC = 'api-health.spec.ts';
const AUTH_SPEC = 'auth.spec.ts';
/**
 * A project that has not committed migrations yet still gets its tables; once it has, a schema change without a
 * committed migration fails here instead of being generated. Stdin is closed and the run bounded, so a drizzle-kit
 * prompt (such as a rename question) fails instead of hanging.
 */
const MIGRATIONS_CHECK = [
  'timeout 300 pnpm run --if-present db:generate < /dev/null',
  // No pipe: GitHub runs steps with `pipefail`, where an early-exiting `grep -q` would fail the listing.
  'if [ -n "$(git ls-files -- \'*/migrations/*\')" ]; then',
  '  git status --porcelain',
  '  if [ -n "$(git status --porcelain)" ]; then',
  "    echo '::error::The schema changed without a committed migration. Run pnpm run db:generate and commit it.'",
  '    exit 1',
  '  fi',
  'fi',
  '',
].join('\n');

/** Local output of a stack or a Playwright run. */
const RUN_OUTPUT = ['.stack', 'test-results', 'playwright-report'];

export const e2eModule = defineModule({
  id: MODULE_IDS.E2E,
  version: '1.0.0',
  name: 'E2E stack',
  description:
    'Playwright end-to-end tests against a per-checkout stack (own compose project and ports), with a PR demo recorder',
  category: MODULE_CATEGORIES.QUALITY,
  requiresCapabilities: [CAPABILITIES.WEB_RENDERING],
  // The stack starts the apps' dev servers on its own ports; wrangler takes its port and env from its own config.
  conflicts: [MODULE_IDS.CLOUDFLARE_WORKER],
  files: [
    {
      source: E2E_WORKSPACE,
      exclude: [`specs/${API_HEALTH_SPEC}`, `specs/${AUTH_SPEC}`, ...RUN_OUTPUT],
    },
  ],
  packageJson: [
    {
      workspace: '.',
      scripts: {
        e2e: `pnpm ${E2E_FILTER} run e2e`,
        'e2e:ui': `pnpm ${E2E_FILTER} run e2e:ui`,
        'e2e:stack': `pnpm ${E2E_FILTER} run stack`,
        'e2e:preflight': `pnpm ${E2E_FILTER} run preflight`,
        'e2e:cleanup': `pnpm ${E2E_FILTER} run cleanup`,
        'e2e:record': `pnpm ${E2E_FILTER} run record`,
      },
    },
    {
      workspace: E2E_WORKSPACE,
      fields: {
        name: E2E_PACKAGE_NAME,
        private: true,
        type: 'module',
        // Playwright loads TypeScript itself and resolves `#~/` without mapping `.js` back to the source.
        imports: { '#~/*': './src/*.ts' },
        engines: { node: '>=26.0.0' },
        prettier: '@startername/prettier-config',
      },
      scripts: {
        e2e: 'playwright test',
        'e2e:ui': 'playwright test --ui',
        stack: 'tsx ./src/commands/start-stack.ts',
        preflight: 'tsx ./src/commands/preflight-check.ts',
        cleanup: 'tsx ./src/commands/cleanup-stack.ts',
        record: 'tsx ./src/demo/record-flow.ts',
        'check-types': 'tsgo --noEmit',
        lint: 'pnpm run lint:oxlint && pnpm run lint:eslint',
        'lint:oxlint': 'oxlint -c oxlint.config.mjs --fix',
        'lint:eslint': 'eslint . --fix',
        prettify:
          'prettier --write ./src/ ./specs/ ./test/ --ignore-path ../../.gitignore --ignore-path ../../.prettierignore',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      devDependencies: {
        '@playwright/test': 'catalog:',
        '@startername/lint-config': 'workspace:*',
        '@startername/prettier-config': 'workspace:*',
        '@startername/vitest-config': 'workspace:*',
        '@types/node': 'catalog:',
        '@typescript/native-preview': 'catalog:',
        eslint: 'catalog:',
        oxlint: 'catalog:',
        'oxlint-tsgolint': 'catalog:',
        prettier: 'catalog:',
        tsx: 'catalog:',
        typescript: 'catalog:',
        vitest: 'catalog:',
      },
    },
  ],
  pnpmWorkspace: {
    packages: ['apps/*'],
    catalog: {
      '@playwright/test': '1.64.1',
    },
  },
  skills: [SKILL_IDS.PR_DEMO_PROOF],
  markdown: [
    { document: MARKDOWN_DOCUMENTS.AGENTS, source: templatePath('fragments/e2e/agents.md.hbs') },
    { document: MARKDOWN_DOCUMENTS.README, source: templatePath('fragments/e2e/readme.md.hbs') },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.CI_JOB,
      id: 'e2e',
      name: 'E2E',
      timeoutMinutes: 30,
      steps: [
        { name: 'Migrations match the schema', run: MIGRATIONS_CHECK },
        { name: 'Install Chromium', run: `pnpm ${E2E_FILTER} exec playwright install --with-deps chromium` },
        { name: 'E2E tests', run: 'pnpm run e2e' },
        {
          name: 'Upload Playwright report',
          if: 'failure()',
          uses: 'actions/upload-artifact@v4',
          with: {
            name: 'playwright-report',
            path: `${E2E_WORKSPACE}/playwright-report/\n${E2E_WORKSPACE}/test-results/\n`,
            'retention-days': 7,
          },
        },
      ],
    },
  ],
  hosts: [
    { kind: CONNECTION_POINT_KINDS.COMPOSE_SERVICE, workspace: E2E_WORKSPACE },
    { kind: CONNECTION_POINT_KINDS.DEV_TASK, workspace: E2E_WORKSPACE },
  ],
});

/** The home page's API health badge, once the web app talks to an API. */
export const e2eApiModule = defineModule({
  id: MODULE_IDS.E2E_API,
  version: '1.0.0',
  name: 'E2E API health spec',
  description: 'E2E spec that the web app reaches the API',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.E2E, MODULE_IDS.API] },
  files: [{ source: `${SPECS}/${API_HEALTH_SPEC}` }],
});

/** Sign-up, session and sign-out through the Better Auth web pages. */
export const e2eBetterAuthModule = defineModule({
  id: MODULE_IDS.E2E_BETTER_AUTH,
  version: '1.0.0',
  name: 'E2E auth spec',
  description: 'E2E spec that signs up, keeps the session across reloads, signs out and signs back in',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.E2E, MODULE_IDS.BETTER_AUTH] },
  files: [{ source: `${SPECS}/${AUTH_SPEC}` }],
});
