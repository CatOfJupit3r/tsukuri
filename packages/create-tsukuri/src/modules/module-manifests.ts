import type { iModuleManifestInput } from '@~/manifest/module-manifest.schema';

import { baseModule } from './base.module';

/** Every module the generator ships. */
export const MODULE_MANIFESTS: iModuleManifestInput[] = [baseModule];
