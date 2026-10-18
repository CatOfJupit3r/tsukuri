import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const moduleCategoriesEnumwaii = em([
  'BASE',
  'BACKEND',
  'WEB',
  'SHIPPING',
  'DATABASE',
  'AUTH',
  'STORAGE',
  'INFRASTRUCTURE',
  'QUALITY',
  'RELEASE',
  'AGENT',
  'FEATURE',
]);

export const MODULE_CATEGORIES = moduleCategoriesEnumwaii.enum;
export type ModuleCategory = (typeof moduleCategoriesEnumwaii)['~type'];
export const moduleCategorySchema = emToZodSchema(moduleCategoriesEnumwaii);

/** Order in which categories are resolved, prompted and written. */
export const MODULE_CATEGORY_ORDER = moduleCategoriesEnumwaii.derive(
  [MODULE_CATEGORIES.BASE, 0],
  [MODULE_CATEGORIES.BACKEND, 1],
  [MODULE_CATEGORIES.WEB, 2],
  [MODULE_CATEGORIES.SHIPPING, 3],
  [MODULE_CATEGORIES.DATABASE, 4],
  [MODULE_CATEGORIES.AUTH, 5],
  [MODULE_CATEGORIES.STORAGE, 6],
  [MODULE_CATEGORIES.INFRASTRUCTURE, 7],
  [MODULE_CATEGORIES.QUALITY, 8],
  [MODULE_CATEGORIES.RELEASE, 9],
  [MODULE_CATEGORIES.AGENT, 10],
  [MODULE_CATEGORIES.FEATURE, 11],
);
