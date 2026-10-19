import { copyFile } from 'node:fs/promises';
import path from 'node:path';

import { createGeneratorContainer } from '#~/di/container';
import { ProjectGenerator } from '#~/engine/project-generator';
import type { ModuleId } from '#~/enums/module-ids.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';

import { runCommand } from '../helpers/run-command';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

interface iProjectCase {
  name: string;
  modules: ModuleId[];
  /** Extra commands that must pass after verify, e.g. a production build. */
  commands: string[];
}

const SERVER_FEATURES = [MODULE_IDS.BETTER_AUTH, MODULE_IDS.EXAMPLE_DOMAIN];

const PROJECT_CASES: iProjectCase[] = [
  {
    name: 'SSR web app with a Node server and every server module',
    modules: [MODULE_IDS.WEB_SSR, MODULE_IDS.NODE_HONO, MODULE_IDS.POSTGRES, MODULE_IDS.VALKEY, ...SERVER_FEATURES],
    commands: ['pnpm run build'],
  },
  {
    name: 'SPA with a Node server',
    modules: [MODULE_IDS.WEB_SPA, MODULE_IDS.NODE_HONO, MODULE_IDS.POSTGRES, ...SERVER_FEATURES],
    commands: ['pnpm --filter=web run build'],
  },
  {
    name: 'TanStack Start app serving the API itself on SQLite',
    modules: [MODULE_IDS.TANSTACK_START, MODULE_IDS.SQLITE, ...SERVER_FEATURES],
    commands: ['pnpm --filter=web run build'],
  },
  {
    name: 'Node server on SQLite',
    modules: [MODULE_IDS.NODE_HONO, MODULE_IDS.SQLITE, ...SERVER_FEATURES],
    commands: ['pnpm run db:generate', 'pnpm run db:migrate', 'pnpm run build'],
  },
];

describe('generated projects', () => {
  const createTempDir = useTempDir();

  it.each(PROJECT_CASES)('$name installs, passes verify and builds', async ({ modules, commands }) => {
    const targetDir = path.join(await createTempDir(), 'acme');
    await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT })
      .resolve(ProjectGenerator)
      .create({ targetDir, projectName: 'acme', modules });
    await copyFile(path.join(targetDir, '.env.example'), path.join(targetDir, '.env'));

    for (const command of ['pnpm install --no-frozen-lockfile', 'pnpm run verify --tests', ...commands]) {
      const result = await runCommand(command, targetDir);
      expect(result.exitCode, `${command}\n${result.output}`).toBe(0);
    }
  });
});
