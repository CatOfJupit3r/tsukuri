import { injectable } from 'tsyringe';

import type { iDiRegistrationContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

@injectable()
export class DiRegistrationRenderer implements iConnectionPointRenderer<iDiRegistrationContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iDiRegistrationContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'di-registrations.ts',
        template: CONNECTION_POINT_TEMPLATES.diRegistrations,
        imports: (registration) => registration.bindings.flatMap((binding) => [binding.token, binding.implementation]),
        variables: (registrations) => ({
          bindings: registrations.flatMap((registration) => registration.bindings),
          sideEffects: [...new Set(registrations.flatMap((registration) => registration.imports))],
        }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
