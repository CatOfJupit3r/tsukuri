import { em } from 'enumwaii';

const generatorErrorCodesEnumwaii = em([
  'INVALID_MANIFEST',
  'DUPLICATE_MODULE',
  'UNKNOWN_MODULE',
  'MODULE_CONFLICT',
  'MISSING_CAPABILITY',
  'CAPABILITY_CONFLICT',
  'DEPENDENCY_CYCLE',
  'MERGE_CONFLICT',
  'MISSING_CATALOG_ENTRY',
  'FILE_CONFLICT',
  'SOURCE_NOT_FOUND',
  'TARGET_NOT_EMPTY',
  'INVALID_PROJECT_NAME',
  'TEMPLATE_ERROR',
]);

export const GENERATOR_ERROR_CODES = generatorErrorCodesEnumwaii.enum;
export type GeneratorErrorCode = (typeof generatorErrorCodesEnumwaii)['~type'];
