import { AsyncLocalStorage } from 'node:async_hooks';
import { singleton } from 'tsyringe';

/** Lets the runtime keep a promise alive after the response is sent, as Workers' `ExecutionContext.waitUntil`. */
export type iWaitUntil = (promise: Promise<unknown>) => void;

type iFinishTask = () => Promise<unknown>;

export interface iRequestContext {
  /** Unique request identifier for tracing. */
  requestId: string;
  /** The authenticated user, once a module has resolved the session. */
  userId?: string;
  /** Set by backends whose runtime can finish work after responding. */
  waitUntil?: iWaitUntil;
  /** Work to run once the response is ready, such as closing request-bound connections. */
  finishTasks: iFinishTask[];
}

/** Request-scoped data (request id, user id, cleanup) that services read without it being passed around. */
@singleton()
export class RequestContextStorage {
  private readonly storage = new AsyncLocalStorage<iRequestContext>();

  /** Runs `callback` in a new request context, then its finish tasks (through `waitUntil` when the runtime has it). */
  public async run<T>(context: Omit<iRequestContext, 'finishTasks'>, callback: () => Promise<T>) {
    const requestContext: iRequestContext = { ...context, finishTasks: [] };
    try {
      return await this.storage.run(requestContext, callback);
    } finally {
      const finished = Promise.allSettled(requestContext.finishTasks.map(async (task) => task()));
      if (requestContext.waitUntil) requestContext.waitUntil(finished);
      else await finished;
    }
  }

  public current() {
    return this.storage.getStore();
  }

  public assignUserId(userId: string) {
    const context = this.storage.getStore();
    if (context) context.userId = userId;
  }
}
