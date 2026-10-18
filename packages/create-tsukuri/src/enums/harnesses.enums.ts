import { em } from 'enumwaii';

/** Agent harnesses a generated document can be written for; values are the `<harness-specific id="...">` ids. */
export const harnessesEnumwaii = em({
  CLAUDE: 'claude',
  CODEX: 'codex',
});

export const HARNESSES = harnessesEnumwaii.enum;
export type Harness = (typeof harnessesEnumwaii)['~type'];
