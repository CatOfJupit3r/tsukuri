import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** How `RequestOriginGuard` treats a state-changing request; values are the `REQUEST_ORIGIN_MODE` strings. */
const requestOriginModesEnumwaii = em({
  /** Rejects a foreign `Origin`, lets requests without one (servers, CLIs) through. */
  LENIENT: 'lenient',
  /** Also rejects requests that send no `Origin`. */
  STRICT: 'strict',
});

export const REQUEST_ORIGIN_MODES = requestOriginModesEnumwaii.enum;
export type RequestOriginMode = (typeof requestOriginModesEnumwaii)['~type'];
export const requestOriginModeSchema = emToZodSchema(requestOriginModesEnumwaii);

interface iRequestOriginModeMeta {
  /** Whether a state-changing request that sends no `Origin` gets through. */
  allowsMissingOrigin: boolean;
}

export const REQUEST_ORIGIN_MODE_META = requestOriginModesEnumwaii.derive<iRequestOriginModeMeta>()(
  [REQUEST_ORIGIN_MODES.LENIENT, { allowsMissingOrigin: true }],
  [REQUEST_ORIGIN_MODES.STRICT, { allowsMissingOrigin: false }],
);
