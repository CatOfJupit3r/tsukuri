import { singleton } from 'tsyringe';

import type { iKeyValueStore } from '#~/features/cache/key-value-store';

import { ValkeyService } from './valkey.service';

const SCAN_BATCH_SIZE = 100;
const SCAN_START_CURSOR = '0';

/** Bound to `KEY_VALUE_STORE_TOKEN`, so caching and auth sessions use Valkey once it is connected. */
@singleton()
export class ValkeyKeyValueStore implements iKeyValueStore {
  constructor(private readonly valkeyService: ValkeyService) {}

  public get isConnected() {
    return this.valkeyService.isConnected;
  }

  public async get(key: string) {
    return this.valkeyService.getClient().get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) await this.valkeyService.getClient().set(key, value, 'EX', ttlSeconds);
    else await this.valkeyService.getClient().set(key, value);
  }

  public async delete(key: string) {
    await this.valkeyService.getClient().del(key);
  }

  /** Uses SCAN instead of KEYS so large keyspaces never block the server. */
  public async deleteMatching(pattern: string) {
    const client = this.valkeyService.getClient();
    let cursor = SCAN_START_CURSOR;
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', SCAN_BATCH_SIZE);
      cursor = nextCursor;
      if (keys.length > 0) deletedCount += await client.del(...keys);
    } while (cursor !== SCAN_START_CURSOR);

    return deletedCount;
  }
}
