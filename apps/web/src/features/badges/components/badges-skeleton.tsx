import { SkeletonCard } from '#~/components/skeleton/skeleton-card';

import { BadgesTitle } from './badges-title';

const BADGE_SKELETON_COUNT = 6;
const BADGE_SKELETON_LINE_CLASS_NAMES = ['h-5 w-24', 'h-4 w-full'];

export function BadgesSkeleton() {
  return (
    <SkeletonCard
      Title={BadgesTitle}
      gridClassName="grid gap-4 md:grid-cols-3"
      itemCount={BADGE_SKELETON_COUNT}
      lineClassNames={BADGE_SKELETON_LINE_CLASS_NAMES}
    />
  );
}
