import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createCliContainer } from '#~/cli/cli-container';
import { CreateCommand } from '#~/cli/create-command';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { baseModule } from '#~/modules/base.module';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { createManifest, testModuleId } from '../helpers/manifests';
import { CANCEL, RecordingRunner, ScriptedPrompter, optionValues } from '../helpers/scripted-prompter';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const ALPHA = testModuleId('alpha');
const BETA = testModuleId('beta');
const GAMMA = testModuleId('gamma');
const DELTA = testModuleId('delta');

const MANIFESTS = [
  baseModule,
  createManifest(ALPHA, {
    name: 'Alpha backend',
    category: MODULE_CATEGORIES.BACKEND,
    provides: [CAPABILITIES.BACKEND_TARGET],
    files: [{ source: 'scripts/clean.ts', target: 'apps/api/src/clean.ts' }],
  }),
  createManifest(BETA, {
    name: 'Beta backend',
    category: MODULE_CATEGORIES.BACKEND,
    provides: [CAPABILITIES.BACKEND_TARGET],
    requires: [DELTA],
  }),
  createManifest(GAMMA, { name: 'Gamma database', category: MODULE_CATEGORIES.DATABASE, conflicts: [ALPHA] }),
  createManifest(DELTA, { name: 'Delta database', category: MODULE_CATEGORIES.DATABASE }),
];

const MESSAGES = {
  name: 'Project name (folder to create)',
  backend: 'Where does the backend run?',
  database: 'Database',
  skills: 'Agent skills to include',
  git: 'Initialize a git repository?',
  install: 'Install dependencies with pnpm?',
  verify: 'Run pnpm run verify afterwards?',
  summary: 'Create the project?',
};

function readRecord(targetDir: string) {
  return JSON.parse(readFileSync(path.join(targetDir, 'starter.json'), 'utf8')) as iProjectRecord;
}

