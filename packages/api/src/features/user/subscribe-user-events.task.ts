import { injectable } from 'tsyringe';

import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { UserEventsService } from './user-events.service';

@injectable()
export class SubscribeUserEventsTask implements iStartupTask {
  public readonly name = 'Create user profiles on registration';

  public constructor(private readonly userEventsService: UserEventsService) {}

  public async run() {
    this.userEventsService.initialize();
  }
}
