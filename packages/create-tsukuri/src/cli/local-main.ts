import path from 'node:path';
import 'reflect-metadata';

import { SOURCE_LAYOUTS } from '#~/enums/source-layouts.enums';

import { runCli } from './run-cli';

/** Module sources of a local checkout: the working tree of the repository. */
const LOCAL_SOURCE_ROOT = path.resolve(import.meta.dirname, '../../../..');

/**
 * `pnpm run` starts every script inside the checkout, where no project may be created, so project
 * folders resolve next to the repository: `pnpm run create my-app` creates `../my-app`.
 */
const LOCAL_PROJECTS_ROOT = path.dirname(LOCAL_SOURCE_ROOT);

await runCli({ sourceRoot: LOCAL_SOURCE_ROOT, sourceLayout: SOURCE_LAYOUTS.REPOSITORY, cwd: LOCAL_PROJECTS_ROOT });
