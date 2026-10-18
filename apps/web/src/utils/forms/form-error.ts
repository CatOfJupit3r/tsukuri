import z from 'zod';

import { FORM_ERROR_KINDS, FORM_ERROR_SOURCES } from '#~/constants/ux-primitives';
import type { FormErrorKind, FormErrorSource } from '#~/constants/ux-primitives';

export interface iFormErrorItem {
  field?: string;
  kind: FormErrorKind;
  message: string;
  source: FormErrorSource;
}

export interface iServerFormErrorMappingOptions {
  fallbackMessage?: string;
  fieldNames?: Record<string, string>;
  messageByCode?: Record<string, string>;
}

const DEFAULT_FIELD_ERROR_MESSAGE = 'Please check this value.';
const DEFAULT_SERVER_ERROR_MESSAGE = 'We could not save your changes. Please try again.';

const errorWithMessageSchema = z.looseObject({ message: z.unknown().optional() });

interface iServerErrorEntry {
  code?: unknown;
  field?: unknown;
  message?: unknown;
  path?: unknown;
}

function readErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (value instanceof Error) return value.message.trim() || undefined;
  const parsedValue = errorWithMessageSchema.safeParse(value);
  return parsedValue.success ? readErrorMessage(parsedValue.data.message) : undefined;
}

export function getHumanFormErrorMessage(value: unknown, fallbackMessage = DEFAULT_FIELD_ERROR_MESSAGE) {
  return readErrorMessage(value) ?? fallbackMessage;
}

export function getFormErrorMessages(errors: unknown[] | undefined) {
  if (!errors) return [];
  return [...new Set(errors.map((error) => getHumanFormErrorMessage(error)))];
}

function getFieldErrorEntries(fieldErrors: object) {
  const entries: iServerErrorEntry[] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    for (const message of Array.isArray(messages) ? messages : [messages]) entries.push({ field, message });
  }
  return entries;
}

function getServerEntries(error: unknown) {
  if (!error || typeof error !== 'object') return [{ message: error }] satisfies iServerErrorEntry[];

  const candidate = error as {
    code?: unknown;
    data?: unknown;
    errors?: unknown;
    fieldErrors?: unknown;
    formErrors?: unknown;
    message?: unknown;
  };
  const payload = candidate.data && typeof candidate.data === 'object' ? candidate.data : candidate;
  const value = payload as typeof candidate;
  const entries: iServerErrorEntry[] = [];

  if (Array.isArray(value.errors)) entries.push(...(value.errors.filter(Boolean) as iServerErrorEntry[]));
  if (value.fieldErrors && typeof value.fieldErrors === 'object') {
    entries.push(...getFieldErrorEntries(value.fieldErrors));
  }
  if (Array.isArray(value.formErrors)) entries.push(...value.formErrors.map((message) => ({ message })));
  if (entries.length === 0)
    entries.push({ code: value.code ?? candidate.code, message: value.message ?? candidate.message });
  return entries;
}

export function mapServerFormErrors(error: unknown, options: iServerFormErrorMappingOptions = {}) {
  const fallbackMessage = options.fallbackMessage ?? DEFAULT_SERVER_ERROR_MESSAGE;

  return getServerEntries(error).map((entry): iFormErrorItem => {
    const rawField = typeof entry.field === 'string' ? entry.field : undefined;
    const pathField = Array.isArray(entry.path) && typeof entry.path[0] === 'string' ? entry.path[0] : undefined;
    const field = options.fieldNames?.[rawField ?? pathField ?? ''] ?? rawField ?? pathField;
    const codeMessage = typeof entry.code === 'string' ? options.messageByCode?.[entry.code] : undefined;
    return {
      field,
      kind: field ? FORM_ERROR_KINDS.FIELD : FORM_ERROR_KINDS.FORM,
      message: codeMessage ?? fallbackMessage,
      source: FORM_ERROR_SOURCES.SERVER_MAPPING,
    };
  });
}
