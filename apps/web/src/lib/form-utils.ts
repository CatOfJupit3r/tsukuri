/**
 * Helper to create a field map for top-level form fields
 *
 * When using withFieldGroup, you need to map the field group's fields
 * to the actual fields in your form. For top-level fields that match
 * the field group exactly, this helper creates that mapping automatically.
 *
 * @example
 * ```tsx
 * const defaultValues = { name: '', description: '' };
 * const fieldMap = createFieldMap(defaultValues);
 * // Returns: { name: 'name', description: 'description' }
 *
 * <ProfileFieldGroup form={form} fields={fieldMap} />
 * ```
 */
export function createFieldMap<T extends Record<string, unknown>>(defaultValues: T): Record<keyof T, keyof T> {
  return Object.keys(defaultValues).reduce(
    (acc, key) => {
      acc[key as keyof T] = key;
      return acc;
    },
    {} as Record<keyof T, keyof T>,
  );
}
