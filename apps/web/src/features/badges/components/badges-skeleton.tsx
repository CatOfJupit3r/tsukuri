import { Skeleton } from '#~/components/ui/feedback/skeleton';
import { Card, CardContent, CardHeader } from '#~/components/ui/layout/card';

import { BadgesTitle } from './badges-title';

const SKELETON_KEYS = [
  'badge-skeleton-1',
  'badge-skeleton-2',
  'badge-skeleton-3',
  'badge-skeleton-4',
  'badge-skeleton-5',
  'badge-skeleton-6',
];

function BadgeSkeletonItem() {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

export function BadgesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <BadgesTitle />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {SKELETON_KEYS.map((key) => (
            <BadgeSkeletonItem key={key} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
