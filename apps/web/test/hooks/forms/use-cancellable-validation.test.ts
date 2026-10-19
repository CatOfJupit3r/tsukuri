import { createCancellableValidation } from '#~/hooks/forms/use-cancellable-validation';

function createDeferred<TValue>() {
  let resolve!: (value: TValue) => unknown;
  const promise = new Promise<TValue>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('createCancellableValidation', () => {
  it('discards the result of a request that a newer request replaced', async () => {
    const pending = [createDeferred<string>(), createDeferred<string>()];
    let requestIndex = 0;
    const validation = createCancellableValidation(async () => pending[requestIndex++].promise);

    const staleResult = validation.validate('first');
    const latestResult = validation.validate('second');
    pending[0].resolve('stale');
    pending[1].resolve('latest');

    await expect(staleResult).resolves.toBeUndefined();
    await expect(latestResult).resolves.toBe('latest');
  });

  it('aborts the signal of the running request when it is cancelled', async () => {
    let capturedSignal: AbortSignal | undefined;
    const pending = createDeferred<string>();
    const validation = createCancellableValidation(async (_value: string, signal) => {
      capturedSignal = signal;
      return pending.promise;
    });

    const result = validation.validate('value');
    validation.cancel();
    pending.resolve('late');

    expect(capturedSignal?.aborted).toBe(true);
    await expect(result).resolves.toBeUndefined();
  });

  it('rethrows validator failures of the current request', async () => {
    const validation = createCancellableValidation(async () => {
      throw new Error('validator failed');
    });

    await expect(validation.validate('value')).rejects.toThrow('validator failed');
  });
});
