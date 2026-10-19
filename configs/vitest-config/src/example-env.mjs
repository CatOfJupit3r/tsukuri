import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const EXAMPLE_ENV_FILE = '.env.example';

/**
 * The project's root `.env.example`, which create-tsukuri generates from the installed modules, so
 * tests always see every module's variables. `overrides` win, e.g. `{ NODE_ENV: 'test' }`.
 *
 * @param {string} projectRoot - Folder that holds the root `.env.example`
 * @param {Record<string, string>} overrides
 */
export const loadExampleEnv = (projectRoot, overrides) => {
  const exampleEnvPath = path.join(projectRoot, EXAMPLE_ENV_FILE);
  const exampleEnv = existsSync(exampleEnvPath) ? parse(readFileSync(exampleEnvPath, 'utf8')) : {};
  return { ...exampleEnv, ...overrides };
};
