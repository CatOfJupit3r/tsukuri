import type { ReactNode } from 'react';

import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { EMPTY_SELECT_VALUE } from '#~/components/ui/form/form-fields/form-fields.constants';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';
import { SingleSelect } from '#~/components/ui/select/select';
import type { iSingleSelectProps } from '#~/components/ui/select/select';

interface iSelectFieldProps<TValue extends string = string> extends iSingleSelectProps<TValue> {
  label: string;
  description?: ReactNode;
}

export function SelectField<TValue extends string = string>({
  label,
  options,
  description,
  onBlur,
  ...selectProps
}: iSelectFieldProps<TValue>) {
  const field = useFieldContext<TValue | typeof EMPTY_SELECT_VALUE>();
  const presentation = useFieldPresentation(Boolean(description));

  const handleBlur: iSingleSelectProps<TValue>['onBlur'] = (event) => {
    field.handleBlur();
    onBlur?.(event);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <SingleSelect<TValue>
          inputId={field.name}
          value={field.state.value === EMPTY_SELECT_VALUE ? null : field.state.value}
          onValueChange={(value) => field.handleChange(value ?? EMPTY_SELECT_VALUE)}
          onBlur={handleBlur}
          options={options}
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
