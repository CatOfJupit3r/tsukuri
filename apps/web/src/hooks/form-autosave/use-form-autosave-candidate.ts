import { useCallback } from 'react';

import type { iFormAutosaveSaveCandidate, iUseFormAutosaveOptions } from '#~/hooks/form-autosave/form-autosave.types';
import { isEqual } from '#~/hooks/form-autosave/form-autosave.utils';
import type { FormAutosaveState } from '#~/hooks/form-autosave/use-form-autosave-state';

interface iUseFormAutosaveCandidateProps<TFormData, TChangedData> extends Pick<
  iUseFormAutosaveOptions<TFormData, TChangedData>,
  'form' | 'selectFields' | 'transformData'
> {
  isOnlyChanged: boolean;
  lastSavedRef: FormAutosaveState<TFormData, TChangedData>['lastSavedRef'];
}

export function useFormAutosaveCandidate<TFormData, TChangedData>({
  form,
  isOnlyChanged,
  lastSavedRef,
  selectFields,
  transformData,
}: iUseFormAutosaveCandidateProps<TFormData, TChangedData>) {
  const getSelectedData = useCallback(
    (values: TFormData) => (selectFields ? selectFields(values) : (values as TFormData & TChangedData)),
    [selectFields],
  );

  const getSaveCandidate = useCallback((): iFormAutosaveSaveCandidate<TFormData, TChangedData> | null => {
    const selectedData = getSelectedData(form.state.values);
    const baselineData = structuredClone(selectedData) as Partial<TFormData>;
    if (!isOnlyChanged) return { baselineData, changedData: selectedData };

    const changedFields: Partial<TFormData> = {};
    let hasChanges = false;
    for (const key of Object.keys(selectedData as Record<string, unknown>) as Array<keyof TFormData>) {
      const currentValue = (selectedData as Partial<TFormData>)[key];
      if (!isEqual(currentValue, lastSavedRef.current[key])) {
        changedFields[key] = currentValue;
        hasChanges = true;
      }
    }

    if (!hasChanges) return null;
    return {
      baselineData,
      changedData: transformData ? transformData(changedFields) : (changedFields as TChangedData),
    };
  }, [form, getSelectedData, isOnlyChanged, lastSavedRef, transformData]);

  return { getSaveCandidate, getSelectedData };
}
