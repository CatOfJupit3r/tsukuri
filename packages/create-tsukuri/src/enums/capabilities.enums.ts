import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const capabilitiesEnumwaii = em([
  'BACKEND_TARGET',
  'WEB_RENDERING',
  'DATABASE',
  'LOCAL_STORAGE_ENGINE',
  /** The API runs as its own server that clients reach over HTTP (not inside the web app or desktop process). */
  'REMOTE_BACKEND',
  /** The API runs on Node: TCP databases, node:sqlite and Valkey are available. */
  'NODE_RUNTIME',
  /** The API runs in a Cloudflare Worker and reaches storage through bindings. */
  'WORKER_RUNTIME',
  /** The installed database speaks SQLite, so modules install their SQLite tables. */
  'SQLITE_DIALECT',
]);

export const CAPABILITIES = capabilitiesEnumwaii.enum;
export type Capability = (typeof capabilitiesEnumwaii)['~type'];
export const capabilitySchema = emToZodSchema(capabilitiesEnumwaii);

interface iCapabilityMeta {
  /** How errors name the capability. */
  label: string;
  /** Only one selected module may provide an exclusive capability. */
  isExclusive: boolean;
}

export const CAPABILITY_META = capabilitiesEnumwaii.derive<iCapabilityMeta>()(
  [CAPABILITIES.BACKEND_TARGET, { label: 'a backend target', isExclusive: true }],
  [CAPABILITIES.WEB_RENDERING, { label: 'web rendering', isExclusive: true }],
  [CAPABILITIES.DATABASE, { label: 'a database', isExclusive: true }],
  [CAPABILITIES.LOCAL_STORAGE_ENGINE, { label: 'a local storage engine', isExclusive: true }],
  [CAPABILITIES.REMOTE_BACKEND, { label: 'a remote backend', isExclusive: false }],
  [CAPABILITIES.NODE_RUNTIME, { label: 'the Node runtime', isExclusive: false }],
  [CAPABILITIES.WORKER_RUNTIME, { label: 'the Worker runtime', isExclusive: false }],
  [CAPABILITIES.SQLITE_DIALECT, { label: 'the SQLite dialect', isExclusive: false }],
);
