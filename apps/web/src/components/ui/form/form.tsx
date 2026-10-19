import { useSelector } from '@tanstack/react-form';
import { useMemo } from 'react';
import type { ComponentPropsWithoutRef, ReactNode, SubmitEvent } from 'react';

import { useFormContext } from '#~/components/ui/form/form-contexts';
import { FormErrorSummary } from '#~/components/ui/form/form-error-summary';
import { cn } from '#~/lib/utils';
import { focusFirstInvalidField } from '#~/utils/forms/focus-first-invalid';
import { getFormErrorMessages } from '#~/utils/forms/form-error';

interface iFormFieldMeta {
  errors?: unknown[];
}

export function Form({
  children,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit' | 'noValidate'> & {
  children?: ReactNode;
}) {
  const form = useFormContext();
  const [submissionAttempts, fieldMeta] = useSelector(form.store, (state) => [
    state.submissionAttempts,
    state.fieldMeta as Record<string, iFormFieldMeta | undefined>,
  ]);
  const summaryErrors = useMemo(() => {
    if (submissionAttempts === 0) return [];
    return Object.entries(fieldMeta).flatMap(([fieldName, meta]) =>
      getFormErrorMessages(meta?.errors).map((message) => ({
        fieldId: fieldName,
        label: fieldName.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll(/[._-]+/g, ' '),
        message,
      })),
    );
  }, [fieldMeta, submissionAttempts]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const formElement = event.currentTarget;
    await form.handleSubmit();
    requestAnimationFrame(() => focusFirstInvalidField(formElement));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('mx-auto flex w-full flex-col gap-2 p-2 md:p-5', className)}
      noValidate
      {...props}
    >
      <FormErrorSummary errors={summaryErrors} />
      {children}
    </form>
  );
}
