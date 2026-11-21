import type { ComponentType } from 'react';

import { Skeleton } from '#~/components/ui/feedback/skeleton';
import { Card, CardContent, CardHeader } from '#~/components/ui/layout/card';

interface iSkeletonCardProps {
  Title: ComponentType;
  gridClassName: string;
  itemCount: number;
  /** Tailwind classes of each text line inside one placeholder item. */
  lineClassNames: string[];
}

function SkeletonCardItem({ lineClassNames }: Pick<iSkeletonCardProps, 'lineClassNames'>) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex-1 space-y-2">
          {lineClassNames.map((lineClassName) => (
            <Skeleton key={lineClassName} className={lineClassName} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard({ Title, gridClassName, itemCount, lineClassNames }: iSkeletonCardProps) {
  const itemKeys = Array.from({ length: itemCount }, (_, position) => `skeleton-item-${position + 1}`);

  return (
    <Card>
      <CardHeader>
        <Title />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className={gridClassName}>
          {itemKeys.map((itemKey) => (
            <SkeletonCardItem key={itemKey} lineClassNames={lineClassNames} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
