import path from 'node:path';
import 'reflect-metadata';

import { BUNDLED_SOURCES_DIR } from '#~/constants/bundled-sources';
import { SOURCE_LAYOUTS } from '#~/enums/files/source-layouts.enums';

import { runCli } from './run-cli';

/** The published build runs from `dist/`, next to the bundled module sources. */
const BUNDLED_SOURCE_ROOT = path.resolve(import.meta.dirname, '..', BUNDLED_SOURCES_DIR);

await runCli({ sourceRoot: BUNDLED_SOURCE_ROOT, sourceLayout: SOURCE_LAYOUTS.BUNDLE, cwd: process.cwd() });
