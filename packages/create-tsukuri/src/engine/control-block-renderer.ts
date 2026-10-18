import { injectable } from 'tsyringe';

import type { ControlBlock } from '#~/enums/control-blocks.enums';
import { CONTROL_BLOCKS, controlBlocksEnumwaii } from '#~/enums/control-blocks.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { Harness } from '#~/enums/harnesses.enums';
import { harnessesEnumwaii } from '#~/enums/harnesses.enums';

import { GeneratorError } from './generator-error';

export interface iControlBlockOptions {
  /** Harness the output is written for; `null` drops every harness-specific block. */
  harness: Harness | null;
  includePrivate: boolean;
  /** Template path, named in errors. */
  source: string;
}

interface iOpenControlBlock {
  type: ControlBlock;
  isIncluded: boolean;
  lineNumber: number;
}

const HARNESS_OPEN_TAG_PATTERN = new RegExp(`^<${CONTROL_BLOCKS.HARNESS_SPECIFIC} id="([^"]*)">$`);

/**
 * `<harness-specific id="...">` and `<private>` blocks, each tag alone on its line. Blocks nest, and a
 * line that looks like a tag but does not parse fails the render, so excluded content never leaks.
 */
@injectable()
export class ControlBlockRenderer {
  public render(template: string, options: iControlBlockOptions) {
    const output: string[] = [];
    const openBlocks: iOpenControlBlock[] = [];

    for (const [lineIndex, line] of template.split('\n').entries()) {
      const lineNumber = lineIndex + 1;
      const tag = line.trim();

      const openBlock = this.parseOpenTag(tag, options, lineNumber);
      if (openBlock) {
        openBlocks.push(openBlock);
        continue;
      }

      const closedType = this.parseCloseTag(tag);
      if (closedType) {
        this.closeBlock(openBlocks, closedType, options.source, lineNumber);
        continue;
      }

      if (this.looksLikeControlTag(tag)) {
        throw this.templateError(options.source, lineNumber, `malformed control tag: ${tag}`);
      }

      if (openBlocks.every((block) => block.isIncluded)) output.push(line);
    }

    const unclosedBlock = openBlocks.at(-1);
    if (unclosedBlock) {
      throw this.templateError(options.source, unclosedBlock.lineNumber, `unclosed <${unclosedBlock.type}> block`);
    }

    return output.join('\n');
  }

  private parseOpenTag(tag: string, options: iControlBlockOptions, lineNumber: number) {
    if (tag === `<${CONTROL_BLOCKS.PRIVATE}>`) {
      return {
        type: CONTROL_BLOCKS.PRIVATE,
        isIncluded: options.includePrivate,
        lineNumber,
      } satisfies iOpenControlBlock;
    }

    const harnessId = HARNESS_OPEN_TAG_PATTERN.exec(tag)?.[1];
    if (!harnessesEnumwaii.is(harnessId)) return null;

    return {
      type: CONTROL_BLOCKS.HARNESS_SPECIFIC,
      isIncluded: harnessId === options.harness,
      lineNumber,
    } satisfies iOpenControlBlock;
  }

  private parseCloseTag(tag: string) {
    return controlBlocksEnumwaii.values.find((type) => tag === `</${type}>`) ?? null;
  }

  private closeBlock(openBlocks: iOpenControlBlock[], closedType: ControlBlock, source: string, lineNumber: number) {
    const activeBlock = openBlocks.pop();
    if (!activeBlock) throw this.templateError(source, lineNumber, `unexpected </${closedType}>`);
    if (activeBlock.type !== closedType) {
      throw this.templateError(source, lineNumber, `expected </${activeBlock.type}> before </${closedType}>`);
    }
  }

  private looksLikeControlTag(tag: string) {
    return controlBlocksEnumwaii.values.some((type) => tag.startsWith(`<${type}`) || tag.startsWith(`</${type}`));
  }

  private templateError(source: string, lineNumber: number, message: string) {
    return new GeneratorError(GENERATOR_ERROR_CODES.TEMPLATE_ERROR, `${source}:${lineNumber}: ${message}`);
  }
}
