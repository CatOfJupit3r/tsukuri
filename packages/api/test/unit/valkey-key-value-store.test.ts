import Redis from 'ioredis';
import { container } from 'tsyringe';

import { LoggerFactory } from '#~/features/logger/logger.factory';
import { ValkeyKeyValueStore } from '#~/features/valkey/valkey-key-value-store';
import { ValkeyService } from '#~/features/valkey/valkey.service';

/** A connected-looking service around a client that never opens a socket. */
class ConnectedValkeyService extends ValkeyService {
  constructor(private readonly redisClient: Redis) {
    super(container.resolve(LoggerFactory));
  }

  public override get isConnected() {
    return true;
  }

  public override getClient() {
    return this.redisClient;
  }
}

function createStore() {
  const client = new Redis({ lazyConnect: true });
  const set = vi.spyOn(client, 'set').mockImplementation(async () => 'OK');
  return { store: new ValkeyKeyValueStore(new ConnectedValkeyService(client)), client: { set } };
}

describe('ValkeyKeyValueStore.set', () => {
  it('stores a key without expiry when no ttl is given', async () => {
    const { store, client } = createStore();

    await store.set('key', 'value');

    expect(client.set).toHaveBeenCalledExactlyOnceWith('key', 'value');
  });

  it('refuses a zero ttl instead of silently keeping the key forever', async () => {
    const { store, client } = createStore();

    await expect(store.set('key', 'value', 0)).rejects.toThrow('at least 1 second');
    expect(client.set).not.toHaveBeenCalled();
  });

  it('stores a key with the expiry it was given', async () => {
    const { store, client } = createStore();

    await store.set('key', 'value', 30);

    expect(client.set).toHaveBeenCalledExactlyOnceWith('key', 'value', 'EX', 30);
  });
});
