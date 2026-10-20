import type { ReactNode } from 'react';

import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';
import { InfiniteMultiSelect } from '#~/components/ui/select/infinite-select';
import type { iInfiniteMultiSelectProps } from '#~/components/ui/select/infinite-select';

interface iInfiniteMultiSelectFieldProps<TValue extends string = string> extends Omit<
  iInfiniteMultiSelectProps<TValue>,
  'value' | 'onValueChange'
> {
  label: string;
  description?: ReactNode;
}

export function InfiniteMultiSelectField<TValue extends string = string>({
  label,
  description,
  items,
  onBlur,
  ...selectProps
}: iInfiniteMultiSelectFieldProps<TValue>) {
  const field = useFieldContext<TValue[]>();
  const presentation = useFieldPresentation(Boolean(description));

  const handleBlur: iInfiniteMultiSelectProps<TValue>['onBlur'] = (event) => {
    field.handleBlur();
    onBlur?.(event);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <InfiniteMultiSelect<TValue>
          inputId={field.name}
          value={field.state.value ?? []}
          onValueChange={field.handleChange}
          onBlur={handleBlur}
          items={items}
          {...selectProps}
          aria-describedby={presentation.describedBy}
          aria-invalid={presentation.isInvalid}
        />
      </div>
      {description ? <FieldDescription id={presentation.descriptionId}>{description}</FieldDescription> : null}
      <FieldError id={presentation.errorId} errors={presentation.errors} />
    </div>
  );
}
