import type { ComponentProps, MouseEvent } from 'react';

import { useScrollSpyContext } from '#~/components/ui/layout/scroll-spy/scroll-spy-context';
import { SCROLL_SPY_DATA_STATE, SCROLL_SPY_STATE } from '#~/components/ui/layout/scroll-spy/scroll-spy.constants';
import { cn } from '#~/lib/utils';

export function ScrollSpyNav({ className, ...props }: ComponentProps<'nav'>) {
  return <nav data-slot="scroll-spy-nav" className={cn('flex flex-col gap-1', className)} {...props} />;
}

interface iScrollSpyLinkProps extends Omit<ComponentProps<'a'>, 'href'> {
  value: string;
}

export function ScrollSpyLink({ value, className, onClick, children, ...props }: iScrollSpyLinkProps) {
  const { activeValue, scrollToSection } = useScrollSpyContext();
  const isActive = activeValue === value;
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onClick?.(event);
    scrollToSection(value);
  };
  return (
    <a
      data-slot="scroll-spy-link"
      data-state={SCROLL_SPY_DATA_STATE.get(isActive ? SCROLL_SPY_STATE.ACTIVE : SCROLL_SPY_STATE.INACTIVE)}
      href={`#${value}`}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground',
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
}
