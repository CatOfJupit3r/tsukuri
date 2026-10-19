import { injectable } from 'tsyringe';

import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { ValkeyService } from './valkey.service';

@injectable()
export class ConnectValkeyTask implements iStartupTask {
  public readonly name = 'Connect to Valkey';

  constructor(private readonly valkeyService: ValkeyService) {}

  public async run() {
    await this.valkeyService.connect();
  }
}
