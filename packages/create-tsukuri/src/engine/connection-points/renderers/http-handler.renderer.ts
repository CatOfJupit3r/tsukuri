import { injectable } from 'tsyringe';

import type { iHttpHandlerContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

@injectable()
export class HttpHandlerRenderer implements iConnectionPointRenderer<iHttpHandlerContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iHttpHandlerContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'http-handlers.ts',
        template: CONNECTION_POINT_TEMPLATES.httpHandlers,
        uniqueness: {
          value: (handler) => handler.path,
          describe: (workspace, handlerPath) => `${workspace}: more than one module handles "${handlerPath}"`,
        },
        imports: (handler) => [handler.handler],
        variables: (handlers) => ({
          handlers: handlers.map((handler) => ({
            ...handler,
            methodList: handler.methods.map((method) => `'${method}'`).join(', '),
          })),
        }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
