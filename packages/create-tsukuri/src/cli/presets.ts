import type { ModuleId } from '#~/enums/module-ids.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { PRESET_IDS, presetIdsEnumwaii } from '#~/enums/preset-ids.enums';
import type { PromptId } from '#~/enums/prompt-ids.enums';
import { PROMPT_IDS } from '#~/enums/prompt-ids.enums';

/** Answer per prompt. A Map, because branded enum members cannot key a `Record`. */
export type iPromptAnswers = Map<PromptId, ModuleId[]>;

interface iPreset {
  description: string;
  /** Answers the preset fills in; flags given next to `--preset` override them. */
  answers: iPromptAnswers;
}

/** Each module task adds its module to the presets it belongs to. */
export const PRESETS = presetIdsEnumwaii.derive<iPreset>()(
  [
    PRESET_IDS.FULLSTACK,
    {
      description: 'Web app with a Node backend, database and auth',
      answers: new Map<PromptId, ModuleId[]>([
        [PROMPT_IDS.BACKEND, [MODULE_IDS.NODE_HONO]],
        [PROMPT_IDS.DATABASE, [MODULE_IDS.POSTGRES]],
        [PROMPT_IDS.AUTH, [MODULE_IDS.BETTER_AUTH]],
        [PROMPT_IDS.INFRASTRUCTURE, [MODULE_IDS.VALKEY]],
      ]),
    },
  ],
  [PRESET_IDS.WEB_LOCAL_FIRST, { description: 'Client-only web app with local-first storage', answers: new Map() }],
  [PRESET_IDS.DESKTOP, { description: 'Electron desktop app with an in-process backend', answers: new Map() }],
);
