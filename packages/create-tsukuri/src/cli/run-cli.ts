import { GeneratorError } from '@~/engine/generator-error';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import { modifyActionsEnumwaii } from '@~/enums/modify-actions.enums';

import { ClackPrompter } from './clack-prompter';
import { createCliContainer } from './cli-container';
import type { iCliContainerOptions } from './cli-container';
import { NodeCommandRunner } from './command-runner';
import { CreateCommand } from './create-command';
import { ModifyCommand } from './modify-command';

const CANCELLED_EXIT_CODE = 130;
const CREATE_SUBCOMMAND = 'create';
const ARGUMENT_SEPARATOR = '--';

/** `pnpm run create -- <args>` forwards the separator itself; no command of the CLI takes one. */
function withoutArgumentSeparator(argv: string[]) {
  const separatorIndex = argv.indexOf(ARGUMENT_SEPARATOR);
  return separatorIndex === -1 ? argv : argv.toSpliced(separatorIndex, 1);
}

/**
 * Runs `create`, `add` or `remove` against the module sources under `sourceRoot`, resolving the
 * project folders given on the command line against `cwd`. The local and the published entry
 * points differ only in these.
 */
export async function runCli({
  sourceRoot,
  sourceLayout,
  cwd,
}: Pick<iCliContainerOptions, 'sourceRoot' | 'sourceLayout' | 'cwd'>) {
  const argv = withoutArgumentSeparator(process.argv.slice(2));
  const prompter = new ClackPrompter();
  const container = createCliContainer({
    sourceRoot,
    sourceLayout,
    cwd,
    prompter,
    runner: new NodeCommandRunner(),
  });

  try {
    const [subcommand, ...rest] = argv;
    const modifyAction = modifyActionsEnumwaii.safeParse(subcommand);
    if (modifyAction.success) await container.resolve(ModifyCommand).run(modifyAction.value, rest);
    else await container.resolve(CreateCommand).run(subcommand === CREATE_SUBCOMMAND ? rest : argv);
  } catch (error) {
    if (error instanceof GeneratorError) {
      prompter.error(error.message);
      process.exitCode = error.code === GENERATOR_ERROR_CODES.CANCELLED ? CANCELLED_EXIT_CODE : 1;
      return;
    }
    throw error;
  }
}
