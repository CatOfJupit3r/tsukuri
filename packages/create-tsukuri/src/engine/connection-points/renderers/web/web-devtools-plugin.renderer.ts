import { injectable } from 'tsyringe';

import type { iWebDevtoolsPluginContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../../connection-point.types';
import { GeneratedSourceFiles } from '../../generated-source-files';

@injectable()
export class WebDevtoolsPluginRenderer implements iConnectionPointRenderer<iWebDevtoolsPluginContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iWebDevtoolsPluginContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'web-devtools-plugins.ts',
        template: CONNECTION_POINT_TEMPLATES.webDevtoolsPlugins,
        imports: (plugin) => [plugin.plugin],
        variables: (plugins) => ({ plugins }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
