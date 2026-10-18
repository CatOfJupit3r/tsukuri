import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';

import { apiModule } from './api.module';
import { baseModule } from './base.module';
import { betterAuthWebModule } from './better-auth-web.module';
import { betterAuthModule } from './better-auth.module';
import { exampleDomainWebModule } from './example-domain-web.module';
import { exampleDomainModule } from './example-domain.module';
import { nodeHonoModule } from './node-hono.module';
import { postgresModule } from './postgres.module';
import { tanstackStartModule } from './tanstack-start.module';
import { valkeyModule } from './valkey.module';
import { webApiModule } from './web-api.module';
import { webRemoteBackendModule, webSsrRemoteBackendModule } from './web-remote-backend.module';
import { webSpaModule } from './web-spa.module';
import { webSsrModule } from './web-ssr.module';
import { webModule } from './web.module';

/** Every module the generator ships. */
export const MODULE_MANIFESTS: iModuleManifestInput[] = [
  baseModule,
  apiModule,
  nodeHonoModule,
  tanstackStartModule,
  webModule,
  webSsrModule,
  webSpaModule,
  postgresModule,
  valkeyModule,
  betterAuthModule,
  exampleDomainModule,
  webApiModule,
  webRemoteBackendModule,
  webSsrRemoteBackendModule,
  betterAuthWebModule,
  exampleDomainWebModule,
];
