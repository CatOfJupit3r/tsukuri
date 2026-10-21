import { EventEmitter, on } from 'node:events';
import { singleton } from 'tsyringe';

import type { PayloadToken } from '@startername/common/helpers/payload-token.helper';

type iHandler<T> = (payload: T) => unknown;

/** What `EventEmitter.rawListeners()` returns for a handler registered with `once`. */
interface iOnceWrapper<T> {
  listener: iHandler<T>;
}

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
    const rawHandlers = this.emitter.rawListeners(token.name) as (iHandler<T> | iOnceWrapper<T>)[];
    if (rawHandlers.length === 0) return false;

    const handlers = rawHandlers.map((rawHandler) => this.consumeOnce(token, rawHandler));
    await Promise.allSettled(handlers.map(async (handler) => handler(payload)));
    return true;
  }

  /**
   * Every payload emitted for the token from this call until the signal aborts, in order. The subscription
   * starts now, not at the first read, and ends cleanly when the signal aborts.
   */
  public stream<T>(token: PayloadToken<T>, signal?: AbortSignal): AsyncGenerator<T> {
    return this.unwrapPayloads<T>(on(this.emitter, token.name, { signal }) as AsyncIterable<[T]>, signal);
  }

  /** A `once` handler is unregistered before it runs, as `emit` does. */
  private consumeOnce<T>(token: PayloadToken<T>, rawHandler: iHandler<T> | iOnceWrapper<T>) {
    // eslint-disable-next-line tsukuri/no-in-narrowing, enumwaii/no-union-property-in -- EventEmitter wraps `once` handlers in an untyped function that carries the original as `listener`
    if (!('listener' in rawHandler)) return rawHandler;
    this.emitter.removeListener(token.name, rawHandler.listener);
    return rawHandler.listener;
  }

  private async *unwrapPayloads<T>(emissions: AsyncIterable<[T]>, signal?: AbortSignal): AsyncGenerator<T> {
    try {
      for await (const [payload] of emissions) yield payload;
    } catch (error) {
      if (!signal?.aborted) throw error;
    }
  }
}
