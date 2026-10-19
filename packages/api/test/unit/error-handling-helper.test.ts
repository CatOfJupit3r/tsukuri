import { describe, expect, it } from 'vitest';

import { tryCatch } from '@startername/common/helpers/error-handling.helper';

describe('error-handling helpers', () => {
  it('returns synchronous data or error without throwing', () => {
    expect(tryCatch(() => 'value')).toEqual({ data: 'value', error: null });

    const result = tryCatch((): string => {
      throw new Error('failed');
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns asynchronous data or error without rejecting', async () => {
    await expect(tryCatch(async () => 'value')).resolves.toEqual({ data: 'value', error: null });

    const result = await tryCatch(async (): Promise<string> => {
      throw new Error('failed');
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});
