import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/**
 * Stand-in for `#~/enums/module-ids.enums` in engine unit tests, so resolution rules can be
 * exercised on small synthetic module graphs:
 * `vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'))`.
 */
const testModuleIdsEnumwaii = em({
  BASE: 'base',
  ALPHA: 'alpha',
  BETA: 'beta',
  GAMMA: 'gamma',
  DELTA: 'delta',
});

export const MODULE_IDS = testModuleIdsEnumwaii.enum;
export type ModuleId = (typeof testModuleIdsEnumwaii)['~type'];
export const moduleIdSchema = emToZodSchema(testModuleIdsEnumwaii);
