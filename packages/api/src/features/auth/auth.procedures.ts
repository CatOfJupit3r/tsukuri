import { errorCodes } from '@startername/common/generated/error-codes';

import { base, publicProcedure } from '#~/lib/orpc';
import { ORPCUnauthorizedError } from '#~/lib/orpc-error-wrapper';

const requireAuth = base.middleware(async ({ context, next }) => {
  if (!context.session) {
    throw ORPCUnauthorizedError(errorCodes.UNAUTHORIZED);
  }
  return next({
    context: {
      ...context,
      session: context.session,
    },
  });
});

/** Procedures of signed-in users: `context.session` is never null. */
export const protectedProcedure = publicProcedure.use(requireAuth);
