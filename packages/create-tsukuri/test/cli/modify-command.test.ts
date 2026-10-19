import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createCliContainer } from '#~/cli/cli-container';
import { ModifyCommand } from '#~/cli/modify-command';
import { ProjectGenerator } from '#~/engine/project-generator';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { FILE_CHANGE_KINDS } from '#~/enums/file-change-kinds.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import { MODIFY_ACTIONS } from '#~/enums/modify-actions.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import { baseModule } from '#~/modules/base.module';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { createManifest, testModuleId } from '../helpers/manifests';
import { RecordingRunner, ScriptedPrompter, optionValues } from '../helpers/scripted-prompter';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';
import { readTree } from '../helpers/tree';

vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const ALPHA = testModuleId('alpha');
const BETA = testModuleId('beta');
const GAMMA = testModuleId('gamma');
const DELTA = testModuleId('delta');

const MANIFESTS = [
  baseModule,
  createManifest(ALPHA, {
    files: [{ source: 'scripts/clean.ts', target: 'tools/clean.ts' }],
    packageJson: [{ workspace: '.', scripts: { 'clean:tools': 'tsx tools/clean.ts' } }],
    contributions: [{ kind: CONNECTION_POINT_KINDS.CI_STEP, name: 'Clean', run: 'pnpm run clean:tools' }],
  }),
  createManifest(BETA, {
    files: [{ source: '.gitattributes', target: 'tools/beta.txt' }],
    packageJson: [{ workspace: '.', devDependencies: { 'beta-tool': '1.0.0' }, scripts: { beta: 'beta-tool' } }],
    pnpmWorkspace: { packages: ['tools/*'], catalog: { 'beta-lib': '2.0.0' } },
    contributions: [
      { kind: CONNECTION_POINT_KINDS.COMPOSE_SERVICE, name: 'beta', service: { image: 'beta:1' } },
      { kind: CONNECTION_POINT_KINDS.CI_STEP, name: 'Beta', run: 'pnpm run beta' },
    ],
  }),
  createManifest(GAMMA, { conflicts: [BETA] }),
  createManifest(DELTA, { requires: [ALPHA] }),
];

function readRecord(projectDir: string) {
  return JSON.parse(readFileSync(path.join(projectDir, 'starter.json'), 'utf8')) as iProjectRecord;
}

