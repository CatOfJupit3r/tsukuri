import { implement } from '@orpc/server';

import { CONTRACT } from '@startername/server-contract/app.contract';

import type { iApiContext } from '#~/lib/api-context';
import { rethrowUnexpectedError } from '#~/lib/orpc-error-wrapper';

export const base = implement(CONTRACT)
  .$config({
    initialOutputValidationIndex: Number.NaN,
  })
  .$context<iApiContext>();

const unexpectedErrorBoundary = base.middleware(async ({ path, next }) => {
  try {
    return await next();
  } catch (error) {
    return rethrowUnexpectedError(error, { operation: path.join('.') });
  }
});

export const publicProcedure = base.use(unexpectedErrorBoundary);
