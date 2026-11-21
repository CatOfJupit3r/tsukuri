import type { Hyperdrive } from '@cloudflare/workers-types';
import { Pool } from 'pg';
import { container } from 'tsyringe';

import { HyperdrivePoolFactory } from '#~/features/database/hyperdrive-pool.factory';
import { Logger } from '#~/features/logger/logger';
import { LoggerFactory } from '#~/features/logger/logger.factory';

/** A binding whose connection string points at a port nothing listens on. */
class UnreachableHyperdrive implements Hyperdrive {
  public readonly connectionString = 'postgresql://user:password@127.0.0.1:1/database';

  public readonly host = '127.0.0.1';

  public readonly ip = '127.0.0.1';

  public readonly port = 1;

  public readonly user = 'user';

  public readonly password = 'password';

  public readonly database = 'database';

  public connect(): never {
    throw new Error('The pool connects through the connection string, not the socket.');
  }
}

describe('HyperdrivePoolFactory', () => {
  it('logs an idle connection failure instead of letting it crash the isolate', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const onSpy = vi.spyOn(Pool.prototype, 'on');
    const factory = new HyperdrivePoolFactory(new UnreachableHyperdrive(), container.resolve(LoggerFactory));
    const { close } = factory.open();

    const failure = new Error('connection reset');
    const idleErrorCall = onSpy.mock.calls.find(([event]) => event === 'error');
    onSpy.mockRestore();
    expect(idleErrorCall).toBeDefined();
    Reflect.apply(idleErrorCall?.[1] ?? vi.fn(), undefined, [failure]);

    expect(errorSpy).toHaveBeenCalledWith('Postgres connection failed while idle', { error: failure });
    await close();
    errorSpy.mockRestore();
  });
});
