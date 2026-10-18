import type { UserAchievementId } from '@startername/common/constants/achievements';

import { Listener } from '#~/features/events/listener.class';

export const BetaEventListener = new Listener<{ userId: string }>('BETA_EVENT');

/** Emitted when a user unlocks an achievement */
export const AchievementUnlockedListener = new Listener<{
  userId: string;
  achievementId: UserAchievementId;
}>('ACHIEVEMENT_UNLOCKED');
