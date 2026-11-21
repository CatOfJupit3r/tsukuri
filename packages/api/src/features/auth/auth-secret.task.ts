import { injectable } from 'tsyringe';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { BETTER_AUTH_SECRET_PLACEHOLDER } from './auth.constants';

@injectable()
export class AuthSecretTask implements iStartupTask {
  public readonly name = 'Check the auth secret';

  public async run() {
    if (env.NODE_ENV === NODE_ENVIRONMENTS.PRODUCTION && env.BETTER_AUTH_SECRET === BETTER_AUTH_SECRET_PLACEHOLDER) {
      throw new Error(
        'BETTER_AUTH_SECRET is still the placeholder from .env.example. Set a random secret of 32 or more characters.',
      );
    }
  }
}
