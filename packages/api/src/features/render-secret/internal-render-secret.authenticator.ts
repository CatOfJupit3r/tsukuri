import { createHash, timingSafeEqual } from 'node:crypto';
import { singleton } from 'tsyringe';

import { INTERNAL_RENDER_SECRET_HEADER } from '@startername/common/constants/internal-render-secret';

import { env } from '#~/constants/env';
import type { iServerRenderAuthenticator } from '#~/features/http/server-render-authenticator';

/** Recognises the server render of a web app running in its own process by the secret both processes share. */
@singleton()
export class InternalRenderSecretAuthenticator implements iServerRenderAuthenticator {
  public isAuthentic(request: Request) {
    const sentSecret = request.headers.get(INTERNAL_RENDER_SECRET_HEADER);
    if (sentSecret === null) return false;
    return timingSafeEqual(this.digestOf(sentSecret), this.digestOf(env.INTERNAL_RENDER_SECRET));
  }

  /** Digests have one length whatever was sent, so the comparison neither throws on nor leaks the secret's length. */
  private digestOf(value: string) {
    return createHash('sha256').update(value).digest();
  }
}
