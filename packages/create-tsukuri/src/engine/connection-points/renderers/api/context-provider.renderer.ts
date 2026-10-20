import { injectable } from 'tsyringe';

import type { iContextProviderContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../../connection-point.types';
import { GeneratedSourceFiles } from '../../generated-source-files';

@injectable()
export class ContextProviderRenderer implements iConnectionPointRenderer<iContextProviderContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iContextProviderContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'api-context.ts',
        template: CONNECTION_POINT_TEMPLATES.apiContext,
        imports: (provider) => [provider.provider],
        variables: (providers) => ({ providers }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
