import path from 'node:path';
import 'reflect-metadata';

import { GeneratorError } from '@~/engine/generator-error';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';

import { ClackPrompter } from './clack-prompter';
import { createCliContainer } from './cli-container';
import { NodeCommandRunner } from './command-runner';
import { CreateCommand } from './create-command';

/** Module sources of a local checkout: the repository root. */
const LOCAL_SOURCE_ROOT = path.resolve(import.meta.dirname, '../../../..');
const CANCELLED_EXIT_CODE = 130;
const CREATE_SUBCOMMAND = 'create';

async function main() {
  // `pnpm run create -- <args>` forwards the `--` separator itself.
  const rawArgv = process.argv.slice(2);
  const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;
  const prompter = new ClackPrompter();
  const container = createCliContainer({
    sourceRoot: LOCAL_SOURCE_ROOT,
    // pnpm sets INIT_CWD to the directory the user ran `pnpm run ...` from.
    cwd: process.env.INIT_CWD ?? process.cwd(),
    prompter,
    runner: new NodeCommandRunner(),
  });

  try {
    await container.resolve(CreateCommand).run(argv[0] === CREATE_SUBCOMMAND ? argv.slice(1) : argv);
  } catch (error) {
    if (error instanceof GeneratorError) {
      prompter.error(error.message);
      process.exitCode = error.code === GENERATOR_ERROR_CODES.CANCELLED ? CANCELLED_EXIT_CODE : 1;
      return;
    }
    throw error;
  }
}

await main();
