import { injectable } from 'tsyringe';

import { DatabaseService } from '#~/features/database/database.service';
import type { iStartupTask } from '#~/features/startup/startup-task.types';

@injectable()
export class ConnectDatabaseTask implements iStartupTask {
  public readonly name = 'Connect to the database';

  constructor(private readonly databaseService: DatabaseService) {}

  public async run() {
    await this.databaseService.connect();
  }
}
