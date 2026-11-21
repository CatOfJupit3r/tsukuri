import { injectable } from 'tsyringe';

import { env } from '#~/constants/env';
import { refuseProductionPlaceholder } from '#~/features/startup/refuse-production-placeholder';
import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { BETTER_AUTH_SECRET_PLACEHOLDER } from './auth.constants';

@injectable()
export class AuthSecretTask implements iStartupTask {
  public readonly name = 'Check the auth secret';

  public async run() {
    refuseProductionPlaceholder({
      variableName: 'BETTER_AUTH_SECRET',
      value: env.BETTER_AUTH_SECRET,
      placeholder: BETTER_AUTH_SECRET_PLACEHOLDER,
      instruction: 'Set a random secret of 32 or more characters.',
    });
  }
}
