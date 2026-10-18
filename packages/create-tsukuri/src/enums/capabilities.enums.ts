import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const capabilitiesEnumwaii = em({
  BACKEND_TARGET: 'backend-target',
  WEB_RENDERING: 'web-rendering',
  DATABASE: 'database',
  LOCAL_STORAGE_ENGINE: 'local-storage-engine',
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
);
