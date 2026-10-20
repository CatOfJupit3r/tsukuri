import type { ComponentProps } from 'react';
import type { DayPicker } from 'react-day-picker';
import { getDefaultClassNames } from 'react-day-picker';

import type { Button } from '#~/components/ui/button/button';
import { buttonVariants } from '#~/components/ui/button/constants';
import { cn } from '#~/lib/utils';

interface iCalendarClassNamesOptions {
  buttonVariant: ComponentProps<typeof Button>['variant'];
  captionLayout: ComponentProps<typeof DayPicker>['captionLayout'];
  isShowingWeekNumber: boolean;
}

export function createCalendarClassNames({
  buttonVariant,
  captionLayout,
  isShowingWeekNumber,
}: iCalendarClassNamesOptions): ComponentProps<typeof DayPicker>['classNames'] {
  const defaultClassNames = getDefaultClassNames();

  return {
    root: cn('w-fit', defaultClassNames.root),
    months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
    month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
    nav: cn('absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1', defaultClassNames.nav),
    button_previous: cn(
      buttonVariants({ variant: buttonVariant }),
      'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
      defaultClassNames.button_previous,
    ),
    button_next: cn(
      buttonVariants({ variant: buttonVariant }),
      'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
      defaultClassNames.button_next,
    ),
    month_caption: cn(
      'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
      defaultClassNames.month_caption,
    ),
    dropdowns: cn(
      'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
      defaultClassNames.dropdowns,
    ),
    dropdown_root: cn('relative rounded-(--cell-radius)', defaultClassNames.dropdown_root),
    dropdown: cn('absolute inset-0 bg-popover opacity-0', defaultClassNames.dropdown),
    caption_label: cn(
      'font-medium select-none',
      captionLayout === 'label'
        ? 'text-sm'
        : 'flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
      defaultClassNames.caption_label,
    ),
    month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
    weekdays: cn('flex', defaultClassNames.weekdays),
    weekday: cn(
      'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none',
      defaultClassNames.weekday,
    ),
    week: cn('mt-2 flex w-full', defaultClassNames.week),
    week_number_header: cn('w-(--cell-size) select-none', defaultClassNames.week_number_header),
    week_number: cn('text-[0.8rem] text-muted-foreground select-none', defaultClassNames.week_number),
    day: cn(
      'group/day relative aspect-square size-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)',
      isShowingWeekNumber
        ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)'
        : '[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)',
      defaultClassNames.day,
    ),
    range_start: cn(
      'relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted',
      defaultClassNames.range_start,
    ),
    range_middle: cn('rounded-none', defaultClassNames.range_middle),
    range_end: cn(
      'relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted',
      defaultClassNames.range_end,
    ),
    today: cn(
      'rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none',
      defaultClassNames.today,
    ),
    outside: cn('text-muted-foreground aria-selected:text-muted-foreground', defaultClassNames.outside),
    disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
    hidden: cn('invisible', defaultClassNames.hidden),
  };
}
