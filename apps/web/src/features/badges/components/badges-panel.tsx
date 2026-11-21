import { LuCircleAlert } from 'react-icons/lu';

import { Alert, AlertDescription, AlertTitle } from '#~/components/ui/feedback/alert';
import { Card, CardContent, CardDescription, CardHeader } from '#~/components/ui/layout/card';
import { useMyAchievements } from '#~/features/achievements/hooks/use-my-achievements';

import { useBadges } from '../hooks/use-badges';
import { isBadgeUnlocked } from '../utils/is-badge-unlocked';
import { BadgeCard } from './badge-card';
import { BadgesSkeleton } from './badges-skeleton';
import { BadgesTitle } from './badges-title';

interface iBadgesErrorProps {
  hasBadgesFailed: boolean;
  hasAchievementsFailed: boolean;
}

function BadgesError({ hasBadgesFailed, hasAchievementsFailed }: iBadgesErrorProps) {
  return (
    <Card>
      <CardHeader>
        <BadgesTitle />
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <LuCircleAlert className="size-4" />
          <AlertTitle>Error loading badges</AlertTitle>
          <AlertDescription>
            {hasBadgesFailed ? 'Failed to load badge list. ' : ''}
            {hasAchievementsFailed ? 'Failed to load your achievements. ' : ''}
            Please try again later.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export function BadgesPanel() {
  const { data: allBadges, isPending: isPendingBadges, error: errorBadges } = useBadges();
  const { data: myAchievements, isPending: isPendingAchievements, error: errorAchievements } = useMyAchievements();

  if (isPendingBadges || isPendingAchievements) {
    return <BadgesSkeleton />;
  }

  if (errorBadges || errorAchievements) {
    return <BadgesError hasBadgesFailed={Boolean(errorBadges)} hasAchievementsFailed={Boolean(errorAchievements)} />;
  }

  return (
    <Card>
      <CardHeader>
        <BadgesTitle />
        <CardDescription>Badges you can unlock through achievements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {allBadges?.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} isUnlocked={isBadgeUnlocked({ badge, myAchievements })} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
