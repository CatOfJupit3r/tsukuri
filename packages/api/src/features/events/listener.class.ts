/**
 * A typed event listener that carries both the event name and payload type.
 * Each listener lives with the feature that emits it; other features import it to subscribe.
 */
export class Listener<TPayload = never> {
  /** Phantom property to preserve the payload type at compile time */
  declare private readonly _phantom: TPayload;

  public constructor(public readonly name: string) {}
}

/** Type helper to extract the payload type from a Listener */
export type ListenerPayload<T> = T extends Listener<infer P> ? P : never;
