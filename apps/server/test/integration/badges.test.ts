import { call } from '@orpc/server';
import { it, expect, describe } from 'vitest';

import { USER_ACHIEVEMENTS } from '@startername/common/constants/achievements';
import { BADGE_IDS } from '@startername/common/constants/badges';
import { errorCodes } from '@startername/common/enums/errors.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { getUserAchievementRepository, getUserProfileRepository } from './fixtures/repository.fixtures';
import { createUser } from './utilities';

describe('Badge Selection API', () => {
  describe('updateUserBadge', () => {
    it('should allow selecting DEFAULT badge without achievement', async () => {
      const { ctx, user } = await createUser();

      const updatedProfile = await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.DEFAULT }, ctx());

      expect(updatedProfile).not.toBeNil();
      expect(updatedProfile.selectedBadge).toBe(BADGE_IDS.DEFAULT);
      expect(updatedProfile.userId).toBe(user.id);
    });

    it('should reject badge selection when user lacks required achievement', async () => {
      const { ctx } = await createUser();

      await expectORPCError(call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx()), {
        code: errorCodes.USER_BADGE_NOT_ALLOWED,
      });
    });

    it('should allow badge selection when user has required achievement', async () => {
      const { ctx, user } = await createUser();

      await Promise.all(
        Object.keys(USER_ACHIEVEMENTS).map(async (key) => {
          const achievementId = USER_ACHIEVEMENTS[key as keyof typeof USER_ACHIEVEMENTS];
          return getUserAchievementRepository().ensureUnlocked(user.id, achievementId);
        }),
      );

      await Promise.all(
        Object.keys(BADGE_IDS).map(async (key) => {
          const badgeId = BADGE_IDS[key as keyof typeof BADGE_IDS];

          const updatedProfile = await call(appRouter.user.updateUserBadge, { badgeId }, ctx());
          expect(updatedProfile).not.toBeNil();
          expect(updatedProfile.selectedBadge).toBe(badgeId);
        }),
      );
    });

    it('should auto-create profile on first badge selection if missing', async () => {
      const { ctx, user } = await createUser();

      await getUserProfileRepository().deleteByUserId(user.id);

      const updatedProfile = await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.DEFAULT }, ctx());

      expect(updatedProfile).not.toBeNil();
      expect(updatedProfile.selectedBadge).toBe(BADGE_IDS.DEFAULT);
      expect(updatedProfile.userId).toBe(user.id);
      expect(updatedProfile.id).toBeDefined();
    });

    it('should preserve bio when updating badge', async () => {
      const { ctx } = await createUser();

      await call(appRouter.user.updateUserProfile, { bio: 'My cool bio' }, ctx());

      const updatedProfile = await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.DEFAULT }, ctx());

      expect(updatedProfile.bio).toBe('My cool bio');
      expect(updatedProfile.selectedBadge).toBe(BADGE_IDS.DEFAULT);
    });

    it('should verify badge persists in database after selection', async () => {
      const { ctx, user } = await createUser();

      await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.DEFAULT }, ctx());

      const dbProfile = await getUserProfileRepository().findByUserId(user.id);
      expect(dbProfile).toBeDefined();
      expect(dbProfile?.selectedBadge).toBe(BADGE_IDS.DEFAULT);
    });

    it('should include selectedBadge in getUserProfile response', async () => {
      const { ctx } = await createUser();

      await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.DEFAULT }, ctx());

      const profile = await call(appRouter.user.getUserProfile, null, ctx());

      expect(profile).not.toBeNil();
      expect(profile.selectedBadge).toBe(BADGE_IDS.DEFAULT);
    });

    it('should return null for selectedBadge when not set', async () => {
      const { ctx } = await createUser();

      const profile = await call(appRouter.user.getUserProfile, null, ctx());

      expect(profile).not.toBeNil();
      expect(profile.selectedBadge).toBeNull();
    });
  });
});
