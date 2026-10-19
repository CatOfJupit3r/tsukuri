/**
 * Factory for the repetitive "Drizzle row -> API response" mapping. Most repository
 * `toResponse` functions only need to (a) turn `null` DB columns into `undefined` optional
 * fields, (b) drop internal/unexposed columns, and (c) narrow a couple of field types.
 * `createRowResolver` covers all three so features don't hand-roll a field-by-field mapper.
 */
interface iResolverSpec<Row, Response> {
  /** Columns whose `null` value should become `undefined` in the response. */
  optional?: readonly (keyof Row)[];
  /** Columns present on the row that must not be exposed in the response. */
  omit?: readonly (keyof Row)[];
  /** Computed/narrowed fields that can't be expressed via `optional`/`omit` alone. */
  overrides?: (row: Row) => Partial<Response>;
}

export function createRowResolver<Row extends Record<string, unknown>, Response>(
  spec: iResolverSpec<Row, Response> = {},
): (row: Row) => Response {
  return (row: Row): Response => {
    const result: Record<string, unknown> = { ...row };

    for (const key of spec.optional ?? []) {
      if (result[key as string] === null) result[key as string] = undefined;
    }
    for (const key of spec.omit ?? []) {
      delete result[key as string];
    }
    if (spec.overrides) {
      Object.assign(result, spec.overrides(row));
    }

    return result as Response;
  };
}

interface iOwnPropertyUpdateResolverSpec<Input extends object> {
  /** Input fields copied into the update when the input has them as own properties. */
  fields: readonly (keyof Input)[];
  /** Fields whose `undefined` value clears the column instead of leaving it untouched. */
  nullishAsNull?: readonly (keyof Input)[];
  /** Sets `updatedAt` to now; on by default. */
  shouldIncludeUpdatedAt?: boolean;
}

/**
 * Factory for "partial input -> Drizzle update" mappings: only the listed fields the caller actually passed
 * become columns, so `undefined` never overwrites a value by accident.
 */
export function createOwnPropertyUpdateResolver<Input extends object, Insert extends Record<string, unknown>>(
  spec: iOwnPropertyUpdateResolverSpec<Input>,
): (input: Input) => Partial<Insert> {
  return (input: Input): Partial<Insert> => {
    const update: Record<string, unknown> = spec.shouldIncludeUpdatedAt === false ? {} : { updatedAt: new Date() };
    const nullishAsNull = new Set(spec.nullishAsNull ?? []);

    for (const key of spec.fields) {
      if (!Object.hasOwn(input, key)) continue;

      const value = input[key];
      if (value === undefined && !nullishAsNull.has(key)) continue;

      update[key as string] = value ?? (nullishAsNull.has(key) ? null : value);
    }

    return update as Partial<Insert>;
  };
}
