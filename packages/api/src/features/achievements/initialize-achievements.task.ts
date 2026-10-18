import { injectable } from 'tsyringe';

import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { AchievementsService } from './achievements.service';

@injectable()
export class InitializeAchievementsTask implements iStartupTask {
  public readonly name = 'Subscribe achievements to their events';

  constructor(private readonly achievementsService: AchievementsService) {}

  public async run() {
    this.achievementsService.initialize();
  }
}
