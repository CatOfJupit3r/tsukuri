import { Badge } from '#~/components/ui/feedback/badge';

import type { AllAchievementsQueryReturnType } from '../hooks/use-all-achievements';
import type { MyAchievementsQueryReturnType } from '../hooks/use-my-achievements';

interface iAchievementCardProps {
  achievement: AllAchievementsQueryReturnType[number];
  userAchievement?: MyAchievementsQueryReturnType[number];
}

export function AchievementCard({ achievement, userAchievement }: iAchievementCardProps) {
  const isUnlocked = userAchievement !== undefined;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isUnlocked ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{achievement.icon ?? '🏆'}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{achievement.label}</h3>
            {isUnlocked ? <Badge variant="secondary">Unlocked</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          {userAchievement ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Unlocked on {new Date(userAchievement.unlockedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
