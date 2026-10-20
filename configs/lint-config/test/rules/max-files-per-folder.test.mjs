import { Linter } from 'eslint';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { maxFilesPerFolderRule } from '../../src/rules/max-files-per-folder.mjs';

const MAX_FILES = 3;
const LINT_CONFIG = [
  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: { local: { rules: { 'max-files-per-folder': maxFilesPerFolderRule } } },
    rules: { 'local/max-files-per-folder': ['error', { max: MAX_FILES }] },
  },
];

const folders = [];

async function createFolder(fileNames) {
  const folder = await mkdtemp(path.join(tmpdir(), 'max-files-per-folder-'));
  folders.push(folder);
  await Promise.all(fileNames.map((fileName) => writeFile(path.join(folder, fileName), 'export {};\n')));
  return folder;
}

function lint(folder, fileName) {
  return new Linter({ cwd: folder }).verify('export {};\n', LINT_CONFIG, { filename: path.join(folder, fileName) });
}

describe('max-files-per-folder', () => {
  afterEach(async () => {
    await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
  });

  it('reports an overfull folder once, on its first source file by name', async () => {
    const folder = await createFolder(['d.ts', 'b.tsx', 'a.ts', 'c.mjs']);

    expect(lint(folder, 'a.ts')).toEqual([
      expect.objectContaining({ ruleId: 'local/max-files-per-folder', message: expect.stringContaining('4 source') }),
    ]);
    expect(lint(folder, 'b.tsx')).toEqual([]);
    expect(lint(folder, 'd.ts')).toEqual([]);
  });

  it('does not count declaration files or non-source files', async () => {
    const folder = await createFolder(['a.ts', 'b.ts', 'c.ts', 'globals.d.ts', 'styles.css', 'README.md']);

    expect(lint(folder, 'a.ts')).toEqual([]);
  });
});
