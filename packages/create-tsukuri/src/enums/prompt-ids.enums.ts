import { em } from 'enumwaii';

import type { ModuleCategory } from './module-categories.enums';
import { MODULE_CATEGORIES } from './module-categories.enums';

/** Module prompts asked by `create`, in dependency order. Values double as CLI flag names. */
export const promptIdsEnumwaii = em({
  BACKEND: 'backend',
  SHIPPING: 'shipping',
  RENDERING: 'rendering',
  DATABASE: 'database',
  AUTH: 'auth',
  STORAGE: 'storage',
  INFRASTRUCTURE: 'infrastructure',
  QUALITY: 'quality',
  RELEASE: 'release',
  AGENT: 'agent',
  FEATURES: 'features',
});

export const PROMPT_IDS = promptIdsEnumwaii.enum;
export type PromptId = (typeof promptIdsEnumwaii)['~type'];

interface iPromptMeta {
  category: ModuleCategory;
  message: string;
  /** Multi-select prompts take a comma-separated flag value; single-select ones take one id. */
  isMultiple: boolean;
  /** Label of the "no module" choice for single-select prompts. */
  noneLabel: string;
}

export const PROMPT_META = promptIdsEnumwaii.derive<iPromptMeta>()(
  [
    PROMPT_IDS.BACKEND,
    {
      category: MODULE_CATEGORIES.BACKEND,
      message: 'Where does the backend run?',
      isMultiple: false,
      noneLabel: 'No backend (client-only app)',
    },
  ],
  [
    PROMPT_IDS.SHIPPING,
    {
      category: MODULE_CATEGORIES.SHIPPING,
      message: 'How does the app ship?',
      isMultiple: false,
      noneLabel: 'Website',
    },
  ],
  [
    PROMPT_IDS.RENDERING,
    { category: MODULE_CATEGORIES.WEB, message: 'Web app rendering', isMultiple: false, noneLabel: 'No web app' },
  ],
  [
    PROMPT_IDS.DATABASE,
    { category: MODULE_CATEGORIES.DATABASE, message: 'Database', isMultiple: false, noneLabel: 'None' },
  ],
  [
    PROMPT_IDS.AUTH,
    { category: MODULE_CATEGORIES.AUTH, message: 'Authentication', isMultiple: false, noneLabel: 'None' },
  ],
  [
    PROMPT_IDS.STORAGE,
    { category: MODULE_CATEGORIES.STORAGE, message: 'Local storage', isMultiple: false, noneLabel: 'None' },
  ],
  [
    PROMPT_IDS.INFRASTRUCTURE,
    {
      category: MODULE_CATEGORIES.INFRASTRUCTURE,
      message: 'Infrastructure packages',
      isMultiple: true,
      noneLabel: 'None',
    },
  ],
  [
    PROMPT_IDS.QUALITY,
    { category: MODULE_CATEGORIES.QUALITY, message: 'Quality add-ons', isMultiple: true, noneLabel: 'None' },
  ],
  [
    PROMPT_IDS.RELEASE,
    { category: MODULE_CATEGORIES.RELEASE, message: 'Release and deployment', isMultiple: true, noneLabel: 'None' },
  ],
  [
    PROMPT_IDS.AGENT,
    { category: MODULE_CATEGORIES.AGENT, message: 'Agent tooling', isMultiple: true, noneLabel: 'None' },
  ],
  [
    PROMPT_IDS.FEATURES,
    { category: MODULE_CATEGORIES.FEATURE, message: 'Features', isMultiple: true, noneLabel: 'None' },
  ],
);
