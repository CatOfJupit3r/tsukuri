import path from 'node:path';
import 'reflect-metadata';

import { BUNDLED_SOURCES_DIR } from '#~/constants/bundled-sources';
import { createGeneratorContainer } from '#~/di/container';

import { ModuleSourceBundler } from './module-source-bundler';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '../..');
const REPOSITORY_ROOT = path.resolve(PACKAGE_ROOT, '../..');
const outputDirectory = path.join(PACKAGE_ROOT, BUNDLED_SOURCES_DIR);

const sourcePaths = await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT })
  .resolve(ModuleSourceBundler)
  .bundle(outputDirectory);

console.log(
  `Bundled ${sourcePaths.length} module source files into ${path.relative(REPOSITORY_ROOT, outputDirectory)}`,
);
