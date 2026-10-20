import { LuTrophy } from 'react-icons/lu';

import { CardTitle } from '#~/components/ui/layout/card';

export function AchievementsTitle() {
  return (
    <CardTitle className="flex items-center gap-2">
      <LuTrophy className="size-5" />
      Achievements
    </CardTitle>
  );
}
