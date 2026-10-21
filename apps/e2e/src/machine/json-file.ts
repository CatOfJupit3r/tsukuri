import { readFile } from 'node:fs/promises';

/** The object a JSON file holds; null when the file is missing, unreadable or holds something else. */
export async function readJsonObject(filePath: string): Promise<object | null> {
  try {
    const content: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    return typeof content === 'object' && content !== null ? content : null;
  } catch {
    return null;
  }
}

export function readNumberField(record: object, field: string) {
  const value: unknown = Reflect.get(record, field);
  return typeof value === 'number' ? value : null;
}
