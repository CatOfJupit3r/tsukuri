import { injectable } from 'tsyringe';

import type { iRouterContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

@injectable()
export class RouterRenderer implements iConnectionPointRenderer<iRouterContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iRouterContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'routers.ts',
        template: CONNECTION_POINT_TEMPLATES.routers,
        uniqueness: {
          value: (router) => router.key,
          describe: (workspace, key) => `${workspace}: more than one module adds a router under "${key}"`,
        },
        imports: (router) => [router.router],
        variables: (routers) => ({ routers }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
