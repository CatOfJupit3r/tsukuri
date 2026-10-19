import { useState } from 'react';

interface iUseAdjustOnChangeOptions {
  /** Also runs `adjust` during the first render, for state that has to be derived before it is first used. */
  isRunOnMount?: boolean;
}

function areDependenciesEqual(previousDependencies: readonly unknown[], nextDependencies: readonly unknown[]) {
  return (
    previousDependencies.length === nextDependencies.length &&
    previousDependencies.every((dependency, index) => Object.is(dependency, nextDependencies[index]))
  );
}

/**
 * Runs `adjust` during render whenever one of the dependencies changed since the previous render, so state
 * derived from props is corrected in the same pass instead of through an effect and a second render.
 * By default it skips the first render, where the initial state is expected to already match.
 */
export function useAdjustOnChange(
  dependencies: readonly unknown[],
  adjust: () => unknown,
  { isRunOnMount = false }: iUseAdjustOnChangeOptions = {},
) {
  const [previousDependencies, setPreviousDependencies] = useState<readonly unknown[] | null>(
    isRunOnMount ? null : dependencies,
  );

  if (previousDependencies === null || !areDependenciesEqual(previousDependencies, dependencies)) {
    setPreviousDependencies(dependencies);
    adjust();
  }
}
