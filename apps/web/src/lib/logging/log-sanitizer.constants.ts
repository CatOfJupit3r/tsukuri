export const MAXIMUM_CONTEXT_DEPTH = 4;
export const MAXIMUM_OBJECT_KEYS = 30;
export const MAXIMUM_ARRAY_ITEMS = 20;
export const MAXIMUM_STRING_LENGTH = 2_000;

export const REDACTED_VALUE = '[redacted]';
export const TRUNCATED_VALUE = '[truncated]';
export const CIRCULAR_VALUE = '[circular]';

export const UNKNOWN_ERROR_NAME = 'Error';

export const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|api[-_]?key|token|secret|password|passphrase|credential|session|requestbody)/i;

export const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

export const SENSITIVE_VALUE_PATTERNS = [
  /(["']?authorization["']?\s*[:=]\s*["']?)(?:[A-Za-z]+\s+)?[^"'\s,;&}]+/gi,
  /(["']?api[-_]?key["']?\s*[:=]\s*["']?)[^"'\s,;&}]+/gi,
  /(["']?(?:token|secret|password|passphrase)["']?\s*[:=]\s*["']?)[^"'\s,;&}]+/gi,
] as const;
