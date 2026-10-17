import { inject, injectable } from 'tsyringe';

import { MODULE_MANIFESTS_TOKEN } from '@~/di/tokens';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import type { ModuleId } from '@~/enums/module-ids.enums';
import type { iModuleManifest, iModuleManifestInput } from '@~/manifest/module-manifest.schema';
import { moduleManifestSchema } from '@~/manifest/module-manifest.schema';

import { GeneratorError } from './generator-error';

@injectable()
export class ModuleRegistry {
  private readonly modules = new Map<ModuleId, iModuleManifest>();

  constructor(@inject(MODULE_MANIFESTS_TOKEN) inputs: iModuleManifestInput[]) {
    for (const input of inputs) {
      const parsed = moduleManifestSchema.safeParse(input);
      if (!parsed.success) {
        const label = typeof input.id === 'string' ? input.id : '<unknown>';
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.INVALID_MANIFEST,
          `Module manifest "${label}" is invalid:\n${parsed.error.issues
            .map((issue) => `  - ${issue.path.join('.') || '<root>'}: ${issue.message}`)
            .join('\n')}`,
        );
      }

      if (this.modules.has(parsed.data.id)) {
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.DUPLICATE_MODULE,
          `Module "${parsed.data.id}" is declared more than once`,
        );
      }

      this.modules.set(parsed.data.id, parsed.data);
    }

    for (const manifest of this.modules.values()) {
      for (const referenced of [...manifest.requires, ...manifest.conflicts]) {
        if (this.modules.has(referenced)) continue;
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.UNKNOWN_MODULE,
          `Module "${manifest.id}" references unregistered module "${referenced}"`,
        );
      }
    }
  }

  public has(id: ModuleId) {
    return this.modules.has(id);
  }

  public get(id: ModuleId) {
    const manifest = this.modules.get(id);
    if (!manifest) {
      throw new GeneratorError(GENERATOR_ERROR_CODES.UNKNOWN_MODULE, `Unknown module "${id}"`);
    }
    return manifest;
  }

  public list() {
    return [...this.modules.values()];
  }
}
