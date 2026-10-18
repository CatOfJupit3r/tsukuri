import { ORPCError } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@startername/common/generated/error-codes';

import {
  ORPCBadRequestError,
  ORPC_ERROR_KINDS,
  ORPCNotFoundError,
  expectDefined,
  getORPCErrorMetadata,
  handleUnexpectedError,
  isORPCError,
  shouldLogORPCError,
} from '#~/lib/orpc-error-wrapper';

describe('ORPC error wrapper', () => {
  it('creates a typed error with safe payload and metadata', () => {
    const error = ORPCBadRequestError(
      errorCodes.INTERNAL_SERVER_ERROR,
      { field: 'id' },
      {
        operation: 'user.updateBadge',
        context: { source: 'test' },
      },
    );

    expect(error).toBeInstanceOf(ORPCError);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.data).toMatchObject({
      code: errorCodes.INTERNAL_SERVER_ERROR,
      field: 'id',
    });
    expect(getORPCErrorMetadata(error)).toEqual({
      kind: ORPC_ERROR_KINDS.INFO,
      operation: 'user.updateBadge',
      context: { source: 'test' },
    });
    expect(shouldLogORPCError(error)).toBe(false);
  });

  it('normalizes unknown failures and keeps their cause for logging', async () => {
    const cause = new Error('provider unavailable');

    await expect(
      handleUnexpectedError(
        () => {
          throw cause;
        },
        { operation: 'story.generate' },
      ),
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      cause,
    });

    try {
      await handleUnexpectedError(
        () => {
          throw cause;
        },
        { operation: 'story.generate' },
      );
    } catch (error) {
      expect(isORPCError(error)).toBe(true);
      expect(getORPCErrorMetadata(error)).toEqual({
        kind: ORPC_ERROR_KINDS.UNEXPECTED,
        operation: 'story.generate',
      });
      expect(shouldLogORPCError(error)).toBe(true);
    }
  });

  it('preserves an existing expected ORPC error', async () => {
    const expected = ORPCNotFoundError(errorCodes.INTERNAL_SERVER_ERROR);

    await expect(handleUnexpectedError(() => Promise.reject(expected))).rejects.toBe(expected);
  });

  it('throws an internal invariant error only for missing values', () => {
    expect(expectDefined('value', 'missing value')).toBe('value');
    expect(() => expectDefined(undefined, 'missing value')).toThrow('missing value');
  });
});
