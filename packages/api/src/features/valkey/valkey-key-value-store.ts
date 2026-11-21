import { singleton } from 'tsyringe';

import type { iKeyValueStore } from '#~/features/cache/key-value-store';
import { assertExpiryAllowed, SMALLEST_EXPIRY_SECONDS } from '#~/features/cache/key-value-store';

import { ValkeyService } from './valkey.service';

const SCAN_BATCH_SIZE = 100;
const SCAN_START_CURSOR = '0';

/** Bound to `KEY_VALUE_STORE_TOKEN`, so caching and auth sessions use Valkey once it is connected. */
@singleton()
export class ValkeyKeyValueStore implements iKeyValueStore {
  public readonly isStronglyConsistent = true;

  public readonly minimumTtlSeconds = SMALLEST_EXPIRY_SECONDS;

  constructor(private readonly valkeyService: ValkeyService) {}

  public get isConnected() {
    return this.valkeyService.isConnected;
  }

  public async get(key: string) {
    return this.valkeyService.getClient().get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds === undefined) {
      await this.valkeyService.getClient().set(key, value);
      return;
    }
    assertExpiryAllowed(this, 'Valkey', key, ttlSeconds);
    await this.valkeyService.getClient().set(key, value, 'EX', ttlSeconds);
  }

  public async delete(key: string) {
    await this.valkeyService.getClient().del(key);
  }

  /** Uses SCAN instead of KEYS so large keyspaces never block the server. */
  public async deleteMatching(pattern: string) {
    const client = this.valkeyService.getClient();
    let cursor = SCAN_START_CURSOR;

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', SCAN_BATCH_SIZE);
      cursor = nextCursor;
      if (keys.length > 0) await client.del(...keys);
    } while (cursor !== SCAN_START_CURSOR);
  }
}
