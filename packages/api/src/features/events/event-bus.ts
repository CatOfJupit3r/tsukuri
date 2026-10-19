import { EventEmitter, on } from 'node:events';
import { singleton } from 'tsyringe';

import type { Listener } from './listener.class';

type iHandler<T> = (payload: T) => unknown;

/** What `EventEmitter.rawListeners()` returns for a handler registered with `once`. */
interface iOnceWrapper<T> {
  listener: iHandler<T>;
}

@singleton()
export class EventBus {
  private readonly emitter = new EventEmitter();

  public on<T>(listener: Listener<T>, handler: iHandler<T>) {
    this.emitter.on(listener.name, handler);
    return this;
  }

  public off<T>(listener: Listener<T>, handler: iHandler<T>) {
    this.emitter.off(listener.name, handler);
    return this;
  }

  public once<T>(listener: Listener<T>, handler: iHandler<T>) {
    this.emitter.once(listener.name, handler);
    return this;
  }

  /** Calls every handler synchronously and returns whether any was registered; async handlers are not awaited. */
  public emit<T>(listener: Listener<T>, payload: T) {
    return this.emitter.emit(listener.name, payload);
  }

  /**
   * Calls every handler in parallel and waits for all of them. Best-effort, like `emit`: a failing
   * handler neither stops the others nor rejects.
   */
  public async emitAsync<T>(listener: Listener<T>, payload: T) {
    const rawHandlers = this.emitter.rawListeners(listener.name) as (iHandler<T> | iOnceWrapper<T>)[];
    if (rawHandlers.length === 0) return false;

    const handlers = rawHandlers.map((rawHandler) => this.consumeOnce(listener, rawHandler));
    await Promise.allSettled(handlers.map(async (handler) => handler(payload)));
    return true;
  }

  /**
   * Every payload emitted for the listener from this call until the signal aborts, in order. The subscription
   * starts now, not at the first read, and ends cleanly when the signal aborts.
   */
  public stream<T>(listener: Listener<T>, signal?: AbortSignal): AsyncGenerator<T> {
    return this.unwrapPayloads<T>(on(this.emitter, listener.name, { signal }) as AsyncIterable<[T]>, signal);
  }

  /** A `once` handler is unregistered before it runs, as `emit` does. */
  private consumeOnce<T>(listener: Listener<T>, rawHandler: iHandler<T> | iOnceWrapper<T>) {
    if (!('listener' in rawHandler)) return rawHandler;
    this.emitter.removeListener(listener.name, rawHandler.listener);
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
