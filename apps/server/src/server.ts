// sort-imports-ignore
import 'reflect-metadata';
import './load-env';
import { serve } from '@hono/node-server';

import { startApi } from '@startername/api/start-api';

import { createApp } from './app';
import { env } from './constants/env';

const app = createApp(await startApi());

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
