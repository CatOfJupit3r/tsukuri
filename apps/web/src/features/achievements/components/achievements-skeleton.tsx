import { SkeletonCard } from '#~/components/skeleton/skeleton-card';

import { AchievementsTitle } from './achievements-title';

const ACHIEVEMENT_SKELETON_COUNT = 4;
const ACHIEVEMENT_SKELETON_LINE_CLASS_NAMES = ['h-5 w-32', 'h-4 w-full', 'h-3 w-24'];

export function AchievementsSkeleton() {
  return (
    <SkeletonCard
      Title={AchievementsTitle}
      gridClassName="grid gap-4 md:grid-cols-2"
      itemCount={ACHIEVEMENT_SKELETON_COUNT}
      lineClassNames={ACHIEVEMENT_SKELETON_LINE_CLASS_NAMES}
    />
  );
}
