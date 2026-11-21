import { Linter } from 'eslint';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { MAX_FILES_PER_FOLDER } from '../../src/lint-limits.mjs';
import { maxFilesPerFolderRule } from '../../src/rules/max-files-per-folder.mjs';

const MAX_FILES = 3;
const RULE_ID = 'local/max-files-per-folder';
const LOCAL_PLUGIN = {
  rules: { 'max-files-per-folder': maxFilesPerFolderRule },
};

const folders = [];

async function createFolder(fileNames) {
  const folder = await mkdtemp(path.join(tmpdir(), 'max-files-per-folder-'));
  folders.push(folder);
  await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(folder, fileName);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, 'export {};\n');
    }),
  );
  return folder;
}

function lint(folder, fileName, ruleEntry = ['error', { max: MAX_FILES }]) {
  const config = [
    {
      files: ['**/*.{ts,tsx}'],
      plugins: { local: LOCAL_PLUGIN },
      rules: { [RULE_ID]: ruleEntry },
    },
  ];
  return new Linter({ cwd: folder }).verify('export {};\n', config, {
    filename: path.join(folder, fileName),
  });
}

describe('max-files-per-folder', () => {
  afterEach(async () => {
    await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
  });

  it('reports every linted file of an overfull folder, whichever file runs alone', async () => {
    const folder = await createFolder(['d.ts', 'b.tsx', 'a.ts', 'c.ts', 'a.mjs']);

    for (const fileName of ['a.ts', 'b.tsx', 'd.ts']) {
      expect(lint(folder, fileName)).toEqual([
        expect.objectContaining({
          ruleId: RULE_ID,
          message: expect.stringContaining('4 source'),
        }),
      ]);
    }
  });

  it('reports a staged new file that takes a folder over the limit, and only that run', async () => {
    const folder = await createFolder(['a.ts', 'b.ts', 'c.ts']);
    expect(lint(folder, 'c.ts')).toEqual([]);

    await writeFile(path.join(folder, 'd.ts'), 'export {};\n');

    expect(lint(folder, 'd.ts')).toEqual([expect.objectContaining({ ruleId: RULE_ID })]);
  });

  it('counts only the files the convention rules lint', async () => {
    const folder = await createFolder(['a.ts', 'b.ts', 'c.ts', 'globals.d.ts', 'config.mjs', 'styles.css']);

    expect(lint(folder, 'a.ts')).toEqual([]);
  });

  it('does not count files ESLint ignores, so an ignored first file cannot hide or inflate the folder', async () => {
    const underLimit = await createFolder(['a.config.ts', 'b.ts', 'c.ts', 'd.ts']);
    expect(lint(underLimit, 'b.ts')).toEqual([]);

    const overLimit = await createFolder(['a.config.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']);
    expect(lint(overLimit, 'b.ts')).toEqual([
      expect.objectContaining({
        ruleId: RULE_ID,
        message: expect.stringContaining('4 source'),
      }),
    ]);
    expect(lint(overLimit, 'a.config.ts')).toEqual([]);
  });

  it('does not count generated files', async () => {
    const folder = await createFolder([
      'src/generated/a.ts',
      'src/generated/b.ts',
      'src/generated/c.ts',
      'src/generated/d.ts',
    ]);

    expect(lint(folder, 'src/generated/a.ts')).toEqual([]);
  });

  it('allows the default number of files and reports one more', async () => {
    const names = Array.from(
      { length: MAX_FILES_PER_FOLDER + 1 },
      (_, index) => `file-${String(index).padStart(2, '0')}.ts`,
    );
    const atLimit = await createFolder(names.slice(0, MAX_FILES_PER_FOLDER));
    const overLimit = await createFolder(names);

    expect(lint(atLimit, names[0], 'error')).toEqual([]);
    expect(lint(overLimit, names[0], 'error')).toEqual([
      expect.objectContaining({
        ruleId: RULE_ID,
        message: expect.stringContaining(`${MAX_FILES_PER_FOLDER + 1} source`),
      }),
    ]);
  });
});
