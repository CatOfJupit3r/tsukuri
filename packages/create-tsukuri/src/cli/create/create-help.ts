import { presetIdsEnumwaii } from '#~/enums/cli/preset-ids.enums';
import { PROMPT_META, promptIdsEnumwaii } from '#~/enums/cli/prompt-ids.enums';

import { CREATE_COMMAND } from '../command-line';
import { NONE_FLAG_VALUE } from './create-args';
import { PRESETS } from './presets';

/** Usage text for `create --help`; module ids per prompt are listed by the prompts themselves. */
export function renderCreateHelp() {
  const promptFlags = promptIdsEnumwaii.values.map((id) => {
    const meta = PROMPT_META.get(id);
    const value = meta.isMultiple ? '<ids>' : `<id|${NONE_FLAG_VALUE}>`;
    return `  --${id} ${value}`.padEnd(34) + meta.message;
  });
  const presets = presetIdsEnumwaii.values.map((id) => `  ${id}`.padEnd(34) + PRESETS.get(id).description);

  return [
    `Usage: ${CREATE_COMMAND} [directory] [flags]`,
    '',
    'Runs interactively; every prompt can be answered with a flag instead.',
    '',
    'Module prompts:',
    ...promptFlags,
    '',
    'Other flags:',
    '  --preset <id>                   Answer several prompts at once',
    '  --skills <ids>                  Only these agent skills',
    '  --exclude-skills <ids>          Every applicable skill except these',
    '  --[no-]git                      Run git init',
    '  --[no-]install                  Run pnpm install',
    '  --[no-]verify                   Run pnpm run verify (needs install)',
    '  -y, --yes                       Accept defaults for unanswered prompts and skip the summary',
    '  -h, --help                      Show this help',
    '',
    'Presets:',
    ...presets,
  ].join('\n');
}
