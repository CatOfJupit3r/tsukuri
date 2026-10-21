import { container, injectable } from 'tsyringe';
import type { constructor } from 'tsyringe/dist/typings/types';

import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';
import { generatedStartupTasks } from '#~/generated/startup-tasks';

import type { iStartupTask } from './startup-task.types';

/** Runs the installed modules' startup tasks one after another, required modules first. */
@injectable()
export class StartupTaskRunner implements iWithLogger {
  public readonly logger: LoggerType;

  private readonly tasks: constructor<iStartupTask>[] = generatedStartupTasks;

  public constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('startup');
  }

  public async run() {
    for (const Task of this.tasks) {
      const task = container.resolve(Task);
      this.logger.debug(`Startup task: ${task.name}`);
      await task.run();
    }
  }
}
