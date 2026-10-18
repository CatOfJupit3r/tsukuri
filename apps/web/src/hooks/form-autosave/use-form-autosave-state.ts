import { useEffect, useRef, useState } from 'react';

import type { FormSaveState } from '#~/constants/ux-primitives';
import type { iFailedSave } from '#~/hooks/form-autosave/form-autosave.types';

export function useFormAutosaveState<TFormData, TChangedData>() {
  const lastSavedRef = useRef<Partial<TFormData>>({});
  const latestRequestSequenceRef = useRef(0);
  const failedSaveRef = useRef<iFailedSave<TFormData, TChangedData> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDebounceResolveRef = useRef<((wasSaved: boolean) => unknown) | null>(null);
  const isMountedRef = useRef(true);
  const [saveState, setSaveState] = useState<FormSaveState | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [hasUnacknowledgedChanges, setHasUnacknowledgedChanges] = useState(false);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      pendingDebounceResolveRef.current?.(false);
    },
    [],
  );

  return {
    error,
    failedSaveRef,
    hasUnacknowledgedChanges,
    isMountedRef,
    lastSavedRef,
    latestRequestSequenceRef,
    pendingDebounceResolveRef,
    saveState,
    setError,
    setHasUnacknowledgedChanges,
    setSaveState,
    timeoutRef,
  };
}

export type FormAutosaveState<TFormData, TChangedData> = ReturnType<
  typeof useFormAutosaveState<TFormData, TChangedData>
>;
