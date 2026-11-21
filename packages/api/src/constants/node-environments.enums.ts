import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Values are the `NODE_ENV` strings. */
const nodeEnvironmentsEnumwaii = em({ DEVELOPMENT: 'development', PRODUCTION: 'production', TEST: 'test' });

export const NODE_ENVIRONMENTS = nodeEnvironmentsEnumwaii.enum;
export type NodeEnvironment = (typeof nodeEnvironmentsEnumwaii)['~type'];
export const nodeEnvironmentSchema = emToZodSchema(nodeEnvironmentsEnumwaii);

interface iNodeEnvironmentMeta {
  /** Development-only tools (user impersonation, ...) exist only here; anything else keeps them off. */
  allowsDevelopmentTools: boolean;
  /** Rate limits count requests only here, so local work and tests never get blocked by them. */
  hasRateLimits: boolean;
}

export const NODE_ENVIRONMENT_META = nodeEnvironmentsEnumwaii.derive<iNodeEnvironmentMeta>()(
  [NODE_ENVIRONMENTS.DEVELOPMENT, { allowsDevelopmentTools: true, hasRateLimits: false }],
  [NODE_ENVIRONMENTS.TEST, { allowsDevelopmentTools: false, hasRateLimits: false }],
  [NODE_ENVIRONMENTS.PRODUCTION, { allowsDevelopmentTools: false, hasRateLimits: true }],
);
