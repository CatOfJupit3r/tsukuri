import { injectable } from 'tsyringe';

import { GeneratorError } from '#~/engine/generator-error';
import { ModuleRegistry } from '#~/engine/modules/module-registry';
import { ModuleResolver } from '#~/engine/modules/module-resolver';
import type { PromptId } from '#~/enums/cli/prompt-ids.enums';
import { PROMPT_META } from '#~/enums/cli/prompt-ids.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { SkillId } from '#~/enums/skill-ids.enums';
import type { iModuleManifest } from '#~/manifest/module-manifest.schema';

export interface iPromptChoices {
  /** Modules of the prompt's category that can be added to the current selection. */
  options: iModuleManifest[];
  /** Modules of the prompt's category that earlier answers already pulled in. */
  locked: iModuleManifest[];
}

@injectable()
export class SelectionPlanner {
  public constructor(
    private readonly registry: ModuleRegistry,
    private readonly resolver: ModuleResolver,
  ) {}

  /** What a prompt can offer given the answers so far: conflicting modules are hidden, required ones locked. */
  public choicesFor(promptId: PromptId, selected: readonly ModuleId[]): iPromptChoices {
    const { category } = PROMPT_META.get(promptId);
    const included = new Set(
      this.resolver.resolve(selected, { shouldRequireCapabilities: false }).modules.map((m) => m.id),
    );
    const inCategory = this.registry.list().filter((manifest) => manifest.category === category);

    return {
      locked: inCategory.filter((manifest) => included.has(manifest.id)),
      options: inCategory.filter(
        (manifest) => !included.has(manifest.id) && this.resolver.isCompatible(selected, manifest.id),
      ),
    };
  }

  /** Checks a flag or preset answer the same way the interactive prompt would filter it. */
  public assertAnswer(promptId: PromptId, answer: readonly ModuleId[], selected: readonly ModuleId[]) {
    const { category } = PROMPT_META.get(promptId);
    for (const id of answer) {
      const manifest = this.registry.get(id);
      if (manifest.category !== category) {
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
          `--${promptId}: "${id}" is not a ${category.toLowerCase()} module`,
        );
      }
    }
    this.resolver.resolve([...selected, ...answer], { shouldRequireCapabilities: false });
  }

  /** Skills shipped by the resolved modules, in module order. */
  public applicableSkills(modules: readonly iModuleManifest[]): SkillId[] {
    return [...new Set(modules.flatMap((manifest) => manifest.skills))];
  }
}
