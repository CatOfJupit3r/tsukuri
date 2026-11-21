import path from 'node:path';
import { z } from 'zod';

import { LINT_CONFIG_WORKSPACE } from './repository-sync.constants';
import { REPOSITORY_ROOT } from './temp-dir';

export const LINT_CONFIG_ROOT = path.join(REPOSITORY_ROOT, LINT_CONFIG_WORKSPACE);

export const LINT_CONFIG_WORKSPACE_ESLINT_CONFIG = path.join(LINT_CONFIG_ROOT, 'eslint.config.mjs');

export const LINT_CONFIG_SOURCE_ROOT = path.join(LINT_CONFIG_ROOT, 'src');

export const LINT_CONFIG_SOURCE_EXTENSIONS = ['.mjs', '.js', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx'];

/** Helper that loads a package by a string argument; the only package-loading call allowed besides static imports. */
export const PACKAGE_LOADING_FUNCTION_NAME = 'importPlugin';

export const NON_PACKAGE_SPECIFIER_PATTERN = /^(?:[./#]|node:)/;

export const installedPackageSchema = z.object({ peerDependencies: z.record(z.string(), z.string()).default({}) });
