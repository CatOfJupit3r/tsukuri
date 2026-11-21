import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Names the Worker receives its bindings under, in `wrangler.jsonc` and on the `fetch` env. */
const workerBindingNamesEnumwaii = em({ DB: 'DB', KV: 'KV', HYPERDRIVE: 'HYPERDRIVE' });

export const WORKER_BINDING_NAMES = workerBindingNamesEnumwaii.enum;
export type WorkerBindingName = (typeof workerBindingNamesEnumwaii)['~type'];
export const workerBindingNameSchema = emToZodSchema(workerBindingNamesEnumwaii);

/** `wrangler.jsonc` sections that list bindings. */
const wranglerBindingSectionsEnumwaii = em({
  D1_DATABASES: 'd1_databases',
  KV_NAMESPACES: 'kv_namespaces',
  HYPERDRIVE: 'hyperdrive',
});

export const WRANGLER_BINDING_SECTIONS = wranglerBindingSectionsEnumwaii.enum;
export type WranglerBindingSection = (typeof wranglerBindingSectionsEnumwaii)['~type'];

/** Binding types, named as `@cloudflare/workers-types` exports them. */
const workerBindingTypesEnumwaii = em({
  D1_DATABASE: 'D1Database',
  KV_NAMESPACE: 'KVNamespace',
  HYPERDRIVE: 'Hyperdrive',
});

export const WORKER_BINDING_TYPES = workerBindingTypesEnumwaii.enum;
export type WorkerBindingType = (typeof workerBindingTypesEnumwaii)['~type'];
export const workerBindingTypeSchema = emToZodSchema(workerBindingTypesEnumwaii);

interface iWorkerBindingTypeMeta {
  /** The `wrangler.jsonc` section that declares bindings of this type. */
  section: WranglerBindingSection;
}

export const WORKER_BINDING_TYPE_META = workerBindingTypesEnumwaii.derive<iWorkerBindingTypeMeta>()(
  [WORKER_BINDING_TYPES.D1_DATABASE, { section: WRANGLER_BINDING_SECTIONS.D1_DATABASES }],
  [WORKER_BINDING_TYPES.KV_NAMESPACE, { section: WRANGLER_BINDING_SECTIONS.KV_NAMESPACES }],
  [WORKER_BINDING_TYPES.HYPERDRIVE, { section: WRANGLER_BINDING_SECTIONS.HYPERDRIVE }],
);
