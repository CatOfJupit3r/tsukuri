import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';

import { apiModule } from './api.module';
import { baseModule } from './base.module';
import { betterAuthWebModule } from './better-auth-web.module';
import { betterAuthModule } from './better-auth.module';
import { cloudflareKvModule, d1Module } from './cloudflare-storage.module';
import { cloudflareWorkerModule } from './cloudflare-worker.module';
import {
  betterAuthPostgresModule,
  betterAuthSqliteModule,
  exampleDomainPostgresModule,
  exampleDomainSqliteModule,
} from './database-tables.module';
import { exampleDomainWebModule } from './example-domain-web.module';
import { exampleDomainModule } from './example-domain.module';
import { nodeHonoModule } from './node-hono.module';
import { postgresHyperdriveModule, postgresNodeModule } from './postgres-runtimes.module';
import { postgresModule } from './postgres.module';
import { sqliteModule } from './sqlite.module';
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
  cloudflareWorkerModule,
  tanstackStartModule,
  webModule,
  webSsrModule,
  webSpaModule,
  postgresModule,
  sqliteModule,
  d1Module,
  postgresNodeModule,
  postgresHyperdriveModule,
  valkeyModule,
  cloudflareKvModule,
  betterAuthModule,
  exampleDomainModule,
  betterAuthPostgresModule,
  betterAuthSqliteModule,
  exampleDomainPostgresModule,
  exampleDomainSqliteModule,
  webApiModule,
  webRemoteBackendModule,
  webSsrRemoteBackendModule,
  betterAuthWebModule,
  exampleDomainWebModule,
];
