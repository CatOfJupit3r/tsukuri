import type { iGeneratorContainerOptions } from '@~/di/container';
import { createGeneratorContainer } from '@~/di/container';

import { COMMAND_RUNNER_TOKEN } from './command-runner';
import type { iCommandRunner } from './command-runner';
import { CreateCommand } from './create-command';
import { CWD_TOKEN } from './cwd';
import { ModifyCommand } from './modify-command';
import { PROMPTER_TOKEN } from './prompter';
import type { iPrompter } from './prompter';
import { SelectionPlanner } from './selection-planner';

export interface iCliContainerOptions extends iGeneratorContainerOptions {
  cwd: string;
  prompter: iPrompter;
  runner: iCommandRunner;
}

/** Generator container plus the CLI commands and their I/O (prompts, child processes, cwd). */
export function createCliContainer({ cwd, prompter, runner, ...generatorOptions }: iCliContainerOptions) {
  const child = createGeneratorContainer(generatorOptions);
  child.register(CWD_TOKEN, { useValue: cwd });
  child.register(PROMPTER_TOKEN, { useValue: prompter });
  child.register(COMMAND_RUNNER_TOKEN, { useValue: runner });
  child.registerSingleton(SelectionPlanner);
  child.registerSingleton(CreateCommand);
  child.registerSingleton(ModifyCommand);
  return child;
}
