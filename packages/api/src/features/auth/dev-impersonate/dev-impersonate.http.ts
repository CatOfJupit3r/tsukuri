import { container } from 'tsyringe';
import z from 'zod';

import { errorCodes, errorMessages } from '@startername/common/generated/error-codes';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';

import { AuthService } from '../auth.service';

export const DEV_IMPERSONATE_PATH = '/dev-tools/impersonate';

const SESSION_COOKIE_PATTERN = /better-auth\.session_token=([^;]+);/;
const userIdSchema = z.string().min(1);

/**
 * `GET /dev-tools/impersonate/:userId` creates a session for that user, for development only:
 * production answers 404.
 */
export async function handleDevImpersonateRequest(request: Request) {
  if (env.NODE_ENV === NODE_ENVIRONMENTS.PRODUCTION) return new Response(null, { status: 404 });

  const userId = userIdSchema.safeParse(new URL(request.url).pathname.slice(DEV_IMPERSONATE_PATH.length + 1));
  if (!userId.success) return Response.json({ error: errorMessages.get(errorCodes.USER_NOT_FOUND) }, { status: 400 });

  const auth = container.resolve(AuthService).getInstance();
  const { headers, response } = await auth.api.devImpersonateUser({
    body: { userId: userId.data },
    returnHeaders: true,
  });
  if (!response) {
    return Response.json(
      { error: errorMessages.get(errorCodes.IMPERSONATION_SESSION_CREATION_FAILED) },
      { status: 500 },
    );
  }

  const token = headers.get('set-cookie')?.match(SESSION_COOKIE_PATTERN)?.[1];
  if (!token) {
    return Response.json(
      { error: errorMessages.get(errorCodes.IMPERSONATION_SESSION_CREATION_FAILED) },
      { status: 500 },
    );
  }

  return Response.json(
    {
      message: `Impersonation session created for userId: ${userId.data}`,
      session: response.session,
      user: response.user,
    },
    { headers: { 'set-cookie': `better-auth.session_token=${token}; Path=/; HttpOnly` } },
  );
}
