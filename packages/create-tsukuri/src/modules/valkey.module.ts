import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

const API_WORKSPACE = 'packages/api';
const VALKEY_VOLUME = 'valkey-data';

export const valkeyModule = defineModule({
  id: MODULE_IDS.VALKEY,
  version: '1.0.0',
  name: 'Valkey',
  description: 'Valkey (Redis) as the key-value store behind caching and auth sessions',
  category: MODULE_CATEGORIES.INFRASTRUCTURE,
  requires: [MODULE_IDS.API],
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
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'VALKEY_HOST',
      schema: "z.string().default('localhost')",
      example: 'localhost',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'VALKEY_PORT',
      schema: 'z.coerce.number().default(6379)',
      example: '6379',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'VALKEY_USERNAME',
      schema: 'z.string().optional()',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'VALKEY_PASSWORD',
      schema: 'z.string().optional()',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'VALKEY_DB',
      schema: 'z.coerce.number().int().default(0)',
      example: '0',
    },
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
