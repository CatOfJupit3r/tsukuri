import { useSelector } from '@tanstack/react-form';

import { useFieldContext, useFormContext } from '#~/components/ui/form/form-contexts';

export function useFieldPresentation(hasDescription: boolean) {
  const field = useFieldContext<unknown>();
  const form = useFormContext();
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts);
  const isErrorVisible = field.state.meta.isTouched || submissionAttempts > 0;
  const errors = isErrorVisible ? field.state.meta.errors : [];
  const isInvalid = errors.length > 0;
  const descriptionId = hasDescription ? `${field.name}-description` : undefined;
  const errorId = isInvalid ? `${field.name}-error` : undefined;

  return {
    describedBy: [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
    descriptionId,
    errorId,
    errors,
    isInvalid,
  };
}
