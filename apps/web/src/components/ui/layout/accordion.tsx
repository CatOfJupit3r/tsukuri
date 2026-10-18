import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import type { ComponentProps } from 'react';
import { LuChevronDown } from 'react-icons/lu';

import { ACCORDION_TYPES } from '#~/components/ui/layout/accordion.constants';
import type { AccordionType } from '#~/components/ui/layout/accordion.constants';
import { cn } from '#~/lib/utils';

interface iAccordionProps extends Omit<
  AccordionPrimitive.Root.Props<string>,
  'value' | 'defaultValue' | 'onValueChange' | 'multiple'
> {
  type?: AccordionType;
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => unknown;
}

function normalizeAccordionValue(value: string | string[] | undefined) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  return [value];
}

function Accordion({
  type = ACCORDION_TYPES.SINGLE,
  defaultValue,
  value,
  onValueChange,
  collapsible: _collapsible,
  ...props
}: iAccordionProps) {
  const normalizedDefaultValue = normalizeAccordionValue(defaultValue);
  const normalizedValue = normalizeAccordionValue(value);

  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      multiple={type === ACCORDION_TYPES.MULTIPLE}
      defaultValue={normalizedDefaultValue}
      value={normalizedValue}
      onValueChange={(nextValue) => {
        onValueChange?.(type === ACCORDION_TYPES.MULTIPLE ? nextValue : (nextValue[0] ?? ''));
      }}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b last:border-b-0', className)}
      {...props}
    />
  );
}

function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <LuChevronDown className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-closed:animate-accordion-up data-open:animate-accordion-down"
      {...props}
    >
      <div className={cn('pt-0 pb-4', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
