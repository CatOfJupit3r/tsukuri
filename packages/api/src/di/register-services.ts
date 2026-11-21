import 'reflect-metadata';
import { container } from 'tsyringe';

import { env } from '#~/constants/env';
import { KEY_VALUE_STORE_TOKEN, NoopKeyValueStore } from '#~/features/cache/key-value-store';
import { REQUEST_ORIGIN_POLICY_TOKEN } from '#~/features/http/request-origin.guard';
import {
  NoServerRenderAuthenticator,
  SERVER_RENDER_AUTHENTICATOR_TOKEN,
} from '#~/features/http/server-render-authenticator';
import { registerGeneratedServices } from '#~/generated/di-registrations';

/** Core defaults first, so module bindings registered afterwards take precedence. */
export async function registerServices() {
  container.registerSingleton(KEY_VALUE_STORE_TOKEN, NoopKeyValueStore);
  container.registerSingleton(SERVER_RENDER_AUTHENTICATOR_TOKEN, NoServerRenderAuthenticator);
  container.registerInstance(REQUEST_ORIGIN_POLICY_TOKEN, {
    mode: env.REQUEST_ORIGIN_MODE,
    trustedOrigins: env.TRUSTED_ORIGINS,
  });
  await registerGeneratedServices(container);
}
