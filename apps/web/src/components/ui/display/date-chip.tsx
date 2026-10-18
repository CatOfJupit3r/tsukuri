import type { ComponentProps } from 'react';
import { LuCalendar } from 'react-icons/lu';

import { DATE_CHIP_CLASS, DATE_CHIP_STATUS } from '#~/components/ui/display/date-chip.constants';
import type { DateChipStatus } from '#~/components/ui/display/date-chip.constants';
import { Badge } from '#~/components/ui/feedback/badge';
import { cn } from '#~/lib/utils';

interface iDateChipProps
  extends Pick<ComponentProps<typeof Badge>, 'children' | 'className'>, Pick<ComponentProps<'time'>, 'dateTime'> {
  status?: DateChipStatus;
}

export function DateChip({ children, className, dateTime, status = DATE_CHIP_STATUS.UPCOMING }: iDateChipProps) {
  return (
    <Badge className={cn(DATE_CHIP_CLASS.get(status), className)}>
      <LuCalendar aria-hidden="true" />
      <time dateTime={dateTime}>{children}</time>
    </Badge>
  );
}
