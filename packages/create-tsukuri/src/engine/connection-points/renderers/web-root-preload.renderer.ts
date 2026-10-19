import { injectable } from 'tsyringe';

import type { iWebRootPreloadContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

@injectable()
export class WebRootPreloadRenderer implements iConnectionPointRenderer<iWebRootPreloadContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iWebRootPreloadContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'web-root-preloads.ts',
        template: CONNECTION_POINT_TEMPLATES.webRootPreloads,
        imports: (preload) => [preload.preload],
        variables: (preloads) => ({ preloads }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
