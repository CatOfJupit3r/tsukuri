import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

export const moduleIdsEnumwaii = em({
  BASE: 'base',
});

export const MODULE_IDS = moduleIdsEnumwaii.enum;
export type ModuleId = (typeof moduleIdsEnumwaii)['~type'];
export const moduleIdSchema = emToZodSchema(moduleIdsEnumwaii);
