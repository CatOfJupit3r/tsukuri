import { container } from 'tsyringe';

import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { AuthService } from './auth.service';

/** Adds the request's Better Auth session (or `null`) to the API context. */
export async function provideAuthSession(request: Request) {
  const session = await container.resolve(AuthService).getInstance().api.getSession({ headers: request.headers });
  if (session) container.resolve(RequestContextStorage).assignUserId(session.user.id);
  return { session };
}
