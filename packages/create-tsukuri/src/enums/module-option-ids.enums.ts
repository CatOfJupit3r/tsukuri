import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Choices a module asks for at create time; values are also the `create` flag names. */
export const moduleOptionIdsEnumwaii = em({
  ORIGIN_GUARD: 'origin-guard',
  AUTH_SESSION_STORE: 'auth-session-store',
});

export const MODULE_OPTION_IDS = moduleOptionIdsEnumwaii.enum;
export type ModuleOptionId = (typeof moduleOptionIdsEnumwaii)['~type'];
export const moduleOptionIdSchema = emToZodSchema(moduleOptionIdsEnumwaii);
