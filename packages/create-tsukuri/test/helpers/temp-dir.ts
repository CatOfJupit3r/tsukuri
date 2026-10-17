import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** Repository root, which holds the module sources in a local checkout. */
export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../../..');

/** Creates a temp directory per test and removes it afterwards. */
export function useTempDir() {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  return async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'create-tsukuri-'));
    directories.push(directory);
    return directory;
  };
}
