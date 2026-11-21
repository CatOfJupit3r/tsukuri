import { injectable } from 'tsyringe';

import { env } from '#~/constants/env';
import { refuseProductionPlaceholder } from '#~/features/startup/refuse-production-placeholder';
import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { INTERNAL_RENDER_SECRET_PLACEHOLDER } from './internal-render-secret.constants';

@injectable()
export class InternalRenderSecretTask implements iStartupTask {
  public readonly name = 'Check the internal render secret';

  public async run() {
    refuseProductionPlaceholder({
      variableName: 'INTERNAL_RENDER_SECRET',
      value: env.INTERNAL_RENDER_SECRET,
      placeholder: INTERNAL_RENDER_SECRET_PLACEHOLDER,
      instruction: 'Set a random secret of 32 or more characters, the same one for the web app and the API.',
    });
  }
}
