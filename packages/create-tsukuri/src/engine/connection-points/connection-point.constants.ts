import { templatePath } from '#~/constants/template-path';
import type { WranglerBindingSection } from '#~/enums/worker-bindings.enums';

export const COMPOSE_FILE = 'docker-compose.dev.yml';
export const CI_WORKFLOW_FILE = '.github/workflows/ci.yml';
export const ENV_EXAMPLE_FILE = '.env.example';
export const NODE_VERSION_FILE = '.nvmrc';
export const WRANGLER_CONFIG_FILE = 'wrangler.jsonc';

/** Cloudflare's limit for a Worker name, which is lowercase letters, digits and dashes. */
export const MAX_WORKER_NAME_LENGTH = 63;
/** A deployment runs in production; `wrangler dev` overrides it from the root `.env`. */
const DEPLOYED_NODE_ENV = 'production';

/**
 * What every generated `wrangler.jsonc` declares besides its name and bindings; the Worker bundle is built
 * by tsdown. Binding sections are never among these keys, so a module cannot replace them.
 */
export const WRANGLER_CONFIG = {
  $schema: './node_modules/wrangler/config-schema.json',
  main: 'dist/worker.mjs',
  compatibility_date: '2026-10-01',
  compatibility_flags: ['nodejs_compat'],
  no_bundle: true,
  vars: { NODE_ENV: DEPLOYED_NODE_ENV },
  build: {
    command: 'pnpm run bundle',
    watch_dir: ['src', '../../packages/api/src', '../../packages/common/src', '../../packages/server-contract/src'],
  },
} satisfies Record<string, unknown> & Partial<Record<WranglerBindingSection | 'name', never>>;

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
  workerBindings: templatePath('connection-points/worker-bindings.ts.hbs'),
} satisfies Record<string, string>;
