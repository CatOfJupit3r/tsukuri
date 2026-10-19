import type { ReactNode, TextareaHTMLAttributes } from 'react';

import { Textarea } from '#~/components/ui/controls/textarea';
import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';
import { GraphemeCounter } from '#~/components/ui/form/grapheme-counter';
import { truncateUxGraphemes } from '#~/constants/ux-primitives';

export interface iTextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  description?: ReactNode;
}

export function TextareaField({
  label,
  description,
  maxLength,
  onBlur,
  onChange,
  ...textareaProps
}: iTextareaFieldProps) {
  const field = useFieldContext<string>();
  const presentation = useFieldPresentation(Boolean(description));

  const handleBlur: iTextareaFieldProps['onBlur'] = (event) => {
    field.handleBlur();
    onBlur?.(event);
  };
  const handleChange: iTextareaFieldProps['onChange'] = (event) => {
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
        <Textarea
          id={field.name}
          value={field.state.value}
          onChange={handleChange}
          onBlur={handleBlur}
          {...textareaProps}
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
