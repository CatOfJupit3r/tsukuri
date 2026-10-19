import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { clearFormLocalDraft, readFormLocalDraft, writeFormLocalDraft } from '#~/utils/forms/form-local-draft';

interface iFormWizardDraft<TStep, TValues> {
  step: TStep;
  values: TValues;
}

interface iUseFormWizardOptions<TStep extends string, TValues> {
  draftKey: string;
  initialValues: TValues;
  maxDraftAgeMs?: number;
  parseValues?: (value: unknown) => TValues | null;
  selectDraftValues?: (values: TValues) => unknown;
  steps: readonly TStep[];
  validateAll: (values: TValues) => boolean | Promise<boolean>;
  validateStep: (step: TStep, values: TValues) => boolean | Promise<boolean>;
}

function restoreDraft<TStep extends string, TValues>(
  options: iUseFormWizardOptions<TStep, TValues>,
): iFormWizardDraft<TStep, TValues> | null {
  const record = readFormLocalDraft<iFormWizardDraft<unknown, unknown>>(options.draftKey, options.maxDraftAgeMs);
  if (!record?.values || typeof record.values !== 'object') return null;

  const restoredStep = options.steps.find((step) => step === record.values.step);
  const restoredValues = options.parseValues
    ? options.parseValues(record.values.values)
    : (record.values.values as TValues);
  return restoredStep && restoredValues ? { step: restoredStep, values: restoredValues } : null;
}

export function useFormWizard<TStep extends string, TValues>(options: iUseFormWizardOptions<TStep, TValues>) {
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });
  const [restoredDraft, setRestoredDraft] = useState(() => restoreDraft(options));
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    restoredDraft ? options.steps.indexOf(restoredDraft.step) : 0,
  );
  const latestValuesRef = useRef(restoredDraft?.values ?? options.initialValues);

  const persist = useCallback((stepIndex: number, values: TValues) => {
    latestValuesRef.current = values;
    return writeFormLocalDraft(optionsRef.current.draftKey, {
      step: optionsRef.current.steps[stepIndex],
      values: optionsRef.current.selectDraftValues?.(values) ?? values,
    });
  }, []);

  const updateDraft = useCallback((values: TValues) => persist(currentStepIndex, values), [currentStepIndex, persist]);

  const next = useCallback(
    async (values: TValues) => {
      const currentStep = optionsRef.current.steps[currentStepIndex];
      if (!(await optionsRef.current.validateStep(currentStep, values))) return false;
      const nextStepIndex = Math.min(currentStepIndex + 1, optionsRef.current.steps.length - 1);
      persist(nextStepIndex, values);
      setCurrentStepIndex(nextStepIndex);
      return true;
    },
    [currentStepIndex, persist],
  );

  const back = useCallback(
    (values: TValues = latestValuesRef.current) => {
      const previousStepIndex = Math.max(currentStepIndex - 1, 0);
      persist(previousStepIndex, values);
      setCurrentStepIndex(previousStepIndex);
    },
    [currentStepIndex, persist],
  );

  const validateAll = useCallback(async (values: TValues) => optionsRef.current.validateAll(values), []);

  const complete = useCallback((onReset?: () => unknown) => {
    clearFormLocalDraft(optionsRef.current.draftKey);
    setRestoredDraft(null);
    latestValuesRef.current = optionsRef.current.initialValues;
    setCurrentStepIndex(0);
    onReset?.();
  }, []);

  return {
    back,
    complete,
    currentStep: options.steps[currentStepIndex],
    currentStepIndex,
    hasRestoredDraft: restoredDraft !== null,
    initialValues: restoredDraft?.values ?? options.initialValues,
    next,
    updateDraft,
    validateAll,
  };
}
