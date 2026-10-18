import { injectable } from 'tsyringe';

import type { iErrorCodeContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

@injectable()
export class ErrorCodeRenderer implements iConnectionPointRenderer<iErrorCodeContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iErrorCodeContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'error-codes.ts',
        template: CONNECTION_POINT_TEMPLATES.errorCodes,
        uniqueness: {
          value: (errorCode) => errorCode.code,
          describe: (workspace, code) => `${workspace}: more than one module declares the error code "${code}"`,
        },
        variables: (codes) => ({
          codes: codes.map((errorCode) => ({ ...errorCode, messageLiteral: JSON.stringify(errorCode.message) })),
        }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
