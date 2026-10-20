import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { WORKER_WORKSPACE } from '../backend/cloudflare-worker.module';
import { API_WORKSPACE } from '../base/api.module';

const DATABASE_FEATURE = 'src/features/database';
const HYPERDRIVE_VARIANT = `${API_WORKSPACE}/variants/postgres-hyperdrive`;

export const postgresNodeModule = defineModule({
  id: MODULE_IDS.POSTGRES_NODE,
  version: '1.0.0',
  name: 'Postgres on Node',
  description: 'A pg connection pool to POSTGRES_URL, shared by every request',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.POSTGRES], capabilities: [CAPABILITIES.NODE_RUNTIME] },
  files: [{ source: `${API_WORKSPACE}/${DATABASE_FEATURE}/database.service.ts` }],
});

export const postgresHyperdriveModule = defineModule({
  id: MODULE_IDS.POSTGRES_HYPERDRIVE,
  version: '1.0.0',
  name: 'Postgres through Hyperdrive',
  description: 'Postgres on a Cloudflare Worker through a Hyperdrive binding, one pool per request',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.POSTGRES], capabilities: [CAPABILITIES.WORKER_RUNTIME] },
  files: [
    { source: `${HYPERDRIVE_VARIANT}/${DATABASE_FEATURE}`, target: `${API_WORKSPACE}/${DATABASE_FEATURE}` },
    { source: `${HYPERDRIVE_VARIANT}/test/helpers`, target: `${API_WORKSPACE}/test/helpers` },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.WORKER_BINDING,
      workspace: WORKER_WORKSPACE,
      binding: 'HYPERDRIVE',
      type: 'Hyperdrive',
      token: { name: 'HYPERDRIVE_TOKEN', from: '@startername/api/features/database/hyperdrive.token' },
      wrangler: {
        section: 'hyperdrive',
        // `id` is the Hyperdrive config a deployment uses; local dev connects to the compose Postgres.
        entry: { id: 'local', localConnectionString: 'postgresql://postgres:postgres@localhost:5432/startername' },
      },
    },
  ],
});
