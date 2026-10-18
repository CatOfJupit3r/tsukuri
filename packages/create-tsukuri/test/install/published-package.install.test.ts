import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

import { createGeneratorContainer } from '@~/di/container';
import { ProjectGenerator } from '@~/engine/project-generator';

import { runCommand } from '../helpers/run-command';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';
import { readTree } from '../helpers/tree';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '../..');

describe('published create-tsukuri package', () => {
  const createTempDir = useTempDir();

  it('creates the same project from the packed tarball as from the checkout', async () => {
    const workDir = await createTempDir();

    const pack = await runCommand(`pnpm pack --pack-destination "${workDir}"`, PACKAGE_ROOT);
    expect(pack.exitCode, pack.output).toBe(0);
    const [tarball] = (await readdir(workDir)).filter((file) => file.endsWith('.tgz'));

    const consumerDir = path.join(workDir, 'consumer');
    await mkdir(consumerDir);
    const install = await runCommand(`npm init -y && npm install --no-audit --no-fund "../${tarball}"`, consumerDir);
    expect(install.exitCode, install.output).toBe(0);

    const create = await runCommand('npx create-tsukuri acme --yes --no-git --no-install --no-verify', consumerDir);
    expect(create.exitCode, create.output).toBe(0);

    const expectedDir = path.join(workDir, 'expected');
    await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT })
      .resolve(ProjectGenerator)
      .create({ targetDir: expectedDir, projectName: 'acme', modules: [] });

    expect(await readTree(path.join(consumerDir, 'acme'))).toEqual(await readTree(expectedDir));
  });
});
