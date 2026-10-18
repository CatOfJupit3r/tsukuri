// sort-imports-ignore
import 'reflect-metadata';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { container } from 'tsyringe';

import { startApi } from '@startername/api/start-api';

import { createApp } from './app';
import type { iWorkerBindings } from './generated/worker-bindings';
import { registerWorkerBindings } from './generated/worker-bindings';

/** Bindings only reach `fetch`, so each isolate starts the API on its first request. */
async function startWorkerApp(bindings: iWorkerBindings) {
  registerWorkerBindings(container, bindings);
  return createApp(await startApi());
}

let startedApp: ReturnType<typeof startWorkerApp> | null = null;

export default {
  async fetch(request: Request, bindings: iWorkerBindings, executionContext: ExecutionContext) {
    startedApp ??= startWorkerApp(bindings);
    const app = await startedApp;
    return app.fetch(request, bindings, executionContext);
  },
};
