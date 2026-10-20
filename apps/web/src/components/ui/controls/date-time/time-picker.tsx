import type { ComponentProps } from 'react';

import { Input } from '#~/components/ui/controls/input';

interface iTimePickerProps extends Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange' | 'step'> {
  value: string;
  onValueChange: (value: string) => unknown;
  minuteStep?: number;
}

const SECONDS_PER_MINUTE = 60;

export function TimePicker({ value, onValueChange, minuteStep = 1, ...props }: iTimePickerProps) {
  return (
    <Input
      {...props}
      type="time"
      value={value}
      step={minuteStep * SECONDS_PER_MINUTE}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}
