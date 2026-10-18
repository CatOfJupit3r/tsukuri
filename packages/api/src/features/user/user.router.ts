import { protectedProcedure } from '#~/features/auth/auth.procedures';
import { base } from '#~/lib/orpc';

import { UserService } from './user.service';

export const userRouter = base.user.router({
  getUserProfile: protectedProcedure.user.getUserProfile.handler(async ({ context }) => {
    const userId = context.session.user.id;
    return context.resolve(UserService).getUserProfile(userId);
  }),

  updateUserProfile: protectedProcedure.user.updateUserProfile.handler(async ({ context, input }) => {
    const userId = context.session.user.id;
    return context.resolve(UserService).updateUserProfile(userId, input.bio);
  }),

  updateUserBadge: protectedProcedure.user.updateUserBadge.handler(async ({ context, input }) => {
    const userId = context.session.user.id;
    const { badgeId } = input;
    return context.resolve(UserService).updateUserBadge(userId, badgeId);
  }),

  regeneratePublicCode: protectedProcedure.user.regeneratePublicCode.handler(async ({ context }) => {
    const userId = context.session.user.id;
    return context.resolve(UserService).regeneratePublicCode(userId);
  }),
});
