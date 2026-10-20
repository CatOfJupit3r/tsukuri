import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createWebConfig } from '@startername/lint-config/eslint';

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);
const tailwindConfigPath = path.join(currentDirname, 'src', 'index.css');

export const LINT_OPTIONS = {
  rootDir: import.meta.url,
  tailwindConfigPath,
  // The Start backend variant is checked inside a generated project, where its route exists.
  additionalIgnores: [
    './src/routeTree.gen.ts',
    'vite.config.ts',
    'vitest.config.ts',
    '**/*.css',
    'variants/tanstack-start/**',
  ],
  enumwaiiWireExceptions: [
    {
      name: { regex: '^logLevelsEnumwaii$' },
      reason: 'external-contract',
      justification: 'Log record levels keep the spelling log collectors and the server logger use.',
    },
  ],
};

export default createWebConfig(LINT_OPTIONS);
