import path from 'node:path';

import { createGeneratorContainer } from '#~/di/container';
import { ProjectGenerator } from '#~/engine/project-generator';
import { MODULE_IDS } from '#~/enums/module-ids.enums';

import { runCommand } from '../helpers/run-command';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

describe('generated fullstack project', () => {
  const createTempDir = useTempDir();

  it('installs and passes verify with every server module', async () => {
    const targetDir = path.join(await createTempDir(), 'acme');
    await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT })
      .resolve(ProjectGenerator)
      .create({
        targetDir,
        projectName: 'acme',
        modules: [
          MODULE_IDS.NODE_HONO,
          MODULE_IDS.POSTGRES,
          MODULE_IDS.VALKEY,
          MODULE_IDS.BETTER_AUTH,
          MODULE_IDS.EXAMPLE_DOMAIN,
        ],
      });

    const install = await runCommand('pnpm install --no-frozen-lockfile', targetDir);
    expect(install.exitCode, install.output).toBe(0);

    const verify = await runCommand('pnpm run verify --tests', targetDir);
    expect(verify.exitCode, verify.output).toBe(0);
  });
});
