import { injectable } from 'tsyringe';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { INTERNAL_RENDER_SECRET_PLACEHOLDER } from './internal-render-secret.constants';

@injectable()
export class InternalRenderSecretTask implements iStartupTask {
  public readonly name = 'Check the internal render secret';

  public async run() {
    if (
      env.NODE_ENV === NODE_ENVIRONMENTS.PRODUCTION &&
      env.INTERNAL_RENDER_SECRET === INTERNAL_RENDER_SECRET_PLACEHOLDER
    ) {
      throw new Error(
        'INTERNAL_RENDER_SECRET is still the placeholder from .env.example. Set a random secret of 32 or more characters, the same one for the web app and the API.',
      );
    }
  }
}
