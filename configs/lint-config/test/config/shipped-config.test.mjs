import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ESLint } from 'eslint';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CONVENTION_RESTRICTED_SYNTAX } from '../../src/convention-restricted-syntax.constants.mjs';
import { createBackendConfig, createWebConfig } from '../../src/eslint.mjs';

const INDEX_FILE_MESSAGE = 'index.ts/tsx files are forbidden. Use explicit file names for all exports and imports.';

const VIOLATING_SAMPLE = [
  "export * from './other';",
  'async function work() {}',
  'function booleanDefault(isOn = true) { return isOn; }',
  'void work();',
  'function inlineParameter(options: { a: string }) { return options; }',
  'function inlineReturn(): { a: string } { return { a: "x" }; }',
  'type Merged = Base & { c: string };',
  'try { booleanDefault(); } catch {}',
  'enum Color { Red }',
].join('\n');

let projectDirectory;
const lintersByConfigName = new Map();

const createLinter = (config) =>
  new ESLint({ cwd: projectDirectory, overrideConfigFile: true, overrideConfig: config });

const lintFile = async (linter, relativePath, code) => {
  const [result] = await linter.lintText(code, { filePath: path.join(projectDirectory, relativePath) });
  return result.messages;
};

const restrictedSyntaxMessages = async (linter, relativePath, code) =>
  (await lintFile(linter, relativePath, code)).filter((message) => message.ruleId === 'no-restricted-syntax');

beforeAll(async () => {
  projectDirectory = await mkdtemp(path.join(os.tmpdir(), 'lint-config-boundary-'));
  await mkdir(path.join(projectDirectory, 'src'));
  await writeFile(path.join(projectDirectory, '.gitignore'), 'dist\n');
  await writeFile(
    path.join(projectDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler' },
      include: ['src'],
    }),
  );
  await writeFile(path.join(projectDirectory, 'src', 'sample.ts'), VIOLATING_SAMPLE);
  await writeFile(path.join(projectDirectory, 'src', 'index.ts'), VIOLATING_SAMPLE);

  const rootDir = pathToFileURL(path.join(projectDirectory, 'eslint.config.mjs')).href;
  lintersByConfigName.set('backend', createLinter(await createBackendConfig({ rootDir })));
  lintersByConfigName.set('web', createLinter(await createWebConfig({ rootDir })));
}, 60_000);

afterAll(async () => {
  await rm(projectDirectory, { recursive: true, force: true });
});

describe.each(['backend', 'web'])('shipped %s config', (configName) => {
  it('reports every convention ban in an ordinary source file', async () => {
    const messages = await restrictedSyntaxMessages(lintersByConfigName.get(configName), 'src/sample.ts', VIOLATING_SAMPLE);

    expect(messages.map((message) => message.message).sort()).toEqual(
      CONVENTION_RESTRICTED_SYNTAX.map((entry) => entry.message).sort(),
    );
  }, 60_000);

  it('reports every convention ban in an index file, next to the index file ban', async () => {
    const messages = await restrictedSyntaxMessages(lintersByConfigName.get(configName), 'src/index.ts', VIOLATING_SAMPLE);

    expect(messages.map((message) => message.message).sort()).toEqual(
      [...CONVENTION_RESTRICTED_SYNTAX.map((entry) => entry.message), INDEX_FILE_MESSAGE].sort(),
    );
  }, 60_000);
});
