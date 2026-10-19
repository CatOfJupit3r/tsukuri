import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { SKILL_IDS } from '#~/enums/skill-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { API_WORKSPACE } from './api.module';
import { WORKER_WORKSPACE } from './cloudflare-worker.module';
import { SQLITE_VARIANT } from './sqlite.module';

const API_FILTER = '--filter=@startername/api';
const WORKER_FILTER = '--filter=worker';
const D1_VARIANT = `${API_WORKSPACE}/variants/d1`;
/** The D1 tables are the SQLite ones; D1 shares their helpers, migration config and dialect enum. */
const SHARED_SQLITE_FILES = [
  { source: `${SQLITE_VARIANT}/drizzle.config.ts`, target: `${API_WORKSPACE}/drizzle.config.ts` },
  {
    source: `${SQLITE_VARIANT}/src/features/database/schema.helpers.ts`,
    target: `${API_WORKSPACE}/src/features/database/schema.helpers.ts`,
  },
  { source: `${API_WORKSPACE}/src/features/database/database-dialects.enums.ts` },
  { source: `${API_WORKSPACE}/src/features/database/connect-database.task.ts` },
];

export const d1Module = defineModule({
  id: MODULE_IDS.D1,
  version: '1.0.0',
  name: 'Cloudflare D1',
  description: 'Cloudflare D1 (SQLite) through Drizzle, with drizzle-kit migrations applied by wrangler',
  category: MODULE_CATEGORIES.DATABASE,
  requires: [MODULE_IDS.API],
  requiresCapabilities: [CAPABILITIES.WORKER_RUNTIME],
  provides: [CAPABILITIES.DATABASE, CAPABILITIES.SQLITE_DIALECT],
  files: [
    { source: `${D1_VARIANT}/src/features/database`, target: `${API_WORKSPACE}/src/features/database` },
    { source: `${D1_VARIANT}/test/helpers`, target: `${API_WORKSPACE}/test/helpers` },
    ...SHARED_SQLITE_FILES,
  ],
  packageJson: [
    {
      workspace: '.',
      scripts: {
        'db:generate': `pnpm ${API_FILTER} run db:generate`,
        'db:migrate': `pnpm ${WORKER_FILTER} run db:migrate`,
      },
    },
    {
      workspace: API_WORKSPACE,
      scripts: {
        'db:generate': 'drizzle-kit generate --config drizzle.config.ts',
      },
      dependencies: {
        'drizzle-orm': '^0.45.2',
      },
      devDependencies: {
        'drizzle-kit': '^0.31.10',
      },
    },
    {
      workspace: WORKER_WORKSPACE,
      scripts: {
        'db:migrate': 'wrangler d1 migrations apply DB --local',
        'db:migrate:remote': 'wrangler d1 migrations apply DB --remote',
      },
    },
  ],
  skills: [SKILL_IDS.DRIZZLE_ORM],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.WORKER_BINDING,
      workspace: WORKER_WORKSPACE,
      binding: 'DB',
      type: 'D1Database',
      token: { name: 'D1_DATABASE_TOKEN', from: '@startername/api/features/database/d1-database.token' },
      wrangler: {
        section: 'd1_databases',
        // `database_id` is the id of the D1 database a deployment uses; local dev only needs a name.
        entry: {
          database_name: 'startername',
          database_id: 'local',
          migrations_dir: '../../packages/api/src/db/migrations',
        },
      },
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'ConnectDatabaseTask', from: '#~/features/database/connect-database.task' },
    },
  ],
  hosts: [{ kind: CONNECTION_POINT_KINDS.DATABASE_SCHEMA, workspace: API_WORKSPACE }],
});

export const cloudflareKvModule = defineModule({
  id: MODULE_IDS.CLOUDFLARE_KV,
  version: '1.0.0',
  name: 'Cloudflare KV',
  description: 'Cloudflare KV as the key-value store behind caching and auth sessions',
  category: MODULE_CATEGORIES.INFRASTRUCTURE,
  requires: [MODULE_IDS.API],
  requiresCapabilities: [CAPABILITIES.WORKER_RUNTIME],
  files: [
    { source: `${API_WORKSPACE}/src/features/cloudflare-kv` },
    { source: `${API_WORKSPACE}/test/unit/kv-key-value-store.test.ts` },
    { source: `${API_WORKSPACE}/variants/cloudflare-kv/test/helpers`, target: `${API_WORKSPACE}/test/helpers` },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.WORKER_BINDING,
      workspace: WORKER_WORKSPACE,
      binding: 'KV',
      type: 'KVNamespace',
      token: { name: 'KV_NAMESPACE_TOKEN', from: '@startername/api/features/cloudflare-kv/kv-namespace.token' },
      // `id` is the id of the KV namespace a deployment uses.
      wrangler: { section: 'kv_namespaces', entry: { id: 'local' } },
    },
    {
      kind: CONNECTION_POINT_KINDS.DI_REGISTRATION,
      workspace: API_WORKSPACE,
      bindings: [
        {
          token: { name: 'KEY_VALUE_STORE_TOKEN', from: '#~/features/cache/key-value-store' },
          implementation: { name: 'KvKeyValueStore', from: '#~/features/cloudflare-kv/kv-key-value-store' },
        },
      ],
    },
  ],
});
