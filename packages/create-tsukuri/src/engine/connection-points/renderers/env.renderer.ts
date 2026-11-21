import { injectable } from 'tsyringe';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { iEnvShapeContribution, iEnvVariableContribution } from '#~/manifest/connection-point.schema';

import { GeneratorError } from '../../generator-error';
import type { iTemplateContext } from '../../template-renderer';
import { CONNECTION_POINT_TEMPLATES, ENV_EXAMPLE_FILE } from '../connection-point.constants';
import type { iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

/**
 * One env shape per workspace that spreads the shapes its modules export, and one root `.env.example`
 * listing their variables: every runtime loads the root `.env`, since the variables of shared packages
 * are read by whichever app runs them. A module's shape keys are its `ENV_VARIABLE` names for that workspace
 * (a test holds them equal), so a key two modules both spread is caught as a duplicate variable.
 */
@injectable()
export class EnvRenderer {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    shapes: iOwnedContribution<iEnvShapeContribution>[],
    variables: iOwnedContribution<iEnvVariableContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const files = await this.sourceFiles.renderPerWorkspace(
      shapes,
      {
        fileName: 'env.schema.ts',
        template: CONNECTION_POINT_TEMPLATES.envSchema,
        uniqueness: {
          value: (contribution) => contribution.shape.name,
          describe: (workspace, name) => `${workspace}: more than one module exports the env shape "${name}"`,
        },
        imports: (contribution) => [contribution.shape],
        variables: (contributions) => ({ shapes: contributions.map((contribution) => contribution.shape.name) }),
      },
      context,
      hostedWorkspaces,
    );

    if (variables.length === 0) return files;
    this.assertVariablesUnique(variables);
    const workspaces = [...this.sourceFiles.groupByWorkspace(variables, hostedWorkspaces)].map(
      ([workspace, workspaceVariables]) => ({ workspace, variables: workspaceVariables }),
    );

    return [
      ...files,
      await this.sourceFiles.render(ENV_EXAMPLE_FILE, CONNECTION_POINT_TEMPLATES.envExample, {
        ...context,
        workspaces,
      }),
    ];
  }

  private assertVariablesUnique(variables: iOwnedContribution<iEnvVariableContribution>[]) {
    const declaredBy = new Map<string, string>();
    for (const { moduleId, contribution } of variables) {
      const key = `${contribution.workspace}\0${contribution.name}`;
      const firstModuleId = declaredBy.get(key);
      if (firstModuleId !== undefined) {
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.MERGE_CONFLICT,
          `${contribution.workspace}: more than one module declares env variable "${contribution.name}" (${firstModuleId} and ${moduleId})`,
        );
      }
      declaredBy.set(key, moduleId);
    }
  }
}
