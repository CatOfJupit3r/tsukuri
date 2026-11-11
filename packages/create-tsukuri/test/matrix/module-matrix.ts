import { PRESETS } from '#~/cli/create/presets';
import { GeneratorError } from '#~/engine/generator-error';
import type { ModuleRegistry } from '#~/engine/modules/module-registry';
import type { ModuleResolver } from '#~/engine/modules/module-resolver';
import { PRESET_IDS } from '#~/enums/cli/preset-ids.enums';
import type { PromptId } from '#~/enums/cli/prompt-ids.enums';
import { PROMPT_IDS, PROMPT_META, promptIdsEnumwaii } from '#~/enums/cli/prompt-ids.enums';
import type { GeneratorErrorCode } from '#~/enums/generator-error-codes.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';

const CORE_PROMPTS = new Set<PromptId>([
  PROMPT_IDS.BACKEND,
  PROMPT_IDS.SHIPPING,
  PROMPT_IDS.RENDERING,
  PROMPT_IDS.DATABASE,
  PROMPT_IDS.AUTH,
]);
const INVALID_SELECTION_CODES = new Set<GeneratorErrorCode>([
  GENERATOR_ERROR_CODES.MODULE_CONFLICT,
  GENERATOR_ERROR_CODES.CAPABILITY_CONFLICT,
  GENERATOR_ERROR_CODES.MISSING_CAPABILITY,
]);
const MAX_MATRIX_JOBS = 256;

function* enumerateSelections(
  axes: readonly ModuleId[][],
  selection: readonly ModuleId[] = [],
): Generator<readonly ModuleId[]> {
  const [choices, ...rest] = axes;
  if (!choices) {
    yield selection;
    return;
  }
  yield* enumerateSelections(rest, selection);
  for (const choice of choices) yield* enumerateSelections(rest, [...selection, choice]);
}

function resolveSelection(resolver: ModuleResolver, selection: readonly ModuleId[]) {
  try {
    return resolver.resolve(selection);
  } catch (error) {
    if (error instanceof GeneratorError && INVALID_SELECTION_CODES.has(error.code)) return null;
    throw error;
  }
}

/** Plans one CI job per distinct resolved project, plus one per compatible fullstack add-on. */
export function planModuleMatrix(registry: ModuleRegistry, resolver: ModuleResolver) {
  const selectable = registry.list().filter((manifest) => !manifest.isAlwaysIncluded && !manifest.autoInclude);
  const choices = (promptId: PromptId) =>
    selectable
      .filter((manifest) => manifest.category === PROMPT_META.get(promptId).category)
      .map((manifest) => manifest.id)
      .sort();
  const cases = new Map<string, { name: string; modules: string }>();
  const addCase = (selection: readonly ModuleId[], resolved: ReturnType<typeof resolver.resolve>) => {
    const key = resolved.modules.map((manifest) => manifest.id).join(',');
    if (cases.has(key)) return;
    if (cases.size === MAX_MATRIX_JOBS) {
      throw new Error(`The generated project matrix exceeds GitHub Actions' ${MAX_MATRIX_JOBS}-job limit`);
    }
    cases.set(key, { name: selection.join(' + ') || 'base', modules: JSON.stringify(selection) });
  };

  for (const selection of enumerateSelections([...CORE_PROMPTS].map(choices))) {
    const resolved = resolveSelection(resolver, selection);
    if (resolved) addCase(selection, resolved);
  }

  const preset = PRESETS.get(PRESET_IDS.FULLSTACK).answers;
  const fullstack = [...preset.values()].flat();
  addCase(fullstack, resolver.resolve(fullstack));
  const fullstackCore = [...CORE_PROMPTS].flatMap((promptId) => preset.get(promptId) ?? []);
  const addOns = promptIdsEnumwaii.values.filter((promptId) => !CORE_PROMPTS.has(promptId)).flatMap(choices);
  for (const addOn of addOns) {
    const selection = [...fullstackCore, addOn];
    const resolved = resolveSelection(resolver, selection);
    if (resolved) addCase(selection, resolved);
  }

  return [...cases.values()];
}
