import { injectable } from 'tsyringe';

import type { iStartupTaskContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../../connection-point.types';
import { GeneratedSourceFiles } from '../../generated-source-files';

@injectable()
export class StartupTaskRenderer implements iConnectionPointRenderer<iStartupTaskContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iStartupTaskContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'startup-tasks.ts',
        template: CONNECTION_POINT_TEMPLATES.startupTasks,
        imports: (task) => [task.task],
        variables: (tasks) => ({ tasks }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
