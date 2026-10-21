import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import type { iComposeServiceContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../render/template-renderer';
import { COMPOSE_FILE, CONNECTION_POINT_TEMPLATES } from '../connection-point.constants';
import type { iConnectionPointRenderer, iGeneratedFile, iOwnedContribution } from '../connection-point.types';
import { withHashHeader } from '../generated-header';
import { GeneratedSourceFiles } from '../generated-source-files';

/** Indent of a service definition inside the generated array. */
const DEFINITION_INDENT = '    ';

/**
 * The dev docker-compose file with every module's services and volumes. Workspaces that host the
 * connection point (such as an E2E stack running its own copy of the services) get the services as data.
 */
@injectable()
export class ComposeRenderer implements iConnectionPointRenderer<iComposeServiceContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iComposeServiceContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const services = items.map(({ contribution }) => contribution);
    this.sourceFiles.assertUnique(
      services.map((service) => service.name),
      (name) => `more than one module adds the compose service "${name}"`,
    );

    const files: iGeneratedFile[] = [];
    for (const workspace of new Set(hostedWorkspaces)) {
      files.push(
        await this.sourceFiles.render(
          this.sourceFiles.sourcePath(workspace, 'compose-services.ts'),
          CONNECTION_POINT_TEMPLATES.composeServices,
          {
            ...context,
            services: services.map(({ name, service }) => ({
              name,
              definition: JSON.stringify(service, null, 2).replaceAll('\n', `\n${DEFINITION_INDENT}`),
            })),
          },
        ),
      );
    }

    if (services.length === 0) return files;

    const volumes = [...new Set(services.flatMap((service) => service.volumes))];
    const document: Record<string, unknown> = {
      name: 'startername',
      services: Object.fromEntries(services.map((service) => [service.name, service.service])),
    };
    if (volumes.length > 0) document.volumes = Object.fromEntries(volumes.map((volume) => [volume, {}]));

    return [...files, { path: COMPOSE_FILE, content: withHashHeader(stringify(document)) }];
  }
}
