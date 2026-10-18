import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import type { iComposeServiceContribution } from '#~/manifest/connection-point.schema';

import { COMPOSE_FILE } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { withHashHeader } from '../generated-header';
import { GeneratedSourceFiles } from '../generated-source-files';

/** The dev docker-compose file with every module's services and volumes. */
@injectable()
export class ComposeRenderer implements iConnectionPointRenderer<iComposeServiceContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(items: iOwnedContribution<iComposeServiceContribution>[]) {
    if (items.length === 0) return [];

    const services = items.map(({ contribution }) => contribution);
    this.sourceFiles.assertUnique(
      services.map((service) => service.name),
      (name) => `more than one module adds the compose service "${name}"`,
    );

    const volumes = [...new Set(services.flatMap((service) => service.volumes))];
    const document: Record<string, unknown> = {
      name: 'startername',
      services: Object.fromEntries(services.map((service) => [service.name, service.service])),
    };
    if (volumes.length > 0) document.volumes = Object.fromEntries(volumes.map((volume) => [volume, {}]));

    return [{ path: COMPOSE_FILE, content: withHashHeader(stringify(document)) }];
  }
}
