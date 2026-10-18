import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { SKILL_IDS } from '#~/enums/skill-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { API_WORKSPACE } from './api.module';
import { DATABASE_MIGRATE_SCRIPT } from './postgres.module';

/** SQLite files live next to the Postgres ones in this repository and take their paths in a project. */
export const SQLITE_VARIANT = `${API_WORKSPACE}/variants/sqlite`;
const API_FILTER = '--filter=@startername/api';

/** Database files both dialects share. */
const SHARED_DATABASE_FILES = ['database-dialects.enums.ts', 'connect-database.task.ts', 'migrate-database.ts'];

export const sqliteModule = defineModule({
  id: MODULE_IDS.SQLITE,
  version: '1.0.0',
  name: 'SQLite',
  description: 'SQLite on the built-in node:sqlite through Drizzle, with drizzle-kit migrations',
  category: MODULE_CATEGORIES.DATABASE,
  requires: [MODULE_IDS.API],
  provides: [CAPABILITIES.DATABASE],
  files: [
    { source: `${SQLITE_VARIANT}/drizzle.config.ts`, target: `${API_WORKSPACE}/drizzle.config.ts` },
    { source: `${SQLITE_VARIANT}/src/features/database`, target: `${API_WORKSPACE}/src/features/database` },
    ...SHARED_DATABASE_FILES.map((file) => ({ source: `${API_WORKSPACE}/src/features/database/${file}` })),
    { source: `${SQLITE_VARIANT}/test/helpers`, target: `${API_WORKSPACE}/test/helpers` },
  ],
  packageJson: [
    {
      workspace: '.',
      scripts: {
        'db:generate': `pnpm ${API_FILTER} run db:generate`,
        'db:migrate': `pnpm ${API_FILTER} run db:migrate`,
      },
    },
    {
      workspace: API_WORKSPACE,
      scripts: {
        'db:generate': 'drizzle-kit generate --config drizzle.config.ts',
        'db:migrate': DATABASE_MIGRATE_SCRIPT,
      },
      dependencies: {
        'drizzle-orm': '^0.45.2',
      },
      devDependencies: {
        '@swc-node/register': 'catalog:',
        'drizzle-kit': '^0.31.10',
      },
    },
  ],
  pnpmWorkspace: {
    catalog: {
      '@swc-node/register': '1.11.1',
    },
  },
  skills: [SKILL_IDS.DRIZZLE_ORM],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'SQLITE_PATH',
      // Every app runs from `apps/<name>` or `packages/<name>`, so this is `data/` at the project root.
      schema: "z.string().default('../../data/startername.db')",
      example: '../../data/startername.db',
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'ConnectDatabaseTask', from: '#~/features/database/connect-database.task' },
    },
  ],
  hosts: [{ kind: CONNECTION_POINT_KINDS.DATABASE_SCHEMA, workspace: API_WORKSPACE }],
});
