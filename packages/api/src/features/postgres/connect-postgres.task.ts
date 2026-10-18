import { injectable } from 'tsyringe';

import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { PostgresService } from './postgres.service';

@injectable()
export class ConnectPostgresTask implements iStartupTask {
  public readonly name = 'Connect to Postgres';

  constructor(private readonly postgresService: PostgresService) {}

  public async run() {
    this.postgresService.connect();
  }
}
