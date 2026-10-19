import type { ReactNode } from 'react';

import { Ranger } from '#~/components/ui/controls/ranger';
import type { iRangerProps } from '#~/components/ui/controls/ranger';
import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';

interface iRangerFieldProps extends Omit<iRangerProps, 'value' | 'onChange'> {
  label: string;
  description?: ReactNode;
  valueFormatter?: (value: number) => string;
}

export function RangerField({ label, description, valueFormatter, ...rangerProps }: iRangerFieldProps) {
  const field = useFieldContext<number>();
  const presentation = useFieldPresentation(Boolean(description));

  const displayValue = valueFormatter ? valueFormatter(field.state.value) : field.state.value.toString();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <span className="text-sm font-medium text-foreground">{displayValue}</span>
      </div>
      <Ranger
        id={field.name}
        value={field.state.value}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
        aria-label={label}
        {...rangerProps}
        aria-describedby={presentation.describedBy}
        aria-invalid={presentation.isInvalid}
      />
      {description ? <FieldDescription id={presentation.descriptionId}>{description}</FieldDescription> : null}
      <FieldError id={presentation.errorId} errors={presentation.errors} />
    </div>
  );
}
