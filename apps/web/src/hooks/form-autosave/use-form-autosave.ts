import { useCallback } from 'react';

import type { iUseFormAutosaveOptions } from '#~/hooks/form-autosave/form-autosave.types';
import { createDefaultIdempotencyKey } from '#~/hooks/form-autosave/form-autosave.utils';
import { useFormAutosaveCandidate } from '#~/hooks/form-autosave/use-form-autosave-candidate';
import { useFormAutosaveLocalDraft } from '#~/hooks/form-autosave/use-form-autosave-local-draft';
import { useFormAutosaveRunner } from '#~/hooks/form-autosave/use-form-autosave-runner';
import { useFormAutosaveScheduler } from '#~/hooks/form-autosave/use-form-autosave-scheduler';
import { useFormAutosaveState } from '#~/hooks/form-autosave/use-form-autosave-state';

export function useFormAutosave<TFormData, TChangedData = Partial<TFormData>>({
  form,
  onSave,
  selectFields,
  transformData,
  onlyChanged = true,
  debounce = 0,
  localDraft,
  isConflictError = () => false,
  createIdempotencyKey = createDefaultIdempotencyKey,
}: iUseFormAutosaveOptions<TFormData, TChangedData>) {
  const autosaveState = useFormAutosaveState<TFormData, TChangedData>();
  const { failedSaveRef, lastSavedRef, setError, setHasUnacknowledgedChanges, setSaveState } = autosaveState;
  const localDraftState = useFormAutosaveLocalDraft({ form, localDraft, setHasUnacknowledgedChanges });
  const { getSaveCandidate, getSelectedData } = useFormAutosaveCandidate({
    form,
    isOnlyChanged: onlyChanged,
    lastSavedRef,
    selectFields,
    transformData,
  });
  const runSave = useFormAutosaveRunner({
    autosaveState,
    clearLocalDraft: localDraftState.clearPersistedDraft,
    createIdempotencyKey,
    isConflictError,
    onSave,
    persistDraft: localDraftState.persistDraft,
  });
  const handleAutoSave = useFormAutosaveScheduler({
    autosaveState,
    createIdempotencyKey,
    debounce,
    getSaveCandidate,
    persistDraft: localDraftState.persistDraft,
    runSave,
  });

  const retry = useCallback(async () => {
    const failedSave = failedSaveRef.current;
    if (!failedSave) return false;
    return runSave(failedSave.changedData, failedSave.baselineData, failedSave.metadata);
  }, [failedSaveRef, runSave]);

  const resetTracking = useCallback(
    (values?: Partial<TFormData>) => {
      const baseData = values ?? form.state.values;
      lastSavedRef.current = getSelectedData(baseData as TFormData) as Partial<TFormData>;
      failedSaveRef.current = null;
      setError(null);
      setHasUnacknowledgedChanges(false);
      setSaveState(null);
    },
    [failedSaveRef, form, getSelectedData, lastSavedRef, setError, setHasUnacknowledgedChanges, setSaveState],
  );

  return {
    handleAutoSave,
    resetTracking,
    retry,
    saveState: autosaveState.saveState,
    error: autosaveState.error,
    hasUnacknowledgedChanges: autosaveState.hasUnacknowledgedChanges,
    recoveredDraft: localDraftState.recoveredDraft,
    restoreLocalDraft: localDraftState.restoreLocalDraft,
    discardLocalDraft: localDraftState.discardLocalDraft,
    draftRecovery: localDraftState.draftRecovery,
  };
}
