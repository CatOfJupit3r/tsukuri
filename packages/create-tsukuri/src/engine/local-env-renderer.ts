import { randomBytes } from 'node:crypto';
import { injectable } from 'tsyringe';

import { BETTER_AUTH_SECRET_VARIABLE } from '#~/constants/better-auth-secret';
import { INTERNAL_RENDER_SECRET_VARIABLE } from '#~/constants/internal-render-secret';

const SECRET_BYTES = 32;
const GENERATED_SECRET_VARIABLES = [BETTER_AUTH_SECRET_VARIABLE, INTERNAL_RENDER_SECRET_VARIABLE];

/**
 * The project's own `.env`: `.env.example` with a generated random value instead of each secret's placeholder.
 * A variable listed under several workspaces gets the same value on every line.
 */
@injectable()
export class LocalEnvRenderer {
  public render(exampleContent: string) {
    return GENERATED_SECRET_VARIABLES.reduce((content, variable) => {
      const secretLine = new RegExp(`^${variable}=.*$`, 'gm');
      const secret = randomBytes(SECRET_BYTES).toString('hex');
      return content.replace(secretLine, () => `${variable}=${secret}`);
    }, exampleContent);
  }
}
