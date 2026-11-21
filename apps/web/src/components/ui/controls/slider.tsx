import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import type { ComponentProps } from 'react';

import { cn } from '#~/lib/utils';

export interface iSliderProps extends Pick<
  ComponentProps<'div'>,
  'id' | 'className' | 'aria-label' | 'aria-describedby' | 'aria-invalid'
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
 * Single-value range input on the Base UI slider: drag, click on the track or use the arrow keys.
 *
 * @example
 * ```tsx
 * <Slider
 *   value={temperature}
 *   onChange={setTemperature}
 *   min={0}
 *   max={2}
 *   step={0.01}
 * />
 * ```
 */
export function Slider({
  value,
  onChange,
  onBlur,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel = 'Range slider handle',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: iSliderProps) {
  return (
    <SliderPrimitive.Root
      id={id}
      data-slot="slider"
      value={value}
      onValueChange={(nextValue) => onChange(nextValue)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn('relative w-full data-disabled:cursor-not-allowed data-disabled:opacity-50', className)}
    >
      <SliderPrimitive.Control className="flex w-full touch-none items-center py-2 select-none">
        <SliderPrimitive.Track className="relative h-2 w-full rounded-lg bg-muted">
          <SliderPrimitive.Indicator className="rounded-lg bg-primary" />
          <SliderPrimitive.Thumb
            onBlur={onBlur}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            className={cn(
              'size-4 rounded-full bg-primary shadow-sm transition-shadow outline-none',
              'hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'data-dragging:shadow-md',
            )}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
