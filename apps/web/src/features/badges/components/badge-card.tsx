import { Badge } from '#~/components/ui/feedback/badge';

import type { BadgesQueryReturnType } from '../hooks/use-badges';

interface iBadgeCardProps {
  badge: BadgesQueryReturnType[number];
  isUnlocked: boolean;
}

export function BadgeCard({ badge, isUnlocked }: iBadgeCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isUnlocked ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{badge.icon ?? '🎖️'}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{badge.label}</h3>
            {isUnlocked ? <Badge variant="secondary">Unlocked</Badge> : <Badge variant="outline">Locked</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
          {!isUnlocked && badge.requiresAchievement ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Requires: {badge.requiresAchievement.replace(/_/g, ' ')} achievement
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
