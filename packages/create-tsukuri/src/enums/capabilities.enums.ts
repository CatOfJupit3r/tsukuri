import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const capabilitiesEnumwaii = em({
  BACKEND_TARGET: 'backend-target',
  WEB_RENDERING: 'web-rendering',
  DATABASE: 'database',
  LOCAL_STORAGE_ENGINE: 'local-storage-engine',
  /** The API runs as its own server that clients reach over HTTP (not inside the web app or desktop process). */
  REMOTE_BACKEND: 'remote-backend',
  /** The API runs on Node: TCP databases, node:sqlite and Valkey are available. */
  NODE_RUNTIME: 'node-runtime',
  /** The API runs in a Cloudflare Worker and reaches storage through bindings. */
  WORKER_RUNTIME: 'worker-runtime',
  /** The installed database speaks SQLite, so modules install their SQLite tables. */
  SQLITE_DIALECT: 'sqlite-dialect',
});

export const CAPABILITIES = capabilitiesEnumwaii.enum;
export type Capability = (typeof capabilitiesEnumwaii)['~type'];
export const capabilitySchema = emToZodSchema(capabilitiesEnumwaii);

interface iCapabilityMeta {
  /** Only one selected module may provide an exclusive capability. */
  isExclusive: boolean;
}

export const CAPABILITY_META = capabilitiesEnumwaii.derive<iCapabilityMeta>()(
  [CAPABILITIES.BACKEND_TARGET, { isExclusive: true }],
  [CAPABILITIES.WEB_RENDERING, { isExclusive: true }],
  [CAPABILITIES.DATABASE, { isExclusive: true }],
  [CAPABILITIES.LOCAL_STORAGE_ENGINE, { isExclusive: true }],
  [CAPABILITIES.REMOTE_BACKEND, { isExclusive: false }],
  [CAPABILITIES.NODE_RUNTIME, { isExclusive: false }],
  [CAPABILITIES.WORKER_RUNTIME, { isExclusive: false }],
  [CAPABILITIES.SQLITE_DIALECT, { isExclusive: false }],
);
