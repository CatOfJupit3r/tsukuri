import { singleton } from 'tsyringe';

import type { userAchievements } from '#~/features/achievements/user-achievement.schema';
import { createRowResolver } from '#~/lib/row-resolver';

import type { iUserAchievementRecordResponse } from './user-achievement.types';

type UserAchievementRow = typeof userAchievements.$inferSelect;

@singleton()
export class UserAchievementResolver {
  public toUserAchievementResponse = createRowResolver<UserAchievementRow, iUserAchievementRecordResponse>({
    optional: ['data'],
  });
}
