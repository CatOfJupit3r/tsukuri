import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const connectionPointKindsEnumwaii = em([
  'ROUTER',
  'CONTRACT',
  'DI_REGISTRATION',
  'STARTUP_TASK',
  'HTTP_HANDLER',
  'CONTEXT_PROVIDER',
  'DATABASE_SCHEMA',
  'ERROR_CODE',
  'WEB_COMPONENT',
  'WEB_ROOT_PRELOAD',
  'WEB_DEVTOOLS_PLUGIN',
  'ENV_VARIABLE',
  'WORKER_BINDING',
  'COMPOSE_SERVICE',
  'CI_STEP',
  'DEV_TASK',
  'BUILD_TASK',
]);

export const CONNECTION_POINT_KINDS = connectionPointKindsEnumwaii.enum;
export type ConnectionPointKind = (typeof connectionPointKindsEnumwaii)['~type'];
export const connectionPointKindSchema = emToZodSchema(connectionPointKindsEnumwaii);
