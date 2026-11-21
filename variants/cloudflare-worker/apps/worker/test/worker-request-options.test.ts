import { Hono } from 'hono';

import { workerRequestOptions } from '#~/worker-request-options';

const REPORTED_ADDRESS = '203.0.113.7';

function createExecutionContext() {
  const kept: Promise<unknown>[] = [];
  return {
    kept,
    executionContext: { waitUntil: (promise: Promise<unknown>) => kept.push(promise), passThroughOnException: () => {}, props: {} },
  };
}

describe('workerRequestOptions', () => {
  const app = new Hono().get('/', async (context) => {
    const options = workerRequestOptions(context);
    options.waitUntil(Promise.resolve());
    return context.json({ clientIp: options.clientIp ?? null });
  });

  it('takes the client address from the header Cloudflare sets, whatever else the client forwards', async () => {
    const { executionContext } = createExecutionContext();
    const response = await app.fetch(
      new Request('http://localhost/', {
        headers: { 'cf-connecting-ip': REPORTED_ADDRESS, 'x-forwarded-for': '198.51.100.9' },
      }),
      {},
      executionContext,
    );

    expect(await response.json()).toEqual({ clientIp: REPORTED_ADDRESS });
  });

  it('has no client address when Cloudflare reported none', async () => {
    const { executionContext } = createExecutionContext();
    const response = await app.fetch(
      new Request('http://localhost/', { headers: { 'x-forwarded-for': '198.51.100.9' } }),
      {},
      executionContext,
    );

    expect(await response.json()).toEqual({ clientIp: null });
  });

  it('hands finishing work to the runtime through waitUntil', async () => {
    const { executionContext, kept } = createExecutionContext();
    await app.fetch(new Request('http://localhost/'), {}, executionContext);

    expect(kept).toHaveLength(1);
  });
});
