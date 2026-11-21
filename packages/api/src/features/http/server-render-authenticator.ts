import { singleton } from 'tsyringe';

/** Decides whether a request came from the server render of this project's web app. */
export interface iServerRenderAuthenticator {
  isAuthentic: (request: Request) => boolean;
}

export const SERVER_RENDER_AUTHENTICATOR_TOKEN = Symbol.for('ServerRenderAuthenticator');

/** Bound until a module provides a way to recognise the server render across processes: no request is one. */
@singleton()
export class NoServerRenderAuthenticator implements iServerRenderAuthenticator {
  public isAuthentic() {
    return false;
  }
}
