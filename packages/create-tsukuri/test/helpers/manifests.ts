import { MODULE_CATEGORIES } from '@~/enums/module-categories.enums';
import { moduleIdSchema } from '@~/enums/module-ids.enums';
import type { ModuleId } from '@~/enums/module-ids.enums';
import type { iModuleManifestInput } from '@~/manifest/module-manifest.schema';

/** Parses through the (mocked) module id schema, so synthetic ids keep the `ModuleId` type. */
export function testModuleId(value: string) {
  return moduleIdSchema.parse(value);
}

export function createManifest(id: ModuleId, overrides: Partial<iModuleManifestInput> = {}): iModuleManifestInput {
  return {
    id,
    version: '1.0.0',
    name: id,
    description: `${id} module`,
    category: MODULE_CATEGORIES.FEATURE,
    ...overrides,
  };
}
