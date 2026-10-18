import { describe, expect, it } from 'vitest';

import { sanitizeLogContext, sanitizeLogMessage, serializeError } from '#~/lib/logging/log-sanitizer';
import {
  MAXIMUM_ARRAY_ITEMS,
  MAXIMUM_OBJECT_KEYS,
  MAXIMUM_STRING_LENGTH,
  REDACTED_VALUE,
} from '#~/lib/logging/log-sanitizer.constants';

describe('sanitizeLogContext', () => {
  it('redacts the value of sensitive keys at any depth, whatever their casing', () => {
    const sanitized = sanitizeLogContext({
      userId: 'user-1',
      Authorization: 'Bearer abc.def.ghi',
      request: { headers: { 'x-api-key': 'key-123', accept: 'application/json' }, password: 'hunter2' },
      attempts: [{ sessionToken: 'tok-1', retry: 2 }],
    });

    expect(sanitized).toEqual({
      userId: 'user-1',
      Authorization: REDACTED_VALUE,
      request: { headers: { 'x-api-key': REDACTED_VALUE, accept: 'application/json' }, password: REDACTED_VALUE },
      attempts: [{ sessionToken: REDACTED_VALUE, retry: 2 }],
    });
  });

  it('redacts credentials embedded in free-form strings and keeps the surrounding text', () => {
    const sanitized = sanitizeLogContext({
      bearer: 'sent Bearer eyJhbGciOi.payload.signature to the API',
      basic: 'authorization: Basic dXNlcjpwYXNz',
      query: 'token=abc123&page=2',
      json: '{"password":"hunter2","name":"Ada"}',
    });

    expect(sanitized.bearer).toBe(`sent Bearer ${REDACTED_VALUE} to the API`);
    expect(sanitized.basic).toBe(`authorization: ${REDACTED_VALUE}`);
    expect(sanitized.query).toBe(`token=${REDACTED_VALUE}&page=2`);
    expect(sanitized.json).toBe(`{"password":"${REDACTED_VALUE}","name":"Ada"}`);
  });

  it('marks real cycles as circular while keeping a value that is merely referenced twice', () => {
    const shared = { label: 'shared' };
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic.self = cyclic;

    const sanitized = sanitizeLogContext({ first: shared, second: shared, cyclic });

    expect(sanitized.first).toEqual({ label: 'shared' });
    expect(sanitized.second).toEqual({ label: 'shared' });
    expect(sanitized.cyclic).toEqual({ name: 'root', self: '[circular]' });
  });

  it('bounds depth, key count, array length and string length', () => {
    const tooDeep = { one: { two: { three: { four: { five: 'deep' } } } } };
    const manyKeys = Object.fromEntries(
      Array.from({ length: MAXIMUM_OBJECT_KEYS + 10 }, (_, index) => [`key${index}`, index]),
    );
    const longString = 'x'.repeat(MAXIMUM_STRING_LENGTH + 500);

    const sanitized = sanitizeLogContext({
      tooDeep,
      manyKeys,
      longList: Array.from({ length: MAXIMUM_ARRAY_ITEMS + 5 }, (_, index) => index),
      longString,
    });

    expect(sanitized.tooDeep).toEqual({ one: { two: { three: '[truncated]' } } });
    expect(Object.keys(sanitized.manyKeys as object)).toHaveLength(MAXIMUM_OBJECT_KEYS);
    expect(sanitized.longList).toHaveLength(MAXIMUM_ARRAY_ITEMS);
    expect(sanitized.longString).toHaveLength(MAXIMUM_STRING_LENGTH);
    expect((sanitized.longString as string).endsWith('...')).toBe(true);
  });

  it('turns values JSON cannot carry into readable text instead of dropping or leaking them', () => {
    const sanitized = sanitizeLogContext({
      when: new Date('2026-01-02T03:04:05.000Z'),
      invalidDate: new Date('not a date'),
      callback: function loadProfile() {
        return 'secret source';
      },
      identifier: 42n,
      nested: { failure: new TypeError('Failed to fetch') },
    });

    expect(sanitized.when).toBe('2026-01-02T03:04:05.000Z');
    expect(sanitized.invalidDate).toBe('Invalid Date');
    expect(sanitized.callback).toBe('[function loadProfile]');
    expect(sanitized.identifier).toBe('42');
    expect(sanitized.nested).toMatchObject({ failure: { name: 'TypeError', message: 'Failed to fetch' } });
  });

  it('does not mutate the context it receives', () => {
    const context = { password: 'hunter2', nested: { token: 'abc' } };

    sanitizeLogContext(context);

    expect(context).toEqual({ password: 'hunter2', nested: { token: 'abc' } });
  });
});

describe('sanitizeLogMessage', () => {
  it('redacts credentials a caller interpolated into a message', () => {
    expect(sanitizeLogMessage('Request failed with api_key=sk-live-123')).toBe(
      `Request failed with api_key=${REDACTED_VALUE}`,
    );
  });
});

describe('serializeError', () => {
  it('keeps name, message, stack and the message of the cause, redacting secrets in each', () => {
    const error = new Error('Login failed for password=hunter2', { cause: new Error('upstream rejected token=abc') });

    const serialized = serializeError(error);

    expect(serialized.name).toBe('Error');
    expect(serialized.message).toBe(`Login failed for password=${REDACTED_VALUE}`);
    expect(serialized.cause).toBe(`upstream rejected token=${REDACTED_VALUE}`);
    expect(serialized.stack).toContain('Login failed');
    expect(serialized.stack).not.toContain('hunter2');
  });

  it('describes a thrown non-error value as an error with its text', () => {
    expect(serializeError('plain failure')).toEqual({ name: 'Error', message: 'plain failure' });
    expect(serializeError(undefined)).toEqual({ name: 'Error', message: 'undefined' });
  });

  it('omits stack and cause when the error has none', () => {
    const error = new RangeError('out of range');
    error.stack = undefined;

    expect(serializeError(error)).toEqual({ name: 'RangeError', message: 'out of range' });
  });
});
