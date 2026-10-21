export function parseTagInput(inputValue: string) {
  return inputValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function mergeTagValues(values: string[], additions: string[], maxItems?: number) {
  const merged = [...values, ...additions];
  return maxItems != null ? merged.slice(0, maxItems) : merged;
}
