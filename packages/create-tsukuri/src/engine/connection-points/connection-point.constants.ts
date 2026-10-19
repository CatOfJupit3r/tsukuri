import { templatePath } from '#~/constants/template-path';

export const COMPOSE_FILE = 'docker-compose.dev.yml';
export const CI_WORKFLOW_FILE = '.github/workflows/ci.yml';
export const ENV_EXAMPLE_FILE = '.env.example';
export const NODE_VERSION_FILE = '.nvmrc';

export const CONNECTION_POINT_TEMPLATES = {
  routers: templatePath('connection-points/routers.ts.hbs'),
  contracts: templatePath('connection-points/contracts.ts.hbs'),
  diRegistrations: templatePath('connection-points/di-registrations.ts.hbs'),
  startupTasks: templatePath('connection-points/startup-tasks.ts.hbs'),
  httpHandlers: templatePath('connection-points/http-handlers.ts.hbs'),
  apiContext: templatePath('connection-points/api-context.ts.hbs'),
  databaseSchema: templatePath('connection-points/database-schema.ts.hbs'),
  errorCodes: templatePath('connection-points/error-codes.ts.hbs'),
  webSlots: templatePath('connection-points/web-slots.ts.hbs'),
  webRootPreloads: templatePath('connection-points/web-root-preloads.ts.hbs'),
  webDevtoolsPlugins: templatePath('connection-points/web-devtools-plugins.ts.hbs'),
  envSchema: templatePath('connection-points/env.schema.ts.hbs'),
  envExample: templatePath('connection-points/env.example.hbs'),
} satisfies Record<string, string>;
