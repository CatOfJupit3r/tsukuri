import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createCliContainer } from '#~/cli/cli-container';
import { CreateCommand } from '#~/cli/create-command';
import { AUTH_SESSION_STORES } from '#~/enums/auth-session-stores.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { MODULE_OPTION_IDS } from '#~/enums/module-option-ids.enums';
import { ORIGIN_GUARD_MODES } from '#~/enums/origin-guard-modes.enums';
import { projectRecordSchema } from '#~/record/project-record.schema';

import { RecordingRunner, ScriptedPrompter, optionValues } from '../helpers/scripted-prompter';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

const SESSION_STORE_MESSAGE = 'Where Better Auth reads sessions on Cloudflare KV';
const NODE_FLAGS = ['--preset', 'fullstack', '--yes', '--no-git', '--no-install'];
const WORKER_FLAGS = [
  '--backend',
  MODULE_IDS.CLOUDFLARE_WORKER,
  '--database',
  MODULE_IDS.D1,
  '--auth',
  MODULE_IDS.BETTER_AUTH,
  '--infrastructure',
  MODULE_IDS.CLOUDFLARE_KV,
  '--rendering',
  MODULE_IDS.WEB_SPA,
  '--no-git',
  '--no-install',
];
const SECRET_LINE = /^BETTER_AUTH_SECRET=(.*)$/m;

describe('create command with the shipped modules', () => {
  const createTempDir = useTempDir();

  async function create(flags: string[], answers: ConstructorParameters<typeof ScriptedPrompter>[0] = {}) {
    const cwd = await createTempDir();
    const prompter = new ScriptedPrompter(answers);
    const command = createCliContainer({
      sourceRoot: REPOSITORY_ROOT,
      cwd,
      prompter,
      runner: new RecordingRunner(),
    }).resolve(CreateCommand);
    await command.run(['acme', ...flags]);
    const read = (file: string) => readFileSync(path.join(cwd, 'acme', file), 'utf8');
    return { prompter, read };
  }

  it('records the lenient origin guard through the real api module, and generates it as the env default', async () => {
    const { read } = await create(NODE_FLAGS);

    const apiModule = projectRecordSchema
      .parse(JSON.parse(read('starter.json')))
      .modules.find((module) => module.id === MODULE_IDS.API);
    expect(apiModule?.options).toEqual({ [MODULE_OPTION_IDS.ORIGIN_GUARD]: ORIGIN_GUARD_MODES.LENIENT });
    expect(read('.env.example')).toContain('REQUEST_ORIGIN_MODE=lenient');
  });

  it('writes a random Better Auth secret to .env and keeps the placeholder in .env.example', async () => {
    const { read } = await create(NODE_FLAGS);

    const exampleSecret = SECRET_LINE.exec(read('.env.example'))?.[1];
    const localSecret = SECRET_LINE.exec(read('.env'))?.[1];
    expect(exampleSecret).toBe('replace-with-a-random-secret-of-32-chars');
    expect(localSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(localSecret).not.toBe(exampleSecret);
  });

  it('writes the web app origin into both CORS_ORIGIN and TRUSTED_ORIGINS, in .env and .env.example', async () => {
    const { read } = await create(NODE_FLAGS);

    for (const file of ['.env', '.env.example']) {
      const content = read(file);
      expect(content).toContain('CORS_ORIGIN=http://localhost:3030');
      expect(content).toContain('TRUSTED_ORIGINS=http://localhost:3030');
    }
  });

  it('explains CORS_ORIGIN against TRUSTED_ORIGINS in the README and the AGENTS guide', async () => {
    const { read } = await create(NODE_FLAGS);

    expect(read('README.md')).toContain('## Request Origins');
    expect(read('README.md')).toContain('no wildcards');
    expect(read('AGENTS.md')).toContain('`CORS_ORIGIN` is a different setting');
  });

  it('asks where Better Auth reads sessions only when a KV store is installed, and always records a choice', async () => {
    const node = await create(NODE_FLAGS);
    expect(node.prompter.prompts.find((prompt) => prompt.message === SESSION_STORE_MESSAGE)).toBeUndefined();
    // The default is recorded, so adding KV later keeps instant revocation until the project chooses otherwise.
    const authModule = projectRecordSchema
      .parse(JSON.parse(node.read('starter.json')))
      .modules.find((module) => module.id === MODULE_IDS.BETTER_AUTH);
    expect(authModule?.options).toEqual({ [MODULE_OPTION_IDS.AUTH_SESSION_STORE]: AUTH_SESSION_STORES.DATABASE });

    const worker = await create(WORKER_FLAGS, {
      [SESSION_STORE_MESSAGE]: AUTH_SESSION_STORES.KV_CACHE,
      Features: [[]],
      'Cross-site protection for requests that change data': ORIGIN_GUARD_MODES.LENIENT,
      'Agent skills to include': [[]],
      'Create the project?': 'CREATE',
    });
    const prompt = worker.prompter.prompts.find((candidate) => candidate.message === SESSION_STORE_MESSAGE);
    expect(optionValues(prompt)).toEqual([AUTH_SESSION_STORES.DATABASE, AUTH_SESSION_STORES.KV_CACHE]);
    expect(prompt?.initial).toBe(AUTH_SESSION_STORES.DATABASE);
    expect(worker.read('.env.example')).toContain('AUTH_SESSION_STORE=kv-cache');
    expect(worker.read('AGENTS.md')).toContain('AUTH_SESSION_STORE');
  });

  it('defaults the session store to the database under --yes, so revocation is instant', async () => {
    const { read } = await create([...WORKER_FLAGS, '--yes']);

    expect(read('.env.example')).toContain('AUTH_SESSION_STORE=database');
  });
});
