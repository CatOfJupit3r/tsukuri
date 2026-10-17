import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Values are the `--preset` flag values. */
export const presetIdsEnumwaii = em({
  FULLSTACK: 'fullstack',
  WEB_LOCAL_FIRST: 'web-local-first',
  DESKTOP: 'desktop',
});

export const PRESET_IDS = presetIdsEnumwaii.enum;
export type PresetId = (typeof presetIdsEnumwaii)['~type'];
export const presetIdSchema = emToZodSchema(presetIdsEnumwaii);
