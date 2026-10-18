import { useCallback } from 'react';

import type { iFormAutosaveMetadata, iFormAutosaveSaveCandidate } from '#~/hooks/form-autosave/form-autosave.types';
import type { useFormAutosaveRunner } from '#~/hooks/form-autosave/use-form-autosave-runner';
import type { FormAutosaveState } from '#~/hooks/form-autosave/use-form-autosave-state';

interface iUseFormAutosaveSchedulerProps<TFormData, TChangedData> {
  autosaveState: FormAutosaveState<TFormData, TChangedData>;
  createIdempotencyKey: () => string;
  debounce: number;
  getSaveCandidate: () => iFormAutosaveSaveCandidate<TFormData, TChangedData> | null;
  persistDraft: () => unknown;
  runSave: ReturnType<typeof useFormAutosaveRunner<TFormData, TChangedData>>;
}

export function useFormAutosaveScheduler<TFormData, TChangedData>({
  autosaveState,
  createIdempotencyKey,
  debounce,
  getSaveCandidate,
  persistDraft,
  runSave,
}: iUseFormAutosaveSchedulerProps<TFormData, TChangedData>) {
  const { latestRequestSequenceRef, pendingDebounceResolveRef, setHasUnacknowledgedChanges, timeoutRef } =
    autosaveState;

  return useCallback(async () => {
    const candidate = getSaveCandidate();
    if (!candidate) return false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      pendingDebounceResolveRef.current?.(false);
    }
    const metadata = {
      idempotencyKey: createIdempotencyKey(),
      requestSequence: latestRequestSequenceRef.current + 1,
    } satisfies iFormAutosaveMetadata;
    latestRequestSequenceRef.current = metadata.requestSequence;
    if (debounce <= 0) return runSave(candidate.changedData, candidate.baselineData, metadata);

    persistDraft();
    setHasUnacknowledgedChanges(true);
    return new Promise<boolean>((resolve) => {
      pendingDebounceResolveRef.current = resolve;
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        pendingDebounceResolveRef.current = null;
        runSave(candidate.changedData, candidate.baselineData, metadata).then(resolve, () => resolve(false));
      }, debounce);
    });
  }, [
    createIdempotencyKey,
    debounce,
    getSaveCandidate,
    latestRequestSequenceRef,
    pendingDebounceResolveRef,
    persistDraft,
    runSave,
    setHasUnacknowledgedChanges,
    timeoutRef,
  ]);
}
