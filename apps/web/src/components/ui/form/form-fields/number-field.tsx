import type { InputHTMLAttributes, ReactNode } from 'react';

import { Input } from '#~/components/ui/controls/input';
import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';

export interface iNumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label: string;
  description?: ReactNode;
}

export function NumberField({ label, description, onBlur, ...inputProps }: iNumberFieldProps) {
  const field = useFieldContext<number>();
  const presentation = useFieldPresentation(Boolean(description));

  const handleBlur: iNumberFieldProps['onBlur'] = (event) => {
    field.handleBlur();
    onBlur?.(event);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <Input
          id={field.name}
          type="number"
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value ? Number.parseFloat(event.target.value) : 0)}
          onBlur={handleBlur}
          {...inputProps}
          aria-describedby={presentation.describedBy}
          aria-invalid={presentation.isInvalid}
        />
      </div>
      {description ? <FieldDescription id={presentation.descriptionId}>{description}</FieldDescription> : null}
      <FieldError id={presentation.errorId} errors={presentation.errors} />
    </div>
  );
}
