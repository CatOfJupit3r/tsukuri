import { injectable } from 'tsyringe';

import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import type { iEnvShapeContribution, iEnvVariableContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES, ENV_EXAMPLE_FILE } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

type iEnvContribution = iEnvShapeContribution | iEnvVariableContribution;

function isShape(item: iOwnedContribution<iEnvContribution>): item is iOwnedContribution<iEnvShapeContribution> {
  return item.contribution.kind === CONNECTION_POINT_KINDS.ENV_SHAPE;
}

function isVariable(item: iOwnedContribution<iEnvContribution>): item is iOwnedContribution<iEnvVariableContribution> {
  return item.contribution.kind === CONNECTION_POINT_KINDS.ENV_VARIABLE;
}

/**
 * One env shape per workspace that spreads the shapes its modules export, and one root `.env.example`
 * listing their variables: every runtime loads the root `.env`, since the variables of shared packages
 * are read by whichever app runs them.
 */
@injectable()
export class EnvRenderer implements iConnectionPointRenderer<iEnvContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iEnvContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const shapes = items.filter(isShape);
    const variables = items.filter(isVariable);
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
    const workspaces = [...this.sourceFiles.groupByWorkspace(variables, hostedWorkspaces)].map(
      ([workspace, workspaceVariables]) => {
        this.sourceFiles.assertUnique(
          workspaceVariables.map((variable) => variable.name),
          (name) => `${workspace}: more than one module declares env variable "${name}"`,
        );
        return { workspace, variables: workspaceVariables };
      },
    );

    return [
      ...files,
      await this.sourceFiles.render(ENV_EXAMPLE_FILE, CONNECTION_POINT_TEMPLATES.envExample, {
        ...context,
        workspaces,
      }),
    ];
  }
}
