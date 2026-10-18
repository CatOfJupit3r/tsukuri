import { usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { getBackendURL, getForwardedRequestHeaders } from '#~/utils/backend-url';

const createAuthInstance = () =>
  createAuthClient({
    plugins: [usernameClient()],
    baseURL: getBackendURL('/auth'),
    fetchOptions: {
      throw: true,
    },
  });

class AuthService {
  private authInstance;

  constructor() {
    this.authInstance = createAuthInstance();
  }

  public async getSession() {
    return this.authInstance.getSession({ fetchOptions: { throw: true, headers: getForwardedRequestHeaders() } });
  }

  public getInstance() {
    return this.authInstance;
  }
}

export type InternalAuthSession = AuthService['authInstance']['$Infer']['Session'];

export default new AuthService();
