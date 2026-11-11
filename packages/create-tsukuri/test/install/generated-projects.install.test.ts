import { existsSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';

import { createGeneratorContainer } from '#~/di/container';
import { ProjectGenerator } from '#~/engine/project-generator';
import type { ModuleId } from '#~/enums/module-ids.enums';
import { MODULE_IDS, moduleIdSchema } from '#~/enums/module-ids.enums';

import { runCommand } from '../helpers/run-command';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

interface iProjectCase {
  name: string;
  modules: ModuleId[];
  /** Defaults to `acme`; a hyphenated name checks that renamed sources stay valid. */
  projectName?: string;
  /** Extra commands that must pass after verify, e.g. a production build. */
  commands: string[];
}

const SERVER_FEATURES = [MODULE_IDS.BETTER_AUTH, MODULE_IDS.EXAMPLE_DOMAIN];
/** Loads the Playwright config and every spec without a browser or a running stack. */
const LIST_E2E_SPECS = 'pnpm --filter=e2e exec playwright test --list';

const PROJECT_CASES: iProjectCase[] = [
  {
    name: 'SSR web app with a Node server, every server module and the E2E stack',
    projectName: 'my-app',
    modules: [
      MODULE_IDS.WEB_SSR,
      MODULE_IDS.NODE_HONO,
      MODULE_IDS.POSTGRES,
      MODULE_IDS.VALKEY,
      MODULE_IDS.E2E,
      ...SERVER_FEATURES,
    ],
    commands: ['pnpm run build', LIST_E2E_SPECS],
  },
  {
    name: 'SPA with a Node server',
    modules: [MODULE_IDS.WEB_SPA, MODULE_IDS.NODE_HONO, MODULE_IDS.POSTGRES, ...SERVER_FEATURES],
    commands: ['pnpm --filter=web run build'],
  },
  {
    name: 'TanStack Start app serving the API itself on SQLite, with the E2E stack',
    modules: [MODULE_IDS.TANSTACK_START, MODULE_IDS.SQLITE, MODULE_IDS.E2E, ...SERVER_FEATURES],
    commands: ['pnpm --filter=web run build', LIST_E2E_SPECS],
  },
  {
    name: 'Node server on SQLite',
    modules: [MODULE_IDS.NODE_HONO, MODULE_IDS.SQLITE, ...SERVER_FEATURES],
    commands: ['pnpm run db:generate', 'pnpm run db:migrate', 'pnpm run build'],
  },
  {
    name: 'Cloudflare Worker on D1 and KV with the SPA',
    modules: [
      MODULE_IDS.CLOUDFLARE_WORKER,
      MODULE_IDS.D1,
      MODULE_IDS.CLOUDFLARE_KV,
      MODULE_IDS.WEB_SPA,
      ...SERVER_FEATURES,
    ],
    commands: ['pnpm run db:generate', 'pnpm run db:migrate', 'pnpm run build'],
  },
  {
    name: 'Cloudflare Worker on Postgres through Hyperdrive',
    modules: [MODULE_IDS.CLOUDFLARE_WORKER, MODULE_IDS.POSTGRES, ...SERVER_FEATURES],
    commands: ['pnpm --filter=worker run build'],
  },
];

function getInstallCases() {
  const matrixModules = process.env.TSUKURI_MATRIX_MODULES;
  if (matrixModules === undefined) return PROJECT_CASES;
  const modules = moduleIdSchema.array().parse(JSON.parse(matrixModules));
  return [{ name: modules.join(' + ') || 'base', modules, commands: [] }] satisfies iProjectCase[];
}

describe('generated projects', () => {
  const createTempDir = useTempDir();

  it.each(getInstallCases())(
    '$name installs and passes project checks',
    async ({ modules, projectName = 'acme', commands }) => {
      const targetDir = path.join(await createTempDir(), projectName);
      await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT })
        .resolve(ProjectGenerator)
        .create({ targetDir, projectName, modules });
      const envExamplePath = path.join(targetDir, '.env.example');
      if (existsSync(envExamplePath)) await copyFile(envExamplePath, path.join(targetDir, '.env'));

      for (const command of ['pnpm install --no-frozen-lockfile', 'pnpm run verify --tests', ...commands]) {
        const result = await runCommand(command, targetDir);
        expect(result.exitCode, `${command}\n${result.output}`).toBe(0);
      }
    },
  );
});
