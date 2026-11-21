import path from 'node:path';
import { z } from 'zod';

import { LINT_CONFIG_WORKSPACE } from './repository-sync.constants';
import { REPOSITORY_ROOT } from './temp-dir';

export const LINT_CONFIG_ROOT = path.join(REPOSITORY_ROOT, LINT_CONFIG_WORKSPACE);

export const LINT_CONFIG_SOURCE_ROOT = path.join(LINT_CONFIG_ROOT, 'src');

export const LINT_CONFIG_SOURCE_EXTENSIONS = ['.mjs', '.js', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx'];

/** Calls that load a package by a string argument, next to dynamic `import()`. */
export const PACKAGE_LOADING_FUNCTION_NAMES = ['importPlugin'];

export const NON_PACKAGE_SPECIFIER_PATTERN = /^(?:[./#]|node:)/;

export const installedPackageSchema = z.object({ peerDependencies: z.record(z.string(), z.string()).default({}) });
