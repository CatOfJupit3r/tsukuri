import { useRanger } from '@tanstack/react-ranger';
import { useRef } from 'react';
import type { ComponentProps } from 'react';

import { cn } from '#~/lib/utils';

export interface iRangerProps extends Pick<
  ComponentProps<'div'>,
  'id' | 'className' | 'ref' | 'aria-label' | 'aria-describedby' | 'aria-invalid'
> {
  value: number;
  onChange: (value: number) => unknown;
  onBlur?: () => unknown;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

/**
 * Ranger component built with TanStack Ranger for smooth, accessible range input
 *
 * @example
 * ```tsx
 * <Ranger
 *   value={temperature}
 *   onChange={setTemperature}
 *   min={0}
 *   max={2}
 *   step={0.01}
 * />
 * ```
 */
export function Ranger({
  value,
  onChange,
  onBlur,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  id,
  ref,
  'aria-label': ariaLabel = 'Range slider handle',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: iRangerProps) {
  const trackElementRef = useRef<HTMLDivElement>(null);

  const { handles } = useRanger<HTMLDivElement>({
    getRangerElement: () => trackElementRef.current,
    values: [value],
    min,
    max,
    stepSize: step,
    onDrag: (instance) => {
      onChange(instance.sortedValues[0] ?? value);
    },
  });

  return (
    <div
      ref={ref}
      id={id}
      className={cn('relative w-full', disabled && 'cursor-not-allowed opacity-50', className)}
      onBlur={onBlur}
    >
      <div
        ref={trackElementRef}
        className={cn(
          'relative h-2 w-full rounded-lg bg-muted',
          !disabled && 'cursor-pointer',
          disabled && 'pointer-events-none',
        )}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-lg bg-primary transition-all"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />

        {handles().map((handle) => (
          <div
            key={handle.value}
            onKeyDown={handle.onKeyDownHandler}
            onMouseDown={handle.onMouseDownHandler}
            onTouchStart={handle.onTouchStart}
            className={cn(
              'absolute top-1/2 size-4 -translate-1/2 rounded-full bg-primary shadow-sm transition-shadow',
              !disabled && 'hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              disabled && 'pointer-events-none',
              handle.isActive && 'shadow-md',
            )}
            style={{ left: `${((handle.value - min) / (max - min)) * 100}%` }}
            tabIndex={disabled ? -1 : 0}
            role="slider"
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={handle.value}
            aria-disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
