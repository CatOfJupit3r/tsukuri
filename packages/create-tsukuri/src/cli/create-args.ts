import { parseArgs } from 'node:util';
import type { ParseArgsConfig } from 'node:util';

import { GeneratorError } from '#~/engine/generator-error';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import { moduleIdSchema } from '#~/enums/module-ids.enums';
import type { PresetId } from '#~/enums/preset-ids.enums';
import { presetIdSchema } from '#~/enums/preset-ids.enums';
import type { PromptId } from '#~/enums/prompt-ids.enums';
import { PROMPT_META, promptIdsEnumwaii } from '#~/enums/prompt-ids.enums';
import type { SkillId } from '#~/enums/skill-ids.enums';
import { skillIdSchema } from '#~/enums/skill-ids.enums';

import type { iPromptAnswers } from './presets';

/** Flag value meaning "no module" for a prompt. */
export const NONE_FLAG_VALUE = 'none';

export interface iCreateArgs {
  directory: string | null;
  preset: PresetId | null;
  /** Only the prompts answered by a flag. */
  answers: iPromptAnswers;
  skills: SkillId[] | null;
  excludedSkills: SkillId[] | null;
  isYes: boolean;
  shouldInitGit: boolean | null;
  shouldInstall: boolean | null;
  shouldVerify: boolean | null;
  isHelp: boolean;
}

const OPTIONS = {
  preset: { type: 'string' },
  skills: { type: 'string' },
  'exclude-skills': { type: 'string' },
  yes: { type: 'boolean', short: 'y' },
  git: { type: 'boolean' },
  install: { type: 'boolean' },
  verify: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  ...Object.fromEntries(promptIdsEnumwaii.values.map((id) => [id, { type: 'string' }])),
} satisfies ParseArgsConfig['options'];

function invalid(message: string): never {
  throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_ARGUMENTS, message);
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIds<T>(flag: string, value: string, parse: (raw: string) => { success: boolean; data?: T }) {
  return splitList(value).map((raw) => {
    const parsed = parse(raw);
    if (!parsed.success || parsed.data === undefined) invalid(`--${flag}: "${raw}" is not a known id`);
    return parsed.data;
  });
}

function parsePromptAnswer(promptId: PromptId, value: string) {
  if (value === NONE_FLAG_VALUE) return [];

  const ids = parseIds(promptId, value, (raw) => moduleIdSchema.safeParse(raw));
  if (!PROMPT_META.get(promptId).isMultiple && ids.length > 1) {
    invalid(`--${promptId} takes one module id or "${NONE_FLAG_VALUE}"`);
  }
  return ids;
}

export function parseCreateArgs(argv: string[]): iCreateArgs {
  let parsed: ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true; allowNegative: true }>>;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, allowNegative: true, strict: true });
  } catch (error) {
    invalid(error instanceof Error ? error.message : String(error));
  }

  const { values, positionals } = parsed;
  if (positionals.length > 1) invalid(`Expected one project directory, got: ${positionals.join(' ')}`);

  const flagValue = (name: string) => {
    const value: unknown = (values as Record<string, unknown>)[name];
    return typeof value === 'string' ? value : null;
  };

  const answers: iPromptAnswers = new Map();
  for (const promptId of promptIdsEnumwaii.values) {
    const value = flagValue(promptId);
    if (value !== null) answers.set(promptId, parsePromptAnswer(promptId, value));
  }

  const preset = flagValue('preset');
  const skills = flagValue('skills');
  const excludedSkills = flagValue('exclude-skills');
  if (skills !== null && excludedSkills !== null) invalid('Use either --skills or --exclude-skills, not both');

  return {
    directory: positionals[0] ?? null,
    preset: preset === null ? null : (parseIds('preset', preset, (raw) => presetIdSchema.safeParse(raw))[0] ?? null),
    answers,
    skills: skills === null ? null : parseIds('skills', skills, (raw) => skillIdSchema.safeParse(raw)),
    excludedSkills:
      excludedSkills === null
        ? null
        : parseIds('exclude-skills', excludedSkills, (raw) => skillIdSchema.safeParse(raw)),
    isYes: values.yes === true,
    shouldInitGit: typeof values.git === 'boolean' ? values.git : null,
    shouldInstall: typeof values.install === 'boolean' ? values.install : null,
    shouldVerify: typeof values.verify === 'boolean' ? values.verify : null,
    isHelp: values.help === true,
  };
}
