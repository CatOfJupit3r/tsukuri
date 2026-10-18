import { shouldRetryMutation, shouldRetryQuery } from '#~/lib/query-client';

class StatusError extends Error {
  public constructor(public readonly status: number) {
    super(`status ${status}`);
  }
}

describe('query client retry policy', () => {
  it('never retries a request the server rejected as invalid', () => {
    expect(shouldRetryQuery(0, new StatusError(404))).toBe(false);
    expect(shouldRetryMutation(0, new StatusError(422))).toBe(false);
  });

  it('retries server and network failures a bounded number of times', () => {
    expect(shouldRetryQuery(0, new StatusError(503))).toBe(true);
    expect(shouldRetryQuery(2, new StatusError(503))).toBe(false);
    expect(shouldRetryMutation(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldRetryMutation(1, new TypeError('Failed to fetch'))).toBe(false);
  });
});
