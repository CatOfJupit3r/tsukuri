import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import type { ModuleId } from '@~/enums/module-ids.enums';
import { moduleIdSchema } from '@~/enums/module-ids.enums';

import { GeneratorError } from './generator-error';

const OPEN_PATTERN = /^\s*<module\s+(id|not)="([^"]*)"\s*>\s*$/;
const CLOSE_PATTERN = /^\s*<\/module>\s*$/;

interface iOpenBlock {
  isIncluded: boolean;
  line: number;
}

function parseIds(value: string, source: string, line: number) {
  return value.split(',').map((raw) => {
    const parsed = moduleIdSchema.safeParse(raw.trim());
    if (!parsed.success) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.INVALID_MANIFEST,
        `${source}:${line}: "${raw.trim()}" in a <module> block is not a module id`,
      );
    }
    return parsed.data;
  });
}

/**
 * Keeps or drops `<module id="a,b">` (any installed) and `<module not="a">` (none installed)
 * blocks. Tags sit on their own lines and may nest; the tag lines themselves are removed.
 */
export function renderModuleBlocks(text: string, installed: ReadonlySet<ModuleId>, source: string) {
  const stack: iOpenBlock[] = [];
  const output: string[] = [];
  const lines = text.split('\n');

  lines.forEach((content, index) => {
    const line = index + 1;
    const open = OPEN_PATTERN.exec(content);
    if (open) {
      const ids = parseIds(open[2] ?? '', source, line);
      const isAnyInstalled = ids.some((id) => installed.has(id));
      stack.push({ isIncluded: open[1] === 'id' ? isAnyInstalled : !isAnyInstalled, line });
      return;
    }

    if (CLOSE_PATTERN.test(content)) {
      if (!stack.pop()) {
        throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_MANIFEST, `${source}:${line}: unmatched </module>`);
      }
      return;
    }

    if (stack.every((block) => block.isIncluded)) output.push(content);
  });

  const unclosed = stack.at(-1);
  if (unclosed) {
    throw new GeneratorError(
      GENERATOR_ERROR_CODES.INVALID_MANIFEST,
      `${source}:${unclosed.line}: <module> block is never closed`,
    );
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n');
}
