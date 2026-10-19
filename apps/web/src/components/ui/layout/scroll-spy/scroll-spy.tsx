import type { ComponentProps, RefObject } from 'react';

import { ScrollSpyContext } from '#~/components/ui/layout/scroll-spy/scroll-spy-context';
import { useScrollSpyController } from '#~/components/ui/layout/scroll-spy/use-scroll-spy-controller';
import { cn } from '#~/lib/utils';

interface iScrollSpyProps extends ComponentProps<'div'> {
  defaultValue: string;
  offset?: number;
  scrollContainer?: RefObject<HTMLElement | null>;
}

export function ScrollSpy({ defaultValue, offset = 0, scrollContainer, className, ...props }: iScrollSpyProps) {
  const context = useScrollSpyController({ defaultValue, offset, scrollContainer });
  return (
    <ScrollSpyContext value={context}>
      <div data-slot="scroll-spy" className={cn('flex', className)} {...props} />
    </ScrollSpyContext>
  );
}
