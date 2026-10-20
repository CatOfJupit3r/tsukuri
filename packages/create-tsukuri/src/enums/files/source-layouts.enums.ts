import { em } from 'enumwaii';

/** How the files under the source root are named: as in the repository, or as in the published bundle. */
const sourceLayoutsEnumwaii = em(['REPOSITORY', 'BUNDLE']);

export const SOURCE_LAYOUTS = sourceLayoutsEnumwaii.enum;
export type SourceLayout = (typeof sourceLayoutsEnumwaii)['~type'];
