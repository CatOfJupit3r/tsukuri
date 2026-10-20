import { injectable } from 'tsyringe';

import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { DatabaseService } from './database.service';

@injectable()
export class ConnectDatabaseTask implements iStartupTask {
  public readonly name = 'Connect to the database';

  public constructor(private readonly databaseService: DatabaseService) {}

  public async run() {
    await this.databaseService.connect();
  }
}
