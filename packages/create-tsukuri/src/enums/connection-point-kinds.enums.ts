import { em } from 'enumwaii';

const connectionPointKindsEnumwaii = em([
  'ROUTER',
  'DI_REGISTRATION',
  'ENV_VARIABLE',
  'COMPOSE_SERVICE',
  'CI_STEP',
  'DEV_TASK',
  'BUILD_TASK',
]);

export const CONNECTION_POINT_KINDS = connectionPointKindsEnumwaii.enum;
export type ConnectionPointKind = (typeof connectionPointKindsEnumwaii)['~type'];
