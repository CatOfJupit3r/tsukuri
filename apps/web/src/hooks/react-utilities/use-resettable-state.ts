import { useState } from 'react';

import { useAdjustOnChange } from '#~/hooks/react-utilities/use-adjust-on-change';

/**
 * State that starts from `initialize()` and starts over from it whenever one of the dependencies changes.
 */
export function useResettableState<TValue>(initialize: () => TValue, dependencies: readonly unknown[]) {
  const [value, setValue] = useState(initialize);

  useAdjustOnChange(dependencies, () => setValue(initialize()));

  return [value, setValue] as const;
}
