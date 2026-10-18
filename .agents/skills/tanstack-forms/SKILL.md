---
name: tanstack-forms
description: Build type-safe forms using TanStack Form with Zod validation, custom form hooks, withForm and withFieldGroup patterns. STRICT patterns: always use useAppForm (never raw useForm), always define schemas in */schemas/*.schema.ts, always use withFieldGroup for reusable fields, always call form.reset() on success, always use useFormAutosave for edit forms.
---

# TanStack Forms

Type-safe forms with TanStack Form + Zod validation + custom hooks.

## Critical Rules (NON-NEGOTIABLE)

1. **ALWAYS use `useAppForm`** - NEVER use raw `useForm` from `@tanstack/react-form`
2. **ALWAYS define Zod schemas** in `features/*/schemas/*.schema.ts` files
3. **ALWAYS use `withFieldGroup`** for reusable field subsets (name/description patterns)
4. **ALWAYS call `form.reset()`** after successful submit in create forms
5. **ALWAYS use `useFormAutosave`** for edit forms with autosave functionality
6. **ALWAYS pass `isPending`** to field `disabled` props during mutations
7. **ALWAYS convert empty strings to `undefined`** for optional fields before submit
8. **ALWAYS initialize arrays** with typed defaults: `[] as Type[]`
9. **ALWAYS make forms editable by default**. Do not create `Edit` button. Just display the form with editable fields. If you want to show a read-only view, create a separate `View` component. But if the place needs to be editable, just make it editable. Don't hide the editability behind an extra click.
10. **ALWAYS use `Enumwaii`** for closed-set fields. Define `em([...])`, export its accessor, `(typeof enumeration)["~type"]` type, and Zod adapter schema, then use accessor members in defaults, options, payloads, and tests. Use computed enum members for metadata keys. Do not use raw strings, `string`, duplicate unions, `z.enum`, or `schema.enum.VALUE` at call sites. URL/query-facing values may preserve their required spelling through the enum's named external values and `.rawValues` only at the serialization boundary. See the **enumwaii** skill.

## Custom Form Hook

The project uses a custom hook created via `createFormHook` that provides:
- `useAppForm` - Form creation hook with field/form components injected
- `withFieldGroup` - Pattern for reusable field subsets
- `withForm` - Pattern for standalone form components  
- Pre-configured field components (TextField, SelectField, etc.)
- Form layout components (FormActions, FieldLegend, etc.)

**Location**: `apps/web/src/components/ui/field.tsx`

## Create Form Pattern

```typescript
// features/characters/components/character-create-dialog.tsx
import { useAppForm } from '#~/components/ui/field';
import { useCreateCharacter } from '../hooks/use-create-character';
import { characterFormSchema } from '../schemas/character.schema';

export function CharacterCreateDialog({ open, onOpenChange }) {
  const { createCharacter, isPending } = useCreateCharacter();

  const form = useAppForm({
    defaultValues: {
      name: '',
      description: '',
      personality: '',
      tags: [] as string[],
    },
    validators: {
      onSubmit: characterFormSchema, // Zod schema validation
    },
    onSubmit: async ({ value }) => {
      createCharacter(
        {
          name: value.name,
          description: value.description || undefined, // Empty string → undefined
          personality: value.personality || undefined,
          tags: value.tags.length > 0 ? value.tags : undefined,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset(); // ✅ Always reset after success
          },
        },
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Character</DialogTitle>
        </DialogHeader>

        <form.AppForm>
          <form.Form className="space-y-4">
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Name"
                  placeholder="Enter character name"
                  required
                  disabled={isPending}
                />
              )}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextareaField
                  label="Description"
                  placeholder="Describe the character..."
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                />
              )}
            </form.AppField>

            <form.AppField name="tags" mode="array">
              {(field) => (
                <field.TagArrayField
                  label="Tags"
                  placeholder="Add a tag (press Enter)"
                  disabled={isPending}
                />
              )}
            </form.AppField>

            <DialogFooter>
              <form.FormActions
                onCancel={() => onOpenChange(false)}
                submitLabel="Create Character"
                loadingLabel="Creating..."
                isDisabled={isPending}
              />
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
```

## Edit Form + Autosave Pattern

```typescript
// features/characters/components/character-edit-panel.tsx
import { useAppForm } from '#~/components/ui/field';
import { useFormAutosave } from '#~/hooks/use-form-autosave';
import { useCharacter } from '../hooks/use-character';
import { useUpdateCharacter } from '../hooks/use-update-character';

export function CharacterEditPanel({ characterId }) {
  const { data: character, isPending: isLoading } = useCharacter(characterId);
  const { updateCharacter, isPending } = useUpdateCharacter();

  const form = useAppForm({
    defaultValues: {
      name: character?.name ?? '',
      description: character?.description ?? '',
      personality: character?.personality ?? '',
      tags: character?.tags ?? [],
    },
  });

  // Autosave with change detection - only sends modified fields
  const { handleAutoSave, resetTracking } = useFormAutosave({
    form,
    onSave: (changedFields) => {
      // Only sends fields that actually changed
      updateCharacter({
        characterId,
        data: changedFields,
      });
    },
    debounce: 1000, // Debounce by 1 second
  });

  // Reset tracking when data loads
  useEffect(() => {
    if (character) {
      // Update form values
      form.setFieldValue('name', character.name);
      form.setFieldValue('description', character.description ?? '');
      form.setFieldValue('personality', character.personality ?? '');
      form.setFieldValue('tags', character.tags ?? []);
      
      // Reset autosave tracking to current values
      resetTracking({
        name: character.name,
        description: character.description ?? '',
        personality: character.personality ?? '',
        tags: character.tags ?? [],
      });
    }
  }, [character, form, resetTracking]);

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (!character) return <div>Character not found</div>;

  return (
    <form.AppForm>
      <form.Form className="space-y-4">
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Name"
              onBlur={handleAutoSave} // Triggers autosave on blur
              disabled={isPending}
            />
          )}
        </form.AppField>

        <form.AppField name="description">
          {(field) => (
            <field.TextareaField
              label="Description"
              rows={3}
              onBlur={handleAutoSave}
              disabled={isPending}
            />
          )}
        </form.AppField>

        {/* Show saving indicator */}
        {isPending && (
          <div className="text-sm text-muted-foreground">Saving...</div>
        )}
      </form.Form>
    </form.AppForm>
  );
}
```

## Reusable Field Groups with `withFieldGroup`

**Most common pattern** for extracting shared fields (name/description) into reusable components:

```typescript
// features/presets/forms/preset-info-field-group.tsx
import { withFieldGroup } from '#~/components/ui/field';

