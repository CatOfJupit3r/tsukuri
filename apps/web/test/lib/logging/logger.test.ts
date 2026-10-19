import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '#~/lib/logging/logger';
import { LOG_LEVELS, LOG_RUNTIMES } from '#~/lib/logging/logging-contracts';

function spyOnConsole() {
  return {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
  };
}

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes each level through the matching console method with a namespaced message', () => {
    const consoleSpies = spyOnConsole();
    const logger = createLogger('checkout', { minimumLevel: LOG_LEVELS.DEBUG });

    logger.debug('loaded cart');
    logger.info('started payment');
    logger.warn('slow response');
    logger.error('payment failed', new Error('declined'));
    logger.fatal('state corrupted', new Error('invariant'));

    expect(consoleSpies.debug).toHaveBeenCalledWith('[startername:checkout] loaded cart', expect.any(Object));
    expect(consoleSpies.info).toHaveBeenCalledWith('[startername:checkout] started payment', expect.any(Object));
    expect(consoleSpies.warn).toHaveBeenCalledWith('[startername:checkout] slow response', expect.any(Object));
    expect(consoleSpies.error).toHaveBeenCalledTimes(2);
    expect(consoleSpies.error).toHaveBeenLastCalledWith(
      '[startername:checkout] state corrupted',
      expect.objectContaining({ level: LOG_LEVELS.FATAL }),
    );
  });

  it('drops records below the minimum level', () => {
    const consoleSpies = spyOnConsole();
    const logger = createLogger('checkout', { minimumLevel: LOG_LEVELS.WARN });

    logger.debug('noise');
    logger.info('noise');
    logger.warn('kept');

    expect(consoleSpies.debug).not.toHaveBeenCalled();
    expect(consoleSpies.info).not.toHaveBeenCalled();
    expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
  });

  it('attaches sanitized context, the level, the runtime and the serialized error to the record', () => {
    const consoleSpies = spyOnConsole();
    const logger = createLogger('auth');

    logger.error('sign in failed', new Error('bad credentials'), { email: 'ada@example.com', password: 'hunter2' });

    const [, fields] = consoleSpies.error.mock.calls[0] ?? [];
    expect(fields).toMatchObject({
      email: 'ada@example.com',
      password: '[redacted]',
      level: LOG_LEVELS.ERROR,
      runtime: LOG_RUNTIMES.CLIENT,
      error: { name: 'Error', message: 'bad credentials' },
    });
  });

  it('keeps record metadata authoritative when the context uses the same keys', () => {
    const consoleSpies = spyOnConsole();
    const logger = createLogger('auth');

    logger.warn('odd context', { level: 'spoofed', runtime: 'spoofed' });

    const [, fields] = consoleSpies.warn.mock.calls[0] ?? [];
    expect(fields).toMatchObject({ level: LOG_LEVELS.WARN, runtime: LOG_RUNTIMES.CLIENT });
  });

  it('redacts credentials interpolated into the message', () => {
    const consoleSpies = spyOnConsole();
    const logger = createLogger('auth');

    logger.info('called with token=abc123');

    expect(consoleSpies.info.mock.calls[0]?.[0]).toBe('[startername:auth] called with token=[redacted]');
  });

  it('creates child loggers whose bindings accumulate without changing the parent', () => {
    const consoleSpies = spyOnConsole();
    const parent = createLogger('sync', { bindings: { feature: 'import' } });
    const child = parent.child({ batchId: 'batch-7' });

    child.info('started', { attempt: 1 });
    parent.info('idle');

    expect(consoleSpies.info.mock.calls[0]?.[1]).toMatchObject({ feature: 'import', batchId: 'batch-7', attempt: 1 });
    expect(consoleSpies.info.mock.calls[1]?.[1]).not.toHaveProperty('batchId');
  });

  it('lets a child inherit the minimum level of its parent', () => {
    const consoleSpies = spyOnConsole();
    const child = createLogger('sync', { minimumLevel: LOG_LEVELS.ERROR }).child({ batchId: 'batch-7' });

    child.warn('ignored');

    expect(consoleSpies.warn).not.toHaveBeenCalled();
  });
});
