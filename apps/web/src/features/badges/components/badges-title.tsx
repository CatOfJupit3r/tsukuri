import { LuAward } from 'react-icons/lu';

import { CardTitle } from '#~/components/ui/layout/card';

export function BadgesTitle() {
  return (
    <CardTitle className="flex items-center gap-2">
      <LuAward className="size-5" />
      Badges
    </CardTitle>
  );
}
