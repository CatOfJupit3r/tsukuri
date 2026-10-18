import { protectedProcedure } from '#~/features/auth/auth.procedures';
import { base, publicProcedure } from '#~/lib/orpc';

import { AchievementsService } from './achievements.service';

export const achievementsRouter = base.achievements.router({
  listAchievements: publicProcedure.achievements.listAchievements.handler(async ({ context }) =>
    context.resolve(AchievementsService).listAllAchievements(),
  ),

  getMyAchievements: protectedProcedure.achievements.getMyAchievements.handler(async ({ context }) => {
    const userId = context.session.user.id;
    return context.resolve(AchievementsService).getUserAchievements(userId);
  }),
});