interface iPresetInfoFieldGroupProps {
  onBlur?: () => void;
  isPending?: boolean;
}

export const PresetInfoFieldGroup = withFieldGroup({
  // Default values for type-checking only (not used at runtime)
  defaultValues: {
    name: '',
    description: '',
  } as { name: string; description: string },
  
  props: {} as iPresetInfoFieldGroupProps,
  
  // CRITICAL: Use 'group' parameter, NOT 'form'
  render: function Render({ group, onBlur, isPending }) {
    return (
      <>
        <group.AppField name="name">
          {(field) => (
            <field.TextField
              label="Name"
              placeholder="Enter preset name"
              maxLength={200}
              disabled={isPending}
              onBlur={onBlur}
            />
          )}
        </group.AppField>

        <group.AppField name="description">
          {(field) => (
            <field.TextareaField
              label="Description"
              placeholder="Optional description..."
              rows={2}
              maxLength={1000}
              disabled={isPending}
              onBlur={onBlur}
            />
          )}
        </group.AppField>
      </>
    );
  },
});
```

### Using Field Groups in Parent Forms

```typescript
// lib/form-utils.ts
export function createFieldMap<T extends Record<string, unknown>>(
  defaultValues: T
): Record<keyof T, keyof T> {
  return Object.keys(defaultValues).reduce(
    (acc, key) => {
      acc[key as keyof T] = key as keyof T;
      return acc;
    },
    {} as Record<keyof T, keyof T>
  );
}

// features/presets/components/preset-create-dialog.tsx
import { createFieldMap } from '#~/lib/form-utils';
import { PRESET_TYPES } from '@startername/shared/constants/presets';
import { PresetInfoFieldGroup } from '../forms/preset-info-field-group';

// Define field mapping once (top-level constant)
const PRESET_INFO_FIELDS = createFieldMap({ name: '', description: '' });

function PresetCreateDialog() {
  const form = useAppForm({
    defaultValues: {
      name: '',          // Field group field
      description: '',   // Field group field
      type: PRESET_TYPES.GENERATION, // Additional field
    },
    validators: { onSubmit: presetCreateSchema },
  });

  return (
    <form.AppForm>
      <form.Form>
        {/* Use field group for name + description */}
        <PresetInfoFieldGroup
          form={form}
          fields={PRESET_INFO_FIELDS}
          isPending={isPending}
        />
        
        {/* Additional fields */}
        <form.AppField name="type">
          {(field) => <field.SelectField label="Type" options={TYPE_OPTIONS} />}
        </form.AppField>
      </form.Form>
    </form.AppForm>
  );
}
```

## Zod Validation Schemas

```typescript
// features/characters/schemas/character.schema.ts
import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';
import { z } from 'zod';

