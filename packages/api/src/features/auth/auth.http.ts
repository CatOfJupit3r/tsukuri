import { container } from 'tsyringe';

import { AuthService } from './auth.service';

/** Better Auth's own endpoints under `/auth`. */
export async function handleAuthRequest(request: Request) {
  return container.resolve(AuthService).getInstance().handler(request);
}
