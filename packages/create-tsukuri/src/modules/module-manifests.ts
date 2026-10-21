import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';

import { betterAuthWebModule } from './auth/better-auth-web.module';
import { betterAuthModule } from './auth/better-auth.module';
import { cloudflareWorkerModule } from './backend/cloudflare-worker.module';
import { nodeHonoModule } from './backend/node-hono.module';
import { tanstackStartModule } from './backend/tanstack-start.module';
import { apiModule } from './base/api.module';
import { baseModule } from './base/base.module';
import { cloudflareKvModule, d1Module } from './database/cloudflare-storage.module';
import {
  betterAuthPostgresModule,
  betterAuthSqliteModule,
  exampleDomainPostgresModule,
  exampleDomainSqliteModule,
} from './database/database-tables.module';
import { postgresHyperdriveModule, postgresNodeModule } from './database/postgres-runtimes.module';
import { postgresModule } from './database/postgres.module';
import { sqliteModule } from './database/sqlite.module';
import { exampleDomainWebModule } from './feature/example-domain-web.module';
import { exampleDomainModule } from './feature/example-domain.module';
import { valkeyModule } from './infrastructure/valkey.module';
import { webApiModule } from './web/web-api.module';
import { webRemoteBackendModule, webSsrRemoteBackendModule } from './web/web-remote-backend.module';
import { webSpaModule } from './web/web-spa.module';
import { webSsrModule } from './web/web-ssr.module';
import { webModule } from './web/web.module';

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
