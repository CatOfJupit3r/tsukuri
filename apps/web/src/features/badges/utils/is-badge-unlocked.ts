import type { MyAchievementsQueryReturnType } from '#~/features/achievements/hooks/use-my-achievements';

import type { BadgesQueryReturnType } from '../hooks/use-badges';

interface iIsBadgeUnlockedParams {
  badge: Pick<BadgesQueryReturnType[number], 'requiresAchievement'>;
  myAchievements: Pick<MyAchievementsQueryReturnType[number], 'id'>[] | undefined;
}

export function isBadgeUnlocked({ badge, myAchievements }: iIsBadgeUnlockedParams) {
  if (!badge.requiresAchievement) {
    return true;
  }

  return myAchievements?.some((achievement) => achievement.id === badge.requiresAchievement) ?? false;
}
