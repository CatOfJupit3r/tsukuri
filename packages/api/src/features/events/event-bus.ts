import { EventEmitter, on } from 'node:events';
import { singleton } from 'tsyringe';

import type { PayloadToken } from '@startername/common/helpers/payload-token.helper';

type iHandler<T> = (payload: T) => unknown;

@singleton()
export class EventBus {
  private readonly emitter = new EventEmitter();

  public on<T>(token: PayloadToken<T>, handler: iHandler<T>) {
    this.emitter.on(token.name, handler);
    return this;
  }

  public off<T>(token: PayloadToken<T>, handler: iHandler<T>) {
    this.emitter.off(token.name, handler);
    return this;
  }

  public once<T>(token: PayloadToken<T>, handler: iHandler<T>) {
    this.emitter.once(token.name, handler);
    return this;
  }

  /** Calls every handler synchronously and returns whether any was registered; async handlers are not awaited. */
  public emit<T>(token: PayloadToken<T>, payload: NoInfer<T>) {
    return this.emitter.emit(token.name, payload);
  }

  /**
   * Calls every handler in parallel and waits for all of them. Best-effort, like `emit`: a failing
   * handler neither stops the others nor rejects.
   */
  public async emitAsync<T>(token: PayloadToken<T>, payload: NoInfer<T>) {
    const handlers = this.emitter.listeners(token.name);
    if (handlers.length === 0) return false;

    this.consumeOnceHandlers(token);
    await Promise.allSettled(handlers.map(async (handler) => handler(payload)));
    return true;
  }

  /**
   * Every payload emitted for the token from this call until the signal aborts, in order. The subscription
   * starts now, not at the first read, and ends cleanly when the signal aborts.
   */
  public stream<T>(token: PayloadToken<T>, signal?: AbortSignal): AsyncGenerator<T> {
    return this.unwrapPayloads<T>(on(this.emitter, token.name, { signal }), signal);
  }

  /**
   * Unregisters every `once` handler before they run, as `emit` does. `rawListeners` returns the wrapper Node
   * puts around a `once` handler and `listeners` the handler itself, at the same positions, so they differ
   * exactly for `once` registrations.
   */
  private consumeOnceHandlers<T>(token: PayloadToken<T>) {
    const rawHandlers = this.emitter.rawListeners(token.name);
    const handlers = this.emitter.listeners(token.name);
    rawHandlers.forEach((rawHandler, index) => {
      const handler = handlers[index];
      if (handler && handler !== rawHandler) this.emitter.removeListener(token.name, handler);
    });
  }

  private async *unwrapPayloads<T>(emissions: ReturnType<typeof on>, signal?: AbortSignal): AsyncGenerator<T> {
    try {
      for await (const [payload] of emissions) yield payload;
    } catch (error) {
      if (!signal?.aborted) throw error;
    }
  }
}
