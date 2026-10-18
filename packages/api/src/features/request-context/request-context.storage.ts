import { AsyncLocalStorage } from 'node:async_hooks';
import { singleton } from 'tsyringe';

export interface iRequestContext {
  /** Unique request identifier for tracing. */
  requestId: string;
  /** The authenticated user, once a module has resolved the session. */
  userId?: string;
}

/** Request-scoped data (request id, user id) that loggers read without it being passed around. */
@singleton()
export class RequestContextStorage {
  private readonly storage = new AsyncLocalStorage<iRequestContext>();

  public run<T>(context: iRequestContext, callback: () => T) {
    return this.storage.run(context, callback);
  }

  public current() {
    return this.storage.getStore();
  }

  public assignUserId(userId: string) {
    const context = this.storage.getStore();
    if (context) context.userId = userId;
  }
}
