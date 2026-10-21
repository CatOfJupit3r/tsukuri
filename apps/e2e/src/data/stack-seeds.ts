import type { iStack } from '#~/stack/claim-stack';

export interface iStackSeed {
  name: string;
  run: (stack: iStack) => Promise<unknown>;
}

/**
 * Data every spec can rely on, written by the Playwright global setup once the stack is up, before each run (for
 * example a user created through the API at `stack.webBaseUrl`). A reused stack keeps the data of earlier runs, so
 * each seed must be idempotent. Specs that create their own data need none.
 */
export const STACK_SEEDS: iStackSeed[] = [];
