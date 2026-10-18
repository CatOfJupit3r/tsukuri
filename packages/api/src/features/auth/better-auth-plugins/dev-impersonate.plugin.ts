import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint, APIError } from 'better-auth/api';
import { deleteSessionCookie, setSessionCookie } from 'better-auth/cookies';
import { parseUserOutput } from 'better-auth/db';
import { z } from 'zod';

import { errorCodes, errorMessages } from '@startername/common/generated/error-codes';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';

const getDate = (seconds: number) => new Date(Date.now() + seconds * 1000);

/**
 * Development-only user impersonation endpoint based on Better Auth's admin impersonation route.
 * It intentionally does not require admin permissions or reject admin users as impersonation targets.
 */
export const devImpersonatePlugin = () =>
  ({
    id: 'dev-impersonate',
    endpoints: {
      devImpersonateUser: createAuthEndpoint(
        '/dev/impersonate-user',
        {
          method: 'POST',
          body: z.object({
            userId: z.string().min(1).describe('The user id to impersonate'),
          }),
          metadata: {
            openapi: {
              operationId: 'devImpersonateUser',
              summary: 'Impersonate a user (dev only)',
              description: 'Create an impersonation session for development purposes',
              responses: {
                200: {
                  description: 'Impersonation session created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          session: {
                            $ref: '#/components/schemas/Session',
                          },
                          user: {
                            $ref: '#/components/schemas/User',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        async (ctx) => {
          if (env.NODE_ENV === NODE_ENVIRONMENTS.PRODUCTION) {
            throw APIError.fromStatus('FORBIDDEN', {
              message: errorMessages.get(errorCodes.DEV_IMPERSONATION_NOT_ALLOWED),
            });
          }

          const targetUser = await ctx.context.internalAdapter.findUserById(ctx.body.userId);

          if (!targetUser) {
            throw APIError.fromStatus('NOT_FOUND', {
              message: errorMessages.get(errorCodes.USER_NOT_FOUND),
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            targetUser.id,
            true,
            {
              ...(ctx.context.session?.user.id ? { impersonatedBy: ctx.context.session.user.id } : {}),
              expiresAt: getDate(60 * 60),
            },
            true,
          );

          if (!session) {
            throw APIError.fromStatus('INTERNAL_SERVER_ERROR', {
              message: errorMessages.get(errorCodes.IMPERSONATION_SESSION_CREATION_FAILED),
            });
          }

          const { authCookies } = ctx.context;
          deleteSessionCookie(ctx);

          const dontRememberMeCookie = await ctx.getSignedCookie(
            authCookies.dontRememberToken.name,
            ctx.context.secret,
          );

          if (ctx.context.session?.session) {
            const devSessionCookie = ctx.context.createAuthCookie('dev_original_session');
            await ctx.setSignedCookie(
              devSessionCookie.name,
              `${ctx.context.session.session.token}:${dontRememberMeCookie ?? ''}`,
              ctx.context.secret,
              authCookies.sessionToken.attributes,
            );
          }

          await setSessionCookie(
            ctx,
            {
              session,
              user: targetUser,
            },
            true,
          );

          return ctx.json({
            session,
            user: parseUserOutput(ctx.context.options, targetUser),
          });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
