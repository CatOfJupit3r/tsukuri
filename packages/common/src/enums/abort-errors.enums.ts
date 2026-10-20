import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** `Error.name` values runtimes and libraries use when a request or operation is cancelled through its signal. */
const abortErrorNamesEnumwaii = em({
  ABORT_ERROR: 'AbortError',
  REQUEST_ABORTED_ERROR: 'RequestAbortedError',
});

export const ABORT_ERROR_NAMES = abortErrorNamesEnumwaii.enum;
export type AbortErrorName = (typeof abortErrorNamesEnumwaii)['~type'];
export const abortErrorNameSchema = emToZodSchema(abortErrorNamesEnumwaii);

/** Machine-readable reason carried by results of work that stopped because its signal aborted. */
const abortCodesEnumwaii = em(['ABORTED']);

export const ABORT_CODES = abortCodesEnumwaii.enum;
export type AbortCode = (typeof abortCodesEnumwaii)['~type'];
export const abortCodeSchema = emToZodSchema(abortCodesEnumwaii);
