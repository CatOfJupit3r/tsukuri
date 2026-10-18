import type { ComponentProps } from 'react';

import { TIMELINE_STATUS_DATA_VALUES } from '#~/components/ui/display/timeline.constants';
import type { TimelineStatus } from '#~/components/ui/display/timeline.constants';
import { cn } from '#~/lib/utils';

export function Timeline({ className, ...props }: ComponentProps<'div'>) {
  return <div role="list" data-slot="timeline" className={cn('flex flex-col', className)} {...props} />;
}

interface iTimelineItemProps extends ComponentProps<'div'> {
  status: TimelineStatus;
}

export function TimelineItem({ status, className, ...props }: iTimelineItemProps) {
  return (
    <div
      role="listitem"
      data-slot="timeline-item"
      data-status={TIMELINE_STATUS_DATA_VALUES.get(status)}
      className={cn(
        'group/timeline-item grid min-h-12 grid-cols-[3.25rem_0.5rem_minmax(0,1fr)_auto] items-stretch gap-3 border-b px-3.5 py-1.5 data-[status=completed]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TimelineTime({ className, ...props }: ComponentProps<'time'>) {
  return (
    <time
      data-slot="timeline-time"
      className={cn('self-center font-mono text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TimelineTrack({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      data-slot="timeline-track"
      className={cn('relative flex justify-center', className)}
      {...props}
    />
  );
}

export function TimelineMarker({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      data-slot="timeline-marker"
      className={cn(
        'relative z-10 h-full w-1.5 rounded-xs bg-primary group-data-[status=completed]/timeline-item:opacity-40',
        className,
      )}
      {...props}
    />
  );
}

export function TimelineConnector({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      data-slot="timeline-connector"
      className={cn('absolute top-0 -bottom-3 w-px bg-border group-last/timeline-item:bottom-0', className)}
      {...props}
    />
  );
}

export function TimelineContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="timeline-content" className={cn('flex min-w-0 flex-col justify-center', className)} {...props} />
  );
}

export function TimelineTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="timeline-title"
      className={cn('flex min-w-0 items-baseline gap-1.5 truncate font-medium', className)}
      {...props}
    />
  );
}

export function TimelineDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="timeline-description" className={cn('text-xs text-muted-foreground', className)} {...props} />;
}
