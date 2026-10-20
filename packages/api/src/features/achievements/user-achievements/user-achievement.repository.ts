import type { UserAchievementId } from '@startername/common/constants/achievements';

import type { iUserAchievementRecordResponse } from './user-achievement.types';

export interface iUserAchievementRepository {
  listByUserId: (userId: string) => Promise<iUserAchievementRecordResponse[]>;
  findByAchievement: (
    userId: string,
    achievementId: UserAchievementId,
  ) => Promise<iUserAchievementRecordResponse | null>;
  ensureUnlocked: (
    userId: string,
    achievementId: UserAchievementId,
    data?: Record<string, unknown>,
  ) => Promise<iUserAchievementRecordResponse>;
}
