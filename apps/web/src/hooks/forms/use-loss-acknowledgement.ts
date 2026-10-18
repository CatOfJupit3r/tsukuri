import { useSyncExternalStore } from 'react';

import { useLazyValue } from '#~/hooks/react-utilities/use-lazy-value';

function createLossAcknowledgement() {
  let isAcknowledged = false;
  const listeners = new Set<() => unknown>();

  const update = (nextIsAcknowledged: boolean) => {
    if (nextIsAcknowledged === isAcknowledged) return;
    isAcknowledged = nextIsAcknowledged;
    for (const listener of listeners) listener();
  };

  return {
    acknowledge: () => update(true),
    reset: () => update(false),
    getSnapshot: () => isAcknowledged,
    subscribe: (listener: () => unknown) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Tracks whether the user already agreed to lose their unsaved work. The flag is flipped from router
 * blocker callbacks and effects, so it lives in a per-component store that React reads as an external value.
 */
export function useLossAcknowledgement() {
  const { acknowledge, reset, getSnapshot, subscribe } = useLazyValue(createLossAcknowledgement);
  const isAcknowledged = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { isAcknowledged, acknowledge, reset };
}
