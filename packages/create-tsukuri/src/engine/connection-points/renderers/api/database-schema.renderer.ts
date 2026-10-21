import { injectable } from 'tsyringe';

import type { iDatabaseSchemaContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../../connection-point.types';
import { GeneratedSourceFiles } from '../../generated-source-files';

const SCHEMA_ALIAS_SUFFIX = 'Schema';

@injectable()
export class DatabaseSchemaRenderer implements iConnectionPointRenderer<iDatabaseSchemaContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iDatabaseSchemaContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'database-schema.ts',
        template: CONNECTION_POINT_TEMPLATES.databaseSchema,
        uniqueness: {
          value: (schema) => schema.key,
          describe: (workspace, key) => `${workspace}: more than one module adds the database schema "${key}"`,
        },
        variables: (schemas) => ({
          schemas: schemas.map((schema) => ({ ...schema, alias: `${schema.key}${SCHEMA_ALIAS_SUFFIX}` })),
        }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
