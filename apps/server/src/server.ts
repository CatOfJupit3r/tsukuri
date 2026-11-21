// sort-imports-ignore
import 'reflect-metadata';
import './load-env';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';

import { startApi } from '@startername/api/start-api';

import { createApp } from './app';
import { env } from './constants/env';

/** Behind no proxy the socket address is the only client address a request cannot forge. */
const app = createApp(await startApi(), {
  requestOptions: (context) => ({ clientIp: getConnInfo(context).remote.address }),
});

const server = serve({ fetch: app.fetch, port: env.SERVER_PORT, hostname: env.SERVER_HOST }, (info) => {
  console.log(`Server listening on http://${info.address}:${info.port}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}, performing shutdown tasks...`);
  server.close();
  console.log('Server closed.');
  // eslint-disable-next-line n/no-process-exit
  process.exit(0);
};

const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

SIGNALS.forEach((signal) => process.on(signal, shutdown));
