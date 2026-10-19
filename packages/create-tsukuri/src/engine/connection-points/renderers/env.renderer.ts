import { injectable } from 'tsyringe';

import type { iEnvVariableContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../template-renderer';
import { CONNECTION_POINT_TEMPLATES, ENV_EXAMPLE_FILE } from '../connection-point.constants';
import type { iConnectionPointRenderer, iGeneratedFile, iOwnedContribution } from '../connection-point.types';
import { GeneratedSourceFiles } from '../generated-source-files';

/** A schema expression that calls zod directly, e.g. `z.string()`. */
const ZOD_REFERENCE = /\bz\./;

/**
 * One env schema per workspace that validates its variables, and one root `.env.example`: every
 * runtime loads the root `.env`, since the variables of shared packages are read by whichever app runs them.
 */
@injectable()
export class EnvRenderer implements iConnectionPointRenderer<iEnvVariableContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iEnvVariableContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const files: iGeneratedFile[] = [];
    const workspaces = [...this.sourceFiles.groupByWorkspace(items, hostedWorkspaces)].map(
      ([workspace, variables]) => ({
        workspace,
        variables,
      }),
    );

    for (const { workspace, variables } of workspaces) {
      this.sourceFiles.assertUnique(
        variables.map((variable) => variable.name),
        (name) => `${workspace}: more than one module declares env variable "${name}"`,
      );
      files.push(
        await this.sourceFiles.render(
          this.sourceFiles.sourcePath(workspace, 'env.schema.ts'),
          CONNECTION_POINT_TEMPLATES.envSchema,
          {
            ...context,
            variables,
            usesZod: variables.some((variable) => ZOD_REFERENCE.test(variable.schema)),
            imports: this.sourceFiles.groupNamedImports(variables.flatMap((variable) => variable.imports)),
          },
        ),
      );
    }

    if (items.length === 0) return files;
    files.push(
      await this.sourceFiles.render(ENV_EXAMPLE_FILE, CONNECTION_POINT_TEMPLATES.envExample, {
        ...context,
        workspaces,
      }),
    );
    return files;
  }
}
