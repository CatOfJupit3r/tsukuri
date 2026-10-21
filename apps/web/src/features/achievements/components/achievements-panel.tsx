import { LuCircleAlert } from 'react-icons/lu';

import { Alert, AlertDescription, AlertTitle } from '#~/components/ui/feedback/alert';
import { Card, CardContent, CardDescription, CardHeader } from '#~/components/ui/layout/card';

import { useAllAchievements } from '../hooks/use-all-achievements';
import { useMyAchievements } from '../hooks/use-my-achievements';
import { AchievementCard } from './achievement-card';
import { AchievementsSkeleton } from './achievements-skeleton';
import { AchievementsTitle } from './achievements-title';

interface iAchievementsErrorProps {
  hasListFailed: boolean;
  hasOwnFailed: boolean;
}

function AchievementsError({ hasListFailed, hasOwnFailed }: iAchievementsErrorProps) {
  return (
    <Card>
      <CardHeader>
        <AchievementsTitle />
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <LuCircleAlert className="size-4" />
          <AlertTitle>Error loading achievements</AlertTitle>
          <AlertDescription>
            {hasListFailed ? 'Failed to load achievement list. ' : ''}
            {hasOwnFailed ? 'Failed to load your achievements. ' : ''}
            Please try again later.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export function AchievementsPanel() {
  const { data: allAchievements, isPending: isPendingAll, error: errorAll } = useAllAchievements();
  const { data: myAchievements, isPending: isPendingMy, error: errorMy } = useMyAchievements();

  if (isPendingAll || isPendingMy) {
    return <AchievementsSkeleton />;
  }

  if (errorAll || errorMy) {
    return <AchievementsError hasListFailed={Boolean(errorAll)} hasOwnFailed={Boolean(errorMy)} />;
  }

  return (
    <Card>
      <CardHeader>
        <AchievementsTitle />
        <CardDescription>
          {myAchievements?.length ?? 0} of {allAchievements?.length ?? 0} unlocked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {allAchievements?.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              userAchievement={myAchievements?.find((a) => a.id === achievement.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
