import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';

import { useScrollSpyContext } from '#~/components/ui/layout/scroll-spy/scroll-spy-context';
import { cn } from '#~/lib/utils';

export function ScrollSpyViewport({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="scroll-spy-viewport" className={cn('flex flex-1 flex-col gap-6', className)} {...props} />;
}

interface iScrollSpySectionProps extends ComponentProps<'section'> {
  value: string;
}

export function ScrollSpySection({ value, className, ...props }: iScrollSpySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { registerSection } = useScrollSpyContext();
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const unregister = registerSection(value, section);
    return () => {
      unregister();
    };
  }, [registerSection, value]);
  return <section ref={sectionRef} id={value} className={cn('scroll-mt-6', className)} {...props} />;
}