describe('add / remove', () => {
  const createTempDir = useTempDir();

  async function setup(answers: ConstructorParameters<typeof ScriptedPrompter>[0] = {}) {
    const root = await createTempDir();
    const prompter = new ScriptedPrompter(answers);
    const container = createCliContainer({
      sourceRoot: REPOSITORY_ROOT,
      manifests: MANIFESTS,
      cwd: root,
      prompter,
      runner: new RecordingRunner(),
    });

    const create = async (name: string, modules: ModuleId[]) => {
      const targetDir = path.join(root, name);
      await container.resolve(ProjectGenerator).create({ targetDir, projectName: 'acme', modules });
      return targetDir;
    };
    const modify = (action: (typeof MODIFY_ACTIONS)[keyof typeof MODIFY_ACTIONS], projectDir: string, argv: string[]) =>
      container.resolve(ModifyCommand).run(action, [...argv, '--dir', projectDir]);

    return { prompter, create, modify };
  }

  it('create A then add B gives the same tree as create A,B', async () => {
    const { create, modify } = await setup();
    const stepwise = await create('stepwise', [ALPHA]);
    const direct = await create('direct', [ALPHA, BETA]);

    await modify(MODIFY_ACTIONS.ADD, stepwise, [BETA, '--yes']);

    expect(await readTree(stepwise)).toEqual(await readTree(direct));
  });

  it('remove undoes add', async () => {
    const { create, modify } = await setup();
    const projectDir = await create('project', [ALPHA]);
    const original = await readTree(projectDir);

    await modify(MODIFY_ACTIONS.ADD, projectDir, [BETA, '--yes']);
    await modify(MODIFY_ACTIONS.REMOVE, projectDir, [BETA, '--yes']);

    expect(await readTree(projectDir)).toEqual(original);
  });

  it('keeps local package.json and workspace edits while merging the module changes', async () => {
    const { create, modify } = await setup();
    const projectDir = await create('project', [ALPHA]);
    const packagePath = path.join(projectDir, 'package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as Record<string, Record<string, string>>;
    packageJson.devDependencies = { ...packageJson.devDependencies, 'my-own-tool': '3.0.0' };
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

    const plan = await modify(MODIFY_ACTIONS.ADD, projectDir, [BETA, '--yes']);

    expect(plan?.changes.find((change) => change.path === 'package.json')?.kind).toBe(FILE_CHANGE_KINDS.MERGE);
    const merged = JSON.parse(await readFile(packagePath, 'utf8')) as Record<string, Record<string, string>>;
    expect(merged.devDependencies).toEqual(expect.objectContaining({ 'my-own-tool': '3.0.0', 'beta-tool': '1.0.0' }));
    expect(merged.scripts).toEqual(expect.objectContaining({ beta: 'beta-tool', 'clean:tools': 'tsx tools/clean.ts' }));
  });

  it('leaves a file the user already has at a module path alone and reports it', async () => {
    const { create, modify } = await setup();
    const projectDir = await create('project', [ALPHA]);
    await mkdir(path.join(projectDir, 'tools'), { recursive: true });
    await writeFile(path.join(projectDir, 'tools/beta.txt'), 'mine');

    const plan = await modify(MODIFY_ACTIONS.ADD, projectDir, [BETA, '--yes']);

    expect(plan?.changes.find((change) => change.path === 'tools/beta.txt')).toMatchObject({
      kind: FILE_CHANGE_KINDS.CONFLICT,
    });
    expect(await readFile(path.join(projectDir, 'tools/beta.txt'), 'utf8')).toBe('mine');
    expect(readRecord(projectDir).modules.map((module) => module.id)).toContain(BETA);
  });

  it('only prints the plan with --dry-run', async () => {
    const { prompter, create, modify } = await setup();
    const projectDir = await create('project', [ALPHA]);
    const before = await readTree(projectDir);

    const plan = await modify(MODIFY_ACTIONS.ADD, projectDir, [BETA, '--dry-run']);

    expect(plan?.changes.map((change) => `${change.kind} ${change.path}`)).toEqual(
      expect.arrayContaining(['CREATE tools/beta.txt', 'CREATE docker-compose.dev.yml', 'UPDATE starter.json']),
    );
    expect(prompter.messages.some((message) => message.includes('+ tools/beta.txt'))).toBe(true);
    expect(await readTree(projectDir)).toEqual(before);
  });

  it('rejects conflicting additions and removing a module others require', async () => {
    const { create, modify } = await setup();
    const projectDir = await create('project', [DELTA]);

    await expect(modify(MODIFY_ACTIONS.REMOVE, projectDir, [ALPHA, '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.MODULE_CONFLICT,
      message: expect.stringContaining('required by "delta"'),
    });
    await modify(MODIFY_ACTIONS.ADD, projectDir, [BETA, '--yes']);
    await expect(modify(MODIFY_ACTIONS.ADD, projectDir, [GAMMA, '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.MODULE_CONFLICT,
    });
  });

  it('offers only compatible modules that are not installed when no module is named', async () => {
    const { prompter, create, modify } = await setup({ 'Modules to add': [[DELTA]], 'Apply these changes?': true });
    const projectDir = await create('project', [ALPHA, BETA]);

    await modify(MODIFY_ACTIONS.ADD, projectDir, []);

    expect(optionValues(prompter.prompts[0])).toEqual([DELTA]);
    expect(readRecord(projectDir).modules.map((module) => module.id)).toContain(DELTA);
  });

  it('adds and removes individual skills', async () => {
    const { create, modify } = await setup();
    const projectDir = await create('project', [ALPHA]);
    const skillFile = path.join(projectDir, '.agents/skills/review-code/SKILL.md');

    await modify(MODIFY_ACTIONS.REMOVE, projectDir, ['skill', 'review-code', '--yes']);
    expect(existsSync(skillFile)).toBe(false);
    expect(existsSync(path.join(projectDir, '.agents'))).toBe(false);
    expect(readRecord(projectDir).skills.excluded).toEqual(['review-code']);

    await modify(MODIFY_ACTIONS.ADD, projectDir, ['skill', 'review-code', '--yes']);
    expect(existsSync(skillFile)).toBe(true);
    expect(readRecord(projectDir).skills.excluded).toEqual([]);
  });

  it('explains when the folder is not a generated project', async () => {
    const { modify } = await setup();
    const emptyDir = await createTempDir();

    await expect(modify(MODIFY_ACTIONS.ADD, emptyDir, [BETA, '--yes'])).rejects.toMatchObject({
      code: GENERATOR_ERROR_CODES.PROJECT_RECORD_NOT_FOUND,
    });
  });
});
