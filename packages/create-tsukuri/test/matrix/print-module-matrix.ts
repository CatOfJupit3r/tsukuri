import path from 'node:path';

import { createGeneratorContainer } from '#~/di/container';
import { ModuleRegistry } from '#~/engine/modules/module-registry';
import { ModuleResolver } from '#~/engine/modules/module-resolver';

import { planModuleMatrix } from './module-matrix';

const SOURCE_ROOT = path.resolve(import.meta.dirname, '../../../..');
const generator = createGeneratorContainer({ sourceRoot: SOURCE_ROOT });
process.stdout.write(
  JSON.stringify(planModuleMatrix(generator.resolve(ModuleRegistry), generator.resolve(ModuleResolver))),
);
