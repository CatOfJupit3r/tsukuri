import { randomBytes } from 'node:crypto';
import { injectable } from 'tsyringe';

import { BETTER_AUTH_SECRET_VARIABLE } from '#~/constants/better-auth-secret';

const SECRET_BYTES = 32;

/** The project's own `.env`: `.env.example` with a generated random auth secret instead of the placeholder. */
@injectable()
export class LocalEnvRenderer {
  public render(exampleContent: string) {
    const secretLine = new RegExp(`^${BETTER_AUTH_SECRET_VARIABLE}=.*$`, 'm');
    return exampleContent.replace(
      secretLine,
      () => `${BETTER_AUTH_SECRET_VARIABLE}=${randomBytes(SECRET_BYTES).toString('hex')}`,
    );
  }
}
