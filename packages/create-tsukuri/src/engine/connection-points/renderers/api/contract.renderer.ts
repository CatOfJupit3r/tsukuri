import { injectable } from 'tsyringe';

import type { iContractContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../../connection-point.types';
import { GeneratedSourceFiles } from '../../generated-source-files';

@injectable()
export class ContractRenderer implements iConnectionPointRenderer<iContractContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iContractContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'contracts.ts',
        template: CONNECTION_POINT_TEMPLATES.contracts,
        uniqueness: {
          value: (contract) => contract.key,
          describe: (workspace, key) => `${workspace}: more than one module adds a contract under "${key}"`,
        },
        imports: (contract) => [contract.contract],
        variables: (contracts) => ({ contracts }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
