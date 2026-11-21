import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { nodeRequestOptions } from '#~/node-request-options';

const LOOPBACK_ADDRESS = '127.0.0.1';
const FORGED_ADDRESS = '198.51.100.9';

describe('Node adapter client address', () => {
  it('is the socket address of the connection, not a forwarded header', async () => {
    const app = new Hono();
    app.get('/', (context) => context.text(nodeRequestOptions(context).clientIp ?? ''));
    const listening = Promise.withResolvers<{ port: number }>();
    const server = serve({ fetch: app.fetch, port: 0, hostname: LOOPBACK_ADDRESS }, listening.resolve);

    try {
      const { port } = await listening.promise;
      const response = await fetch(`http://${LOOPBACK_ADDRESS}:${port}/`, {
        headers: { 'X-Forwarded-For': FORGED_ADDRESS },
      });

      expect(await response.text()).toBe(LOOPBACK_ADDRESS);
    } finally {
      server.close();
    }
  });
});
