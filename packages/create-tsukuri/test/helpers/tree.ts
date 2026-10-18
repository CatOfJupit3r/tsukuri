import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** Every file under `directory` with its content, keyed by POSIX relative path. */
export async function readTree(directory: string) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(directory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();

  const tree = new Map<string, string>();
  for (const file of files) tree.set(file, await readFile(path.join(directory, file), 'utf8'));
  return tree;
}
