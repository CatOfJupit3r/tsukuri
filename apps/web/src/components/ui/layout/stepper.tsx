import { useId } from 'react';
import type { ComponentProps, KeyboardEvent } from 'react';

import { STEPPER_STEP_PARTS, STEPPER_STEP_STATE_DATA_VALUES } from '#~/components/ui/layout/stepper.constants';
import {
  StepperContext,
  StepperItemContext,
  useRequiredStepperContext,
  useRequiredStepperItemContext,
} from '#~/components/ui/layout/stepper.context';
import { getKeyboardStepIndex, getStepId, getStepState } from '#~/components/ui/layout/stepper.utils';
import { cn } from '#~/lib/utils';

interface iStepperProps<TValue extends string> extends Omit<ComponentProps<'div'>, 'onChange'> {
  steps: readonly TValue[];
  value: TValue;
  onValueChange: (value: TValue) => unknown;
}

export function Stepper<TValue extends string>({
  steps,
  value,
  onValueChange,
  className,
  children,
  ...props
}: iStepperProps<TValue>) {
  const rootId = useId();
  const handleValueChange = (nextValue: string) => {
    const matchedValue = steps.find((step) => step === nextValue);
    if (matchedValue) onValueChange(matchedValue);
  };

  return (
    <StepperContext value={{ rootId, steps, value, onValueChange: handleValueChange }}>
      <div data-slot="stepper" className={cn('flex w-full flex-col gap-6', className)} {...props}>
        {children}
      </div>
    </StepperContext>
  );
}

export function StepperList({ className, ...props }: ComponentProps<'div'>) {
  return <div role="tablist" data-slot="stepper-list" className={cn('flex items-center', className)} {...props} />;
}

interface iStepperItemProps extends ComponentProps<'div'> {
  value: string;
}

export function StepperItem({ value, ...props }: iStepperItemProps) {
  return (
    <StepperItemContext value={value}>
      <div data-slot="stepper-item" {...props} />
    </StepperItemContext>
  );
}

export function StepperTrigger({ className, onKeyDown, ...props }: ComponentProps<'button'>) {
  const context = useRequiredStepperContext();
  const value = useRequiredStepperItemContext();
  const stepIndex = context.steps.indexOf(value);
  const activeIndex = context.steps.indexOf(context.value);
  const isActive = value === context.value;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const nextIndex = getKeyboardStepIndex(event.key, stepIndex, context.steps.length);
    if (nextIndex === null) return;
    event.preventDefault();
    const list = event.currentTarget.closest('[role="tablist"]');
    const triggers = list?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    triggers?.[nextIndex]?.focus();
    const nextValue = context.steps[nextIndex];
    if (nextValue) context.onValueChange(nextValue);
  };

  return (
    <button
      type="button"
      role="tab"
      id={getStepId(context.rootId, STEPPER_STEP_PARTS.TRIGGER, value)}
      aria-controls={getStepId(context.rootId, STEPPER_STEP_PARTS.CONTENT, value)}
      aria-selected={isActive}
      aria-current={isActive ? 'step' : undefined}
      data-state={STEPPER_STEP_STATE_DATA_VALUES.get(getStepState(isActive, stepIndex, activeIndex))}
      data-slot="stepper-trigger"
      className={cn(
        'group/stepper-trigger inline-flex items-center gap-2 text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring data-[state=active]:text-foreground data-[state=completed]:text-foreground',
        className,
      )}
      onClick={() => context.onValueChange(value)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export function StepperIndicator({ className, children, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="stepper-indicator"
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full border bg-card text-xs font-bold group-data-[state=active]/stepper-trigger:border-primary group-data-[state=active]/stepper-trigger:bg-primary group-data-[state=active]/stepper-trigger:text-primary-foreground group-data-[state=completed]/stepper-trigger:border-primary group-data-[state=completed]/stepper-trigger:bg-primary group-data-[state=completed]/stepper-trigger:text-primary-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface iStepperSeparatorProps extends ComponentProps<'span'> {
  isActive?: boolean;
}

export function StepperSeparator({ className, isActive = false, ...props }: iStepperSeparatorProps) {
  return (
    <span
      role="separator"
      aria-hidden="true"
      data-slot="stepper-separator"
      data-active={isActive}
      className={cn('mx-3 h-px flex-1 bg-border data-[active=true]:bg-primary', className)}
      {...props}
    />
  );
}

export function StepperTitle({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span data-slot="stepper-title" className={cn('text-xs font-semibold whitespace-nowrap', className)} {...props} />
  );
}

interface iStepperContentProps extends ComponentProps<'div'> {
  value: string;
}

export function StepperContent({ value, className, ...props }: iStepperContentProps) {
  const context = useRequiredStepperContext();
  if (value !== context.value) return null;

  return (
    <div
      role="tabpanel"
      id={getStepId(context.rootId, STEPPER_STEP_PARTS.CONTENT, value)}
      aria-labelledby={getStepId(context.rootId, STEPPER_STEP_PARTS.TRIGGER, value)}
      data-slot="stepper-content"
      className={cn('outline-none', className)}
      {...props}
    />
  );
}
