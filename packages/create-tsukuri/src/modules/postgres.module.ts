import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { SKILL_IDS } from '#~/enums/skill-ids.enums';
import { defineModule } from '#~/manifest/define-module';

const API_WORKSPACE = 'packages/api';
const API_FILTER = '--filter=@startername/api';
const POSTGRES_VOLUME = 'postgres-data';

export const postgresModule = defineModule({
  id: MODULE_IDS.POSTGRES,
  version: '1.0.0',
  name: 'Postgres',
  description: 'Postgres through Drizzle, with a dev docker-compose service and db:* scripts',
  category: MODULE_CATEGORIES.DATABASE,
  requires: [MODULE_IDS.API],
  provides: [CAPABILITIES.DATABASE],
  files: [
    { source: `${API_WORKSPACE}/drizzle.config.ts` },
    { source: `${API_WORKSPACE}/src/features/postgres` },
    { source: `${API_WORKSPACE}/test/helpers/postgres-memory.ts` },
    { source: `${API_WORKSPACE}/test/helpers/setup/postgres.setup.ts` },
  ],
  packageJson: [
    {
      workspace: '.',
      scripts: {
        'db:generate': `pnpm ${API_FILTER} run db:generate`,
        'db:migrate': `pnpm ${API_FILTER} run db:migrate`,
        'db:push': `pnpm ${API_FILTER} run db:push`,
        'db:studio': `pnpm ${API_FILTER} run db:studio`,
      },
    },
    {
      workspace: API_WORKSPACE,
      scripts: {
        'db:generate': 'drizzle-kit generate --config drizzle.config.ts',
        'db:migrate': 'drizzle-kit migrate --config drizzle.config.ts',
        'db:push': 'drizzle-kit push --config drizzle.config.ts',
        'db:studio': 'drizzle-kit studio --config drizzle.config.ts',
      },
      dependencies: {
        'drizzle-orm': '^0.45.2',
        pg: '^8.16.3',
      },
      devDependencies: {
        '@electric-sql/pglite': '0.5.4',
        '@types/pg': '^8.15.5',
        dotenv: 'catalog:',
        'drizzle-kit': '^0.31.10',
      },
    },
  ],
  pnpmWorkspace: {
    catalog: {
      dotenv: '17.4.2',
    },
  },
  skills: [SKILL_IDS.DRIZZLE_ORM],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'POSTGRES_URL',
      schema: "z.string().default('postgresql://postgres:postgres@localhost:5432/startername')",
      example: 'postgresql://postgres:postgres@localhost:5432/startername',
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'ConnectPostgresTask', from: '#~/features/postgres/connect-postgres.task' },
    },
    {
      kind: CONNECTION_POINT_KINDS.COMPOSE_SERVICE,
      name: 'postgres',
      service: {
        image: 'postgres:17',
        environment: {
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'postgres',
          POSTGRES_DB: 'startername',
        },
        ports: ['5432:5432'],
        volumes: [`${POSTGRES_VOLUME}:/var/lib/postgresql/data`],
        healthcheck: {
          test: ['CMD-SHELL', 'pg_isready -U postgres'],
          interval: '5s',
          timeout: '5s',
          retries: 10,
        },
      },
      volumes: [POSTGRES_VOLUME],
    },
  ],
  hosts: [{ kind: CONNECTION_POINT_KINDS.DATABASE_SCHEMA, workspace: API_WORKSPACE }],
});
