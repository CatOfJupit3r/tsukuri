import { useEffect } from 'react';

import { ASYNC_VALIDATION_CANCELLATION_REASONS } from '#~/constants/ux-primitives';
import type { AsyncValidationCancellationReason } from '#~/constants/ux-primitives';
import { useAsRef } from '#~/hooks/react-utilities/use-as-ref';
import { useLazyValue } from '#~/hooks/react-utilities/use-lazy-value';

export interface iCancellableValidation<TValue, TResult> {
  cancel: (reason?: AsyncValidationCancellationReason) => unknown;
  validate: (value: TValue) => Promise<TResult | undefined>;
}

export function createCancellableValidation<TValue, TResult>(
  validator: (value: TValue, signal: AbortSignal) => Promise<TResult>,
): iCancellableValidation<TValue, TResult> {
  let controller: AbortController | undefined;

  const cancel = (reason: AsyncValidationCancellationReason = ASYNC_VALIDATION_CANCELLATION_REASONS.FIELD_CHANGED) => {
    controller?.abort(reason);
    controller = undefined;
  };

  return {
    cancel,
    validate: async (value) => {
      cancel(ASYNC_VALIDATION_CANCELLATION_REASONS.STALE_REQUEST);
      const currentController = new AbortController();
      controller = currentController;
      try {
        const result = await validator(value, currentController.signal);
        return controller === currentController && !currentController.signal.aborted ? result : undefined;
      } catch (error) {
        if (currentController.signal.aborted) return undefined;
        throw error;
      }
    },
  };
}

export function useCancellableValidation<TValue, TResult>(
  validator: (value: TValue, signal: AbortSignal) => Promise<TResult>,
): iCancellableValidation<TValue, TResult> {
  const validatorRef = useAsRef(validator);
  const validation = useLazyValue(() =>
    createCancellableValidation(async (value: TValue, signal: AbortSignal) => validatorRef.current(value, signal)),
  );

  useEffect(
    () => () => {
      validation.cancel(ASYNC_VALIDATION_CANCELLATION_REASONS.UNMOUNTED);
    },
    [validation],
  );

  return validation;
}
