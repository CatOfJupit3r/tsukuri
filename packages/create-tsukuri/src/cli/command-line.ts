import { promptIdsEnumwaii } from '@~/enums/prompt-ids.enums';
import type { SkillId } from '@~/enums/skill-ids.enums';

import { NONE_FLAG_VALUE } from './create-args';
import type { iPromptAnswers } from './presets';

export const CREATE_COMMAND = 'pnpm create tsukuri';

export interface iCommandLineInput {
  directory: string;
  answers: iPromptAnswers;
  excludedSkills: readonly SkillId[];
  shouldInitGit: boolean;
  shouldInstall: boolean;
  shouldVerify: boolean;
}

function quote(value: string) {
  return /^[\w./@:-]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`;
}

/** The non-interactive command that reproduces a set of answers. */
export function renderCreateCommandLine(input: iCommandLineInput) {
  const parts = [CREATE_COMMAND, quote(input.directory)];

  for (const promptId of promptIdsEnumwaii.values) {
    const answer = input.answers.get(promptId);
    if (answer === undefined) continue;
    parts.push(`--${promptId}`, answer.length > 0 ? answer.join(',') : NONE_FLAG_VALUE);
  }

  if (input.excludedSkills.length > 0) parts.push('--exclude-skills', input.excludedSkills.join(','));
  parts.push(input.shouldInitGit ? '--git' : '--no-git');
  parts.push(input.shouldInstall ? '--install' : '--no-install');
  parts.push(input.shouldVerify ? '--verify' : '--no-verify');
  parts.push('--yes');

  return parts.join(' ');
}
