import { LuAward } from 'react-icons/lu';

import { Alert, AlertDescription, AlertTitle } from '#~/components/ui/feedback/alert';
import { Skeleton } from '#~/components/ui/feedback/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#~/components/ui/layout/card';
import { useMyAchievements } from '#~/features/achievements/hooks/use-my-achievements';
import { useBadges } from '#~/features/badges/hooks/use-badges';

import { useUpdateUserBadge } from '../hooks/use-update-user-badge';
import { useUserProfile } from '../hooks/use-user-profile';
import { BadgeOption } from './badge-option';

function BadgePickerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LuAward className="size-5" />
          Select Your Badge
        </CardTitle>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BadgePicker() {
  const { data: badges, isPending: isPendingBadges, error: errorBadges } = useBadges();
  const { data: profile, isPending: isPendingProfile } = useUserProfile();
  const { data: myAchievements, isPending: isPendingAchievements } = useMyAchievements();
  const { updateUserBadge, isPending } = useUpdateUserBadge();

  if (isPendingBadges || isPendingProfile || isPendingAchievements) {
    return <BadgePickerSkeleton />;
  }

  if (errorBadges) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LuAward className="size-5" />
            Select Your Badge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error loading badges</AlertTitle>
            <AlertDescription>Failed to load badge list. Please try again later.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const unlockedAchievementIds = new Set(myAchievements?.map((a) => a.id) ?? []);
  const selectedBadge = profile?.selectedBadge;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LuAward className="size-5" />
          Select Your Badge
        </CardTitle>
        <CardDescription>
          Choose a badge to display on your profile. Some badges require achievements to unlock.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges?.map((badge) => (
            <BadgeOption
              key={badge.id}
              badge={badge}
              isUnlocked={!badge.requiresAchievement || unlockedAchievementIds.has(badge.requiresAchievement)}
              isSelected={selectedBadge === badge.id}
              isDisabled={isPending}
              onSelect={() => updateUserBadge({ badgeId: badge.id })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
