import type { InputHTMLAttributes, ReactNode } from 'react';

import { Input } from '#~/components/ui/controls/input';
import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';
import { GraphemeCounter } from '#~/components/ui/form/grapheme-counter';
import { truncateUxGraphemes } from '#~/constants/ux-primitives';

export interface iTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: ReactNode;
}

export function TextField({ label, description, maxLength, onBlur, onChange, ...inputProps }: iTextFieldProps) {
  const field = useFieldContext<string>();
  const presentation = useFieldPresentation(Boolean(description));

  const handleBlur: iTextFieldProps['onBlur'] = (event) => {
    field.handleBlur();
    onBlur?.(event);
  };
  const handleChange: iTextFieldProps['onChange'] = (event) => {
    const value =
      maxLength == null ? event.currentTarget.value : truncateUxGraphemes(event.currentTarget.value, maxLength);
    event.currentTarget.value = value;
    field.handleChange(value);
    onChange?.(event);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <Input
          id={field.name}
          value={field.state.value}
          onChange={handleChange}
          onBlur={handleBlur}
          {...inputProps}
          aria-describedby={presentation.describedBy}
          aria-invalid={presentation.isInvalid}
        />
      </div>
      {description ? <FieldDescription id={presentation.descriptionId}>{description}</FieldDescription> : null}
      {maxLength == null ? null : <GraphemeCounter max={maxLength} value={field.state.value} />}
      <FieldError id={presentation.errorId} errors={presentation.errors} />
    </div>
  );
}
