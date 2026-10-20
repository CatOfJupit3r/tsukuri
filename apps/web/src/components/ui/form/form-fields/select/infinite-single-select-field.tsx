import type { ReactNode } from 'react';

import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { EMPTY_SELECT_VALUE } from '#~/components/ui/form/form-fields/form-fields.constants';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';
import { InfiniteSingleSelect } from '#~/components/ui/select/infinite-select';
import type { iInfiniteSingleSelectProps } from '#~/components/ui/select/infinite-select';

interface iInfiniteSingleSelectFieldProps<TValue extends string = string> extends Omit<
  iInfiniteSingleSelectProps<TValue>,
  'value' | 'onValueChange'
> {
  label: string;
  description?: ReactNode;
}

export function InfiniteSingleSelectField<TValue extends string = string>({
  label,
  description,
  items,
  onBlur,
  ...selectProps
}: iInfiniteSingleSelectFieldProps<TValue>) {
  const field = useFieldContext<TValue | typeof EMPTY_SELECT_VALUE>();
  const presentation = useFieldPresentation(Boolean(description));

  const handleBlur: iInfiniteSingleSelectProps<TValue>['onBlur'] = (event) => {
    field.handleBlur();
    onBlur?.(event);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <InfiniteSingleSelect<TValue>
          inputId={field.name}
          value={field.state.value === EMPTY_SELECT_VALUE ? null : field.state.value}
          onValueChange={(value) => field.handleChange(value ?? EMPTY_SELECT_VALUE)}
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
