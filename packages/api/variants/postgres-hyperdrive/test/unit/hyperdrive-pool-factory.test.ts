import type { Hyperdrive } from '@cloudflare/workers-types';
import { Pool } from 'pg';

import { HyperdrivePoolFactory } from '#~/features/database/hyperdrive-pool.factory';
import type { LoggerFactory } from '#~/features/logger/logger.factory';

describe('HyperdrivePoolFactory', () => {
  it('logs an idle connection failure instead of letting it crash the isolate', async () => {
    const logger = { error: vi.fn() };
    // The factory only calls `create` on the logger factory.
    const loggerFactory = { create: () => logger } as unknown as LoggerFactory;
    const onSpy = vi.spyOn(Pool.prototype, 'on');
    const factory = new HyperdrivePoolFactory(
      { connectionString: 'postgresql://user:password@127.0.0.1:1/database' } as Hyperdrive,
      loggerFactory,
    );
    const { close } = factory.open();

    const failure = new Error('connection reset');
    const idleErrorCall = onSpy.mock.calls.find(([event]) => event === 'error');
    onSpy.mockRestore();
    expect(idleErrorCall).toBeDefined();
    Reflect.apply(idleErrorCall?.[1] ?? vi.fn(), undefined, [failure]);

    expect(logger.error).toHaveBeenCalledWith('Postgres connection failed while idle', { error: failure });
    await close();
  });
});
