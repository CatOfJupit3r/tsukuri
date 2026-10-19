import {
  BEARER_PATTERN,
  CIRCULAR_VALUE,
  MAXIMUM_ARRAY_ITEMS,
  MAXIMUM_CONTEXT_DEPTH,
  MAXIMUM_OBJECT_KEYS,
  MAXIMUM_STRING_LENGTH,
  REDACTED_VALUE,
  SENSITIVE_KEY_PATTERN,
  SENSITIVE_VALUE_PATTERNS,
  TRUNCATED_VALUE,
  UNKNOWN_ERROR_NAME,
} from './log-sanitizer.constants';
import type { iSerializedError, LogContext } from './logging-contracts';

function sanitizeString(value: string) {
  const redacted = SENSITIVE_VALUE_PATTERNS.reduce(
    (currentValue, pattern) => currentValue.replace(pattern, `$1${REDACTED_VALUE}`),
    value.replace(BEARER_PATTERN, `Bearer ${REDACTED_VALUE}`),
  );
  return redacted.length > MAXIMUM_STRING_LENGTH ? `${redacted.slice(0, MAXIMUM_STRING_LENGTH - 3)}...` : redacted;
}

function sanitizeRecord(record: object, depth: number, ancestors: WeakSet<object>): LogContext {
  return Object.fromEntries(
    Object.entries(record)
      .slice(0, MAXIMUM_OBJECT_KEYS)
      .map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_VALUE : sanitizeValue(item, depth + 1, ancestors),
      ]),
  );
}

function sanitizeArray(items: unknown[], depth: number, ancestors: WeakSet<object>) {
  return items.slice(0, MAXIMUM_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1, ancestors));
}

function sanitizeObject(value: object, depth: number, ancestors: WeakSet<object>) {
  if (depth >= MAXIMUM_CONTEXT_DEPTH) return TRUNCATED_VALUE;
  if (ancestors.has(value)) return CIRCULAR_VALUE;

  ancestors.add(value);
  const sanitized = Array.isArray(value)
    ? sanitizeArray(value, depth, ancestors)
    : sanitizeRecord(value, depth, ancestors);
  ancestors.delete(value);
  return sanitized;
}

function sanitizeValue(value: unknown, depth: number, ancestors: WeakSet<object>): unknown {
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) return value;
  if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;
  if (typeof value === 'bigint' || typeof value === 'symbol') return value.toString();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  if (value instanceof Error) return serializeError(value);
  return sanitizeObject(value, depth, ancestors);
}

/** Redacts credentials and bounds length, so a message is safe to write to any log destination. */
export function sanitizeLogMessage(message: string) {
  return sanitizeString(message);
}

/** A copy of `context` that is safe to log: sensitive keys and values redacted, size and depth bounded. */
export function sanitizeLogContext(context: LogContext = {}) {
  return sanitizeRecord(context, 0, new WeakSet([context]));
}

export function serializeError(error: unknown): iSerializedError {
  if (!(error instanceof Error)) {
    return { name: UNKNOWN_ERROR_NAME, message: sanitizeString(String(error)) };
  }
  return {
    name: sanitizeString(error.name),
    message: sanitizeString(error.message),
    ...(error.stack ? { stack: sanitizeString(error.stack) } : {}),
    ...(error.cause === undefined ? {} : { cause: sanitizeString(describeCause(error.cause)) }),
  };
}

function describeCause(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  return JSON.stringify(sanitizeValue(cause, 0, new WeakSet()));
}
