import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

export const moduleIdsEnumwaii = em({
  BASE: 'base',
  API: 'api',
  NODE_HONO: 'node-hono',
  POSTGRES: 'postgres',
  VALKEY: 'valkey',
  BETTER_AUTH: 'better-auth',
  EXAMPLE_DOMAIN: 'example-domain',
});

export const MODULE_IDS = moduleIdsEnumwaii.enum;
export type ModuleId = (typeof moduleIdsEnumwaii)['~type'];
export const moduleIdSchema = emToZodSchema(moduleIdsEnumwaii);