describe('create command', () => {
  const createTempDir = useTempDir();

  async function setup(answers: ConstructorParameters<typeof ScriptedPrompter>[0]) {
    const cwd = await createTempDir();
    const prompter = new ScriptedPrompter(answers);
    const runner = new RecordingRunner();
    const command = createCliContainer({
      sourceRoot: REPOSITORY_ROOT,
      manifests: MANIFESTS,
      cwd,
      prompter,
      runner,
    }).resolve(CreateCommand);
    return { cwd, prompter, runner, command };
  }

  it('asks every prompt that has options, hides conflicting modules, and writes the confirmed project', async () => {
    const { cwd, prompter, runner, command } = await setup({
      [MESSAGES.name]: 'acme',
      [MESSAGES.backend]: ALPHA,
      [MESSAGES.database]: DELTA,
      [MESSAGES.skills]: [[]],
      [MESSAGES.git]: false,
      [MESSAGES.install]: false,
      [MESSAGES.summary]: 'CREATE',
    });

    await command.run([]);

    const databasePrompt = prompter.prompts.find((prompt) => prompt.message === MESSAGES.database);
    expect(optionValues(databasePrompt)).toEqual([null, DELTA]);

    const targetDir = path.join(cwd, 'acme');
    const record = readRecord(targetDir);
    expect(record.projectName).toBe('acme');
    expect(record.modules.map((module) => module.id)).toEqual(['base', ALPHA, DELTA]);
    expect(record.skills.excluded).toEqual(['review-code']);
    expect(existsSync(path.join(targetDir, 'apps/api/src/clean.ts'))).toBe(true);
    expect(existsSync(path.join(targetDir, '.agents/skills'))).toBe(false);
    expect(runner.commands).toEqual([]);
  });

  it('skips a single-choice prompt whose module an earlier answer already requires', async () => {
    const { cwd, prompter, command } = await setup({
      [MESSAGES.name]: 'acme',
      [MESSAGES.backend]: BETA,
      [MESSAGES.skills]: [['review-code']],
      [MESSAGES.git]: false,
      [MESSAGES.install]: false,
      [MESSAGES.summary]: 'CREATE',
    });

    await command.run([]);

    expect(prompter.prompts.map((prompt) => prompt.message)).not.toContain(MESSAGES.database);
    expect(prompter.messages).toContain('Database: Delta database (required by earlier choices)');
    expect(readRecord(path.join(cwd, 'acme')).modules.map((module) => module.id)).toEqual(['base', DELTA, BETA]);
  });

  it('goes back through the prompts with the previous answers when the user changes their mind', async () => {
    const { cwd, prompter, command } = await setup({
      [MESSAGES.name]: ['acme', 'acme'],
      [MESSAGES.backend]: [ALPHA, BETA],
      [MESSAGES.database]: [null],
      [MESSAGES.skills]: [['review-code'], ['review-code']],
      [MESSAGES.git]: [false, false],
      [MESSAGES.install]: [false, false],
      [MESSAGES.summary]: ['CHANGE', 'CREATE'],
    });

    await command.run([]);

    const backendPrompts = prompter.prompts.filter((prompt) => prompt.message === MESSAGES.backend);
    expect(backendPrompts.map((prompt) => prompt.initial)).toEqual([null, ALPHA]);
    expect(readRecord(path.join(cwd, 'acme')).modules.map((module) => module.id)).toEqual(['base', DELTA, BETA]);
  });

  it('writes nothing when the user cancels', async () => {
    const { cwd, command } = await setup({ [MESSAGES.name]: 'acme', [MESSAGES.backend]: CANCEL });

    await expect(command.run([])).rejects.toMatchObject({ code: GENERATOR_ERROR_CODES.CANCELLED });
    expect(existsSync(path.join(cwd, 'acme'))).toBe(false);
  });

  it('runs without prompts when flags answer everything, and prints the equivalent command', async () => {
    const { cwd, prompter, runner, command } = await setup({});

    await command.run(['acme', '--backend', 'alpha', '--database', 'none', '--yes']);

    expect(prompter.prompts).toEqual([]);
    expect(readRecord(path.join(cwd, 'acme')).modules.map((module) => module.id)).toEqual(['base', ALPHA]);
    expect(prompter.messages.find((message) => message.startsWith('Summary'))).toContain(
      'pnpm create tsukuri acme --backend alpha --database none --git --install --no-verify --yes',
    );
    expect(runner.commands).toEqual(['git init --quiet', 'pnpm install']);
  });

  it('only asks the prompts no flag answers', async () => {
    const { prompter, command } = await setup({
      [MESSAGES.database]: DELTA,
      [MESSAGES.skills]: [['review-code']],
      [MESSAGES.summary]: 'CREATE',
    });

    await command.run(['acme', '--backend', 'alpha', '--no-git', '--no-install']);

    expect(prompter.prompts.map((prompt) => prompt.message)).toEqual([
      MESSAGES.database,
      MESSAGES.skills,
      MESSAGES.summary,
    ]);
  });

  it('rejects flag answers that conflict, before writing anything', async () => {
    const { cwd, command } = await setup({});

    await expect(command.run(['acme', '--backend', 'alpha', '--database', 'gamma', '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.MODULE_CONFLICT,
    });
    await expect(command.run(['acme', '--database', 'alpha', '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
    });
    expect(existsSync(path.join(cwd, 'acme'))).toBe(false);
  });

  it('trims the typed project name', async () => {
    const { cwd, command } = await setup({
      [MESSAGES.name]: '  acme  ',
      [MESSAGES.backend]: ALPHA,
      [MESSAGES.database]: DELTA,
      [MESSAGES.skills]: [[]],
      [MESSAGES.git]: false,
      [MESSAGES.install]: false,
      [MESSAGES.summary]: 'CREATE',
    });

    await command.run([]);

    expect(readRecord(path.join(cwd, 'acme')).projectName).toBe('acme');
  });

  it('refuses a folder inside the generator sources', async () => {
    const { command } = await setup({});
    const targetDir = path.join(REPOSITORY_ROOT, 'acme');

    await expect(command.run([targetDir, '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
    });
    expect(existsSync(targetDir)).toBe(false);
  });

  it('refuses a folder that is not empty and an invalid project name', async () => {
    const { cwd, command } = await setup({});
    await mkdir(path.join(cwd, 'taken'));
    await writeFile(path.join(cwd, 'taken', 'file.txt'), 'mine');

    await expect(command.run(['taken', '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
    });
    await expect(command.run(['Not Valid', '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
    });
  });
});
