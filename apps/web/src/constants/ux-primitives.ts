import { em } from 'enumwaii';

const formSaveStateEnumwaii = em(['SAVING', 'SAVED', 'FAILED', 'OFFLINE', 'CONFLICT']);

export const FORM_SAVE_STATES = formSaveStateEnumwaii.enum;
export type FormSaveState = (typeof formSaveStateEnumwaii)['~type'];

const formErrorKindEnumwaii = em(['FIELD', 'FORM']);

export const FORM_ERROR_KINDS = formErrorKindEnumwaii.enum;
export type FormErrorKind = (typeof formErrorKindEnumwaii)['~type'];

const formErrorSourceEnumwaii = em(['CLIENT_VALIDATION', 'SERVER_MAPPING', 'ASYNC_VALIDATION']);

export const FORM_ERROR_SOURCES = formErrorSourceEnumwaii.enum;
export type FormErrorSource = (typeof formErrorSourceEnumwaii)['~type'];

const asyncValidationCancellationReasonEnumwaii = em(['STALE_REQUEST', 'FIELD_CHANGED', 'FORM_CLOSED', 'UNMOUNTED']);

export const ASYNC_VALIDATION_CANCELLATION_REASONS = asyncValidationCancellationReasonEnumwaii.enum;
export type AsyncValidationCancellationReason = (typeof asyncValidationCancellationReasonEnumwaii)['~type'];

const graphemeCounterStateEnumwaii = em(['WITHIN_LIMIT', 'APPROACHING_LIMIT', 'EXCEEDED_LIMIT']);

export const GRAPHEME_COUNTER_STATES = graphemeCounterStateEnumwaii.enum;
export type GraphemeCounterState = (typeof graphemeCounterStateEnumwaii)['~type'];

const liveRegionPolitenessEnumwaii = em(['OFF', 'POLITE', 'ASSERTIVE']);

export const LIVE_REGION_POLITENESS = liveRegionPolitenessEnumwaii.enum;
export type LiveRegionPoliteness = (typeof liveRegionPolitenessEnumwaii)['~type'];

export const LIVE_REGION_POLITENESS_ARIA_VALUES = liveRegionPolitenessEnumwaii.derive(
  [LIVE_REGION_POLITENESS.OFF, 'off'],
  [LIVE_REGION_POLITENESS.POLITE, 'polite'],
  [LIVE_REGION_POLITENESS.ASSERTIVE, 'assertive'],
);

export const UX_GRAPHEME_INPUT_MAX_LENGTH = 100_000;

export function countUxGraphemes(value: string) {
  if (value.length > UX_GRAPHEME_INPUT_MAX_LENGTH) {
    throw new RangeError(`Grapheme input exceeds ${UX_GRAPHEME_INPUT_MAX_LENGTH} UTF-16 code units`);
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(value)).length;
}

export function truncateUxGraphemes(value: string, maxGraphemes: number) {
  if (!Number.isSafeInteger(maxGraphemes) || maxGraphemes < 0) {
    throw new RangeError('Grapheme limit must be a non-negative safe integer');
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let result = '';
  let count = 0;
  for (const segment of segmenter.segment(value)) {
    if (count >= maxGraphemes) break;
    result += segment.segment;
    count += 1;
  }
  return result;
}
