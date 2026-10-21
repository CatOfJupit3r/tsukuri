import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

const API_WORKSPACE = 'packages/api';
const VALKEY_VOLUME = 'valkey-data';

/** Names and `.env.example` values of the variables `valkey.env.ts` validates. */
const ENV_VARIABLES = [
  ['VALKEY_HOST', 'localhost'],
  ['VALKEY_PORT', '6379'],
  ['VALKEY_USERNAME', ''],
  ['VALKEY_PASSWORD', ''],
  ['VALKEY_DB', '0'],
] as const;

export const valkeyModule = defineModule({
  id: MODULE_IDS.VALKEY,
  version: '1.0.0',
  name: 'Valkey',
  description: 'Valkey (Redis) as the key-value store behind caching and auth sessions',
  category: MODULE_CATEGORIES.INFRASTRUCTURE,
  requires: [MODULE_IDS.API],
  // ioredis needs TCP sockets.
  requiresCapabilities: [CAPABILITIES.NODE_RUNTIME],
  files: [{ source: `${API_WORKSPACE}/src/features/valkey` }],
  packageJson: [
    {
      workspace: API_WORKSPACE,
      dependencies: {
        ioredis: '5.11.1',
      },
    },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.ENV_SHAPE,
      workspace: API_WORKSPACE,
      shape: { name: 'valkeyEnvShape', from: '#~/features/valkey/valkey.env' },
    },
    ...ENV_VARIABLES.map(([name, example]) => ({
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name,
      example,
    })),
    {
      kind: CONNECTION_POINT_KINDS.DI_REGISTRATION,
      workspace: API_WORKSPACE,
      bindings: [
        {
          token: { name: 'KEY_VALUE_STORE_TOKEN', from: '#~/features/cache/key-value-store' },
          implementation: { name: 'ValkeyKeyValueStore', from: '#~/features/valkey/valkey-key-value-store' },
        },
      ],
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'ConnectValkeyTask', from: '#~/features/valkey/connect-valkey.task' },
    },
    {
      kind: CONNECTION_POINT_KINDS.ERROR_CODE,
      workspace: 'packages/common',
      code: 'VALKEY_CLIENT_NOT_CONNECTED',
      message: 'Valkey client is not connected',
    },
    {
      kind: CONNECTION_POINT_KINDS.COMPOSE_SERVICE,
      name: 'valkey',
      service: {
        image: 'valkey/valkey:8',
        ports: ['6379:6379'],
        volumes: [`${VALKEY_VOLUME}:/data`],
        healthcheck: {
          test: ['CMD', 'valkey-cli', 'ping'],
          interval: '5s',
          timeout: '5s',
          retries: 10,
        },
      },
      volumes: [VALKEY_VOLUME],
    },
  ],
});
