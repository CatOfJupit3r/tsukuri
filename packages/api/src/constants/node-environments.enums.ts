import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Values are the `NODE_ENV` strings. */
const nodeEnvironmentsEnumwaii = em({ DEVELOPMENT: 'development', PRODUCTION: 'production', TEST: 'test' });

export const NODE_ENVIRONMENTS = nodeEnvironmentsEnumwaii.enum;
export type NodeEnvironment = (typeof nodeEnvironmentsEnumwaii)['~type'];
export const nodeEnvironmentSchema = emToZodSchema(nodeEnvironmentsEnumwaii);
