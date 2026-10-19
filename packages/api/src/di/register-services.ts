import 'reflect-metadata';
import { container } from 'tsyringe';

import { KEY_VALUE_STORE_TOKEN, NoopKeyValueStore } from '#~/features/cache/key-value-store';
import { registerGeneratedServices } from '#~/generated/di-registrations';

/** Core defaults first, so module bindings registered afterwards take precedence. */
export async function registerServices() {
  container.registerSingleton(KEY_VALUE_STORE_TOKEN, NoopKeyValueStore);
  await registerGeneratedServices(container);
}
