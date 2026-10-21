import { injectable } from 'tsyringe';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { iDevTaskContribution } from '#~/manifest/connection-point.schema';

import { GeneratorError } from '../../generator-error';
import type { iTemplateContext } from '../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../connection-point.constants';
import type { iConnectionPointRenderer, iGeneratedFile, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

/** The dev tasks as data, for workspaces that start the dev servers themselves (such as an E2E stack). */
@injectable()
export class DevTaskRenderer implements iConnectionPointRenderer<iDevTaskContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iDevTaskContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const tasks = this.uniqueTasks(items);
    const files: iGeneratedFile[] = [];
    for (const workspace of new Set(hostedWorkspaces)) {
      files.push(
        await this.sourceFiles.render(
          this.sourceFiles.sourcePath(workspace, 'dev-tasks.ts'),
          CONNECTION_POINT_TEMPLATES.devTasks,
          {
            ...context,
            tasks: tasks.map((task) => ({
              filter: task.filter,
              portVariable: task.portVariable === undefined ? 'null' : `'${task.portVariable}'`,
              isServedFromBuild: task.isServedFromBuild,
            })),
          },
        ),
      );
    }
    return files;
  }

  /** One task per workspace; modules that start the same workspace must agree on how. */
  private uniqueTasks(items: iOwnedContribution<iDevTaskContribution>[]) {
    const tasks = new Map<string, iDevTaskContribution>();
    for (const { contribution } of items) {
      const known = tasks.get(contribution.filter);
      const isConflicting =
        known !== undefined &&
        (known.portVariable !== contribution.portVariable ||
          known.isServedFromBuild !== contribution.isServedFromBuild);
      if (isConflicting) {
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.MERGE_CONFLICT,
          `modules start the dev task "${contribution.filter}" with different ports or serving`,
        );
      }
      tasks.set(contribution.filter, contribution);
    }
    return [...tasks.values()];
  }
}
