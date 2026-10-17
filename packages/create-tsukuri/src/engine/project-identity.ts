import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';

import { GeneratorError } from './generator-error';

/**
 * Placeholder project name used throughout the module sources. It also forms the npm scope
 * (`@startername/common`), so a generated project's workspace packages are `@<name>/...`.
 */
export const PROJECT_NAME_TOKEN = 'startername';

const NPM_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const MAX_NPM_NAME_LENGTH = 214;
const RESERVED_NAMES = new Set(['node_modules', 'favicon.ico']);

/** Returns why `value` is not usable as a project name (and npm scope), or null when it is. */
export function getProjectNameProblem(value: string) {
  if (value.length === 0) return 'Name is required';
  if (value.length > MAX_NPM_NAME_LENGTH) return `Name must be at most ${MAX_NPM_NAME_LENGTH} characters`;
  if (value !== value.toLowerCase()) return 'Name must be lowercase';
  if (!NPM_NAME_PATTERN.test(value)) {
    return 'Name may only contain lowercase letters, digits, "-", "." and "_", and must start with a letter or digit';
  }
  if (RESERVED_NAMES.has(value)) return `"${value}" is a reserved name`;
  return null;
}

export function assertProjectName(name: string) {
  const problem = getProjectNameProblem(name);
  if (problem) {
    throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_PROJECT_NAME, `Invalid project name "${name}": ${problem}`);
  }
}

const NAME_PATTERN = new RegExp(`\\b${PROJECT_NAME_TOKEN}\\b`, 'g');

/** Replaces the project name token, which also renames the `@startername/` package scope. */
export function applyProjectName(content: string, name: string) {
  return content.replace(NAME_PATTERN, name);
}
