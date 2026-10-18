import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';

import { apiModule } from './api.module';
import { baseModule } from './base.module';
import { betterAuthModule } from './better-auth.module';
import { exampleDomainModule } from './example-domain.module';
import { nodeHonoModule } from './node-hono.module';
import { postgresModule } from './postgres.module';
import { valkeyModule } from './valkey.module';

/** Every module the generator ships. */
export const MODULE_MANIFESTS: iModuleManifestInput[] = [
  baseModule,
  apiModule,
  nodeHonoModule,
  postgresModule,
  valkeyModule,
  betterAuthModule,
  exampleDomainModule,
];
