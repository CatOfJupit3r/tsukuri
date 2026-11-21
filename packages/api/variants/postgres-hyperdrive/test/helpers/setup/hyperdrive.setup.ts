import { randomUUID } from 'node:crypto';
import { container } from 'tsyringe';
import { aroundEach } from 'vitest';

import { HYPERDRIVE_TOKEN } from '#~/features/database/hyperdrive.token';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { getHyperdriveSocketServer } from '../hyperdrive-socket-server';

container.registerInstance(HYPERDRIVE_TOKEN, (await getHyperdriveSocketServer()).hyperdrive);

// On a Worker the database exists only while a request is served, so every test (with its hooks) runs as one.
aroundEach(async (runTest) => {
  await container.resolve(RequestContextStorage).run({ requestId: randomUUID() }, runTest);
});
