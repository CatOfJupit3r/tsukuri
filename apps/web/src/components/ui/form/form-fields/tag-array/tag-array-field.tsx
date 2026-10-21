import type { ReactNode } from 'react';
import { LuPlus } from 'react-icons/lu';

import { Button } from '#~/components/ui/button/button';
import { Input } from '#~/components/ui/controls/input';
import { FieldDescription, FieldError, FieldLabel } from '#~/components/ui/form/field-primitives';
import { useFieldContext } from '#~/components/ui/form/form-contexts';
import { TagArrayChips } from '#~/components/ui/form/form-fields/tag-array/tag-array-chips';
import { useTagArrayInput } from '#~/components/ui/form/form-fields/tag-array/use-tag-array-input';
import { useFieldPresentation } from '#~/components/ui/form/form-fields/use-field-presentation';

interface iTagArrayFieldProps {
  label: string;
  description?: ReactNode;
  placeholder?: string;
  maxItems?: number;
  disabled?: boolean;
  onCommit?: () => unknown;
}

export function TagArrayField({
  label,
  description,
  placeholder = 'Type a value and press Enter',
  maxItems,
  disabled,
  onCommit,
}: iTagArrayFieldProps) {
  const field = useFieldContext<string[]>();
  const presentation = useFieldPresentation(Boolean(description));
  const values = field.state.value ?? [];
  const { handleAdd, handleKeyDown, handleRemove, inputValue, isAtLimit, setInputValue } = useTagArrayInput({
    maxItems,
    onBlur: field.handleBlur,
    onChange: field.handleChange,
    onCommit,
    values,
  });

  return (
    <div className="space-y-3">
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>

      {values.length > 0 ? <TagArrayChips disabled={disabled} onRemove={handleRemove} values={values} /> : null}

      {isAtLimit ? (
        <p className="text-xs text-muted-foreground">Maximum {maxItems} items allowed</p>
      ) : (
        <div className="flex gap-2">
          <Input
            id={field.name}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleAdd(true)}
            placeholder={placeholder}
            disabled={disabled}
            aria-describedby={presentation.describedBy}
            aria-invalid={presentation.isInvalid}
          />
          <Button
            type="button"
            onClick={() => handleAdd()}
            disabled={(disabled ?? false) || !inputValue.trim()}
            size="sm"
            aria-label="Add value"
          >
            <LuPlus className="size-4" />
          </Button>
        </div>
      )}

      {description ? <FieldDescription id={presentation.descriptionId}>{description}</FieldDescription> : null}
      <FieldError id={presentation.errorId} errors={presentation.errors} />
    </div>
  );
}
