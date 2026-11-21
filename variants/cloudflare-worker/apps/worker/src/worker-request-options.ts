import type { Context } from 'hono';

/** Work the API starts while answering (closing a request's connections, ...) finishes after the response. */
export function workerRequestOptions(context: Context) {
  return {
    waitUntil: (promise: Promise<unknown>) => context.executionCtx.waitUntil(promise),
    // Cloudflare sets this header itself and drops any value a client sends.
    clientIp: context.req.header('cf-connecting-ip'),
  };
}
