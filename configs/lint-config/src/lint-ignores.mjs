/**
 * Globs (relative to a workspace) of the files no workspace lints. ESLint's global ignores and the folder-size
 * rule's file count both read them, so a folder is never counted by files ESLint skips.
 */
export const BASE_IGNORE_PATTERNS = [
  'node_modules/**',
  '*.config.{js,mjs,cjs,ts}',
  '**/*.config.{js,mjs,cjs,ts}',
  'test/**',
  'tests/**',
  'dist/**',
  'build/**',
  '.lintstagedrc.{js,cjs,mjs}',
  // Connection points, rewritten by create-tsukuri on every add/remove.
  'src/generated/**',
];
