import { container } from 'tsyringe';

import { registerServices } from '#~/di/register-services';
import { ApiRequestHandler } from '#~/features/http/api-request-handler';
import { StartupTaskRunner } from '#~/features/startup/startup-task.runner';

async function bootstrap() {
  await registerServices();
  await container.resolve(StartupTaskRunner).run();
  return container.resolve(ApiRequestHandler);
}

let startedApi: ReturnType<typeof bootstrap> | null = null;

/**
 * Registers the installed modules' services and runs their startup tasks once, then returns the
 * handler every backend adapter forwards its fetch requests to.
 */
export async function startApi() {
  startedApi ??= bootstrap();
  return startedApi;
}