export const characterFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(500).optional(),
  personality: z.string().trim().max(500).optional(),
  tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed'),
});

export type CharacterFormValues = z.infer<typeof characterFormSchema>;

const characterVisibilitiesEnumwaii = em(['PUBLIC', 'PRIVATE']);
export const CHARACTER_VISIBILITIES = characterVisibilitiesEnumwaii.enum;
export type CharacterVisibility = (typeof characterVisibilitiesEnumwaii)['~type'];
export const characterVisibilitySchema = emToZodSchema(characterVisibilitiesEnumwaii);

// For edit forms, extend the base schema
export const characterEditSchema = characterFormSchema.extend({
  visibility: characterVisibilitySchema,
});
```

For an enum-backed form field, import the named enumwaii accessor (for example `PRESET_TYPES` from `@startername/shared/constants/presets`) and use its members in `defaultValues`, select options, submit payloads, and test fixtures. Use `emToZodSchema(enumeration)` only for validation and the inferred type for annotations; never write raw values or reach through the schema for members. See the **enumwaii** skill.

## Available Field Components

Pre-built field components from custom form hook are defined in `#~/components/ui/form-fields.tsx`
and can be referenced when using `form.AppField`.

To get the full list of available fields and their props, check the `form-fields.tsx` file

## Array Fields

### Simple arrays (tags, strings)
```typescript
<form.AppField name="tags" mode="array">
  {(field) => (
    <field.TagArrayField label="Tags" placeholder="Add tag (press Enter)" />
  )}
</form.AppField>
```

### Complex nested object arrays
```typescript
<form.Field name="relationships" mode="array">
  {(field) => {
    const relationships = field.state.value || [];
    return (
      <div className="space-y-2">
        <Label>Relationships</Label>
        {relationships.map((rel, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={rel.targetId}
              onChange={(e) => {
                const updated = [...relationships];
                updated[index] = { ...rel, targetId: e.target.value };
                field.handleChange(updated);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                field.handleChange(relationships.filter((_, i) => i !== index));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            field.handleChange([
              ...relationships,
              { targetId: '', type: '', note: '' },
            ]);
          }}
        >
          Add Relationship
        </Button>
      </div>
    );
  }}
</form.Field>
```

## Form + Mutation Integration

Forms always pair with TanStack Query mutations. **See [tanstack-query-integration](../tanstack-query-integration/SKILL.md) for mutation patterns.**

Key points:
- Export mutation options as constants
- Use `ctx.client.invalidateQueries()` for cache updates
- Handle loading states with `isPending`
- Show success/error toasts

```typescript
const form = useAppForm({
  onSubmit: async ({ value }) => {
    createCharacter(
      { value },
      {
        onSuccess: () => {
          toast.success('Created!');
          form.reset();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  },
});
```

## Common Mistakes

❌ **Don't use raw useForm:**
```typescript
import { useForm } from '@tanstack/react-form'; // WRONG
const form = useForm({ ... });
```

✅ **Do use useAppForm:**
```typescript
import { useAppForm } from '#~/components/ui/field'; // CORRECT
const form = useAppForm({ ... });
```

❌ **Don't forget form.reset():**
```typescript
onSuccess: () => {
  onOpenChange(false); // Form state persists!
}
```

✅ **Do reset after success:**
```typescript
onSuccess: () => {
  onOpenChange(false);
  form.reset(); // CORRECT
}
```

❌ **Don't send empty strings for optional fields:**
```typescript
onSubmit: async ({ value }) => {
  createItem({ name: value.name, description: value.description }); // Empty string sent
}
```

✅ **Do convert to undefined:**
```typescript
onSubmit: async ({ value }) => {
  createItem({
    name: value.name,
    description: value.description || undefined, // CORRECT
  });
}
```

❌ **Don't use 'form' in withFieldGroup:**
```typescript
withFieldGroup({
  render: function Render({ form }) { // WRONG parameter name
    return <form.AppField ... />;
  },
});
```

✅ **Do use 'group' in withFieldGroup:**
```typescript
withFieldGroup({
  render: function Render({ group }) { // CORRECT parameter name
    return <group.AppField ... />;
  },
});
```

## File Naming Conventions

- Create forms: `*-create-form.tsx` or `*-create-dialog.tsx`
- Edit forms: `*-edit-form.tsx` or `*-edit-panel.tsx`
- Field groups: `*-field-group.tsx` or `*-fields.tsx`
- Schemas: `features/*/schemas/*.schema.ts`
