import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { iFormAutosaveApi, iUseFormAutosaveOptions } from '#~/hooks/form-autosave/form-autosave.types';
import { useAdjustOnChange } from '#~/hooks/react-utilities/use-adjust-on-change';
import { clearFormLocalDraft, readFormLocalDraft, writeFormLocalDraft } from '#~/utils/forms/form-local-draft';
import type { iFormLocalDraftRecord } from '#~/utils/forms/form-local-draft';

interface iUseFormAutosaveLocalDraftProps<TFormData> extends Pick<iUseFormAutosaveOptions<TFormData>, 'localDraft'> {
  form: iFormAutosaveApi<TFormData>;
  setHasUnacknowledgedChanges: Dispatch<SetStateAction<boolean>>;
}

export function useFormAutosaveLocalDraft<TFormData>({
  form,
  localDraft,
  setHasUnacknowledgedChanges,
}: iUseFormAutosaveLocalDraftProps<TFormData>) {
  const localDraftKey = localDraft?.key;
  const localDraftMaxAgeMs = localDraft?.maxAgeMs;
  const localDraftOwnerId = localDraft?.ownerId;
  const [recoveredDraft, setRecoveredDraft] = useState<iFormLocalDraftRecord<Partial<TFormData>> | null>(() =>
    localDraft ? readFormLocalDraft<Partial<TFormData>>(localDraft.key, localDraft.maxAgeMs, localDraft.ownerId) : null,
  );

  useAdjustOnChange([localDraftKey, localDraftMaxAgeMs, localDraftOwnerId], () => {
    setRecoveredDraft(
      localDraftKey
        ? readFormLocalDraft<Partial<TFormData>>(localDraftKey, localDraftMaxAgeMs, localDraftOwnerId)
        : null,
    );
  });

  const persistDraft = useCallback(() => {
    if (!localDraft) return;
    const projectedValues: Partial<TFormData> = {};
    for (const field of localDraft.fields) projectedValues[field] = structuredClone(form.state.values[field]);
    writeFormLocalDraft(localDraft.key, projectedValues, localDraft.ownerId);
  }, [form, localDraft]);

  const restoreLocalDraft = useCallback(() => {
    const formWithFieldSetter = form as iFormAutosaveApi<TFormData> & {
      setFieldValue?: (field: keyof TFormData, value: unknown) => unknown;
    };
    if (!recoveredDraft || (!form.reset && !formWithFieldSetter.setFieldValue)) return false;
    if (formWithFieldSetter.setFieldValue) {
      for (const field of Object.keys(recoveredDraft.values) as Array<keyof TFormData>) {
        const value = recoveredDraft.values[field];
        if (value !== undefined) formWithFieldSetter.setFieldValue(field, value);
      }
    } else {
      form.reset?.({ ...form.state.values, ...recoveredDraft.values });
    }
    setHasUnacknowledgedChanges(true);
    setRecoveredDraft(null);
    return true;
  }, [form, recoveredDraft, setHasUnacknowledgedChanges]);

  const clearPersistedDraft = useCallback(() => {
    if (localDraft) clearFormLocalDraft(localDraft.key, localDraft.ownerId);
  }, [localDraft]);

  const discardLocalDraft = useCallback(() => {
    clearPersistedDraft();
    setRecoveredDraft(null);
  }, [clearPersistedDraft]);

  const draftRecovery = {
    isAvailable: recoveredDraft !== null,
    onRestore: restoreLocalDraft,
    onDiscard: discardLocalDraft,
  };

  return { clearPersistedDraft, discardLocalDraft, draftRecovery, persistDraft, recoveredDraft, restoreLocalDraft };
}
