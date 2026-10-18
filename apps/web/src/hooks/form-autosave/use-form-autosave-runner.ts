import { useCallback } from 'react';

import { FORM_SAVE_STATES } from '#~/constants/ux-primitives';
import { UNCONFIRMED_SAVE_MESSAGE } from '#~/hooks/form-autosave/form-autosave.constants';
import type { iFormAutosaveMetadata, iUseFormAutosaveOptions } from '#~/hooks/form-autosave/form-autosave.types';
import { isOnline, isPromiseLike } from '#~/hooks/form-autosave/form-autosave.utils';
import type { FormAutosaveState } from '#~/hooks/form-autosave/use-form-autosave-state';

interface iUseFormAutosaveRunnerProps<TFormData, TChangedData> extends Pick<
  iUseFormAutosaveOptions<TFormData, TChangedData>,
  'onSave'
> {
  autosaveState: FormAutosaveState<TFormData, TChangedData>;
  clearLocalDraft: () => unknown;
  createIdempotencyKey: () => string;
  isConflictError: (error: unknown) => boolean;
  persistDraft: () => unknown;
}

export function useFormAutosaveRunner<TFormData, TChangedData>({
  autosaveState,
  clearLocalDraft,
  createIdempotencyKey,
  isConflictError,
  onSave,
  persistDraft,
}: iUseFormAutosaveRunnerProps<TFormData, TChangedData>) {
  const {
    failedSaveRef,
    isMountedRef,
    lastSavedRef,
    latestRequestSequenceRef,
    setError,
    setHasUnacknowledgedChanges,
    setSaveState,
  } = autosaveState;

  return useCallback(
    async (changedData: TChangedData, baselineData: Partial<TFormData>, metadata?: iFormAutosaveMetadata) => {
      const requestMetadata =
        metadata ??
        ({
          idempotencyKey: createIdempotencyKey(),
          requestSequence: latestRequestSequenceRef.current + 1,
        } satisfies iFormAutosaveMetadata);
      latestRequestSequenceRef.current = Math.max(latestRequestSequenceRef.current, requestMetadata.requestSequence);
      const { requestSequence } = requestMetadata;

      persistDraft();
      failedSaveRef.current = null;
      setHasUnacknowledgedChanges(true);
      setError(null);

      if (!isOnline()) {
        failedSaveRef.current = { baselineData, changedData, metadata: requestMetadata };
        setSaveState(FORM_SAVE_STATES.OFFLINE);
        return false;
      }

      setSaveState(FORM_SAVE_STATES.SAVING);
      try {
        const result = onSave(changedData, requestMetadata);
        if (!isPromiseLike(result)) throw new TypeError(UNCONFIRMED_SAVE_MESSAGE);
        await result;

        if (!isMountedRef.current || requestSequence !== latestRequestSequenceRef.current) return true;

        lastSavedRef.current = { ...lastSavedRef.current, ...baselineData };
        failedSaveRef.current = null;
        setSaveState(FORM_SAVE_STATES.SAVED);
        setHasUnacknowledgedChanges(false);
        clearLocalDraft();
        return true;
      } catch (saveError) {
        if (!isMountedRef.current || requestSequence !== latestRequestSequenceRef.current) return false;

        failedSaveRef.current = { baselineData, changedData, metadata: requestMetadata };
        setError(saveError);
        setSaveState(isConflictError(saveError) ? FORM_SAVE_STATES.CONFLICT : FORM_SAVE_STATES.FAILED);
        setHasUnacknowledgedChanges(true);
        return false;
      }
    },
    [
      clearLocalDraft,
      createIdempotencyKey,
      failedSaveRef,
      isConflictError,
      isMountedRef,
      lastSavedRef,
      latestRequestSequenceRef,
      onSave,
      persistDraft,
      setError,
      setHasUnacknowledgedChanges,
      setSaveState,
    ],
  );
}
