import path from 'node:path';

import { createCliContainer } from '#~/cli/cli-container';
import { ModifyCommand } from '#~/cli/modify-command';
import { ProjectGenerator } from '#~/engine/project-generator';
import { MODIFY_ACTIONS } from '#~/enums/cli/modify-actions.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';

import { RecordingRunner, ScriptedPrompter } from '../helpers/scripted-prompter';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';
import { readTree } from '../helpers/tree';

const PROJECT_NAME = 'matrix-app';
const INITIAL_MODULES = [MODULE_IDS.NODE_HONO, MODULE_IDS.WEB_SSR];
const ADDED_MODULES = [MODULE_IDS.POSTGRES, MODULE_IDS.BETTER_AUTH, MODULE_IDS.E2E];

describe('create and add consistency for shipped modules', () => {
  const createTempDir = useTempDir();

  it('adding database, auth, and E2E gives the same project as selecting them at create', async () => {
    const cwd = await createTempDir();
    const container = createCliContainer({
      sourceRoot: REPOSITORY_ROOT,
      cwd,
      prompter: new ScriptedPrompter({}),
      runner: new RecordingRunner(),
    });
    const generator = container.resolve(ProjectGenerator);
    const stepwise = path.join(cwd, 'stepwise');
    const direct = path.join(cwd, 'direct');

    await generator.create({ targetDir: stepwise, projectName: PROJECT_NAME, modules: INITIAL_MODULES });
    await container.resolve(ModifyCommand).run(MODIFY_ACTIONS.ADD, [...ADDED_MODULES, '--yes', '--dir', stepwise]);
    await generator.create({
      targetDir: direct,
      projectName: PROJECT_NAME,
      modules: [...INITIAL_MODULES, ...ADDED_MODULES],
    });

    expect(await readTree(stepwise)).toEqual(await readTree(direct));
  });
});
