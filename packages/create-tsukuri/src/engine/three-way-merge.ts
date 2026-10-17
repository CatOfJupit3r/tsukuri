import { isDeepStrictEqual } from 'node:util';

export interface iThreeWayMergeResult {
  value: unknown;
  /** Dotted paths where the user and the generator changed the same value differently. */
  conflicts: string[];
}

type iRecord = Record<string, unknown>;

function isRecord(value: unknown): value is iRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrimitiveArray(value: unknown): value is (string | number | boolean)[] {
  return Array.isArray(value) && value.every((item) => typeof item !== 'object' || item === null);
}

function join(parent: string, key: string) {
  return parent ? `${parent}.${key}` : key;
}

/**
 * Applies the generator's change (`base` → `theirs`) on top of the user's file (`ours`).
 * Objects merge per key, arrays of scalars merge as sets, and anything else is taken from
 * whichever side changed; when both changed it differently, ours is kept and the path reported.
 */
export function mergeThreeWay(base: unknown, ours: unknown, theirs: unknown, at = ''): iThreeWayMergeResult {
  if (isDeepStrictEqual(ours, base)) return { value: theirs, conflicts: [] };
  if (isDeepStrictEqual(theirs, base) || isDeepStrictEqual(ours, theirs)) return { value: ours, conflicts: [] };

  if (isRecord(ours) && isRecord(theirs)) {
    const baseRecord = isRecord(base) ? base : {};
    const value: iRecord = {};
    const conflicts: string[] = [];
    const keys = [...new Set([...Object.keys(theirs), ...Object.keys(ours)])];

    for (const key of keys) {
      const merged = mergeThreeWay(baseRecord[key], ours[key], theirs[key], join(at, key));
      conflicts.push(...merged.conflicts);
      if (merged.value !== undefined) value[key] = merged.value;
    }
    return { value, conflicts };
  }

  if (isPrimitiveArray(ours) && isPrimitiveArray(theirs)) {
    const baseItems = isPrimitiveArray(base) ? base : [];
    const removed = baseItems.filter((item) => !theirs.includes(item));
    const added = theirs.filter((item) => !baseItems.includes(item));
    const kept = ours.filter((item) => !removed.includes(item));
    return { value: [...kept, ...added.filter((item) => !kept.includes(item))], conflicts: [] };
  }

  return { value: ours, conflicts: [at || '<root>'] };
}
