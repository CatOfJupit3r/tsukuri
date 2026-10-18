import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { API_WORKSPACE } from './api.module';
import { SQLITE_VARIANT } from './sqlite.module';

const AUTH_SCHEMA = 'src/features/auth/auth.schema.ts';
const EXAMPLE_DOMAIN_SCHEMAS = [
  'src/features/user/user-profile.schema.ts',
  'src/features/achievements/user-achievement.schema.ts',
];

/** Repositories are shared; only the tables differ between dialects. */
export const betterAuthPostgresModule = defineModule({
  id: MODULE_IDS.BETTER_AUTH_POSTGRES,
  version: '1.0.0',
  name: 'Better Auth tables on Postgres',
  description: 'Better Auth users, sessions, accounts and verifications as Postgres tables',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.BETTER_AUTH, MODULE_IDS.POSTGRES] },
  files: [{ source: `${API_WORKSPACE}/${AUTH_SCHEMA}` }],
});

export const betterAuthSqliteModule = defineModule({
  id: MODULE_IDS.BETTER_AUTH_SQLITE,
  version: '1.0.0',
  name: 'Better Auth tables on SQLite',
  description: 'Better Auth users, sessions, accounts and verifications as SQLite tables',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.BETTER_AUTH, MODULE_IDS.SQLITE] },
  files: [{ source: `${SQLITE_VARIANT}/${AUTH_SCHEMA}`, target: `${API_WORKSPACE}/${AUTH_SCHEMA}` }],
});

export const exampleDomainPostgresModule = defineModule({
  id: MODULE_IDS.EXAMPLE_DOMAIN_POSTGRES,
  version: '1.0.0',
  name: 'Example domain tables on Postgres',
  description: 'User profile and achievement tables on Postgres',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.EXAMPLE_DOMAIN, MODULE_IDS.POSTGRES] },
  files: EXAMPLE_DOMAIN_SCHEMAS.map((file) => ({ source: `${API_WORKSPACE}/${file}` })),
});

export const exampleDomainSqliteModule = defineModule({
  id: MODULE_IDS.EXAMPLE_DOMAIN_SQLITE,
  version: '1.0.0',
  name: 'Example domain tables on SQLite',
  description: 'User profile and achievement tables on SQLite',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.EXAMPLE_DOMAIN, MODULE_IDS.SQLITE] },
  files: EXAMPLE_DOMAIN_SCHEMAS.map((file) => ({
    source: `${SQLITE_VARIANT}/${file}`,
    target: `${API_WORKSPACE}/${file}`,
  })),
});
