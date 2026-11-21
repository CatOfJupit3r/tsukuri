import { injectable } from 'tsyringe';
import z from 'zod';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleOptionId } from '#~/enums/module-option-ids.enums';
import type { iModuleManifest, iModuleOption } from '#~/manifest/module-manifest.schema';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { GeneratorError } from './generator-error';

const recordedOptionValueSchema = z.string();

export type iModuleOptionValues = ReadonlyMap<ModuleOptionId, string>;

/** Turns option answers into recorded values, and recorded values into the contributions they add. */
@injectable()
export class ModuleOptionResolver {
  /** The values a module records: the requested ones, and the default for every other option. */
  public valuesFor(manifest: iModuleManifest, requested: iModuleOptionValues) {
    return Object.fromEntries(
      manifest.options.map((option) => {
        const value = requested.get(option.id) ?? option.defaultValue;
        this.assertChoice(option, value);
        return [option.id, value];
      }),
    );
  }

  /** Every option the selected modules ask for, so `create` can prompt for them. */
  public optionsOf(modules: readonly iModuleManifest[]) {
    return modules.flatMap((manifest) => manifest.options);
  }

  public assertChoice(option: iModuleOption, value: string) {
    if (option.choices.some((choice) => choice.value === value)) return;
    throw new GeneratorError(
      GENERATOR_ERROR_CODES.INVALID_MODULE_OPTION,
      `--${option.id}: "${value}" is not one of ${option.choices.map((choice) => choice.value).join(', ')}`,
    );
  }

  /** The modules with the contributions of their recorded choices (defaults for unrecorded options) added. */
  public withChosenContributions(modules: iModuleManifest[], record: iProjectRecord) {
    const recordedById = new Map(record.modules.map((recorded) => [recorded.id, recorded.options]));

    return modules.map((manifest) => {
      if (manifest.options.length === 0) return manifest;

      const recorded = recordedById.get(manifest.id) ?? {};
      const chosen = manifest.options.flatMap((option) => {
        const parsed = recordedOptionValueSchema.safeParse(recorded[option.id]);
        const value = parsed.success ? parsed.data : option.defaultValue;
        this.assertChoice(option, value);
        return option.choices.find((choice) => choice.value === value)?.contributions ?? [];
      });
      return { ...manifest, contributions: [...manifest.contributions, ...chosen] };
    });
  }
}
