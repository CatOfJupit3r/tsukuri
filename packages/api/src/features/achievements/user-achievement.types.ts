import type { UserAchievementId } from '@startername/common/constants/achievements';

import type { userAchievements } from '#~/features/achievements/user-achievement.schema';

type UserAchievementRow = typeof userAchievements.$inferSelect;

export type iUserAchievementRecordResponse = Omit<UserAchievementRow, 'achievementId' | 'data'> & {
  achievementId: UserAchievementId;
  data?: Record<string, unknown>;
};
