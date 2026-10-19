import type { ComponentProps } from 'react';

import { cn } from '#~/lib/utils';

/**
 * VisuallyHidden component
 *
 * Hides content visually but keeps it accessible to screen readers.
 * Useful for providing context to assistive technologies without cluttering the UI.
 */
export function VisuallyHidden({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'absolute size-px overflow-hidden border-0 p-0 whitespace-nowrap',
        '[clip-path:inset(50%)] [clip:rect(0,0,0,0)]',
        className,
      )}
      {...props}
    />
  );
}
