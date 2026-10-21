import { Skeleton } from '#~/components/ui/feedback/skeleton';
import { Card, CardContent, CardHeader } from '#~/components/ui/layout/card';

import { AchievementsTitle } from './achievements-title';

const SKELETON_KEYS = [
  'achievement-skeleton-1',
  'achievement-skeleton-2',
  'achievement-skeleton-3',
  'achievement-skeleton-4',
];

function AchievementSkeletonItem() {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function AchievementsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <AchievementsTitle />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {SKELETON_KEYS.map((key) => (
            <AchievementSkeletonItem key={key} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
