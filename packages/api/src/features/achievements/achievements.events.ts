import { em } from 'enumwaii';

import type { UserAchievementId } from '@startername/common/constants/achievements';
import { definePayloadTokens, payloadOf } from '@startername/common/helpers/payload-token-set.helper';

const achievementEventNamesEnumwaii = em({
  BETA_EVENT: 'achievements.beta-event',
  ACHIEVEMENT_UNLOCKED: 'achievements.achievement-unlocked',
});

/** Events the achievements feature emits on the event bus. */
export const ACHIEVEMENT_EVENTS = definePayloadTokens(achievementEventNamesEnumwaii, {
  BETA_EVENT: payloadOf<{ userId: string }>(),
  /** A user unlocked an achievement. */
  ACHIEVEMENT_UNLOCKED: payloadOf<{ userId: string; achievementId: UserAchievementId }>(),
});
