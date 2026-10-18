import { useReducer } from 'react';

function keepValue<T>(value: T) {
  return value;
}

/**
 * Creates a value on the first render and keeps the same instance for the component's lifetime.
 * The reducer initializer runs once and exposes no setter, unlike a `useState` pair.
 *
 * @param initialize Factory that returns the value
 * @returns The value created on the first render
 */
function useLazyValue<T>(initialize: () => T): T {
  const [value] = useReducer(keepValue<T>, null, initialize);

  return value;
}

export { useLazyValue };
