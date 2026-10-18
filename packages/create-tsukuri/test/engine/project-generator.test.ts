import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

import { createGeneratorContainer } from '#~/di/container';
import { ProjectGenerator } from '#~/engine/project-generator';
import { PROJECT_NAME_TOKEN } from '#~/engine/project-identity';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';

import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
}

async function listFiles(directory: string) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(directory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}

describe('ProjectGenerator', () => {
  const createTempDir = useTempDir();

  function createGenerator(manifests = MODULE_MANIFESTS) {
    return createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT, manifests }).resolve(ProjectGenerator);
  }

  it('writes a base-only project with composed package.json files and the project name applied', async () => {
    const targetDir = path.join(await createTempDir(), 'acme');

    await createGenerator().create({ targetDir, projectName: 'acme', modules: [] });

    const files = await listFiles(targetDir);
    expect(files).toEqual(
      expect.arrayContaining([
        'package.json',
        'pnpm-workspace.yaml',
        'AGENTS.md',
        'README.md',
        'scripts/verify.ts',
        'configs/lint-config/package.json',
        'packages/common/package.json',
        'packages/common/src/helpers/std-utils.ts',
        '.agents/skills/review-code/SKILL.md',
      ]),
    );
    expect(files).not.toContain('packages/common/src/constants/achievements.ts');
    expect(files.some((file) => file.includes('node_modules/') || file.startsWith('packages/common/dist/'))).toBe(
      false,
    );

    const rootPackage = await readJson(path.join(targetDir, 'package.json'));
    expect(rootPackage.name).toBe('acme');
    expect(rootPackage.scripts).toEqual(expect.objectContaining({ verify: 'tsx scripts/verify.ts' }));

    const commonPackage = await readJson(path.join(targetDir, 'packages/common/package.json'));
    expect(commonPackage.name).toBe('@acme/common');
    expect(commonPackage.devDependencies).toEqual(expect.objectContaining({ '@acme/lint-config': 'workspace:*' }));

    const workspace = parse(await readFile(path.join(targetDir, 'pnpm-workspace.yaml'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(workspace.packages).toEqual(['packages/*', 'configs/*']);
    expect(workspace.catalog).toEqual(expect.objectContaining({ zod: '4.4.3', typescript: '6.0.3' }));

    expect(await readFile(path.join(targetDir, 'AGENTS.md'), 'utf8')).toMatch(/^---\napplyTo/);

    for (const file of files) {
      const content = await readFile(path.join(targetDir, file));
      if (content.includes(0)) continue;
      expect.soft(content.toString('utf8'), file).not.toContain(PROJECT_NAME_TOKEN);
    }
  });

  it('refuses to write into a folder that is not empty', async () => {
    const targetDir = await createTempDir();
    await writeFile(path.join(targetDir, 'keep.txt'), 'mine');

    await expect(createGenerator().create({ targetDir, projectName: 'acme', modules: [] })).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.TARGET_NOT_EMPTY,
    });
    expect(await readdir(targetDir)).toEqual(['keep.txt']);
  });

  it('refuses a folder inside the generator sources before writing anything', async () => {
    const targetDir = path.join(REPOSITORY_ROOT, 'acme');

    await expect(createGenerator().create({ targetDir, projectName: 'acme', modules: [] })).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.TARGET_INSIDE_SOURCE,
    });
    await expect(readdir(targetDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects invalid project names before writing anything', async () => {
    const targetDir = path.join(await createTempDir(), 'out');

    await expect(createGenerator().create({ targetDir, projectName: 'Acme App', modules: [] })).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.INVALID_PROJECT_NAME,
    });
    await expect(readdir(targetDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
