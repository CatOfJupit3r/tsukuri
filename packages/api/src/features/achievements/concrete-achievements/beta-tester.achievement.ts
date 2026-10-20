import { USER_ACHIEVEMENTS } from '@startername/common/constants/achievements';

import { ACHIEVEMENT_EVENTS } from '#~/features/achievements/achievements.events';

import type { iAchievementContext, iAchievementDefinition } from '../achievements.types';

export const betaTesterAchievement: iAchievementDefinition<typeof ACHIEVEMENT_EVENTS.BETA_EVENT> = {
  id: USER_ACHIEVEMENTS.BETA_TESTER,
  listensTo: [ACHIEVEMENT_EVENTS.BETA_EVENT],
  async handle(payload, context: iAchievementContext) {
    await context.unlock(payload.userId, USER_ACHIEVEMENTS.BETA_TESTER, {});
  },
};
