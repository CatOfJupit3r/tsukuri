// sort-imports-ignore
import 'reflect-metadata';
import type { ExecutionContext } from 'hono';
import { container } from 'tsyringe';

import { startApi } from '@startername/api/start-api';

import { createApp } from '#~/app';
import type { iWorkerBindings } from '#~/generated/worker-bindings';
import { registerWorkerBindings } from '#~/generated/worker-bindings';
import { workerRequestOptions } from '#~/worker-request-options';

/**
 * Bindings only reach `fetch`, and a Worker may not do I/O outside a request, so each isolate starts the
 * API on its first request.
 */
async function startWorkerApp(bindings: iWorkerBindings) {
  registerWorkerBindings(container, bindings);
  return createApp(await startApi(), { requestOptions: workerRequestOptions });
}

let startedApp: ReturnType<typeof startWorkerApp> | null = null;

/** A failed start is not kept, so the next request tries again instead of the isolate failing for good. */
async function getStartedApp(bindings: iWorkerBindings) {
  startedApp ??= startWorkerApp(bindings).catch((error: unknown) => {
    startedApp = null;
    throw error;
  });
  return startedApp;
}

export default {
  /** Hono's view of the execution context, which the runtime's and wrangler's local one both satisfy. */
  async fetch(request: Request, bindings: iWorkerBindings, executionContext: ExecutionContext) {
    const app = await getStartedApp(bindings);
    return app.fetch(request, bindings, executionContext);
  },
};
