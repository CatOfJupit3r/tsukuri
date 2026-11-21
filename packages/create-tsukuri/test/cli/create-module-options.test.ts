import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createCliContainer } from '#~/cli/cli-container';
import { CreateCommand } from '#~/cli/create-command';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_OPTION_IDS } from '#~/enums/module-option-ids.enums';
import { ORIGIN_GUARD_MODES } from '#~/enums/origin-guard-modes.enums';
import { baseModule } from '#~/modules/base.module';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { createManifest, testModuleId } from '../helpers/manifests';
import { RecordingRunner, ScriptedPrompter, optionValues } from '../helpers/scripted-prompter';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const GUARDED = testModuleId('alpha');
const GUARD_MESSAGE = 'Cross-site protection';
const ENV_SCHEMA = 'apps/api/src/generated/env.schema.ts';

function modeVariable(mode: string) {
  return {
    kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
    workspace: 'apps/api',
    name: 'REQUEST_ORIGIN_MODE',
    schema: `z.string().default('${mode}')`,
    example: mode,
  } as const;
}

const MANIFESTS = [
  baseModule,
  createManifest(GUARDED, {
    name: 'Guarded backend',
    category: MODULE_CATEGORIES.BACKEND,
    provides: [CAPABILITIES.BACKEND_TARGET],
    options: [
      {
        id: MODULE_OPTION_IDS.ORIGIN_GUARD,
        message: GUARD_MESSAGE,
        defaultValue: ORIGIN_GUARD_MODES.LENIENT,
        choices: [
          {
            value: ORIGIN_GUARD_MODES.LENIENT,
            label: 'Lenient',
            contributions: [modeVariable(ORIGIN_GUARD_MODES.LENIENT)],
          },
          {
            value: ORIGIN_GUARD_MODES.STRICT,
            label: 'Strict',
            contributions: [modeVariable(ORIGIN_GUARD_MODES.STRICT)],
          },
        ],
      },
    ],
  }),
];

describe('create command module options', () => {
  const createTempDir = useTempDir();

  async function setup(answers: ConstructorParameters<typeof ScriptedPrompter>[0]) {
    const cwd = await createTempDir();
    const prompter = new ScriptedPrompter(answers);
    const command = createCliContainer({
      sourceRoot: REPOSITORY_ROOT,
      manifests: MANIFESTS,
      cwd,
      prompter,
      runner: new RecordingRunner(),
    }).resolve(CreateCommand);
    return { cwd, prompter, command };
  }

  function read(cwd: string, file: string) {
    return readFileSync(path.join(cwd, 'acme', file), 'utf8');
  }

  it('asks the options of the selected modules, then records the choice and generates its contributions', async () => {
    const { cwd, prompter, command } = await setup({
      [GUARD_MESSAGE]: ORIGIN_GUARD_MODES.STRICT,
      'Agent skills to include': [[]],
      'Create the project?': 'CREATE',
    });

    await command.run(['acme', '--backend', GUARDED, '--no-git', '--no-install']);

    const prompt = prompter.prompts.find((candidate) => candidate.message === GUARD_MESSAGE);
    expect(optionValues(prompt)).toEqual([ORIGIN_GUARD_MODES.LENIENT, ORIGIN_GUARD_MODES.STRICT]);
    expect(prompt?.initial).toBe(ORIGIN_GUARD_MODES.LENIENT);

    const record = JSON.parse(read(cwd, 'starter.json')) as iProjectRecord;
    expect(record.modules.find((module) => module.id === GUARDED)?.options).toEqual({
      [MODULE_OPTION_IDS.ORIGIN_GUARD]: ORIGIN_GUARD_MODES.STRICT,
    });
    expect(read(cwd, ENV_SCHEMA)).toContain("REQUEST_ORIGIN_MODE: z.string().default('strict')");
  });

  it('takes the flag, and the default under --yes, without prompting', async () => {
    const { cwd, prompter, command } = await setup({});

    await command.run(['acme', '--backend', GUARDED, '--yes', '--no-git', '--no-install']);

    expect(prompter.prompts).toEqual([]);
    expect(read(cwd, ENV_SCHEMA)).toContain("REQUEST_ORIGIN_MODE: z.string().default('lenient')");
    expect(prompter.messages.find((message) => message.startsWith('Summary'))).toContain('--origin-guard lenient');
  });

  it('refuses a value the option does not offer, before writing anything', async () => {
    const { command } = await setup({});

    await expect(
      command.run(['acme', '--backend', GUARDED, '--origin-guard', 'paranoid', '--yes', '--no-git', '--no-install']),
    ).rejects.toMatchObject({ code: GENERATOR_ERROR_CODES.INVALID_MODULE_OPTION });
  });
});
