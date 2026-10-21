import { injectable } from 'tsyringe';

import type { iDevTaskContribution } from '#~/manifest/connection-point.schema';

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
    const tasks = [...new Map(items.map(({ contribution }) => [contribution.filter, contribution])).values()];
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
            })),
          },
        ),
      );
    }
    return files;
  }
}
