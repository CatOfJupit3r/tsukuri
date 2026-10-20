import { base, publicProcedure } from '#~/lib/orpc';

import { AuthStatisticsService } from './users/auth-statistics.service';

export const authRouter = base.auth.router({
  metrics: publicProcedure.auth.metrics.handler(async ({ context }) =>
    context.resolve(AuthStatisticsService).getMetrics(),
  ),

  devToolsListAllUsers: publicProcedure.auth.devToolsListAllUsers.handler(async ({ context }) =>
    context.resolve(AuthStatisticsService).listAllUsers(),
  ),
});
