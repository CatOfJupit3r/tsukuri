import { em } from 'enumwaii';

/** Answers to the `origin-guard` option; each is the default `REQUEST_ORIGIN_MODE` it writes into the env schema. */
export const originGuardModesEnumwaii = em({ LENIENT: 'lenient', STRICT: 'strict' });

export const ORIGIN_GUARD_MODES = originGuardModesEnumwaii.enum;
export type OriginGuardMode = (typeof originGuardModesEnumwaii)['~type'];

interface iOriginGuardModeMeta {
  label: string;
  hint: string;
  /** The `REQUEST_ORIGIN_MODES` member the env schema defaults to. */
  enumMember: string;
}

export const ORIGIN_GUARD_MODE_META = originGuardModesEnumwaii.derive<iOriginGuardModeMeta>()(
  [
    ORIGIN_GUARD_MODES.LENIENT,
    {
      label: 'Lenient',
      hint: 'reject a foreign Origin; allow requests that send none (servers, CLIs)',
      enumMember: 'LENIENT',
    },
  ],
  [
    ORIGIN_GUARD_MODES.STRICT,
    { label: 'Strict', hint: 'also reject requests that send no Origin', enumMember: 'STRICT' },
  ],
);
