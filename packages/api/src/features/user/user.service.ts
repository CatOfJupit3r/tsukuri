import { inject, injectable } from 'tsyringe';

import type { BadgeId } from '@startername/common/constants/badges';
import { errorCodes, errorMessages } from '@startername/common/generated/error-codes';

import { USER_ACHIEVEMENT_REPOSITORY_TOKEN } from '#~/features/achievements/achievements.tokens';
import type { iUserAchievementRepository } from '#~/features/achievements/user-achievement.repository';
import { BADGES_META } from '#~/features/badges/badges.constants';
import { DatabaseErrorGuard } from '#~/features/database/database-error.guard';
import {
  ORPCBadRequestError,
  ORPCForbiddenError,
  ORPCInternalServerError,
  ORPCNotFoundError,
  expectDefined,
  rethrowUnexpectedError,
} from '#~/lib/orpc-error-wrapper';

import { generatePublicCode } from './public-code';
import type { iUserProfileRepository } from './user-profile.repository';
import { USER_PROFILE_REPOSITORY_TOKEN } from './user.tokens';

@injectable()
export class UserService {
  constructor(
    @inject(USER_ACHIEVEMENT_REPOSITORY_TOKEN)
    private readonly userAchievementRepository: iUserAchievementRepository,
    @inject(USER_PROFILE_REPOSITORY_TOKEN)
    private readonly userProfileRepository: iUserProfileRepository,
    private readonly databaseErrorGuard: DatabaseErrorGuard,
  ) {}

  public async getUserProfile(userId: string) {
    const profile = await this.userProfileRepository.findByUserId(userId);
    if (!profile) throw ORPCNotFoundError(errorCodes.USER_PROFILE_NOT_FOUND);
    return profile;
  }

  public async updateUserProfile(userId: string, bio: string) {
    const updatedProfile = await this.userProfileRepository.upsert(userId, { bio });
    return expectDefined(updatedProfile, errorMessages.get(errorCodes.USER_PROFILE_UPSERT_FAILED));
  }

  public async updateUserBadge(userId: string, badgeId: BadgeId) {
    const badgeMeta = BADGES_META.find((badge) => badge.id === badgeId);
    if (!badgeMeta) throw ORPCBadRequestError(errorCodes.BADGE_NOT_FOUND);

    if (badgeMeta.requiresAchievement) {
      const hasAchievement = await this.userAchievementRepository.findByAchievement(
        userId,
        badgeMeta.requiresAchievement,
      );
      if (!hasAchievement) throw ORPCForbiddenError(errorCodes.USER_BADGE_NOT_ALLOWED);
    }

    const updatedProfile = await this.userProfileRepository.upsert(userId, { selectedBadge: badgeId });
    return expectDefined(updatedProfile, errorMessages.get(errorCodes.USER_BADGE_UPDATE_FAILED));
  }

  public async regeneratePublicCode(userId: string) {
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await this.userProfileRepository.upsert(userId, { publicCode: generatePublicCode() });
      } catch (error) {
        if (this.databaseErrorGuard.isUniqueViolation(error)) continue;
        rethrowUnexpectedError(error, { operation: 'user.regeneratePublicCode' });
      }
    }

    throw ORPCInternalServerError(errorCodes.USER_PUBLIC_CODE_GENERATION_FAILED);
  }
}
