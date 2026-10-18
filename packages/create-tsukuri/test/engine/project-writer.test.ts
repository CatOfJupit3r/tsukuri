import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { ProjectWriter } from '@~/engine/project-writer';
import { VirtualProject } from '@~/engine/virtual-project';
import { FILE_KINDS } from '@~/enums/file-kinds.enums';

import { useTempDir } from '../helpers/temp-dir';

/** `a` as a file and `a/b.txt` cannot both exist, so writing fails after the first file. */
function createUnwritableProject() {
  const project = new VirtualProject();
  project.write('a', 'file', { kind: FILE_KINDS.MODULE_FILE });
  project.write('a/b.txt', 'nested', { kind: FILE_KINDS.MODULE_FILE });
  return project;
}

describe('ProjectWriter', () => {
  const createTempDir = useTempDir();
  const writer = new ProjectWriter();

  it('writes every file of the project', async () => {
    const targetDir = path.join(await createTempDir(), 'out');
    const project = new VirtualProject();
    project.write('package.json', '{}\n', { kind: FILE_KINDS.MODULE_FILE });
    project.write('src/deep/file.ts', 'export {};\n', { kind: FILE_KINDS.MODULE_FILE });

    await writer.writeNew(targetDir, project);

    expect(await readFile(path.join(targetDir, 'src/deep/file.ts'), 'utf8')).toBe('export {};\n');
  });

  it('removes a folder it created when writing fails', async () => {
    const parent = await createTempDir();

    await expect(writer.writeNew(path.join(parent, 'out'), createUnwritableProject())).rejects.toThrow();
    expect(await readdir(parent)).toEqual([]);
  });

  it('empties an existing empty folder again when writing fails', async () => {
    const targetDir = await createTempDir();

    await expect(writer.writeNew(targetDir, createUnwritableProject())).rejects.toThrow();
    expect(await readdir(targetDir)).toEqual([]);
  });
});
