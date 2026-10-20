import { em } from 'enumwaii';

/** What produced a file in a composed project; `add`/`remove` update each kind differently. */
const fileKindsEnumwaii = em([
  'MODULE_FILE',
  'SKILL',
  'CONNECTION_POINT',
  'PACKAGE_JSON',
  'PNPM_WORKSPACE',
  'MARKDOWN',
  'MODULE_RECORD',
]);

export const FILE_KINDS = fileKindsEnumwaii.enum;
export type FileKind = (typeof fileKindsEnumwaii)['~type'];
