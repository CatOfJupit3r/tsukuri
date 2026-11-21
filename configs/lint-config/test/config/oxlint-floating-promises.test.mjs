import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createBackendOxlintConfig } from '../../src/eslint.mjs';

const runFile = promisify(execFile);
const OXLINT_BINARY = path.join(path.dirname(fileURLToPath(import.meta.resolve('oxlint/package.json'))), 'bin', 'oxlint');
const FLOATING_PROMISES_RULE = 'no-floating-promises';

const SAMPLES = {
  'bare-void.ts': ['async function work() {}', 'void work();'].join('\n'),
  'detached.ts': [
    'async function work() {}',
    'function handle(error: unknown) { return error; }',
    'void work().catch(handle);',
  ].join('\n'),
};

let projectDirectory;

const floatingPromiseFiles = async () => {
  const { stdout } = await runFile(
    process.execPath,
    [OXLINT_BINARY, '-c', 'oxlint.config.json', '--type-aware', '--format', 'json', 'src'],
    { cwd: projectDirectory },
  ).catch((error) => error);
  const { diagnostics } = JSON.parse(stdout);

  return diagnostics.filter((diagnostic) => diagnostic.code.includes(FLOATING_PROMISES_RULE)).map((diagnostic) => path.basename(diagnostic.filename));
};

beforeAll(async () => {
  projectDirectory = await mkdtemp(path.join(os.tmpdir(), 'lint-config-oxlint-'));
  await mkdir(path.join(projectDirectory, 'src'));
  await writeFile(path.join(projectDirectory, '.gitignore'), 'dist\n');
  await writeFile(
    path.join(projectDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler' },
      include: ['src'],
    }),
  );
  await Promise.all(
    Object.entries(SAMPLES).map(([fileName, code]) => writeFile(path.join(projectDirectory, 'src', fileName), code)),
  );
  const rootDir = pathToFileURL(path.join(projectDirectory, 'eslint.config.mjs')).href;
  await writeFile(
    path.join(projectDirectory, 'oxlint.config.json'),
    JSON.stringify(await createBackendOxlintConfig({ rootDir })),
  );
}, 60_000);

afterAll(async () => {
  await rm(projectDirectory, { recursive: true, force: true });
});

describe('shipped oxlint config', () => {
  it('flags a bare void on a promise and accepts a promise detached with a rejection handler', async () => {
    expect(await floatingPromiseFiles()).toEqual(['bare-void.ts']);
  }, 60_000);
});
