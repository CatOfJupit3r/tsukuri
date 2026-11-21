import { ValkeyKeyValueStore } from '#~/features/valkey/valkey-key-value-store';
import type { ValkeyService } from '#~/features/valkey/valkey.service';

function createStore() {
  const client = { set: vi.fn(async () => 'OK') };
  const valkeyService = { isConnected: true, getClient: () => client };
  // The store only reads `isConnected` and `getClient` from the service.
  const store = new ValkeyKeyValueStore(valkeyService as unknown as ValkeyService);
  return { store, client };
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
