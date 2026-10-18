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
  WEB: 'web',
  WEB_SSR: 'web-ssr',
  WEB_SPA: 'web-spa',
  TANSTACK_START: 'tanstack-start',
  WEB_API: 'web-api',
  WEB_REMOTE_BACKEND: 'web-remote-backend',
  WEB_SSR_REMOTE_BACKEND: 'web-ssr-remote-backend',
  BETTER_AUTH_WEB: 'better-auth-web',
  EXAMPLE_DOMAIN_WEB: 'example-domain-web',
});

export const MODULE_IDS = moduleIdsEnumwaii.enum;
export type ModuleId = (typeof moduleIdsEnumwaii)['~type'];
export const moduleIdSchema = emToZodSchema(moduleIdsEnumwaii);
