import { Input } from '#~/components/ui/controls/input';
import { FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import type { iTextFieldProps } from '#~/components/ui/form/form-fields/text-field';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';

export function CheckboxField({ label, onBlur, ...inputProps }: iTextFieldProps) {
  const field = useFieldContext<boolean>();
  const presentation = useFieldPresentation(false);

  const handleBlur: iTextFieldProps['onBlur'] = (event) => {
    field.handleBlur();
    onBlur?.(event);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-row items-center gap-1 space-y-0">
        <Input
          id={field.name}
          type="checkbox"
          checked={field.state.value}
          onChange={(event) => field.handleChange(event.target.checked)}
          onBlur={handleBlur}
          {...inputProps}
          aria-describedby={presentation.describedBy}
          aria-invalid={presentation.isInvalid}
        />
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      </div>
      <FieldError id={presentation.errorId} errors={presentation.errors} />
    </div>
  );
}
