import { base, publicProcedure } from '#~/lib/orpc';

export const healthRouter = base.index.router({
  healthCheck: publicProcedure.index.healthCheck.handler(async () => ({ status: 'OK' })),
});
